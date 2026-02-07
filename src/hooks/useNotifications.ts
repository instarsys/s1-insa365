'use client';

import useSWR from 'swr';
import { fetcher, apiPut } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  link?: string;
  createdAt: string;
}

interface NotificationsResponse {
  items: Notification[];
  unreadCount: number;
}

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true },
  );

  const markRead = async (id: string) => {
    await apiPut(`/api/notifications/${id}/read`);
    await mutate();
  };

  const markAllRead = async () => {
    await apiPut('/api/notifications/read-all');
    await mutate();
  };

  return {
    notifications: data?.items ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    markRead,
    markAllRead,
    mutate,
  };
}
