// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const CONFIG_DIR: &str = ".archivio";
const CONFIG_FILE: &str = "config.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub archive_root: Option<PathBuf>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self { archive_root: None }
    }
}

impl AppConfig {
    fn config_path() -> Option<PathBuf> {
        dirs::home_dir().map(|home| home.join(CONFIG_DIR).join(CONFIG_FILE))
    }

    pub fn load() -> Self {
        if let Some(path) = Self::config_path() {
            if let Ok(data) = fs::read_to_string(&path) {
                if let Ok(config) = serde_json::from_str(&data) {
                    return config;
                }
            }
        }
        Self::default()
    }

    pub fn save(&self) -> std::io::Result<()> {
        if let Some(path) = Self::config_path() {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }
            let json = serde_json::to_string_pretty(self)?;
            fs::write(path, json)?;
        }
        Ok(())
    }

    pub fn archive_root_or_default(&self) -> PathBuf {
        self.archive_root
            .clone()
            .unwrap_or_else(|| default_archive_root())
    }
}

pub fn default_archive_root() -> PathBuf {
    dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Archivio")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_has_no_root() {
        let config = AppConfig::default();
        assert!(config.archive_root.is_none());
    }

    #[test]
    fn archive_root_or_default_uses_default_when_none() {
        let config = AppConfig::default();
        let expected = default_archive_root();
        assert_eq!(config.archive_root_or_default(), expected);
    }

    #[test]
    fn archive_root_or_default_uses_custom_when_set() {
        let config = AppConfig {
            archive_root: Some(PathBuf::from("/custom/path")),
        };
        assert_eq!(config.archive_root_or_default(), PathBuf::from("/custom/path"));
    }

    #[test]
    fn save_and_load_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");

        let config = AppConfig {
            archive_root: Some(PathBuf::from("/test/archive")),
        };
        let json = serde_json::to_string_pretty(&config).unwrap();
        fs::write(&path, json).unwrap();

        let data = fs::read_to_string(&path).unwrap();
        let loaded: AppConfig = serde_json::from_str(&data).unwrap();
        assert_eq!(
            loaded.archive_root,
            Some(PathBuf::from("/test/archive"))
        );
    }
}
