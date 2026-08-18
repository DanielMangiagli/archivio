use crate::error::{AppError, AppResult};
use crate::models::{PhotoMetadata, Project, ProjectSummary};
use exif::Reader;
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

    pub fn original_photo_dir(&self, project: &Project, phase_id: &str) -> PathBuf {
        self.project_dir(project)
            .join(phase_id)
            .join("foto")
            .join("originals")
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

    pub fn load_metadata(&self, folder_name: &str) -> AppResult<Project> {
        let path = self.projects_dir().join(folder_name).join("metadata.json");
        if !path.exists() {
            return Err(AppError::ProjectNotFound(folder_name.to_string()));
        }
        let data = fs::read_to_string(&path)?;
        let project: Project = serde_json::from_str(&data)?;
        Ok(project)
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
