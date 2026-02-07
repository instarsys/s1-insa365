/**
 * Common DTOs shared across the application layer.
 */

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type SortDirection = 'asc' | 'desc';
