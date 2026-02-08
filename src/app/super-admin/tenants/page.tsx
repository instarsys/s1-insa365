'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody, Badge, Button, Input, Modal, Table, Spinner, useToast } from '@/components/ui';
import { fetcher, apiPost } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Column } from '@/components/ui';

interface Tenant {
  id: string;
  name: string;
  businessNumber: string;
  representativeName: string;
  email: string;
  phone: string;
  employeeCount: number;
  createdAt: string;
  isActive: boolean;
  [key: string]: unknown;
}

interface TenantsResponse {
  items: Tenant[];
  total: number;
}

export default function TenantsPage() {
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<TenantsResponse>('/api/super-admin/tenants', fetcher);
  const tenants = data?.items ?? [];

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', businessNumber: '', representativeName: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.businessNumber) {
      toast.error('회사명과 사업자번호는 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/api/super-admin/tenants', form);
      toast.success('테넌트가 생성되었습니다.');
      await mutate();
      setShowModal(false);
      setForm({ name: '', businessNumber: '', representativeName: '', email: '', phone: '' });
    } catch {
      toast.error('테넌트 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      label: '회사명',
      render: (t) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <span className="font-medium text-gray-900">{t.name}</span>
        </div>
      ),
    },
    { key: 'businessNumber', label: '사업자번호' },
    { key: 'representativeName', label: '대표자' },
    { key: 'employeeCount', label: '직원수', render: (t) => <span className="font-medium">{t.employeeCount}명</span> },
    { key: 'createdAt', label: '생성일', render: (t) => formatDate(t.createdAt) },
    {
      key: 'isActive',
      label: '상태',
      render: (t) => (
        <Badge variant={t.isActive ? 'success' : 'gray'}>
          {t.isActive ? '활성' : '비활성'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="테넌트 관리" subtitle="등록된 회사(테넌트)를 관리합니다." />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> 테넌트 추가
        </Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="테넌트 목록 로딩중..." className="py-12" />
          ) : (
            <Table columns={columns} data={tenants} />
          )}
        </CardBody>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="새 테넌트 생성"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? '생성 중...' : '생성'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="회사명 *" placeholder="회사명" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="사업자번호 *" placeholder="000-00-00000" value={form.businessNumber} onChange={(e) => setForm((f) => ({ ...f, businessNumber: e.target.value }))} />
          <Input label="대표자" placeholder="대표자명" value={form.representativeName} onChange={(e) => setForm((f) => ({ ...f, representativeName: e.target.value }))} />
          <Input label="이메일" type="email" placeholder="admin@company.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="전화번호" placeholder="02-0000-0000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
