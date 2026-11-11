#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use spanish321_core::{self as core, Rating, Review};
use std::sync::Mutex;
use tauri::{Manager, State};
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
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let conn = rusqlite::Connection::open(dir.join("learner.sqlite3"))?;
            core::migrate(&conn).map_err(std::io::Error::other)?;
            app.manage(Database(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            schedule_review
        ])
        .run(tauri::generate_context!())
        .expect("Unable to start Spanish321");
}
