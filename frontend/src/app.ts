import { listProjects, getProject, createProject, updateProject, deleteProject, addFile, removeFile, generateIndex, openIndex, scanProject, openFileLocation, pickFiles, getProjectMeta } from './api';
import type { ProjectSummary, Project, FileEntry } from './types';

let currentView: 'dashboard' | 'project' = 'dashboard';
let currentProjectId: string | null = null;
let currentPhase: string = 'contratto';
let searchQuery = '';
let statusFilter = '';
let allProjects: ProjectSummary[] = [];

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function formatAmount(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date + 'T00:00:00').toLocaleDateString('it-IT');
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    bozza: 'Bozza',
    in_corso: 'In Corso',
    sospeso: 'Sospeso',
    completato: 'Completato',
    archiviato: 'Archiviato',
  };
  return labels[status] || status;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---- Dashboard ----

async function loadProjects() {
  allProjects = await listProjects();
  renderProjectGrid();
}

function getFilteredProjects(): ProjectSummary[] {
  return allProjects.filter((p) => {
    const matchSearch =
      !searchQuery ||
      p.code.toLowerCase().includes(searchQuery) ||
      p.name.toLowerCase().includes(searchQuery) ||
      p.client.toLowerCase().includes(searchQuery);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });
}

function renderProjectGrid() {
  const filtered = getFilteredProjects();
  const grid = document.querySelector('.project-grid') as HTMLElement | null;
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="empty">Nessun progetto trovato.</p>';
    return;
  }

  grid.innerHTML = filtered
    .map(
      (p) => `
    <div class="project-card" data-id="${p.id}">
      <div class="card-header">
        <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18"/>
          <path d="M5 21V7l7-4 7 4v14"/>
          <path d="M9 21v-6h6v6"/>
          <path d="M10 9h1"/>
          <path d="M14 9h1"/>
          <path d="M10 13h1"/>
          <path d="M14 13h1"/>
        </svg>
        <span class="card-code">${p.code}</span>
        <span class="status status-${p.status}">${statusLabel(p.status)}</span>
      </div>
      <h3>${p.name}</h3>
      <p class="client">${p.client}</p>
      <div class="card-meta">
        <span>${formatDate(p.contract_date)}</span>
        <span>${formatAmount(p.amount)}</span>
      </div>
      <div class="card-footer">
        <span>${p.file_count} file</span>
        <span>${p.photo_count} foto</span>
      </div>
    </div>
  `
    )
    .join('');

  // Rebind card click handlers
  grid.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      if (id) renderProjectDetail(id);
    });
  });
}

async function renderDashboard() {
  currentView = 'dashboard';
  currentProjectId = null;

  await loadProjects();

  const app = $('app');
  app.innerHTML = `
    <div class="dashboard">
      <header>
        <h1>Archivio</h1>
        <div class="header-actions">
          <input type="text" id="search" placeholder="Cerca..." value="${searchQuery}" />
          <select id="statusFilter">
            <option value="">Tutti gli stati</option>
            <option value="bozza" ${statusFilter === 'bozza' ? 'selected' : ''}>Bozza</option>
            <option value="in_corso" ${statusFilter === 'in_corso' ? 'selected' : ''}>In Corso</option>
            <option value="sospeso" ${statusFilter === 'sospeso' ? 'selected' : ''}>Sospeso</option>
            <option value="completato" ${statusFilter === 'completato' ? 'selected' : ''}>Completato</option>
            <option value="archiviato" ${statusFilter === 'archiviato' ? 'selected' : ''}>Archiviato</option>
          </select>
          <button id="btnNew" class="btn primary">+ Nuovo Progetto</button>
          <button id="btnIndex" class="btn">Genera Indice</button>
        </div>
      </header>
      <div class="project-grid"></div>
    </div>
  `;

  renderProjectGrid();

  // Bind search — only re-render grid, NOT the header
  $('search').addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
    renderProjectGrid();
  });

  $('statusFilter').addEventListener('change', (e) => {
    statusFilter = (e.target as HTMLSelectElement).value;
    renderProjectGrid();
  });

  $('btnNew').addEventListener('click', showCreateDialog);

  $('btnIndex').addEventListener('click', async () => {
    try {
      await generateIndex();
      await openIndex();
    } catch (e) {
      alert('Errore: ' + e);
    }
  });
}

// ---- Create Project Dialog ----

function showCreateDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="dialog">
      <h2>Nuovo Progetto</h2>
      <form id="createForm">
        <label>Codice <input type="text" id="fCode" required placeholder="C-2024-001" /></label>
        <label>Nome <input type="text" id="fName" required placeholder="Rehabilitation bridge" /></label>
        <label>Committente <input type="text" id="fClient" required placeholder="Municipality of Milan" /></label>
        <label>Descrizione <textarea id="fDesc" rows="3"></textarea></label>
        <label>Data contratto <input type="date" id="fDate" /></label>
        <label>Importo <input type="number" id="fAmount" step="0.01" min="0" /></label>
        <div class="dialog-actions">
          <button type="button" class="btn" id="btnCancel">Annulla</button>
          <button type="submit" class="btn primary">Crea</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#btnCancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#createForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = (document.getElementById('fCode') as HTMLInputElement).value;
    const name = (document.getElementById('fName') as HTMLInputElement).value;
    const client = (document.getElementById('fClient') as HTMLInputElement).value;
    const description = (document.getElementById('fDesc') as HTMLTextAreaElement).value;
    const contract_date = (document.getElementById('fDate') as HTMLInputElement).value || undefined;
    const amountStr = (document.getElementById('fAmount') as HTMLInputElement).value;
    const amount = amountStr ? parseFloat(amountStr) : undefined;

    await createProject({ code, name, client, description, contract_date, amount });
    overlay.remove();
    renderDashboard();
  });
}

// ---- Project Detail ----

function sortFiles(files: FileEntry[]): FileEntry[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

async function renderProjectDetail(id: string) {
  currentView = 'project';
  currentProjectId = id;

  const project = await getProject(id);
  const phase = project.phases.find((p) => p.id === currentPhase) || project.phases[0];
  currentPhase = phase.id;

  const sortedFiles = sortFiles(phase.files);

  let html = `
    <div class="project-detail">
      <header>
        <button id="btnBack" class="btn">← Indietro</button>
        <h1>${project.code} — ${project.name}</h1>
        <div class="header-actions">
          <button id="btnEdit" class="btn">Modifica</button>
          <button id="btnDelete" class="btn danger">Elimina</button>
        </div>
      </header>

      <div class="project-info">
        <div class="info-row">
          <span class="info-label">Committente</span>
          <span>${project.client}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Data contratto</span>
          <span>${formatDate(project.contract_date)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Importo</span>
          <span>${formatAmount(project.amount)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Stato</span>
          <span class="status status-${project.status}">${statusLabel(project.status)}</span>
        </div>
        ${project.description ? `<div class="info-row"><span class="info-label">Descrizione</span><span>${project.description}</span></div>` : ''}
        ${project.notes ? `<div class="info-row"><span class="info-label">Note</span><span>${project.notes}</span></div>` : ''}
        ${project.tags.length > 0 ? `<div class="info-row"><span class="info-label">Tag</span><span>${project.tags.map((t) => `<span class="tag">${t}</span>`).join(' ')}</span></div>` : ''}
      </div>

      <div class="tabs">
        ${project.phases.map((p) => `
          <button class="tab ${p.id === currentPhase ? 'active' : ''}" data-phase="${p.id}">
            ${p.label} (${p.files.length})
          </button>
        `).join('')}
      </div>

      <div class="phase-content" id="phaseContent">
        <div class="phase-toolbar">
          <button id="btnSync" class="btn">Sincronizza Cartella</button>
          <button id="btnAddFile" class="btn primary">+ Aggiungi File</button>
        </div>
        <div class="file-list" id="fileList">
          ${renderFileList(sortedFiles)}
        </div>
      </div>
    </div>
  `;

  $('app').innerHTML = html;

  // Bind events
  $('btnBack').addEventListener('click', () => renderDashboard());
  $('btnEdit').addEventListener('click', () => showEditDialog(project));

  $('btnDelete').addEventListener('click', async () => {
    if (confirm('Eliminare questo progetto?')) {
      await deleteProject(id);
      renderDashboard();
    }
  });

  // Sync button: re-scan the folder and refresh
  $('btnSync').addEventListener('click', async () => {
    const synced = await scanProject(id);
    const newPhase = synced.phases.find((p) => p.id === currentPhase) || synced.phases[0];
    currentPhase = newPhase.id;
    const sorted = sortFiles(newPhase.files);
    $('fileList').innerHTML = renderFileList(sorted);
    synced.phases.forEach((p) => {
      const tab = document.querySelector(`.tab[data-phase="${p.id}"]`);
      if (tab) tab.textContent = `${p.label} (${p.files.length})`;
    });
  });

  // File picker via Rust native dialog
  $('btnAddFile').addEventListener('click', async () => {
    try {
      const filePaths = await pickFiles();
      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          await addFile(id, currentPhase, filePath);
        }
        // After adding, scan to pick up thumbnails/exif, then refresh
        const refreshed = await scanProject(id);
        const newPhase = refreshed.phases.find((p) => p.id === currentPhase) || refreshed.phases[0];
        currentPhase = newPhase.id;
        $('fileList').innerHTML = renderFileList(sortFiles(newPhase.files));
        refreshed.phases.forEach((p) => {
          const tab = document.querySelector(`.tab[data-phase="${p.id}"]`);
          if (tab) tab.textContent = `${p.label} (${p.files.length})`;
        });
      }
    } catch (e) {
      console.error('Failed to pick files:', e);
    }
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentPhase = tab.getAttribute('data-phase')!;
      renderProjectDetail(id);
    });
  });

  document.querySelectorAll('.btn-remove-file').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const filePath = btn.getAttribute('data-file-path');
      if (!filePath) return;
      try {
        await removeFile(id, currentPhase, filePath);
        // Reload from metadata only (no rescan) so deleted files stay gone
        const project = await getProjectMeta(id);
        const phase = project.phases.find((p) => p.id === currentPhase) || project.phases[0];
        currentPhase = phase.id;
        $('fileList').innerHTML = renderFileList(sortFiles(phase.files));
        project.phases.forEach((p) => {
          const tab = document.querySelector(`.tab[data-phase="${p.id}"]`);
          if (tab) tab.textContent = `${p.label} (${p.files.length})`;
        });
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Errore eliminazione: ' + err);
      }
    });
  });

  // Click on file name → open containing folder
  document.querySelectorAll('.file-name').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const filePath = el.getAttribute('data-file-path');
      if (filePath) {
        await openFileLocation(id, filePath);
      }
    });
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderFileList(files: FileEntry[]): string {
  if (files.length === 0) {
    return '<p class="empty">Nessun file in questa fase.</p>';
  }

  return files
    .map(
      (f) => `
    <div class="file-item">
      <div class="file-icon">${fileIcon(f.mime_type)}</div>
      <div class="file-info">
        <span class="file-name" data-file-path="${escapeAttr(f.path)}" title="Clicca per aprire la cartella">${f.name}</span>
        <span class="file-meta">${formatSize(f.size)} ${f.mime_type ? `· ${f.mime_type}` : ''}</span>
        ${
          f.photo_metadata?.date_taken
            ? `<span class="file-meta">Scattata: ${formatDate(f.photo_metadata.date_taken)}</span>`
            : ''
        }
      </div>
      <button class="btn-remove-file btn danger small" data-file-path="${escapeAttr(f.path)}" title="Elimina">×</button>
    </div>
  `
    )
    .join('');
}

