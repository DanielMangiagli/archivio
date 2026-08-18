mod commands;
mod error;
mod indexer;
mod models;
mod storage;

use commands::AppState;
use std::path::PathBuf;
use std::sync::Mutex;

fn main() {
    // Default archive location: ~/Documents/Archivio
    let archive_root = dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Archivio");

    let storage = storage::Storage::new(archive_root);
    storage.init().expect("Failed to initialize archive directory");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            storage: Mutex::new(storage),
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_projects,
            commands::get_project,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::add_file,
            commands::remove_file,
            commands::list_files,
            commands::generate_index,
            commands::get_index_html,
            commands::get_archive_root,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
