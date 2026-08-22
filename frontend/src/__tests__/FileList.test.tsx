import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileList from '../components/FileList';
import { I18nProvider } from '../i18n';
import type { FileEntry } from '../types';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

function makeFile(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name: 'test.pdf',
    path: 'projects/C-001_bridge/contratto/test.pdf',
    size: 1024,
    mime_type: 'application/pdf',
    created_at: null,
    photo_metadata: null,
    ...overrides,
  };
}

describe('FileList', () => {
  it('shows empty state when no files', () => {
    renderWithI18n(
      <FileList
        files={[]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={() => {}}
      />
    );
    expect(screen.getByText('Nessun file in questa fase.')).toBeInTheDocument();
  });

  it('renders file name', () => {
    renderWithI18n(
      <FileList
        files={[makeFile()]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={() => {}}
      />
    );
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('renders file size', () => {
    renderWithI18n(
      <FileList
        files={[makeFile({ size: 2048 })]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={() => {}}
      />
    );
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });

  it('renders MIME type', () => {
    renderWithI18n(
      <FileList
        files={[makeFile({ mime_type: 'image/jpeg' })]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={() => {}}
      />
    );
    expect(screen.getByText(/image\/jpeg/)).toBeInTheDocument();
  });

  it('calls onRemoveFile when delete button clicked', () => {
    const onRemove = vi.fn();
    renderWithI18n(
      <FileList
        files={[makeFile()]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={onRemove}
        onOpenFile={() => {}}
      />
    );
    fireEvent.click(screen.getByText('×'));
    expect(onRemove).toHaveBeenCalledWith('projects/C-001_bridge/contratto/test.pdf');
  });

  it('calls onOpenFile when file name clicked', () => {
    const onOpen = vi.fn();
    renderWithI18n(
      <FileList
        files={[makeFile()]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={onOpen}
      />
    );
    fireEvent.click(screen.getByText('test.pdf'));
    expect(onOpen).toHaveBeenCalledWith('projects/C-001_bridge/contratto/test.pdf');
  });

  it('renders multiple files sorted alphabetically', () => {
    const files = [
      makeFile({ name: 'zebra.txt', path: 'zebra.txt' }),
      makeFile({ name: 'alpha.txt', path: 'alpha.txt' }),
      makeFile({ name: 'middle.txt', path: 'middle.txt' }),
    ];
    renderWithI18n(
      <FileList
        files={files}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={() => {}}
      />
    );
    const names = screen.getAllByText(/\.txt$/).map((el) => el.textContent);
    expect(names).toEqual(['alpha.txt', 'middle.txt', 'zebra.txt']);
  });

  it('shows file icon based on mime type', () => {
    renderWithI18n(
      <FileList
        files={[makeFile({ mime_type: 'application/pdf' })]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={() => {}}
      />
    );
    const icons = document.querySelectorAll('.file-icon');
    expect(icons.length).toBe(1);
    expect(icons[0].textContent).toContain('\u{1F4D5}');
  });

  it('shows no mime info when mime_type is null', () => {
    renderWithI18n(
      <FileList
        files={[makeFile({ mime_type: null })]}
        projectId="p1"
        phaseId="contratto"
        onRemoveFile={() => {}}
        onOpenFile={() => {}}
      />
    );
    const meta = document.querySelector('.file-meta');
    expect(meta?.textContent).not.toContain('·');
  });
});
