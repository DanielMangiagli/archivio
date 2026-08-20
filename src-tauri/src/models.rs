// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
    pub status: ProjectStatus,
    pub phases: Vec<Phase>,
    pub tags: Vec<String>,
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
    pub amount: Option<f64>,
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
