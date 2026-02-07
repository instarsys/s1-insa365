'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}

function SlidePanel({ open, onClose, title, children, size = 'md' }: SlidePanelProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, handleEsc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity duration-200"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'absolute right-0 top-0 h-full bg-white shadow-xl',
          'animate-slide-in-right',
          size === 'lg' ? 'w-[640px]' : 'w-[480px]',
          'max-w-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          {title && <h2 className="text-lg font-semibold text-gray-800">{title}</h2>}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Content */}
        <div className="h-[calc(100%-57px)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export { SlidePanel, type SlidePanelProps };
