// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use crate::error::{AppError, AppResult};
use crate::models::{PhotoMetadata, Project, ProjectSummary};
use exif::Reader;
use std::collections::HashSet;
use std::fs;
use std::io::BufReader;
use std::path::{Path, PathBuf};

pub struct Storage {
    root: PathBuf,
}

impl Storage {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn projects_dir(&self) -> PathBuf {
        self.root.join("projects")
    }

    pub fn index_path(&self) -> PathBuf {
        self.root.join("index.html")
    }

    pub fn project_dir(&self, project: &Project) -> PathBuf {
        self.projects_dir().join(project.folder_name())
    }

    pub fn metadata_path(&self, project: &Project) -> PathBuf {
        self.project_dir(project).join("metadata.json")
    }

    pub fn thumbnail_dir(&self, project: &Project, phase_id: &str) -> PathBuf {
        self.project_dir(project)
            .join(phase_id)
            .join("foto")
            .join("thumb")
    }

    pub fn init(&self) -> AppResult<()> {
        fs::create_dir_all(self.projects_dir())?;
        Ok(())
    }

    pub fn scaffold_project(&self, project: &Project) -> AppResult<()> {
        let dir = self.project_dir(project);
        fs::create_dir_all(&dir)?;

        for phase in &project.phases {
            let phase_dir = dir.join(&phase.folder_name);
            fs::create_dir_all(&phase_dir)?;

            for subfolder in &phase.subfolders {
                fs::create_dir_all(phase_dir.join(subfolder))?;
            }
        }

        self.save_metadata(project)?;
        Ok(())
    }

    pub fn save_metadata(&self, project: &Project) -> AppResult<()> {
        let path = self.metadata_path(project);
        let parent = path.parent().ok_or_else(|| AppError::InvalidPath("Cannot get parent directory".into()))?;
        fs::create_dir_all(parent)?;
        let json = serde_json::to_string_pretty(project)?;
        fs::write(path, json)?;
        Ok(())
    }

    pub fn rename_project_dir(&self, old_folder: &str, new_folder: &str) -> AppResult<()> {
        let old_dir = self.projects_dir().join(old_folder);
        let new_dir = self.projects_dir().join(new_folder);
        if old_dir.exists() && old_dir != new_dir {
            fs::rename(&old_dir, &new_dir)?;
        }
        Ok(())
    }

