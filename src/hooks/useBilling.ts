import useSWR from 'swr';
import { fetcher, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface PlanConfig {
  maxEmployees: number;
  pricePerEmployee: number;
}

export interface SubscriptionData {
  id: string;
  companyId: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  maxEmployees: number;
  pricePerEmployee: number;
  billingKey: string | null;
  lastCardDigits: string | null;
  cardBrand: string | null;
  payments: PaymentData[];
}

export interface PaymentData {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  employeeCount: number;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface BillingResponse {
  subscription: SubscriptionData | null;
  employeeCount: number;
  planConfig: Record<string, PlanConfig>;
}

export function useBilling() {
  const { data, error, isLoading, mutate } = useSWR<BillingResponse>('/api/billing', fetcher);

  return {
    subscription: data?.subscription ?? null,
    employeeCount: data?.employeeCount ?? 0,
    planConfig: data?.planConfig ?? {},
    isLoading,
    error,
    mutate,
  };
}

export function usePaymentHistory() {
  const { data, isLoading } = useSWR<{ payments: PaymentData[] }>('/api/billing/payments', fetcher);
  return {
    payments: data?.payments ?? [],
    isLoading,
  };
}

export function useBillingMutations() {
  return {
    registerCard: async (lastCardDigits: string, cardBrand: string) => {
      return apiPost('/api/billing/card', { lastCardDigits, cardBrand });
    },
    removeCard: async () => {
      return apiDelete('/api/billing/card');
    },
    changePlan: async (plan: string) => {
      return apiPut('/api/billing/plan', { plan });
    },
  };
}
