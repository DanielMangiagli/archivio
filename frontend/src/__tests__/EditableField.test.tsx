import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditableField from '../components/EditableField';
import { I18nProvider } from '../i18n';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('EditableField', () => {
  describe('display mode', () => {
    it('shows formatted value', () => {
      renderWithI18n(
        <EditableField
          value="hello"
          type="text"
          formatDisplay={(v) => `prefix-${v}`}
          onSave={() => {}}
        />
      );
      expect(screen.getByText('prefix-hello')).toBeInTheDocument();
    });

    it('shows dash for null value', () => {
      renderWithI18n(
        <EditableField value={null} type="text" onSave={() => {}} />
      );
      expect(screen.getByText('–')).toBeInTheDocument();
    });

    it('shows pencil icon', () => {
      renderWithI18n(
        <EditableField value="test" type="text" onSave={() => {}} />
      );
      expect(document.querySelector('.edit-pencil')).toBeInTheDocument();
    });

    it('shows raw value when no formatDisplay', () => {
      renderWithI18n(
        <EditableField value="raw text" type="text" onSave={() => {}} />
      );
      expect(screen.getByText('raw text')).toBeInTheDocument();
    });
  });

  describe('text editing', () => {
    it('switches to input on click', () => {
      renderWithI18n(
        <EditableField value="initial" type="text" onSave={() => {}} />
      );
      fireEvent.click(screen.getByText('initial'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('initial');
    });

    it('saves on Enter', () => {
      const onSave = vi.fn();
      renderWithI18n(
        <EditableField value="old" type="text" onSave={onSave} />
      );
      fireEvent.click(screen.getByText('old'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'new' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSave).toHaveBeenCalledWith('new');
    });

    it('cancels on Escape', () => {
      const onSave = vi.fn();
      renderWithI18n(
        <EditableField value="original" type="text" onSave={onSave} />
      );
      fireEvent.click(screen.getByText('original'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'changed' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText('original')).toBeInTheDocument();
    });

    it('saves on blur', () => {
      const onSave = vi.fn();
      renderWithI18n(
        <EditableField value="before" type="text" onSave={onSave} />
      );
      fireEvent.click(screen.getByText('before'));
      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'after' } });
      fireEvent.blur(input);
      expect(onSave).toHaveBeenCalledWith('after');
    });
  });

  describe('number editing', () => {
    it('renders number input', () => {
      renderWithI18n(
        <EditableField value={42} type="number" onSave={() => {}} />
      );
      fireEvent.click(screen.getByText('42'));
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('number');
    });

    it('saves parsed number', () => {
      const onSave = vi.fn();
      renderWithI18n(
        <EditableField value={10} type="number" onSave={onSave} />
      );
      fireEvent.click(screen.getByText('10'));
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '25' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSave).toHaveBeenCalledWith(25);
    });

    it('saves null for empty value', () => {
      const onSave = vi.fn();
      renderWithI18n(
        <EditableField value={10} type="number" onSave={onSave} />
      );
      fireEvent.click(screen.getByText('10'));
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSave).toHaveBeenCalledWith(null);
    });
  });

  describe('select editing', () => {
    it('renders select with options', () => {
      const options = [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ];
      renderWithI18n(
        <EditableField
          value="a"
          type="select"
          onSelectOptions={options}
          onSave={() => {}}
        />
      );
      fireEvent.click(screen.getByText('a'));
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('saves on selection change', () => {
      const onSave = vi.fn();
      const options = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ];
      renderWithI18n(
        <EditableField
          value="a"
          type="select"
          onSelectOptions={options}
          onSave={onSave}
        />
      );
      fireEvent.click(screen.getByText('a'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
      expect(onSave).toHaveBeenCalledWith('b');
    });
  });

  describe('textarea editing', () => {
    it('renders textarea', () => {
      renderWithI18n(
        <EditableField value="text" type="textarea" onSave={() => {}} />
      );
      fireEvent.click(screen.getByText('text'));
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('Enter does NOT save (allows newlines)', () => {
      const onSave = vi.fn();
      renderWithI18n(
        <EditableField value="old" type="textarea" onSave={onSave} />
      );
      fireEvent.click(screen.getByText('old'));
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