    pub fn load_project_by_id(&self, id: &str) -> AppResult<Project> {
        let projects = self.list_projects()?;
        projects
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::ProjectNotFound(id.to_string()))
    }

    pub fn list_projects(&self) -> AppResult<Vec<Project>> {
        let mut projects = Vec::new();
        let projects_dir = self.projects_dir();

        if !projects_dir.exists() {
            return Ok(projects);
        }

        for entry in fs::read_dir(&projects_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let metadata_path = path.join("metadata.json");
                if metadata_path.exists() {
                    let data = fs::read_to_string(&metadata_path)?;
                    let project: Project = serde_json::from_str(&data)?;
                    projects.push(project);
                }
            }
        }

        projects.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(projects)
    }

    pub fn delete_project(&self, project: &Project) -> AppResult<()> {
        let dir = self.project_dir(project);
        if dir.exists() {
            if let Err(e) = trash::delete(&dir) {
                eprintln!("trash::delete failed ({}), falling back to permanent delete", e);
                fs::remove_dir_all(&dir)
                    .map_err(|e| crate::error::AppError::InvalidPath(format!("Failed to delete project: {}", e)))?;
            }
        }
        Ok(())
    }

    /// Walk each phase folder on disk, reconcile with metadata.json.
    /// Adds new files found on disk, removes entries for deleted files.
    pub fn scan_project_files(&self, project: &mut Project) -> AppResult<()> {
        let root = self.root().to_path_buf();
        let project_dir = self.project_dir(project);

        for phase in &mut project.phases {
            let phase_dir = project_dir.join(&phase.folder_name);
            if !phase_dir.exists() {
                continue;
            }

            // Collect all files currently on disk under this phase folder
            let mut disk_files: Vec<PathBuf> = Vec::new();
            Self::walk_files(&phase_dir, &mut disk_files)?;

            // Build set of filenames already tracked in metadata
            let tracked_names: HashSet<String> =
                phase.files.iter().map(|f| f.name.clone()).collect();

            // Add files found on disk but not in metadata
            for disk_path in &disk_files {
                let filename = disk_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                if !tracked_names.contains(&filename) {
                    let metadata = fs::metadata(disk_path)?;
                    let mime = crate::commands::mime_guess(&filename);

                    let mut file_entry = crate::models::FileEntry {
                        name: filename,
                        path: disk_path
                            .strip_prefix(&root)
                            .unwrap_or(disk_path)
                            .to_path_buf(),
                        size: metadata.len(),
                        mime_type: mime.clone(),
                        created_at: Some(chrono::Utc::now()),
                        photo_metadata: None,
                    };

                    // Process photos
                    if let Some(ref m) = mime {
                        if m.starts_with("image/") {
                            if let Ok(mut photo_meta) = extract_exif(disk_path) {
                                let thumb_dir = phase_dir.join("foto").join("thumb");
                                let _ = fs::create_dir_all(&thumb_dir);
                                let thumb_name = format!("thumb_{}", file_entry.name);
                                let thumb_path = thumb_dir.join(&thumb_name);

                                if generate_thumbnail(disk_path, &thumb_path, 300).is_ok() {
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

                    phase.files.push(file_entry);
                }
            }

            // Remove files from metadata that no longer exist on disk
            let disk_names: HashSet<String> = disk_files
                .iter()
                .filter_map(|p| p.file_name().map(|f| f.to_string_lossy().to_string()))
                .collect();

            phase.files.retain(|f| disk_names.contains(&f.name));
        }

        self.save_metadata(project)?;
        Ok(())
    }

    fn walk_files(dir: &Path, files: &mut Vec<PathBuf>) -> AppResult<()> {
        if !dir.exists() {
            return Ok(());
        }
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                // Skip metadata.json itself
                if path.file_name().and_then(|n| n.to_str()) == Some("metadata.json") {
                    continue;
                }
                files.push(path);
            } else if path.is_dir() {
                Self::walk_files(&path, files)?;
            }
        }
        Ok(())
    }

    pub fn project_summary(&self, project: &Project) -> ProjectSummary {
        let mut file_count = 0;
        let mut photo_count = 0;

        for phase in &project.phases {
            file_count += phase.files.len();
            for file in &phase.files {
                if let Some(ref mime) = file.mime_type {
                    if mime.starts_with("image/") {
                        photo_count += 1;
                    }
                }
            }
        }

        ProjectSummary {
            id: project.id.clone(),
            code: project.code.clone(),
            name: project.name.clone(),
            client: project.client.clone(),
            status: project.status.clone(),
            contract_date: project.contract_date,
            completion_date: project.completion_date,
            amount: project.amount,
            amount_paid: project.amount_paid,
            category_id: project.category_id.clone(),
            file_count,
            photo_count,
        }
    }
}

// Photo processing functions

pub fn generate_thumbnail(src: &Path, dest: &Path, max_size: u32) -> AppResult<()> {
    let img = image::open(src).map_err(|e| AppError::Image(e.to_string()))?;
    let thumbnail = img.resize(max_size, max_size, image::imageops::FilterType::Lanczos3);
    thumbnail
        .save(dest)
        .map_err(|e| AppError::Image(e.to_string()))?;
    Ok(())
}

pub fn extract_exif(path: &Path) -> AppResult<PhotoMetadata> {
    let file = fs::File::open(path)?;
    let mut bufreader = BufReader::new(file);
    let exif_reader = Reader::new();

    let mut metadata = PhotoMetadata {
        width: None,
        height: None,
        camera_make: None,
        camera_model: None,
        date_taken: None,
        gps_lat: None,
        gps_lon: None,
        has_thumbnail: false,
        thumbnail_path: None,
    };

    // Get image dimensions
    if let Ok(img) = image::ImageReader::open(path)?.decode() {
        metadata.width = Some(img.width());
        metadata.height = Some(img.height());
    }

    // Try to read EXIF
    if let Ok(exif_data) = exif_reader.read_from_container(&mut bufreader) {
        if let Some(field) = exif_data.get_field(exif::Tag::Make, exif::In::PRIMARY) {
            metadata.camera_make = Some(field.display_value().to_string());
        }
        if let Some(field) = exif_data.get_field(exif::Tag::Model, exif::In::PRIMARY) {
            metadata.camera_model = Some(field.display_value().to_string());
        }
        if let Some(field) = exif_data.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY) {
            if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(
                &field.display_value().to_string(),
                "%Y-%m-%d %H:%M:%S",
            ) {
                metadata.date_taken = Some(dt.and_utc());
            }
        }
        if let (Some(lat), Some(lon)) = (
            exif_data.get_field(exif::Tag::GPSLatitude, exif::In::PRIMARY),
            exif_data.get_field(exif::Tag::GPSLongitude, exif::In::PRIMARY),
        ) {
            metadata.gps_lat = parse_gps_coord(&lat.value);
            metadata.gps_lon = parse_gps_coord(&lon.value);
        }
    }

    Ok(metadata)
}

