// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub language: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "it".to_string(),
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
