//! 사내 구글시트 연동용 Cloudflare Worker 프록시 클라이언트.
//!
//! 기존 Chrome 확장프로그램이 쓰던 워커를 그대로 재사용한다.
//! 엔드포인트 명세: knowledge/api/cloudflare-proxy.md

use serde::{Deserialize, Serialize};

pub const DEFAULT_PROXY_URL: &str = "https://btv-proxy.alcheminos.workers.dev";

#[derive(Debug, Deserialize)]
pub struct ProxyArgs {
    /// 설정에서 덮어쓸 수 있게 한다. 미지정 시 DEFAULT_PROXY_URL.
    pub base_url: Option<String>,
}

fn base(args: &ProxyArgs) -> String {
    args.base_url
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(DEFAULT_PROXY_URL)
        .trim_end_matches('/')
        .to_string()
}

/// 배너 편성 Capa CSV 조회.
#[tauri::command]
pub async fn fetch_capa_csv(args: ProxyArgs) -> Result<String, String> {
    let url = format!("{}/?action=getCapaCsv", base(&args));
    reqwest::get(&url)
        .await
        .map_err(|e| format!("Capa 조회 실패: {e}"))?
        .text()
        .await
        .map_err(|e| format!("Capa 응답 파싱 실패: {e}"))
}

/// GNB별 담당자 매핑 Config 조회.
#[tauri::command]
pub async fn fetch_config(args: ProxyArgs) -> Result<serde_json::Value, String> {
    let url = format!("{}/?action=getConfig", base(&args));
    reqwest::get(&url)
        .await
        .map_err(|e| format!("Config 조회 실패: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Config 응답 파싱 실패: {e}"))
}

#[derive(Debug, Deserialize)]
pub struct BulkInsertArgs {
    pub base_url: Option<String>,
    /// 시트에 적재할 행 배열. 스키마는 knowledge/workflow/sheets-logging.md 참고.
    pub rows: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
struct BulkInsertBody<'a> {
    action: &'a str,
    rows: &'a [serde_json::Value],
}

/// 캠페인 실행 로그를 구글시트에 일괄 적재한다.
#[tauri::command]
pub async fn sheets_bulk_insert(args: BulkInsertArgs) -> Result<serde_json::Value, String> {
    let url = base(&ProxyArgs {
        base_url: args.base_url.clone(),
    });

    let res = reqwest::Client::new()
        .post(&url)
        .json(&BulkInsertBody {
            action: "bulkInsert",
            rows: &args.rows,
        })
        .send()
        .await
        .map_err(|e| format!("시트 적재 요청 실패: {e}"))?;

    if !res.status().is_success() {
        return Err(format!("시트 적재 실패 (HTTP {})", res.status()));
    }

    res.json()
        .await
        .map_err(|e| format!("시트 적재 응답 파싱 실패: {e}"))
}
