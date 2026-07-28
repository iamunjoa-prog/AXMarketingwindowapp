//! 사내 Jira 연동.
//!
//! 사내 Jira는 SSO 세션 쿠키로 인증하므로, Rust에서 직접 HTTP를 호출하지 않고
//! **Jira 오리진에 로드된 웹뷰 안에서** fetch를 실행한다. 웹뷰가 세션 쿠키를 보유하므로
//! 기존 Chrome 확장프로그램과 동일한 인증 모델이 된다.
//!
//! 흐름:
//!   1. `open_jira_login`으로 Jira 웹뷰 창을 띄우고 사용자가 로그인
//!   2. 초기화 스크립트가 `jira://job` 이벤트를 구독하는 브리지를 설치
//!   3. Rust가 작업(job)을 emit → 웹뷰가 fetch 실행 → `jira_job_result`로 회신
//!
//! 배경: knowledge/decisions/ADR-006-jira-auth-webview.md
//! API 명세: knowledge/api/jira.md

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::oneshot;

pub const JIRA_BASE_URL: &str = "https://jira.skbroadband.com";
const JIRA_WINDOW_LABEL: &str = "jira-session";

/// 웹뷰에 주입되는 브리지. Jira 오리진에서 실행되므로 세션 쿠키를 그대로 사용한다.
const BRIDGE_SCRIPT: &str = r#"
(function () {
  if (window.__AX_JIRA_BRIDGE__) return;
  window.__AX_JIRA_BRIDGE__ = true;

  const invoke = (cmd, args) =>
    window.__TAURI_INTERNALS__.invoke(cmd, args);

  async function runJob(job) {
    const { jobId, method, path, body, isForm } = job;
    try {
      const headers = { 'X-Atlassian-Token': 'no-check' };
      let payload;

      if (isForm) {
        // body: { filename, mime, base64 }
        const bin = atob(body.base64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const fd = new FormData();
        fd.append('file', new Blob([buf], { type: body.mime }), body.filename);
        payload = fd;
      } else if (body !== null && body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }

      const res = await fetch(path, {
        method,
        headers,
        credentials: 'include',
        body: payload,
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('Jira 로그인 세션이 만료되었습니다. 이 창에서 다시 로그인해 주세요.');
      }
      const text = await res.text();
      if (!res.ok) {
        throw new Error('상태코드 ' + res.status + '\n' + text);
      }

      await invoke('jira_job_result', {
        jobId,
        ok: true,
        payload: text || '{}',
      });
    } catch (e) {
      await invoke('jira_job_result', {
        jobId,
        ok: false,
        payload: String(e && e.message ? e.message : e),
      });
    }
  }

  window.__TAURI__.event.listen('jira://job', (evt) => runJob(evt.payload));
  invoke('jira_bridge_ready', {});
})();
"#;

/// 웹뷰에서 회신을 기다리는 작업들.
#[derive(Default)]
pub struct JiraJobs(Mutex<HashMap<String, oneshot::Sender<Result<String, String>>>>);

#[derive(Debug, Clone, Serialize)]
struct Job {
    #[serde(rename = "jobId")]
    job_id: String,
    method: String,
    path: String,
    body: Option<serde_json::Value>,
    #[serde(rename = "isForm")]
    is_form: bool,
}

/// Jira 로그인 웹뷰를 연다. 이미 열려 있으면 포커스만 준다.
#[tauri::command]
pub async fn open_jira_login(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(JIRA_WINDOW_LABEL) {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    let url = JIRA_BASE_URL
        .parse()
        .map_err(|e| format!("Jira URL 파싱 실패: {e}"))?;

    WebviewWindowBuilder::new(&app, JIRA_WINDOW_LABEL, WebviewUrl::External(url))
        .title("Jira 로그인 — 로그인 후 이 창을 닫지 마세요")
        .inner_size(1000.0, 800.0)
        .initialization_script(BRIDGE_SCRIPT)
        .build()
        .map_err(|e| format!("Jira 창 생성 실패: {e}"))?;

    Ok(())
}

/// 웹뷰 브리지가 준비되었음을 알린다. 프론트엔드가 상태 표시에 사용한다.
#[tauri::command]
pub fn jira_bridge_ready(app: AppHandle) -> Result<(), String> {
    app.emit("jira://ready", ())
        .map_err(|e| format!("이벤트 발행 실패: {e}"))
}

/// 웹뷰가 작업 결과를 회신할 때 호출한다.
#[tauri::command]
pub fn jira_job_result(
    jobs: State<'_, JiraJobs>,
    job_id: String,
    ok: bool,
    payload: String,
) -> Result<(), String> {
    let tx = jobs
        .0
        .lock()
        .map_err(|_| "작업 잠금 실패")?
        .remove(&job_id);

    if let Some(tx) = tx {
        let _ = tx.send(if ok { Ok(payload) } else { Err(payload) });
    }
    Ok(())
}

/// 웹뷰를 통해 Jira REST 요청을 1건 실행하고 응답 본문을 반환한다.
async fn dispatch(
    app: &AppHandle,
    jobs: &JiraJobs,
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
    is_form: bool,
) -> Result<String, String> {
    if app.get_webview_window(JIRA_WINDOW_LABEL).is_none() {
        return Err("Jira 로그인 창이 열려 있지 않습니다. 먼저 로그인해 주세요.".into());
    }

    let job_id = format!("job-{}", uuid_like());
    let (tx, rx) = oneshot::channel();
    jobs.0
        .lock()
        .map_err(|_| "작업 잠금 실패")?
        .insert(job_id.clone(), tx);

    app.emit(
        "jira://job",
        Job {
            job_id: job_id.clone(),
            method: method.to_string(),
            path: format!("{JIRA_BASE_URL}{path}"),
            body,
            is_form,
        },
    )
    .map_err(|e| format!("작업 전송 실패: {e}"))?;

    match tokio::time::timeout(Duration::from_secs(60), rx).await {
        Ok(Ok(result)) => result,
        Ok(Err(_)) => Err("웹뷰 응답 채널이 닫혔습니다".into()),
        Err(_) => {
            jobs.0.lock().ok().and_then(|mut m| m.remove(&job_id));
            Err("Jira 응답 시간이 초과되었습니다 (60초)".into())
        }
    }
}

/// 현재 세션이 유효한지 확인한다.
#[tauri::command]
pub async fn jira_check_session(
    app: AppHandle,
    jobs: State<'_, JiraJobs>,
) -> Result<serde_json::Value, String> {
    let text = dispatch(&app, &jobs, "GET", "/rest/api/2/myself", None, false).await?;
    serde_json::from_str(&text).map_err(|e| format!("세션 응답 파싱 실패: {e}"))
}

#[derive(Debug, Deserialize)]
pub struct JiraRequestArgs {
    pub method: String,
    /// `/rest/api/2/issue` 처럼 JIRA_BASE_URL 이후 경로만 넘긴다.
    pub path: String,
    pub body: Option<serde_json::Value>,
}

/// 범용 Jira REST 호출. 일감 생성·댓글·벌크 생성 모두 이 명령으로 처리한다.
#[tauri::command]
pub async fn jira_request(
    app: AppHandle,
    jobs: State<'_, JiraJobs>,
    args: JiraRequestArgs,
) -> Result<serde_json::Value, String> {
    let text = dispatch(&app, &jobs, &args.method, &args.path, args.body, false).await?;
    if text.trim().is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&text).or(Ok(serde_json::Value::String(text)))
}

#[derive(Debug, Deserialize)]
pub struct JiraAttachArgs {
    pub issue_key: String,
    pub filename: String,
    pub mime: String,
    /// data URL이 아닌 순수 base64 문자열.
    pub base64: String,
}

/// 이슈에 이미지를 첨부한다.
#[tauri::command]
pub async fn jira_attach(
    app: AppHandle,
    jobs: State<'_, JiraJobs>,
    args: JiraAttachArgs,
) -> Result<serde_json::Value, String> {
    let body = serde_json::json!({
        "filename": args.filename,
        "mime": args.mime,
        "base64": args.base64,
    });
    let path = format!("/rest/api/2/issue/{}/attachments", args.issue_key);
    let text = dispatch(&app, &jobs, "POST", &path, Some(body), true).await?;
    serde_json::from_str(&text).or(Ok(serde_json::Value::String(text)))
}

/// 외부 crate 없이 충돌 가능성이 낮은 식별자를 만든다.
fn uuid_like() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{nanos:x}")
}
