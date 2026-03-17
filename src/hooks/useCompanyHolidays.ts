'use client';

import useSWR from 'swr';
import { fetcher, apiPost, apiDelete } from '@/lib/api';

export interface CompanyHolidayItem {
  id: string;
  companyId: string;
  date: string;
  name: string;
  type: 'NATIONAL' | 'COMPANY';
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyHolidaysResponse {
  year: number;
  items: CompanyHolidayItem[];
}

export function useCompanyHolidays(year: number) {
  const { data, error, isLoading, mutate } = useSWR<CompanyHolidaysResponse>(
    `/api/settings/holidays?year=${year}`,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { holidays: data?.items ?? [], isLoading, error, mutate };
}

export function useCompanyHolidayMutations() {
  return {
    create: (data: { date: string; name: string; type?: string; isRecurring?: boolean }) =>
      apiPost('/api/settings/holidays', data),
    importNational: (year: number) =>
      apiPost('/api/settings/holidays/import', { year }),
    deleteHoliday: (id: string) =>
      apiDelete(`/api/settings/holidays/${id}`),
  };
}
