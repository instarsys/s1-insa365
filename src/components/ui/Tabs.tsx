import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-gray-200', className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              'hover:text-purple-600',
              isActive
                ? 'text-purple-600 font-semibold'
                : 'text-gray-500',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {tab.count != null && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {/* Active indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, type TabsProps, type Tab };
