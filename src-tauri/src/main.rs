#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use spanish321_core::{self as core, Rating, Review};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use tauri::webview::{PermissionKind, PermissionResponse};
use tauri::{Manager, State};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
struct MicrophonePermission(AtomicBool);
struct Database(Mutex<rusqlite::Connection>);
#[tauri::command]
fn load_state(db: State<Database>) -> Result<Option<String>, String> {
    core::load(&*db.0.lock().map_err(|e| e.to_string())?)
}
#[tauri::command]
fn save_state(db: State<Database>, json: String) -> Result<(), String> {
    core::save(&mut *db.0.lock().map_err(|e| e.to_string())?, &json)
}
#[tauri::command]
fn schedule_review(old: Review, rating: Rating, now: f64) -> Result<Review, String> {
    core::schedule(old, rating, now)
}
#[tauri::command]
async fn request_microphone(app: tauri::AppHandle) -> bool {
    let allowed = app.dialog().message("Allow Spanish321 to use your microphone for this recording? Audio stays on this device unless you export it.")
        .title("Microphone access")
        .buttons(MessageDialogButtons::OkCancelCustom("Allow recording".into(), "Cancel".into()))
        .blocking_show();
    app.state::<MicrophonePermission>()
        .0
        .store(allowed, Ordering::SeqCst);
    allowed
}
#[tauri::command]
async fn export_file(app: tauri::AppHandle, name: String, bytes: Vec<u8>) -> Result<bool, String> {
    if bytes.len() > 100_000_000
        || name.len() > 200
        || name.contains(['/', '\\'])
        || name.is_empty()
    {
        return Err("Invalid export name or file exceeds 100 MB".into());
    }
    // A native Save dialog grants access to exactly the user-selected destination.
    // Remote pages have no IPC capability; callers never supply filesystem paths.
    let Some(file) = app
        .dialog()
        .file()
        .set_file_name(&name)
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, bytes).map_err(|e| e.to_string())?;
    Ok(true)
}
fn main() {
    tauri::Builder::default()
        .manage(MicrophonePermission(AtomicBool::new(false)))
        .on_permission_request(|webview, kind| {
            let local = webview.url().is_ok_and(|url| {
                url.scheme() == "tauri"
                    || url.host_str() == Some("tauri.localhost")
                    || (cfg!(debug_assertions) && url.host_str() == Some("localhost"))
            });
            if matches!(kind, PermissionKind::Microphone)
                && local
                && webview.label() == "main"
                && webview
                    .state::<MicrophonePermission>()
                    .0
                    .load(Ordering::SeqCst)
            {
                PermissionResponse::Allow
            } else {
                PermissionResponse::Deny
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let conn = rusqlite::Connection::open(dir.join("learner.sqlite3"))?;
            core::migrate(&conn).map_err(std::io::Error::other)?;
            core::sync_content(&conn, include_str!("../../content/manifest.json"))
                .map_err(std::io::Error::other)?;
            app.manage(Database(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            schedule_review,
            export_file,
            request_microphone
        ])
        .run(tauri::generate_context!())
        .expect("Unable to start Spanish321");
}
