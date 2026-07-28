mod cli;
mod jira;
mod proxy;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(cli::AgentSessions::default())
        .manage(jira::JiraJobs::default())
        .invoke_handler(tauri::generate_handler![
            cli::detect_cli,
            cli::run_agent,
            cli::cancel_agent,
            jira::open_jira_login,
            jira::jira_bridge_ready,
            jira::jira_job_result,
            jira::jira_check_session,
            jira::jira_request,
            jira::jira_attach,
            proxy::fetch_capa_csv,
            proxy::fetch_config,
            proxy::sheets_bulk_insert,
        ]);

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
