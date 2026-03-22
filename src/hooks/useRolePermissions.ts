import useSWR from 'swr';
import { fetcher, apiPut } from '@/lib/api';

interface PermissionItem {
  category: string;
  permission: string;
  enabled: boolean;
}

interface RolePermissionsResponse {
  role: string;
  items: PermissionItem[];
}

export function useRolePermissions(role: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RolePermissionsResponse>(
    role ? `/api/settings/permissions?role=${role}` : null,
    fetcher,
  );
  return {
    permissions: data?.items ?? [],
    role: data?.role ?? role,
    isLoading,
    error,
    mutate,
  };
}

export function useRolePermissionMutations() {
  return {
    updatePermissions: (role: string, permissions: PermissionItem[]) =>
      apiPut('/api/settings/permissions', { role, permissions }),
  };
}

export type { PermissionItem };
