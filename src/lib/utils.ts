import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function formatDate(date: Date | string, format: 'date' | 'datetime' = 'date'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'datetime') {
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
