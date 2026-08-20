import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n';

const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_IT = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];
const DAYS_EN = ['Mo','Tu','We','Th','Fr','Sa','Su'];

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const months = lang === 'en' ? MONTHS_EN : MONTHS_IT;
  const days = lang === 'en' ? DAYS_EN : DAYS_IT;

  const toStr = useCallback((d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const formatDisplay = useCallback((d: Date): string => {
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }, [months]);

  const selectedDate = value ? (() => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  })() : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const firstDay = new Date(y, m, 1);
  let startDay = firstDay.getDay();
  if (startDay === 0) startDay = 7;
  startDay--;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();

  const dayButtons: React.ReactNode[] = [];
  for (let i = 0; i < startDay; i++) {
    dayButtons.push(<span key={`empty-${i}`} className="dp-day dp-empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const dateStr = toStr(date);
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const classes = ['dp-day'];
    if (isToday) classes.push('dp-today-marker');
    if (isSelected) classes.push('dp-selected');
    dayButtons.push(
      <button
        key={d}
        className={classes.join(' ')}
        type="button"
        onClick={() => {
          console.log('DatePicker selected:', dateStr);
          onChange(dateStr);
          setIsOpen(false);
        }}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="dp" ref={containerRef}>
      <button
        className="dp-input"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className={`dp-input-text ${selectedDate ? 'dp-has-value' : ''}`}>
          {selectedDate ? formatDisplay(selectedDate) : (lang === 'en' ? 'Select date' : 'Seleziona data')}
        </span>
      </button>
      {isOpen && (
        <div className="dp-dropdown dp-open">
          <div className="dp-header">
            <button
              className="dp-nav"
              type="button"
              onClick={() => setCurrentDate(new Date(y, m - 1))}
            >
              &lsaquo;
            </button>
            <span className="dp-title">{months[m]} {y}</span>
            <button
              className="dp-nav"
              type="button"
              onClick={() => setCurrentDate(new Date(y, m + 1))}
            >
              &rsaquo;
            </button>
          </div>
          <div className="dp-days-header">
            {days.map(d => <span key={d} className="dp-dow">{d}</span>)}
          </div>
          <div className="dp-grid">{dayButtons}</div>
          <div className="dp-footer">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                onChange(toStr(now));
                setIsOpen(false);
              }}
            >
              {lang === 'en' ? 'Today' : 'Oggi'}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              {lang === 'en' ? 'Clear' : 'Pulisci'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
