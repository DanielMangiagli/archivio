import { useI18n } from '../i18n';
import type { FileEntry } from '../types';

interface FileListProps {
  files: FileEntry[];
  projectId: string;
  phaseId: string;
  onRemoveFile: (filePath: string) => void;
  onOpenFile: (filePath: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date + 'T00:00:00').toLocaleDateString('it-IT');
}

function fileIcon(mime: string | null): string {
  if (!mime) return '\u{1F4C4}';
  if (mime.startsWith('image/')) return '\u{1F5BC}';
  if (mime === 'application/pdf') return '\u{1F4D5}';
  if (mime.includes('word') || mime.includes('document')) return '\u{1F4D8}';
  if (mime.includes('excel') || mime.includes('sheet')) return '\u{1F4D7}';
  if (mime.includes('zip')) return '\u{1F4E6}';
  return '\u{1F4C4}';
}

function sortFiles(files: FileEntry[]): FileEntry[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export default function FileList({ files, onRemoveFile, onOpenFile }: FileListProps) {
  const { t } = useI18n();
  const sorted = sortFiles(files);

  if (sorted.length === 0) {
    return <p className="empty">{t('no_files')}</p>;
  }

  return (
    <div className="file-list">
      {sorted.map((f) => (
        <div key={f.path} className="file-item">
          <div className="file-icon">{fileIcon(f.mime_type)}</div>
          <div className="file-info">
            <span
              className="file-name"
              title={t('click_to_open_folder')}
              onClick={(e) => {
                e.stopPropagation();
                onOpenFile(f.path);
              }}
            >
              {f.name}
            </span>
            <span className="file-meta">
              {formatSize(f.size)} {f.mime_type ? `\u00B7 ${f.mime_type}` : ''}
            </span>
            {f.photo_metadata?.date_taken && (
              <span className="file-meta">{formatDate(f.photo_metadata.date_taken)}</span>
            )}
          </div>
          <button
            className="btn-remove-file btn danger small"
            title={t('delete_file_title')}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFile(f.path);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
