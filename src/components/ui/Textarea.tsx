import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, maxLength, value, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-150',
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
        <div className="mt-1 flex items-center justify-between">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {maxLength != null && (
            <p className="ml-auto text-xs text-gray-400">
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea, type TextareaProps };
