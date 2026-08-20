import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function Dialog({ title, children, onClose }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
