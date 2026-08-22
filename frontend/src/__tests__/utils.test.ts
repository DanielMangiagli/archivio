import { describe, it, expect } from 'vitest';
import {
  formatSize,
  fileIcon,
  formatAmount,
  formatDate,
  dateRangeFilter,
} from '../utils';

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(1048575)).toBe('1024.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatSize(1048576)).toBe('1.0 MB');
    expect(formatSize(5242880)).toBe('5.0 MB');
    expect(formatSize(1572864)).toBe('1.5 MB');
  });
});

describe('fileIcon', () => {
  it('returns file icon for null mime', () => {
    expect(fileIcon(null)).toBe('\u{1F4C4}');
  });

  it('returns image icon for image types', () => {
    expect(fileIcon('image/jpeg')).toBe('\u{1F5BC}');
    expect(fileIcon('image/png')).toBe('\u{1F5BC}');
    expect(fileIcon('image/gif')).toBe('\u{1F5BC}');
  });

  it('returns PDF icon', () => {
    expect(fileIcon('application/pdf')).toBe('\u{1F4D5}');
  });

  it('returns document icon for Word types', () => {
    expect(fileIcon('application/msword')).toBe('\u{1F4D8}');
    expect(fileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('\u{1F4D8}');
  });

  it('returns spreadsheet icon for Excel types', () => {
    expect(fileIcon('application/vnd.ms-excel')).toBe('\u{1F4D7}');
  });

  it('returns package icon for zip', () => {
    expect(fileIcon('application/zip')).toBe('\u{1F4E6}');
  });

  it('returns default file icon for unknown types', () => {
    expect(fileIcon('text/plain')).toBe('\u{1F4C4}');
    expect(fileIcon('application/dxf')).toBe('\u{1F4C4}');
  });
});

describe('formatAmount', () => {
  it('returns dash for null', () => {
    expect(formatAmount(null)).toBe('-');
  });

  it('formats zero', () => {
    const result = formatAmount(0);
    expect(result).toContain('0');
  });

  it('formats positive amount in EUR', () => {
    const result = formatAmount(1234.56);
    expect(result).toContain('1234');
    expect(result).toContain('56');
    expect(result).toContain('€');
  });

  it('formats large amount', () => {
    const result = formatAmount(100000);
    expect(result).toContain('100');
    expect(result).toContain('000');
  });
});

describe('formatDate', () => {
  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('formats a date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('15/01/2024');
  });

  it('formats end of year', () => {
    const result = formatDate('2024-12-31');
    expect(result).toBe('31/12/2024');
  });

  it('formats single digit day/month', () => {
    const result = formatDate('2024-03-05');
    expect(result).toBe('05/03/2024');
  });
});

describe('dateRangeFilter', () => {
  it('returns false for null date', () => {
    expect(dateRangeFilter(null, { from: '2024-01-01', to: '2024-12-31' })).toBe(false);
  });

  it('returns true when no filter', () => {
    expect(dateRangeFilter('2024-06-15', undefined)).toBe(true);
  });

  it('filters by from date', () => {
    expect(dateRangeFilter('2024-06-15', { from: '2024-07-01' })).toBe(false);
    expect(dateRangeFilter('2024-06-15', { from: '2024-06-01' })).toBe(true);
  });

  it('filters by to date', () => {
    expect(dateRangeFilter('2024-06-15', { to: '2024-06-01' })).toBe(false);
    expect(dateRangeFilter('2024-06-15', { to: '2024-06-30' })).toBe(true);
  });

  it('filters by from and to range', () => {
    expect(dateRangeFilter('2024-06-15', { from: '2024-06-01', to: '2024-06-30' })).toBe(true);
    expect(dateRangeFilter('2024-06-15', { from: '2024-07-01', to: '2024-12-31' })).toBe(false);
    expect(dateRangeFilter('2024-06-15', { from: '2024-01-01', to: '2024-05-31' })).toBe(false);
  });

  it('empty filter object passes', () => {
    expect(dateRangeFilter('2024-06-15', {})).toBe(true);
  });
});
