// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub prefix: String,
    pub next_number: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProjectStatus {
    #[serde(rename = "bozza")]
    Bozza,
    #[serde(rename = "in_corso")]
    InCorso,
    #[serde(rename = "sospeso")]
    Sospeso,
    #[serde(rename = "completato")]
    Completato,
    #[serde(rename = "archiviato")]
    Archiviato,
}

impl std::fmt::Display for ProjectStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Bozza => write!(f, "Bozza"),
            Self::InCorso => write!(f, "In Corso"),
            Self::Sospeso => write!(f, "Sospeso"),
            Self::Completato => write!(f, "Completato"),
            Self::Archiviato => write!(f, "Archiviato"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: PathBuf,
    pub size: u64,
    pub mime_type: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub photo_metadata: Option<PhotoMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoMetadata {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub date_taken: Option<DateTime<Utc>>,
    pub gps_lat: Option<f64>,
    pub gps_lon: Option<f64>,
    pub has_thumbnail: bool,
    pub thumbnail_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Phase {
    pub id: String,
    pub label: String,
    pub folder_name: String,
    pub files: Vec<FileEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub code: String,
    pub name: String,
    pub client: String,
    pub description: String,
    pub contract_date: Option<chrono::NaiveDate>,
    pub completion_date: Option<chrono::NaiveDate>,
    pub amount: Option<f64>,
    pub amount_paid: Option<f64>,
    pub status: ProjectStatus,
    pub phases: Vec<Phase>,
    pub tags: Vec<String>,
    pub category_id: Option<String>,
    pub notes: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub id: String,
    pub code: String,
    pub name: String,
    pub client: String,
    pub status: ProjectStatus,
    pub contract_date: Option<chrono::NaiveDate>,
    pub completion_date: Option<chrono::NaiveDate>,
    pub amount: Option<f64>,
    pub amount_paid: Option<f64>,
    pub category_id: Option<String>,
    pub file_count: usize,
    pub photo_count: usize,
}

impl Project {
    pub fn folder_name(&self) -> String {
        let slug = self
            .name
            .to_lowercase()
            .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
            .replace(' ', "-");
        format!("{}_{}", self.code, slug)
    }
}

pub fn default_phases() -> Vec<Phase> {
    vec![
        Phase {
            id: "contratto".into(),
            label: "Contratto".into(),
            folder_name: "contratto".into(),
            files: vec![],
        },
        Phase {
            id: "esecuzione".into(),
            label: "Esecuzione".into(),
            folder_name: "esecuzione".into(),
            files: vec![],
        },
        Phase {
            id: "pagamento".into(),
            label: "Pagamento".into(),
            folder_name: "pagamento".into(),
            files: vec![],
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
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
            phases: default_phases(),
            tags: vec![],
            category_id: None,
            notes: String::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn folder_name_basic() {
        let p = make_project("C-001", "Bridge Rehab");
        assert_eq!(p.folder_name(), "C-001_bridge-rehab");
    }

    #[test]
    fn folder_name_special_chars() {
        let p = make_project("X-99", "Progetto: Test & Demo!");
        assert_eq!(p.folder_name(), "X-99_progetto-test--demo");
    }

    #[test]
    fn folder_name_unicode() {
        let p = make_project("IT-01", "Edificio Degrado");
        assert_eq!(p.folder_name(), "IT-01_edificio-degrado");
    }

    #[test]
    fn folder_name_empty_name() {
        let p = make_project("C-001", "");
        assert_eq!(p.folder_name(), "C-001_");
    }

    #[test]
    fn folder_name_multiple_spaces() {
        let p = make_project("C-001", "a  b  c");
        assert_eq!(p.folder_name(), "C-001_a--b--c");
    }

    #[test]
    fn default_phases_count() {
        let phases = default_phases();
        assert_eq!(phases.len(), 3);
    }

    #[test]
    fn default_phases_ids() {
        let phases = default_phases();
        let ids: Vec<&str> = phases.iter().map(|p| p.id.as_str()).collect();
        assert_eq!(ids, vec!["contratto", "esecuzione", "pagamento"]);
    }

    #[test]
    fn default_phases_have_empty_files() {
        let phases = default_phases();
        for phase in &phases {
            assert!(phase.files.is_empty());
        }
    }

    #[test]
    fn project_status_display() {
        assert_eq!(ProjectStatus::Bozza.to_string(), "Bozza");
        assert_eq!(ProjectStatus::InCorso.to_string(), "In Corso");
        assert_eq!(ProjectStatus::Sospeso.to_string(), "Sospeso");
        assert_eq!(ProjectStatus::Completato.to_string(), "Completato");
        assert_eq!(ProjectStatus::Archiviato.to_string(), "Archiviato");
    }

    #[test]
    fn project_status_serde_roundtrip() {
        let statuses = vec![
            ProjectStatus::Bozza,
            ProjectStatus::InCorso,
            ProjectStatus::Sospeso,
            ProjectStatus::Completato,
            ProjectStatus::Archiviato,
        ];
        for status in statuses {
            let json = serde_json::to_value(&status).unwrap();
            let deserialized: ProjectStatus = serde_json::from_value(json.clone()).unwrap();
            assert_eq!(status, deserialized);
        }
    }

    #[test]
    fn project_status_serde_values() {
        assert_eq!(serde_json::to_value(&ProjectStatus::Bozza).unwrap(), "bozza");
        assert_eq!(serde_json::to_value(&ProjectStatus::InCorso).unwrap(), "in_corso");
        assert_eq!(serde_json::to_value(&ProjectStatus::Sospeso).unwrap(), "sospeso");
        assert_eq!(serde_json::to_value(&ProjectStatus::Completato).unwrap(), "completato");
        assert_eq!(serde_json::to_value(&ProjectStatus::Archiviato).unwrap(), "archiviato");
    }
}
