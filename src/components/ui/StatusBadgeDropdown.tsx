'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown, UserMinus, UserCheck, LogOut, UserPlus, Undo2 } from 'lucide-react';

interface StatusBadgeDropdownProps {
  status: string; // 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED'
  onLeave?: () => void;
  onReturn?: () => void;
  onResign?: () => void;
  onRehire?: () => void;
  onCancelResign?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: '재직', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ON_LEAVE: { label: '휴직', bg: 'bg-amber-50', text: 'text-amber-700' },
  RESIGNED: { label: '퇴직', bg: 'bg-gray-100', text: 'text-gray-600' },
  TERMINATED: { label: '퇴직', bg: 'bg-gray-100', text: 'text-gray-600' },
};

export function StatusBadgeDropdown({ status, onLeave, onReturn, onResign, onRehire, onCancelResign }: StatusBadgeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const config = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };

  // Build menu items based on status
  const items: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }[] = [];
  if (status === 'ACTIVE') {
    if (onLeave) items.push({ label: '휴직 처리', icon: <UserMinus className="h-4 w-4" />, onClick: onLeave });
    if (onResign) items.push({ label: '퇴직 처리', icon: <LogOut className="h-4 w-4" />, onClick: onResign, danger: true });
  } else if (status === 'ON_LEAVE') {
    if (onReturn) items.push({ label: '복귀 처리', icon: <UserCheck className="h-4 w-4" />, onClick: onReturn });
    if (onResign) items.push({ label: '퇴직 처리', icon: <LogOut className="h-4 w-4" />, onClick: onResign, danger: true });
  } else if (status === 'RESIGNED' || status === 'TERMINATED') {
    if (onCancelResign) items.push({ label: '퇴직 취소', icon: <Undo2 className="h-4 w-4" />, onClick: onCancelResign });
    if (onRehire) items.push({ label: '재입사 처리', icon: <UserPlus className="h-4 w-4" />, onClick: onRehire });
  }

  if (items.length === 0) {
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-shadow ${config.bg} ${config.text} cursor-pointer hover:shadow-sm`}
      >
        {config.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
