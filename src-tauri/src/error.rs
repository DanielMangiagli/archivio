// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Project not found: {0}")]
    ProjectNotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Image error: {0}")]
    Image(String),

    #[error("File already exists: {0}")]
    FileAlreadyExists(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_io_error() {
        let err = AppError::Io(std::io::Error::new(std::io::ErrorKind::NotFound, "file missing"));
        assert!(err.to_string().contains("file missing"));
    }

    #[test]
    fn display_project_not_found() {
        let err = AppError::ProjectNotFound("abc-123".into());
        assert_eq!(err.to_string(), "Project not found: abc-123");
    }

    #[test]
    fn display_invalid_path() {
        let err = AppError::InvalidPath("bad path".into());
        assert_eq!(err.to_string(), "Invalid path: bad path");
    }

    #[test]
    fn display_image_error() {
        let err = AppError::Image("decode failed".into());
        assert_eq!(err.to_string(), "Image error: decode failed");
    }

    #[test]
    fn display_file_already_exists() {
        let err = AppError::FileAlreadyExists("test.pdf".into());
        assert_eq!(err.to_string(), "File already exists: test.pdf");
    }

    #[test]
    fn serialize_produces_string() {
        let err = AppError::ProjectNotFound("x".into());
        let json = serde_json::to_value(&err).unwrap();
        assert!(json.is_string());
        assert_eq!(json.as_str().unwrap(), "Project not found: x");
    }

    #[test]
    fn from_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied");
        let app_err: AppError = io_err.into();
        assert!(app_err.to_string().contains("denied"));
    }

    #[test]
    fn from_json_error() {
        let json_err = serde_json::from_str::<serde_json::Value>("invalid").unwrap_err();
        let app_err: AppError = json_err.into();
        assert!(app_err.to_string().contains("JSON error"));
    }
}
