// Copyright Daniele Mangiagli
// Licensed under the PolyForm Noncommercial License 1.0.0
// See LICENSE file in the project root for full license information.

use crate::error::AppResult;
use crate::indexer;
use crate::models::{default_phases, FileEntry, Project, ProjectStatus, ProjectSummary};
use crate::settings::Settings;
use crate::storage::Storage;
use chrono::{NaiveDate, Utc};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

pub struct AppState {
    pub storage: Mutex<Storage>,
    pub settings: Mutex<Settings>,
    pub settings_path: Mutex<PathBuf>,
}

// ---- Project CRUD ----

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> AppResult<Vec<ProjectSummary>> {
    let storage = state.storage.lock().unwrap();
    let projects = storage.list_projects()?;
    Ok(projects.iter().map(|p| storage.project_summary(p)).collect())
}

#[tauri::command]
pub fn get_project(state: State<'_, AppState>, id: String) -> AppResult<Project> {
    let storage = state.storage.lock().unwrap();
    storage.load_project_by_id(&id)
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    code: String,
    name: String,
    client: String,
    description: Option<String>,
    contract_date: Option<String>,
    amount: Option<f64>,
    tags: Option<Vec<String>>,
) -> AppResult<Project> {
    let contract_date_parsed = contract_date
        .and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok());

    let mut project = Project {
        id: Uuid::new_v4().to_string(),
        code,
        name,
        client,
        description: description.unwrap_or_default(),
        contract_date: contract_date_parsed,
        completion_date: None,
        amount,
        status: ProjectStatus::Bozza,
        phases: default_phases(),
        tags: tags.unwrap_or_default(),
        notes: String::new(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let storage = state.storage.lock().unwrap();
    storage.scaffold_project(&mut project)?;
    Ok(project)
}

#[tauri::command]
pub fn update_project(
    state: State<'_, AppState>,
    id: String,
    code: Option<String>,
    name: Option<String>,
    client: Option<String>,
    description: Option<String>,
    contract_date: Option<String>,
    completion_date: Option<String>,
    amount: Option<f64>,
    status: Option<String>,
    tags: Option<Vec<String>>,
    notes: Option<String>,
) -> AppResult<Project> {
    let storage = state.storage.lock().unwrap();
    let mut project = storage.load_project_by_id(&id)?;

    if let Some(v) = code { project.code = v; }
    if let Some(v) = name { project.name = v; }
    if let Some(v) = client { project.client = v; }
    if let Some(v) = description { project.description = v; }
    if let Some(v) = contract_date {
        project.contract_date = NaiveDate::parse_from_str(&v, "%Y-%m-%d").ok();
    }
    if let Some(v) = completion_date {
        project.completion_date = NaiveDate::parse_from_str(&v, "%Y-%m-%d").ok();
    }
    if let Some(v) = amount { project.amount = Some(v); }
    if let Some(v) = status {
        project.status = match v.as_str() {
            "bozza" => ProjectStatus::Bozza,
            "in_corso" => ProjectStatus::InCorso,
            "sospeso" => ProjectStatus::Sospeso,
            "completato" => ProjectStatus::Completato,
            "archiviato" => ProjectStatus::Archiviato,
            _ => project.status,
        };
    }
    if let Some(v) = tags { project.tags = v; }
    if let Some(v) = notes { project.notes = v; }

    project.updated_at = Utc::now();
    storage.save_metadata(&project)?;
    Ok(project)
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> AppResult<()> {
    let storage = state.storage.lock().unwrap();
    let project = storage.load_project_by_id(&id)?;
    storage.delete_project(&project)?;
    Ok(())
}

// ---- File Management ----

#[tauri::command]
pub fn add_file(
    state: State<'_, AppState>,
    project_id: String,
    phase_id: String,
    file_path: String,
) -> AppResult<FileEntry> {
    let src = PathBuf::from(&file_path);
    if !src.exists() {
        return Err(crate::error::AppError::InvalidPath(format!(
            "File not found: {}",
            file_path
        )));
    }

    let storage = state.storage.lock().unwrap();
    let mut project = storage.load_project_by_id(&project_id)?;

    // Get folder name before mutable borrow
    let phase_idx = project
        .phases
        .iter()
        .position(|p| p.id == phase_id)
        .ok_or_else(|| {
            crate::error::AppError::InvalidPath(format!("Phase not found: {}", phase_id))
        })?;
    let folder_name = project.phases[phase_idx].folder_name.clone();

    let filename = src
        .file_name()
        .ok_or_else(|| crate::error::AppError::InvalidPath("Invalid filename".into()))?
        .to_string_lossy()
        .to_string();

    let dest_dir = storage.project_dir(&project).join(&folder_name);
    let dest = dest_dir.join(&filename);

    if dest.exists() {
        return Err(crate::error::AppError::FileAlreadyExists(filename));
    }

    fs::copy(&src, &dest)?;

    let metadata = fs::metadata(&dest)?;
    let mime = mime_guess(&filename);
    let root = storage.root().to_path_buf();
    let thumb_dir_path = storage.thumbnail_dir(&project, &phase_id);

    let mut file_entry = FileEntry {
        name: filename,
        path: dest.strip_prefix(&root).unwrap_or(&dest).to_path_buf(),
        size: metadata.len(),
        mime_type: mime.clone(),
        created_at: Some(Utc::now()),
        photo_metadata: None,
    };

    // Process photo metadata and thumbnail
    if let Some(ref m) = mime {
        if m.starts_with("image/") {
            if let Ok(mut photo_meta) = crate::storage::extract_exif(&dest) {
                let _ = fs::create_dir_all(&thumb_dir_path);
                let thumb_name = format!("thumb_{}", file_entry.name);
                let thumb_path = thumb_dir_path.join(&thumb_name);

                if crate::storage::generate_thumbnail(&dest, &thumb_path, 300).is_ok() {
                    photo_meta.has_thumbnail = true;
                    photo_meta.thumbnail_path = Some(
                        thumb_path
                            .strip_prefix(&root)
                            .unwrap_or(&thumb_path)
                            .to_path_buf(),
                    );
                }
                file_entry.photo_metadata = Some(photo_meta);
            }
        }
    }

    project.phases[phase_idx].files.push(file_entry.clone());
    storage.save_metadata(&project)?;

    Ok(file_entry)
}

#[tauri::command]
pub fn remove_file(
    state: State<'_, AppState>,
    project_id: String,
    phase_id: String,
    file_path: String,
) -> AppResult<()> {
    let storage = state.storage.lock().unwrap();
    let mut project = storage.load_project_by_id(&project_id)?;

    let phase = project
        .phases
        .iter_mut()
        .find(|p| p.id == phase_id)
        .ok_or_else(|| {
            crate::error::AppError::InvalidPath(format!("Phase not found: {}", phase_id))
        })?;

    let idx = phase
        .files
        .iter()
        .position(|f| f.path.to_string_lossy() == file_path);
    if let Some(idx) = idx {
        let file = &phase.files[idx];
        let full_path = storage.root().join(&file.path);
        if full_path.exists() {
            let _ = trash::delete(&full_path);
        }
        // Remove thumbnail permanently (small cache file, not worth trashing)
        if let Some(ref photo) = file.photo_metadata {
            if let Some(ref thumb) = photo.thumbnail_path {
                let thumb_full = storage.root().join(thumb);
                if thumb_full.exists() {
                    let _ = fs::remove_file(&thumb_full);
                }
            }
        }
        phase.files.remove(idx);
        storage.save_metadata(&project)?;
    } else {
        // File not found by path — try to find by name as fallback
        let file_name_only = std::path::Path::new(&file_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        let idx_by_name = phase.files.iter().position(|f| f.name == file_name_only);
        if let Some(idx) = idx_by_name {
            let file = &phase.files[idx];
            let full_path = storage.root().join(&file.path);
            if full_path.exists() {
                let _ = trash::delete(&full_path);
            }
            if let Some(ref photo) = file.photo_metadata {
                if let Some(ref thumb) = photo.thumbnail_path {
                    let thumb_full = storage.root().join(thumb);
                    if thumb_full.exists() {
                        let _ = fs::remove_file(&thumb_full);
                    }
                }
            }
            phase.files.remove(idx);
            storage.save_metadata(&project)?;
        } else {
            return Err(crate::error::AppError::InvalidPath(format!(
                "File not found: {}",
                file_path
            )));
        }
    }

    Ok(())
}

#[tauri::command]
pub fn list_files(
    state: State<'_, AppState>,
    project_id: String,
    phase_id: String,
) -> AppResult<Vec<FileEntry>> {
    let storage = state.storage.lock().unwrap();
    let project = storage.load_project_by_id(&project_id)?;

    let phase = project
        .phases
        .iter()
        .find(|p| p.id == phase_id)
        .ok_or_else(|| {
            crate::error::AppError::InvalidPath(format!("Phase not found: {}", phase_id))
        })?;

    Ok(phase.files.clone())
}

// ---- Index ----

#[tauri::command]
pub fn generate_index(state: State<'_, AppState>) -> AppResult<String> {
    let storage = state.storage.lock().unwrap();
    let projects = storage.list_projects()?;
    let html = indexer::generate_index(&projects);
    let path = storage.index_path();
    fs::write(&path, &html)?;
    let path_str = path.to_string_lossy().to_string();
    let _ = open::that(&path_str);
    Ok(path_str)
}

#[tauri::command]
pub fn open_index(state: State<'_, AppState>) -> AppResult<()> {
    let path = {
        let storage = state.storage.lock().unwrap();
        storage.index_path()
    };
    let path_str = path.to_string_lossy().to_string();
    if path.exists() {
        open::that(&path_str)
            .map_err(|e| crate::error::AppError::InvalidPath(format!("Failed to open: {}", e)))?;
    } else {
        return Err(crate::error::AppError::InvalidPath(
            "Index not generated yet".into(),
        ));
    }
    Ok(())
}

#[tauri::command]
pub fn get_index_html(state: State<'_, AppState>) -> AppResult<String> {
    let storage = state.storage.lock().unwrap();
    let projects = storage.list_projects()?;
    Ok(indexer::generate_index(&projects))
}

// ---- Utilities ----

#[tauri::command]
pub fn get_archive_root(state: State<'_, AppState>) -> String {
    let storage = state.storage.lock().unwrap();
    storage.root().to_string_lossy().to_string()
}

#[tauri::command]
pub fn scan_project(state: State<'_, AppState>, id: String) -> AppResult<Project> {
    let storage = state.storage.lock().unwrap();
    let mut project = storage.load_project_by_id(&id)?;
    storage.scan_project_files(&mut project)?;
    Ok(project)
}

#[tauri::command]
pub fn scan_all_projects(state: State<'_, AppState>) -> AppResult<Vec<ProjectSummary>> {
    let storage = state.storage.lock().unwrap();
    let mut projects = storage.list_projects()?;
    for project in &mut projects {
        let _ = storage.scan_project_files(project);
    }
    Ok(projects.iter().map(|p| storage.project_summary(p)).collect())
}

#[tauri::command]
pub fn open_file_location(
    state: State<'_, AppState>,
    _project_id: String,
    file_path: String,
) -> AppResult<()> {
    let root = {
        let storage = state.storage.lock().unwrap();
        storage.root().to_path_buf()
    };
    let full_path = root.join(&file_path);
    let dir = if full_path.is_dir() {
        full_path
    } else {
        full_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or(root)
    };
    open::that(&dir)
        .map_err(|e| crate::error::AppError::InvalidPath(format!("Failed to open: {}", e)))?;
    Ok(())
}

pub fn mime_guess(filename: &str) -> Option<String> {
    let ext = Path::new(filename).extension()?.to_str()?;
    match ext.to_lowercase().as_str() {
        "pdf" => Some("application/pdf".into()),
        "jpg" | "jpeg" => Some("image/jpeg".into()),
        "png" => Some("image/png".into()),
        "gif" => Some("image/gif".into()),
        "bmp" => Some("image/bmp".into()),
        "tiff" | "tif" => Some("image/tiff".into()),
        "doc" => Some("application/msword".into()),
        "docx" => Some("application/vnd.openxmlformats-officedocument.wordprocessingml.document".into()),
        "xls" => Some("application/vnd.ms-excel".into()),
        "xlsx" => Some("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".into()),
        "dwg" => Some("application/acad".into()),
        "dxf" => Some("application/dxf".into()),
        "txt" => Some("text/plain".into()),
        "csv" => Some("text/csv".into()),
        "zip" => Some("application/zip".into()),
        _ => None,
    }
}

#[tauri::command]
pub fn pick_files() -> AppResult<Vec<String>> {
    let files = rfd::FileDialog::new()
        .add_filter(
            "Tutti i file",
            &["pdf","jpg","jpeg","png","gif","bmp","tiff","tif","doc","docx","xls","xlsx","dwg","dxf","txt","csv","zip"],
        )
        .pick_files()
        .unwrap_or_default();
    Ok(files
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
pub fn get_project_meta(state: State<'_, AppState>, id: String) -> AppResult<Project> {
    let storage = state.storage.lock().unwrap();
    storage.load_project_by_id(&id)
}

// ---- Settings ----

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, AppState>,
    language: Option<String>,
) -> AppResult<Settings> {
    let settings_path = state.settings_path.lock().unwrap().clone();
    let mut settings = state.settings.lock().unwrap();
    if let Some(lang) = language {
        settings.language = lang;
    }
    settings.save(&settings_path)?;
    Ok(settings.clone())
}
