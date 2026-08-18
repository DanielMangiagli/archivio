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

            // Create subfolders for esecuzione phase
            if phase.id == "esecuzione" {
                fs::create_dir_all(phase_dir.join("relazioni"))?;
                fs::create_dir_all(phase_dir.join("foto").join("originals"))?;
                fs::create_dir_all(phase_dir.join("foto").join("thumb"))?;
                fs::create_dir_all(phase_dir.join("documenti"))?;
            }

            // Create subfolders for contratto phase
            if phase.id == "contratto" {
                fs::create_dir_all(phase_dir.join("documenti"))?;
            }

            // Create subfolders for pagamento phase
            if phase.id == "pagamento" {
                fs::create_dir_all(phase_dir.join("fatture"))?;
                fs::create_dir_all(phase_dir.join("certificati"))?;
            }
        }

        self.save_metadata(project)?;
        Ok(())
    }

    pub fn save_metadata(&self, project: &Project) -> AppResult<()> {
        let path = self.metadata_path(project);
        let json = serde_json::to_string_pretty(project)?;
        fs::write(path, json)?;
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
            fs::remove_dir_all(dir)?;
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
            amount: project.amount,
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