fn parse_gps_coord(field: &exif::Value) -> Option<f64> {
    if let exif::Value::Rational(rational_vec) = field {
        if rational_vec.len() >= 3 {
            let deg = rational_vec[0].to_f64();
            let min = rational_vec[1].to_f64();
            let sec = rational_vec[2].to_f64();
            if deg >= 0.0 && min >= 0.0 && sec >= 0.0 {
                return Some(deg + min / 60.0 + sec / 3600.0);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use crate::models::{FolderTemplate, FileEntry, ProjectStatus};
    use uuid::Uuid;

    fn make_project(code: &str, name: &str) -> Project {
        Project {
            id: Uuid::new_v4().to_string(),
            code: code.to_string(),
            name: name.to_string(),
            client: "Test Client".to_string(),
            description: String::new(),
            contract_date: None,
            completion_date: None,
            amount: None,
            amount_paid: None,
            status: ProjectStatus::Bozza,
            phases: FolderTemplate::default().to_phases(),
            tags: vec![],
            category_id: None,
            notes: String::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn make_storage() -> (tempfile::TempDir, Storage) {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        storage.init().unwrap();
        (dir, storage)
    }

    #[test]
    fn new_storage_root() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        assert_eq!(storage.root(), dir.path());
    }

    #[test]
    fn projects_dir_path() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        assert_eq!(storage.projects_dir(), dir.path().join("projects"));
    }

    #[test]
    fn index_path_value() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        assert_eq!(storage.index_path(), dir.path().join("index.html"));
    }

    #[test]
    fn project_dir_path() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        let p = make_project("C-001", "Bridge");
        assert_eq!(
            storage.project_dir(&p),
            dir.path().join("projects").join("C-001_bridge")
        );
    }

    #[test]
    fn metadata_path_value() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        let p = make_project("C-001", "Bridge");
        assert_eq!(
            storage.metadata_path(&p),
            dir.path()
                .join("projects")
                .join("C-001_bridge")
                .join("metadata.json")
        );
    }

    #[test]
    fn thumbnail_dir_path() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        let p = make_project("C-001", "Bridge");
        assert_eq!(
            storage.thumbnail_dir(&p, "esecuzione"),
            dir.path()
                .join("projects")
                .join("C-001_bridge")
                .join("esecuzione")
                .join("foto")
                .join("thumb")
        );
    }

    #[test]
    fn init_creates_projects_dir() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().to_path_buf());
        storage.init().unwrap();
        assert!(storage.projects_dir().exists());
    }

    #[test]
    fn scaffold_creates_directory_tree() {
        let (_dir, storage) = make_storage();
        let p = make_project("C-001", "Bridge");
        storage.scaffold_project(&p).unwrap();

        let base = storage.project_dir(&p);
        assert!(base.exists());
        assert!(base.join("contratto").exists());
        assert!(base.join("contratto").join("documenti").exists());
        assert!(base.join("esecuzione").exists());
        assert!(base.join("esecuzione").join("relazioni").exists());
        assert!(base.join("esecuzione").join("foto").join("originals").exists());
        assert!(base.join("esecuzione").join("foto").join("thumb").exists());
        assert!(base.join("esecuzione").join("documenti").exists());
        assert!(base.join("pagamento").exists());
        assert!(base.join("pagamento").join("fatture").exists());
        assert!(base.join("pagamento").join("certificati").exists());
    }

    #[test]
    fn scaffold_custom_phases() {
        let (_dir, storage) = make_storage();
        let mut p = make_project("C-002", "Custom");
        p.phases = vec![
            crate::models::Phase {
                id: "fase_a".into(),
                label: "Fase A".into(),
                folder_name: "fase_a".into(),
                subfolders: vec!["docs".into(), "images".into()],
                files: vec![],
            },
            crate::models::Phase {
                id: "fase_b".into(),
                label: "Fase B".into(),
                folder_name: "fase_b".into(),
                subfolders: vec![],
                files: vec![],
            },
        ];
        storage.scaffold_project(&p).unwrap();

        let base = storage.project_dir(&p);
        assert!(base.join("fase_a").exists());
        assert!(base.join("fase_a").join("docs").exists());
        assert!(base.join("fase_a").join("images").exists());
        assert!(base.join("fase_b").exists());
        assert!(!base.join("fase_b").join("docs").exists());
    }

    #[test]
    fn scaffold_saves_metadata() {
        let (_dir, storage) = make_storage();
        let p = make_project("C-001", "Bridge");
        storage.scaffold_project(&p).unwrap();

        let meta_path = storage.metadata_path(&p);
        assert!(meta_path.exists());

        let data = fs::read_to_string(&meta_path).unwrap();
        let loaded: Project = serde_json::from_str(&data).unwrap();
        assert_eq!(loaded.code, "C-001");
        assert_eq!(loaded.name, "Bridge");
    }

    #[test]
    fn save_and_load_metadata_roundtrip() {
        let (_dir, storage) = make_storage();
        let mut p = make_project("C-001", "Bridge");
        storage.scaffold_project(&mut p).unwrap();

        p.description = "Updated description".into();
        p.amount = Some(50000.0);
        storage.save_metadata(&p).unwrap();

        let loaded = storage.load_project_by_id(&p.id).unwrap();
        assert_eq!(loaded.description, "Updated description");
        assert_eq!(loaded.amount, Some(50000.0));
    }

    #[test]
    fn list_projects_empty() {
        let (_dir, storage) = make_storage();
        let projects = storage.list_projects().unwrap();
        assert!(projects.is_empty());
    }

    #[test]
    fn list_projects_returns_all() {
        let (_dir, storage) = make_storage();
        let p1 = make_project("C-001", "Bridge");
        let p2 = make_project("C-002", "Road");
        storage.scaffold_project(&p1).unwrap();
        storage.scaffold_project(&p2).unwrap();

        let projects = storage.list_projects().unwrap();
        assert_eq!(projects.len(), 2);
    }

    #[test]
    fn list_projects_sorted_by_created_at_desc() {
        let (_dir, storage) = make_storage();
        let mut p1 = make_project("C-001", "Old");
        p1.created_at = Utc::now() - chrono::Duration::hours(2);
        let mut p2 = make_project("C-002", "New");
        p2.created_at = Utc::now();

        storage.scaffold_project(&p1).unwrap();
        storage.scaffold_project(&p2).unwrap();

        let projects = storage.list_projects().unwrap();
        assert_eq!(projects[0].name, "New");
        assert_eq!(projects[1].name, "Old");
    }

    #[test]
    fn load_project_by_id_found() {
        let (_dir, storage) = make_storage();
        let p = make_project("C-001", "Bridge");
        storage.scaffold_project(&p).unwrap();

        let loaded = storage.load_project_by_id(&p.id).unwrap();
        assert_eq!(loaded.code, "C-001");
    }

    #[test]
    fn load_project_by_id_not_found() {
        let (_dir, storage) = make_storage();
        let result = storage.load_project_by_id("nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn rename_project_dir() {
        let (_dir, storage) = make_storage();
        let p = make_project("C-001", "Bridge");
        storage.scaffold_project(&p).unwrap();

        let old_folder = p.folder_name();
        let new_folder = "C-001_road".to_string();

        storage.rename_project_dir(&old_folder, &new_folder).unwrap();

        assert!(!storage.projects_dir().join(&old_folder).exists());
        assert!(storage.projects_dir().join(&new_folder).exists());
    }

    #[test]
    fn rename_project_dir_same_name() {
        let (_dir, storage) = make_storage();
        let p = make_project("C-001", "Bridge");
        storage.scaffold_project(&p).unwrap();

        let folder = p.folder_name();
        storage.rename_project_dir(&folder, &folder).unwrap();

        assert!(storage.projects_dir().join(&folder).exists());
    }

    #[test]
    fn delete_project_removes_dir() {
        let (_dir, storage) = make_storage();
        let p = make_project("C-001", "Bridge");
        storage.scaffold_project(&p).unwrap();

        let project_dir = storage.project_dir(&p);
        assert!(project_dir.exists());

        storage.delete_project(&p).unwrap();
        assert!(!project_dir.exists());
    }

    #[test]
    fn project_summary_counts() {
        let (_dir, storage) = make_storage();
        let mut p = make_project("C-001", "Bridge");

        p.phases[0].files.push(FileEntry {
            name: "doc.pdf".into(),
            path: "doc.pdf".into(),
            size: 1000,
            mime_type: Some("application/pdf".into()),
            created_at: None,
            photo_metadata: None,
        });
        p.phases[1].files.push(FileEntry {
            name: "photo.jpg".into(),
            path: "photo.jpg".into(),
            size: 2000,
            mime_type: Some("image/jpeg".into()),
            created_at: None,
            photo_metadata: None,
        });
        p.phases[1].files.push(FileEntry {
            name: "photo2.png".into(),
            path: "photo2.png".into(),
            size: 3000,
            mime_type: Some("image/png".into()),
            created_at: None,
            photo_metadata: None,
        });

        let summary = storage.project_summary(&p);
        assert_eq!(summary.file_count, 3);
        assert_eq!(summary.photo_count, 2);
        assert_eq!(summary.code, "C-001");
    }

    #[test]
    fn scan_project_files_adds_new() {
        let (_dir, storage) = make_storage();
        let mut p = make_project("C-001", "Bridge");
        storage.scaffold_project(&mut p).unwrap();

        // Create a file on disk
        let phase_dir = storage.project_dir(&p).join("contratto");
        fs::write(phase_dir.join("test.pdf"), b"content").unwrap();

        // Scan should pick it up
        storage.scan_project_files(&mut p).unwrap();

        let phase = p.phases.iter().find(|ph| ph.id == "contratto").unwrap();
        assert_eq!(phase.files.len(), 1);
        assert_eq!(phase.files[0].name, "test.pdf");
    }

    #[test]
    fn scan_project_files_removes_deleted() {
        let (_dir, storage) = make_storage();
        let mut p = make_project("C-001", "Bridge");
        storage.scaffold_project(&mut p).unwrap();

        // Create and track a file
        let phase_dir = storage.project_dir(&p).join("contratto");
        fs::write(phase_dir.join("test.pdf"), b"content").unwrap();
        storage.scan_project_files(&mut p).unwrap();

        // Delete the file from disk
        fs::remove_file(phase_dir.join("test.pdf")).unwrap();

        // Scan should remove it
        storage.scan_project_files(&mut p).unwrap();

        let phase = p.phases.iter().find(|ph| ph.id == "contratto").unwrap();
        assert!(phase.files.is_empty());
    }

    #[test]
    fn scan_project_files_preserves_existing() {
        let (_dir, storage) = make_storage();
        let mut p = make_project("C-001", "Bridge");
        storage.scaffold_project(&mut p).unwrap();

        // Create and track a file
        let phase_dir = storage.project_dir(&p).join("contratto");
        fs::write(phase_dir.join("test.pdf"), b"content").unwrap();
        storage.scan_project_files(&mut p).unwrap();

        // Scan again — should not duplicate
        storage.scan_project_files(&mut p).unwrap();

        let phase = p.phases.iter().find(|ph| ph.id == "contratto").unwrap();
        assert_eq!(phase.files.len(), 1);
    }

    #[test]
    fn parse_gps_coord_valid() {
        use exif::Rational;

        let value = exif::Value::Rational(vec![
            Rational { num: 45, denom: 1 },
            Rational { num: 30, denom: 1 },
            Rational { num: 0, denom: 1 },
        ]);
        let result = parse_gps_coord(&value);
        assert!((result.unwrap() - 45.5).abs() < 0.001);
    }

    #[test]
    fn parse_gps_coord_wrong_type() {
        let value = exif::Value::Ascii(vec![]);
        assert!(parse_gps_coord(&value).is_none());
    }

    #[test]
    fn parse_gps_coord_too_few_elements() {
        use exif::Rational;

        let value = exif::Value::Rational(vec![
            Rational { num: 45, denom: 1 },
            Rational { num: 30, denom: 1 },
        ]);
        assert!(parse_gps_coord(&value).is_none());
    }

    #[test]
    fn list_projects_nonexistent_dir() {
        let dir = tempfile::tempdir().unwrap();
        let storage = Storage::new(dir.path().join("nonexistent"));
        let projects = storage.list_projects().unwrap();
        assert!(projects.is_empty());
    }
}
