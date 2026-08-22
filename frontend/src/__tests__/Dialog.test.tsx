import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dialog from '../components/Dialog';

describe('Dialog', () => {
  it('renders title and children', () => {
    render(
      <Dialog title="Test Title" onClose={() => {}}>
        <p>Dialog content</p>
      </Dialog>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('renders overlay and dialog box', () => {
    render(
      <Dialog title="Title" onClose={() => {}}>
        <div />
      </Dialog>
    );
    expect(document.querySelector('.overlay')).toBeInTheDocument();
    expect(document.querySelector('.dialog')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Title" onClose={onClose}>
        <div />
      </Dialog>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking overlay background', () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Title" onClose={onClose}>
        <div />
      </Dialog>
    );
    const overlay = document.querySelector('.overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the dialog', () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Title" onClose={onClose}>
        <button>Inside</button>
      </Dialog>
    );
    fireEvent.click(screen.getByText('Inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT call onClose on other key presses', () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Title" onClose={onClose}>
        <div />
      </Dialog>
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
