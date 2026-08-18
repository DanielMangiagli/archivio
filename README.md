# Archivio

Desktop application for managing and archiving civil engineering projects. Built with [Tauri 2](https://v2.tauri.app/) (Rust + TypeScript).

## Features

- **Project dashboard** — grid view with search and status filtering
- **Project phases** — Contratto, Esecuzione, Pagamento, each with its own folder structure
- **File management** — add, remove, and sync files per phase
- **Photo support** — EXIF extraction (camera, date, GPS) and automatic thumbnail generation
- **HTML index** — generates a searchable, filterable HTML table of all projects
- **Folder sync** — detect files added directly to the project folder on disk
- **Click to open** — click a file name to reveal it in the system file manager
- **Cross-platform** — runs on Windows, macOS, and Linux

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (stable)
- Platform-specific dependencies for Tauri — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Install frontend dependencies
cd frontend && npm install

# Run in development mode
cd ../src-tauri && cargo tauri dev

# Or from the project root (after adding root package.json)
npm install
npm run dev
```

## Building

```bash
# Development build
cargo tauri dev

# Production build (creates installer in src-tauri/target/release/bundle/)
cargo tauri build
```

The build output depends on your platform:
- **macOS**: `.dmg` and `.app` in `src-tauri/target/release/bundle/dmg/`
- **Windows**: `.msi` and `.exe` in `src-tauri/target/release/bundle/msi/` and `nsis/`
- **Linux**: `.deb` and `.AppImage` in `src-tauri/target/release/bundle/`

## Windows Installer (CI)

A GitHub Actions workflow automatically builds a Windows installer when you push a version tag:

```bash
git tag v1.0.0
git push --tags
```

The `.msi` and `.exe` installers will be available in the GitHub Releases page.

## Project Structure

```
archivio/
├── frontend/                 # TypeScript + Vite frontend
│   ├── src/
│   │   ├── app.ts            # UI logic
│   │   ├── api.ts            # Tauri IPC bridge
│   │   └── types.ts          # TypeScript types
│   ├── style.css
│   └── package.json
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── main.rs           # App entry, Tauri setup
│   │   ├── commands.rs       # Tauri command handlers
│   │   ├── storage.rs        # File system, EXIF, thumbnails
│   │   ├── indexer.rs        # HTML index generation
│   │   ├── models.rs         # Data models
│   │   └── error.rs          # Error types
│   ├── tauri.conf.json
│   └── Cargo.toml
├── .github/workflows/
│   └── build-windows.yml     # CI: builds Windows installer
└── package.json              # Root scripts (dev, build)
```

## Data Storage

Projects are stored in `~/Documents/Archivio/` by default:

```
Archivio/
├── index.html                # Generated HTML index
└── projects/
    ├── C-2024-001_rehabilitation-bridge/
    │   ├── metadata.json     # Project metadata
    │   ├── contratto/
    │   ├── esecuzione/
    │   │   ├── relazioni/
    │   │   ├── foto/originals/
    │   │   ├── foto/thumb/
    │   │   └── documenti/
    │   └── pagamento/
    │       ├── fatture/
    │       └── certificati/
    └── ...
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| Backend | Rust |
| Frontend | TypeScript, Vite |
| Photo processing | `image`, `kamadak-exif` |
| File system | `walkdir`, `std::fs` |

## License

MIT
