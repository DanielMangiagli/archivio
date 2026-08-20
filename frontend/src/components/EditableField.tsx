import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n';
import DatePicker from './DatePicker';

export interface SelectOption {
  value: string;
  label: string;
}

interface EditableFieldProps {
  value: any;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea';
  onSelectOptions?: SelectOption[];
  formatDisplay?: (value: any) => string;
  onSave: (value: any) => void;
}

export default function EditableField({
  value,
  type,
  onSelectOptions,
  formatDisplay,
  onSave,
}: EditableFieldProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (type === 'number') {
      const num = draft === '' || draft === null ? null : parseFloat(draft);
      onSave(num);
    } else {
      onSave(draft || null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setDraft(value ?? '');
      setEditing(false);
    }
  };

  const displayValue = formatDisplay ? formatDisplay(value) : (value ?? '–');

  if (!editing) {
    return (
      <div className="editable-cell" onClick={() => setEditing(true)}>
        <span>{displayValue}</span>
        <svg className="edit-pencil" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </div>
    );
  }

  if (type === 'select' && onSelectOptions) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        className="inline-editor"
        value={draft ?? ''}
        onChange={(e) => {
          setDraft(e.target.value);
          onSave(e.target.value || null);
          setEditing(false);
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      >
        {onSelectOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (type === 'date') {
    return (
      <div className="inline-editor-date">
        <DatePicker
          value={draft ?? ''}
          onChange={(val) => {
            onSave(val || null);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  if (type === 'number') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        step="0.01"
        className="inline-editor"
        value={draft ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        className="inline-editor inline-editor-textarea"
        rows={3}
        value={draft ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      className="inline-editor"
      value={draft ?? ''}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
