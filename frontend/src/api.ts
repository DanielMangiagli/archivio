import { invoke } from '@tauri-apps/api/core';
import type { Project, ProjectSummary, FileEntry } from './types';

export async function listProjects(): Promise<ProjectSummary[]> {
  return invoke('list_projects');
}

export async function getProject(id: string): Promise<Project> {
  return invoke('get_project', { id });
}

export async function createProject(params: {
  code: string;
  name: string;
  client: string;
  description?: string;
  contract_date?: string;
  amount?: number;
  tags?: string[];
}): Promise<Project> {
  return invoke('create_project', params);
}

export async function updateProject(
  id: string,
  params: {
    code?: string;
    name?: string;
    client?: string;
    description?: string;
    contract_date?: string;
    completion_date?: string;
    amount?: number;
    status?: string;
    tags?: string[];
    notes?: string;
  }
): Promise<Project> {
  return invoke('update_project', { id, ...params });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke('delete_project', { id });
}

export async function addFile(
  projectId: string,
  phaseId: string,
  filePath: string
): Promise<FileEntry> {
  return invoke('add_file', { projectId, phaseId, filePath });
}

export async function removeFile(
  projectId: string,
  phaseId: string,
  fileName: string
): Promise<void> {
  return invoke('remove_file', { projectId, phaseId, fileName });
}

export async function listFiles(
  projectId: string,
  phaseId: string
): Promise<FileEntry[]> {
  return invoke('list_files', { projectId, phaseId });
}

export async function generateIndex(): Promise<string> {
  return invoke('generate_index');
}

export async function getIndexHtml(): Promise<string> {
  return invoke('get_index_html');
}

export async function getArchiveRoot(): Promise<string> {
  return invoke('get_archive_root');
}
