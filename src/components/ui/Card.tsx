import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between border-b border-gray-200 px-6 py-4', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-800', className)} {...props} />
  );
}

function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardBody };
