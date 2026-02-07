import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-center justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
