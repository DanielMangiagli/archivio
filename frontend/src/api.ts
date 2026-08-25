// Copyright 2024 Daniele Mangiagli
// Licensed under the Apache License, Version 2.0
// See LICENSE file in the project root for full license information.

import { invoke } from '@tauri-apps/api/core';
import type { Project, ProjectSummary, FileEntry, Category, Settings, FolderTemplate } from './types';

export async function listProjects(): Promise<ProjectSummary[]> {
  return invoke('list_projects');
}

export async function getProject(id: string): Promise<Project> {
  return invoke('get_project', { id });
}

export async function createProject(params: {
  code?: string;
  name: string;
  client: string;
  description?: string;
  contract_date?: string;
  amount?: number;
  amount_paid?: number;
  tags?: string[];
  category_id?: string;
}): Promise<Project> {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined)
  );
  console.log('API createProject invoking with:', cleanParams);
  const result = await invoke<Project>('create_project', { request: cleanParams });
  console.log('API createProject response:', result);
  return result;
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
    amount_paid?: number;
    status?: string;
    tags?: string[];
    notes?: string;
  }
): Promise<Project> {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined)
  );
  return invoke('update_project', { id, request: cleanParams });
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
  filePath: string
): Promise<void> {
  return invoke('remove_file', { projectId, phaseId, filePath });
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

export async function openIndex(): Promise<void> {
  return invoke('open_index');
}

export async function getIndexHtml(): Promise<string> {
  return invoke('get_index_html');
}

export async function getArchiveRoot(): Promise<string> {
  return invoke('get_archive_root');
}

export async function scanProject(id: string): Promise<Project> {
  return invoke('scan_project', { id });
}

export async function scanAllProjects(): Promise<ProjectSummary[]> {
  return invoke('scan_all_projects');
}

export async function openFileLocation(
  projectId: string,
  filePath: string
): Promise<void> {
  return invoke('open_file_location', { projectId, filePath });
}

export async function pickFiles(): Promise<string[]> {
  return invoke('pick_files');
}

export async function getProjectMeta(id: string): Promise<Project> {
  return invoke('get_project_meta', { id });
}

export async function getSettings(): Promise<Settings> {
  return invoke('get_settings');
}

export async function saveSettings(params: {
  language?: string;
}): Promise<Settings> {
  return invoke('save_settings', params);
}

export async function listCategories(): Promise<Category[]> {
  return invoke('list_categories');
}

export async function addCategory(name: string, prefix: string): Promise<Category> {
  return invoke('add_category', { name, prefix });
}

export async function updateCategory(
  id: string,
  params: { name?: string; prefix?: string }
): Promise<Category> {
  return invoke('update_category', { id, ...params });
}

export async function deleteCategory(id: string): Promise<void> {
  return invoke('delete_category', { id });
}

export async function getNextCodePreview(categoryId: string): Promise<string> {
  return invoke('get_next_code_preview', { categoryId });
}

export async function getFolderTemplate(): Promise<FolderTemplate> {
  return invoke('get_folder_template');
}

export async function saveFolderTemplate(template: FolderTemplate): Promise<FolderTemplate> {
  return invoke('save_folder_template', { template });
}
