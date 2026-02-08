'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout';
import { Card, CardBody, Badge, Select, SearchInput, Table, Pagination, Spinner, Modal, Button, useToast } from '@/components/ui';
import { fetcher, apiPut } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Column } from '@/components/ui';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeNumber: string | null;
  employeeStatus: string;
  companyId: string;
  companyName: string;
  createdAt: string;
  [key: string]: unknown;
}

interface UsersResponse {
  items: UserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TenantsResponse {
  items: { id: string; name: string }[];
}

const ROLE_OPTIONS = [
  { value: '', label: '전체 역할' },
  { value: 'SYSTEM_ADMIN', label: '시스템관리자' },
  { value: 'COMPANY_ADMIN', label: '회사관리자' },
  { value: 'MANAGER', label: '매니저' },
  { value: 'EMPLOYEE', label: '직원' },
];

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: '시스템관리자',
  COMPANY_ADMIN: '회사관리자',
  MANAGER: '매니저',
  EMPLOYEE: '직원',
};

const ROLE_COLORS: Record<string, 'error' | 'info' | 'warning' | 'gray'> = {
  SYSTEM_ADMIN: 'error',
  COMPANY_ADMIN: 'info',
  MANAGER: 'warning',
  EMPLOYEE: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '재직',
  ON_LEAVE: '휴직',
  RESIGNED: '퇴직',
};

export default function UsersPage() {
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');

  // Build query params
  const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
  if (role) params.set('role', role);
  if (companyId) params.set('companyId', companyId);
  if (search) params.set('search', search);

  const { data, isLoading, mutate } = useSWR<UsersResponse>(
    `/api/super-admin/users?${params}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: tenantsData } = useSWR<TenantsResponse>('/api/super-admin/tenants', fetcher);
  const companyOptions = [
    { value: '', label: '전체 회사' },
    ...(tenantsData?.items?.map((c) => ({ value: c.id, label: c.name })) ?? []),
  ];

  const users = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Role change modal
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  const openRoleModal = (u: UserItem) => {
    setEditUser(u);
    setNewRole(u.role);
  };

  const handleRoleChange = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await apiPut(`/api/super-admin/users/${editUser.id}`, { role: newRole });
      toast.success(`${editUser.name}의 역할이 변경되었습니다.`);
      await mutate();
      setEditUser(null);
    } catch {
      toast.error('역할 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<UserItem>[] = [
    {
      key: 'name',
      label: '이름',
      render: (u) => (
        <div>
          <p className="font-medium text-gray-900">{u.name}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
      ),
    },
    { key: 'companyName', label: '회사' },
    {
      key: 'role',
      label: '역할',
      render: (u) => (
        <Badge variant={ROLE_COLORS[u.role] ?? 'gray'}>
          {ROLE_LABELS[u.role] ?? u.role}
        </Badge>
      ),
    },
    { key: 'employeeNumber', label: '사번', render: (u) => u.employeeNumber ?? '-' },
    {
      key: 'employeeStatus',
      label: '상태',
      render: (u) => (
        <Badge variant={u.employeeStatus === 'ACTIVE' ? 'success' : 'gray'}>
          {STATUS_LABELS[u.employeeStatus] ?? u.employeeStatus}
        </Badge>
      ),
    },
    { key: 'createdAt', label: '가입일', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <button
          onClick={() => openRoleModal(u)}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          역할변경
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="사용자 관리" subtitle="전체 사용자를 크로스 테넌트로 관리합니다." />

      {/* Filters */}
      <Card className="mb-4">
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="역할"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(v) => { setRole(v); setCurrentPage(1); }}
            />
            <Select
              label="회사"
              options={companyOptions}
              value={companyId}
              onChange={(v) => { setCompanyId(v); setCurrentPage(1); }}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-gray-700">검색</p>
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setCurrentPage(1); }}
                placeholder="이름 또는 이메일..."
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="사용자 목록 로딩중..." className="py-12" />
          ) : (
            <Table columns={columns} data={users} />
          )}
        </CardBody>
      </Card>

      <div className="mt-4 flex justify-center">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Role Change Modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="역할 변경"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditUser(null)}>취소</Button>
            <Button onClick={handleRoleChange} disabled={saving}>{saving ? '변경 중...' : '변경'}</Button>
          </>
        }
      >
        {editUser && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">대상: <span className="font-medium text-gray-900">{editUser.name}</span> ({editUser.email})</p>
              <p className="text-sm text-gray-500">회사: {editUser.companyName}</p>
            </div>
            <Select
              label="새 역할"
              options={[
                { value: 'SYSTEM_ADMIN', label: '시스템관리자' },
                { value: 'COMPANY_ADMIN', label: '회사관리자' },
                { value: 'MANAGER', label: '매니저' },
                { value: 'EMPLOYEE', label: '직원' },
              ]}
              value={newRole}
              onChange={setNewRole}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
