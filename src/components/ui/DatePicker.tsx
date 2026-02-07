import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, id, onChange, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="date"
          lang="ko"
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'h-10 w-full rounded-lg border px-3 text-sm transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500',
            'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400',
            error
              ? 'border-red-500 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-300 bg-white',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
DatePicker.displayName = 'DatePicker';

export { DatePicker, type DatePickerProps };
