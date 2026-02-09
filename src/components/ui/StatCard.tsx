import { type ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  className?: string;
}

function StatCard({ title, value, change, changeLabel, icon, className }: StatCardProps) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
        </div>
        {icon && (
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">{icon}</div>
        )}
      </div>
      {change != null && (
        <div className="mt-3 flex items-center gap-1">
          {isPositive && <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />}
          {isNegative && <ArrowDown className="h-3.5 w-3.5 text-red-500" />}
          <span
            className={cn(
              'text-xs font-medium',
              isPositive && 'text-emerald-600',
              isNegative && 'text-red-600',
              !isPositive && !isNegative && 'text-gray-500',
            )}
          >
            {isPositive && '+'}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-gray-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export { StatCard, type StatCardProps };
