'use client';

import useSWR from 'swr';
import { fetcher, apiPost, apiDelete } from '@/lib/api';
import { useCallback } from 'react';

interface Invitation {
  id: string;
  inviteCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  departmentId: string | null;
  positionId: string | null;
  sendMethod: string;
  status: string;
  sentAt: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export function useInvitations(status?: string) {
  const params = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR<{ items: Invitation[] }>(
    `/api/invitations${params}`,
    fetcher,
    { refreshInterval: 30000 },
  );

  const createInvitation = useCallback(async (input: {
    name: string;
    email?: string;
    phone?: string;
    departmentId?: string;
    positionId?: string;
    sendMethod?: string;
  }) => {
    const result = await apiPost('/api/invitations', input);
    await mutate();
    return result;
  }, [mutate]);

  const resendInvitation = useCallback(async (id: string) => {
    await apiPost(`/api/invitations/${id}/resend`);
    await mutate();
  }, [mutate]);

  const cancelInvitation = useCallback(async (id: string) => {
    await apiDelete(`/api/invitations/${id}`);
    await mutate();
  }, [mutate]);

  return {
    invitations: data?.items ?? [],
    isLoading,
    error,
    createInvitation,
    resendInvitation,
    cancelInvitation,
  };
}
