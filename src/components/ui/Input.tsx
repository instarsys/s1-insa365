import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
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
          className={cn(
            'h-10 w-full rounded-lg border px-3 text-sm transition-colors duration-150',
            'placeholder:text-gray-400',
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
Input.displayName = 'Input';

export { Input, type InputProps };
