import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

type SortDirection = 'asc' | 'desc';

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDir?: SortDirection;
  className?: string;
}

function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  sortKey,
  sortDir,
  className,
}: TableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                as="th"
                className={cn(
                  'bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                )}
                onClick={col.sortable ? () => onSort?.(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ArrowUp className="h-3.5 w-3.5" />
                      : <ArrowDown className="h-3.5 w-3.5" />
                  )}
                </span>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i} className="even:bg-gray-50/50 hover:bg-purple-50/30">
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}

function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)} {...props} />;
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-gray-100', className)} {...props} />;
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn(className)} {...props} />;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  as?: 'td' | 'th';
}

function TableCell({ as: Tag = 'td', className, ...props }: TableCellProps) {
  return <Tag className={cn('px-4 py-3 whitespace-nowrap', className)} {...props} />;
}

export { Table, TableHead, TableBody, TableRow, TableCell };
export type { TableProps, Column, SortDirection };
