import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
            {isLast || !item.href ? (
              <span className={cn(isLast ? 'text-gray-800 font-medium' : 'text-gray-500')}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="text-gray-500 hover:text-gray-700">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
