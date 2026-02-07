import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

function getPageRange(current: number, total: number, siblings: number): (number | 'ellipsis')[] {
  const totalNumbers = siblings * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 ellipsis slots

  if (total <= totalBlocks) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblings, 2);
  const rightSibling = Math.min(current + siblings, total - 1);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  const pages: (number | 'ellipsis')[] = [1];

  if (showLeftEllipsis) {
    pages.push('ellipsis');
  } else {
    for (let i = 2; i < leftSibling; i++) pages.push(i);
  }

  for (let i = leftSibling; i <= rightSibling; i++) {
    pages.push(i);
  }

  if (showRightEllipsis) {
    pages.push('ellipsis');
  } else {
    for (let i = rightSibling + 1; i < total; i++) pages.push(i);
  }

  pages.push(total);
  return pages;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(currentPage, totalPages, siblingCount);

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm',
          'disabled:cursor-not-allowed disabled:text-gray-300',
          'hover:bg-gray-100 text-gray-600',
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`e-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm',
          'disabled:cursor-not-allowed disabled:text-gray-300',
          'hover:bg-gray-100 text-gray-600',
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export { Pagination, type PaginationProps };
