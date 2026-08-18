export interface PhotoMetadata {
  width: number | null;
  height: number | null;
  camera_make: string | null;
  camera_model: string | null;
  date_taken: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  has_thumbnail: boolean;
  thumbnail_path: string | null;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  mime_type: string | null;
  created_at: string | null;
  photo_metadata: PhotoMetadata | null;
}

export interface Phase {
  id: string;
  label: string;
  folder_name: string;
  files: FileEntry[];
}

export type ProjectStatus =
  | 'bozza'
  | 'in_corso'
  | 'sospeso'
  | 'completato'
  | 'archiviato';

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  contract_date: string | null;
  completion_date: string | null;
  amount: number | null;
  status: ProjectStatus;
  phases: Phase[];
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  client: string;
  status: ProjectStatus;
  contract_date: string | null;
  amount: number | null;
  file_count: number;
  photo_count: number;
}
