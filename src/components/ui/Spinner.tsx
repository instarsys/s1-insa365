import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  text?: string;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

function Spinner({ size = 'md', text, className }: SpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-purple-600', sizeStyles[size])} />
      {text && <span className="text-sm text-gray-500">{text}</span>}
    </div>
  );
}

export { Spinner, type SpinnerProps, type SpinnerSize };
