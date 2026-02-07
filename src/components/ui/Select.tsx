import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, placeholder, id, value, onChange, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'h-10 w-full rounded-lg border px-3 text-sm transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500',
            'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400',
            error
              ? 'border-red-500 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-300 bg-white',
            !value && 'text-gray-400',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select, type SelectProps, type SelectOption };
