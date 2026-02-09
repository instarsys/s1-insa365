'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
}

function Checkbox({ label, checked, onChange, disabled, indeterminate, className }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <label
      className={cn(
        'inline-flex items-center gap-2',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={cn(
          'h-4 w-4 rounded border-gray-300',
          'text-indigo-600 focus:ring-2 focus:ring-indigo-500/20',
          'disabled:cursor-not-allowed',
        )}
      />
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

export { Checkbox, type CheckboxProps };
