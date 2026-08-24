// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::error::AppResult;
use crate::models::Category;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub language: String,
    #[serde(default)]
    pub categories: Vec<Category>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "it".to_string(),
            categories: Vec::new(),
        }
    }
}

impl Settings {
    pub fn load(settings_path: &Path) -> Self {
        if settings_path.exists() {
            if let Ok(data) = fs::read_to_string(settings_path) {
                if let Ok(settings) = serde_json::from_str(&data) {
                    return settings;
                }
            }
        }
        Self::default()
    }

    pub fn save(&self, settings_path: &Path) -> AppResult<()> {
        let json = serde_json::to_string_pretty(self)?;
        fs::write(settings_path, json)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_language_is_italian() {
        let s = Settings::default();
        assert_eq!(s.language, "it");
    }

    #[test]
    fn save_and_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");

        let settings = Settings {
            language: "en".to_string(),
            categories: vec![],
        };
        settings.save(&path).unwrap();

        let loaded = Settings::load(&path);
        assert_eq!(loaded.language, "en");
        assert!(loaded.categories.is_empty());
    }

    #[test]
    fn load_missing_file_returns_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nonexistent.json");

        let loaded = Settings::load(&path);
        assert_eq!(loaded.language, "it");
    }

    #[test]
    fn load_corrupt_file_returns_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(&path, "not valid json!!!").unwrap();

        let loaded = Settings::load(&path);
        assert_eq!(loaded.language, "it");
    }

    #[test]
    fn save_creates_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");

        let settings = Settings::default();
        settings.save(&path).unwrap();

        assert!(path.exists());
        let loaded = Settings::load(&path);
        assert_eq!(loaded.language, "it");
    }
}
