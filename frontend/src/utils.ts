export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function fileIcon(mime: string | null): string {
  if (!mime) return '\u{1F4C4}';
  if (mime.startsWith('image/')) return '\u{1F5BC}';
  if (mime === 'application/pdf') return '\u{1F4D5}';
  if (mime.includes('word') || mime.includes('document')) return '\u{1F4D8}';
  if (mime.includes('excel') || mime.includes('sheet')) return '\u{1F4D7}';
  if (mime.includes('zip')) return '\u{1F4E6}';
  return '\u{1F4C4}';
}

export function formatAmount(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date + 'T00:00:00').toLocaleDateString('it-IT');
}

export function dateRangeFilter(
  date: string | null,
  filterValue: { from?: string; to?: string } | undefined
): boolean {
  if (!date) return false;
  if (!filterValue) return true;
  const { from, to } = filterValue;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
