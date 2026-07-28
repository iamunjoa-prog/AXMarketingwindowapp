//! 로컬에 설치된 AI CLI(Claude Code / Codex)를 자식 프로세스로 실행하고
//! stdout/stderr를 Tauri 이벤트로 스트리밍한다.
//!
//! 프론트엔드는 `agent://chunk`, `agent://done`, `agent://error` 이벤트를 구독한다.
//! 자세한 프로토콜은 knowledge/architecture.md 참고.

use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::oneshot;

/// 지원하는 CLI 백엔드.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CliKind {
    Claude,
    Codex,
}

impl CliKind {
    /// PATH에서 찾을 실행 파일 이름 후보. Windows에서는 .cmd 셰임이 흔하다.
    fn binaries(&self) -> &'static [&'static str] {
        match self {
            CliKind::Claude => &["claude"],
            CliKind::Codex => &["codex"],
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct CliInfo {
    pub kind: CliKind,
    pub found: bool,
    pub path: Option<String>,
}

/// PATH에서 CLI 실행 파일을 탐지한다.
#[tauri::command]
pub fn detect_cli() -> Vec<CliInfo> {
    [CliKind::Claude, CliKind::Codex]
        .iter()
        .map(|kind| {
            let path = kind
                .binaries()
                .iter()
                .find_map(|name| which::which(name).ok())
                .map(|p| p.to_string_lossy().to_string());
            CliInfo {
                kind: *kind,
                found: path.is_some(),
                path,
            }
        })
        .collect()
}

/// 실행 중인 세션의 취소 신호를 보관한다.
#[derive(Default)]
pub struct AgentSessions(Mutex<HashMap<String, oneshot::Sender<()>>>);

#[derive(Debug, Clone, Serialize)]
struct ChunkEvent {
    session_id: String,
    stream: &'static str,
    text: String,
}

#[derive(Debug, Clone, Serialize)]
struct DoneEvent {
    session_id: String,
    code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
struct ErrorEvent {
    session_id: String,
    message: String,
}

#[derive(Debug, Deserialize)]
pub struct RunAgentArgs {
    /// 프론트엔드가 생성한 세션 식별자. 이벤트 라우팅과 취소에 사용한다.
    pub session_id: String,
    pub kind: CliKind,
    /// 탐지 실패 시 사용자가 직접 지정한 실행 파일 경로.
    pub binary_path: Option<String>,
    /// CLI에 전달할 프롬프트 (stdin으로 주입).
    pub prompt: String,
    /// 작업 디렉터리. 지식베이스가 있는 저장소 루트를 넘긴다.
    pub cwd: Option<String>,
    /// 추가 인자. 미지정 시 백엔드별 기본값을 사용한다.
    pub extra_args: Option<Vec<String>>,
}

/// 백엔드별 기본 인자. 비대화형 1회 실행 모드로 동작시킨다.
fn default_args(kind: CliKind) -> Vec<String> {
    match kind {
        // Claude Code: -p(print) 모드로 stdin 프롬프트를 받아 결과를 stdout으로 출력
        CliKind::Claude => vec!["-p".into()],
        // Codex CLI: exec 서브커맨드가 비대화형 실행
        CliKind::Codex => vec!["exec".into()],
    }
}

/// CLI를 실행하고 출력을 스트리밍한다. 호출 즉시 반환하며 결과는 이벤트로 전달된다.
#[tauri::command]
pub async fn run_agent(
    app: AppHandle,
    sessions: State<'_, AgentSessions>,
    args: RunAgentArgs,
) -> Result<(), String> {
    let program = match &args.binary_path {
        Some(p) if !p.trim().is_empty() => p.clone(),
        _ => args
            .kind
            .binaries()
            .iter()
            .find_map(|name| which::which(name).ok())
            .map(|p| p.to_string_lossy().to_string())
            .ok_or_else(|| {
                format!(
                    "{:?} CLI를 찾을 수 없습니다. 설정에서 실행 파일 경로를 지정해 주세요.",
                    args.kind
                )
            })?,
    };

    let cli_args = args.extra_args.unwrap_or_else(|| default_args(args.kind));

    let mut cmd = Command::new(&program);
    cmd.args(&cli_args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(cwd) = &args.cwd {
        cmd.current_dir(cwd);
    }

    #[cfg(windows)]
    {
        // 콘솔 창이 깜빡이지 않도록 CREATE_NO_WINDOW
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("CLI 실행 실패 ({program}): {e}"))?;

    // 프롬프트를 stdin으로 주입한 뒤 닫아서 CLI가 입력 종료를 인식하게 한다.
    if let Some(mut stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        let prompt = args.prompt.clone();
        tokio::spawn(async move {
            let _ = stdin.write_all(prompt.as_bytes()).await;
            let _ = stdin.shutdown().await;
        });
    }

    let stdout = child.stdout.take().ok_or("stdout 파이프를 열 수 없습니다")?;
    let stderr = child.stderr.take().ok_or("stderr 파이프를 열 수 없습니다")?;

    let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
    sessions
        .0
        .lock()
        .map_err(|_| "세션 잠금 실패")?
        .insert(args.session_id.clone(), cancel_tx);

    // stdout 스트리밍
    {
        let app = app.clone();
        let sid = args.session_id.clone();
        tokio::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app.emit(
                    "agent://chunk",
                    ChunkEvent {
                        session_id: sid.clone(),
                        stream: "stdout",
                        text: line,
                    },
                );
            }
        });
    }

    // stderr 스트리밍
    {
        let app = app.clone();
        let sid = args.session_id.clone();
        tokio::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app.emit(
                    "agent://chunk",
                    ChunkEvent {
                        session_id: sid.clone(),
                        stream: "stderr",
                        text: line,
                    },
                );
            }
        });
    }

    // 종료 대기 + 취소 처리
    {
        let app = app.clone();
        let sid = args.session_id.clone();
        tokio::spawn(async move {
            let result = tokio::select! {
                status = child.wait() => status.map(|s| s.code()),
                _ = &mut cancel_rx => {
                    let _ = child.kill().await;
                    Ok(None)
                }
            };

            match result {
                Ok(code) => {
                    let _ = app.emit(
                        "agent://done",
                        DoneEvent {
                            session_id: sid,
                            code,
                        },
                    );
                }
                Err(e) => {
                    let _ = app.emit(
                        "agent://error",
                        ErrorEvent {
                            session_id: sid,
                            message: e.to_string(),
                        },
                    );
                }
            }
        });
    }

    Ok(())
}

/// 실행 중인 세션을 취소한다.
#[tauri::command]
pub fn cancel_agent(sessions: State<'_, AgentSessions>, session_id: String) -> Result<(), String> {
    let mut map = sessions.0.lock().map_err(|_| "세션 잠금 실패")?;
    if let Some(tx) = map.remove(&session_id) {
        let _ = tx.send(());
    }
    Ok(())
}