function fileIcon(mime: string | null): string {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('word') || mime.includes('document')) return '📘';
  if (mime.includes('excel') || mime.includes('sheet')) return '📗';
  if (mime.includes('zip')) return '📦';
  return '📄';
}

// ---- Edit Dialog ----

function showEditDialog(project: Project) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="dialog">
      <h2>Modifica Progetto</h2>
      <form id="editForm">
        <label>Codice <input type="text" id="eCode" value="${project.code}" required /></label>
        <label>Nome <input type="text" id="eName" value="${project.name}" required /></label>
        <label>Committente <input type="text" id="eClient" value="${project.client}" required /></label>
        <label>Descrizione <textarea id="eDesc" rows="3">${project.description}</textarea></label>
        <label>Data contratto <input type="date" id="eDate" value="${project.contract_date || ''}" /></label>
        <label>Data completamento <input type="date" id="eCompDate" value="${project.completion_date || ''}" /></label>
        <label>Importo <input type="number" id="eAmount" step="0.01" min="0" value="${project.amount || ''}" /></label>
        <label>Stato
          <select id="eStatus">
            <option value="bozza" ${project.status === 'bozza' ? 'selected' : ''}>Bozza</option>
            <option value="in_corso" ${project.status === 'in_corso' ? 'selected' : ''}>In Corso</option>
            <option value="sospeso" ${project.status === 'sospeso' ? 'selected' : ''}>Sospeso</option>
            <option value="completato" ${project.status === 'completato' ? 'selected' : ''}>Completato</option>
            <option value="archiviato" ${project.status === 'archiviato' ? 'selected' : ''}>Archiviato</option>
          </select>
        </label>
        <label>Note <textarea id="eNotes" rows="3">${project.notes}</textarea></label>
        <div class="dialog-actions">
          <button type="button" class="btn" id="btnCancelEdit">Annulla</button>
          <button type="submit" class="btn primary">Salva</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#btnCancelEdit')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#editForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateProject(project.id, {
      code: (document.getElementById('eCode') as HTMLInputElement).value,
      name: (document.getElementById('eName') as HTMLInputElement).value,
      client: (document.getElementById('eClient') as HTMLInputElement).value,
      description: (document.getElementById('eDesc') as HTMLTextAreaElement).value,
      contract_date: (document.getElementById('eDate') as HTMLInputElement).value || undefined,
      completion_date: (document.getElementById('eCompDate') as HTMLInputElement).value || undefined,
      amount: (document.getElementById('eAmount') as HTMLInputElement).value
        ? parseFloat((document.getElementById('eAmount') as HTMLInputElement).value)
        : undefined,
      status: (document.getElementById('eStatus') as HTMLSelectElement).value,
      notes: (document.getElementById('eNotes') as HTMLTextAreaElement).value,
    });
    overlay.remove();
    renderProjectDetail(project.id);
  });
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
});
