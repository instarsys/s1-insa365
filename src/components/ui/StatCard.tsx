import { type ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  border: 'border-l-indigo-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-l-emerald-500' },
  sky:     { bg: 'bg-sky-50',     icon: 'text-sky-600',     border: 'border-l-sky-500' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    border: 'border-l-rose-500' },
} as const;

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  className?: string;
  colorScheme?: keyof typeof COLOR_MAP;
}

function StatCard({ title, value, change, changeLabel, icon, className, colorScheme }: StatCardProps) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;
  const colors = colorScheme ? COLOR_MAP[colorScheme] : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        colors && `border-l-[3px] ${colors.border}`,
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
        </div>
        {icon && (
          <div className={cn(
            'rounded-lg p-2',
            colors ? `${colors.bg} ${colors.icon}` : 'bg-indigo-50 text-indigo-600',
          )}>{icon}</div>
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
