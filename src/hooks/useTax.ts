import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import type { WithholdingMonthlySummaryDto, WithholdingEmployeeDetailDto, WithholdingReturnDto, SimplifiedStatementDto, WithholdingReceiptDto, AnnualTaxSummaryDto, MonthlyTaxPaymentDto } from '@/application/dtos/tax';

export function useWithholdingSummary(year: number) {
  const { data, error, isLoading } = useSWR<{ items: WithholdingMonthlySummaryDto[] }>(
    `/api/tax/withholding?year=${year}`,
    fetcher,
    { revalidateOnFocus: true },
  );
  return { items: data?.items ?? [], error, isLoading };
}

export function useWithholdingEmployees(year: number, month: number | null) {
  const { data, error, isLoading } = useSWR<{ items: WithholdingEmployeeDetailDto[] }>(
    month ? `/api/tax/withholding/employees?year=${year}&month=${month}` : null,
    fetcher,
  );
  return { items: data?.items ?? [], error, isLoading };
}

export function useWithholdingReturn(year: number, month: number) {
  const { data, error, isLoading } = useSWR<WithholdingReturnDto>(
    `/api/tax/reports/withholding-return?year=${year}&month=${month}`,
    fetcher,
  );
  return { data: data ?? null, error, isLoading };
}

export function useSimplifiedStatement(year: number, half: 1 | 2) {
  const { data, error, isLoading } = useSWR<SimplifiedStatementDto>(
    `/api/tax/reports/simplified-statement?year=${year}&half=${half}`,
    fetcher,
  );
  return { data: data ?? null, error, isLoading };
}

export function useWithholdingReceipt(year: number, userId: string | null) {
  const { data, error, isLoading } = useSWR<WithholdingReceiptDto>(
    userId ? `/api/tax/withholding-receipt?year=${year}&userId=${userId}` : null,
    fetcher,
  );
  return { data: data ?? null, error, isLoading };
}

export function useAnnualTaxSummary(year: number) {
  const { data, error, isLoading } = useSWR<{ summary: AnnualTaxSummaryDto; payments: MonthlyTaxPaymentDto[] }>(
    `/api/tax/annual-summary?year=${year}`,
    fetcher,
  );
  return { summary: data?.summary ?? null, payments: data?.payments ?? [], error, isLoading };
}
