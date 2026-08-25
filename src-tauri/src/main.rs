// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

mod commands;
mod config;
mod error;
mod indexer;
mod models;
mod settings;
mod storage;

use commands::AppState;
use config::AppConfig;
use settings::Settings;
use std::sync::Mutex;

fn main() {
    let app_config = AppConfig::load();
    let archive_root = app_config.archive_root_or_default();

    let storage = storage::Storage::new(archive_root.clone());
    storage.init().expect("Failed to initialize archive directory");

    let settings_path = archive_root.join("settings.json");
    let settings = Settings::load(&settings_path);

    tauri::Builder::default()
        .plugin(tauri_plugin_wdio_webdriver::init())
        .manage(AppState {
            storage: Mutex::new(storage),
            settings: Mutex::new(settings),
            settings_path: Mutex::new(settings_path),
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
            commands::open_index,
            commands::get_index_html,
            commands::get_archive_root,
            commands::scan_project,
            commands::scan_all_projects,
            commands::open_file_location,
            commands::pick_files,
            commands::get_project_meta,
            commands::get_settings,
            commands::save_settings,
            commands::list_categories,
            commands::add_category,
            commands::update_category,
            commands::delete_category,
            commands::get_next_code_preview,
            commands::get_folder_template,
            commands::save_folder_template,
            commands::pick_directory,
            commands::set_archive_root,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
