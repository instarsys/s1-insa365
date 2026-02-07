'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Badge, SearchInput, Select, Pagination,
  Spinner, EmptyState, SlidePanel, Input, DatePicker, useToast,
} from '@/components/ui';
import { useEmployees, useEmployeeMutations } from '@/hooks';
import { formatDate, formatKRW } from '@/lib/utils';
import { Plus, Users } from 'lucide-react';

type PanelMode = 'create' | 'detail' | null;

const statusOptions = [
  { value: '', label: '전체 상태' },
  { value: 'ACTIVE', label: '재직' },
  { value: 'ON_LEAVE', label: '휴직' },
  { value: 'RESIGNED', label: '퇴직' },
];

const departmentFilterOptions = [
  { value: '', label: '전체 부서' },
];

const departmentOptions = [
  { value: '', label: '부서 선택' },
  { value: 'dept-1', label: '경영지원부' },
  { value: 'dept-2', label: '개발부' },
  { value: 'dept-3', label: '영업부' },
  { value: 'dept-4', label: '마케팅부' },
  { value: 'dept-5', label: '인사부' },
];

const positionOptions = [
  { value: '', label: '직급 선택' },
  { value: 'pos-1', label: '사원' },
  { value: 'pos-2', label: '주임' },
  { value: 'pos-3', label: '대리' },
  { value: 'pos-4', label: '과장' },
  { value: 'pos-5', label: '부장' },
];

const insuranceModeOptions = [
  { value: 'AUTO', label: '자동 계산' },
  { value: 'MANUAL', label: '수동 입력' },
  { value: 'NONE', label: '미적용' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE': return <Badge variant="success">재직</Badge>;
    case 'ON_LEAVE': return <Badge variant="warning">휴직</Badge>;
    case 'RESIGNED': return <Badge variant="gray">퇴직</Badge>;
    default: return <Badge variant="gray">{status}</Badge>;
  }
}

interface EmployeeForm {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  joinDate: string;
  baseSalary: string;
  insuranceMode: string;
}

const emptyForm: EmployeeForm = {
  name: '',
  email: '',
  phone: '',
  departmentId: '',
  positionId: '',
  joinDate: '',
  baseSalary: '',
  insuranceMode: 'AUTO',
};

export default function EmployeeListPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { employees, total, isLoading, mutate } = useEmployees({
    search,
    departmentId: departmentFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const { createEmployee, updateEmployee } = useEmployeeMutations();

  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.ceil(total / 20);

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setSelectedEmployee(null);
    setPanelMode('create');
  }, []);

  const openDetail = useCallback((emp: Record<string, unknown>) => {
    setSelectedEmployee(emp);
    setForm({
      name: (emp.name as string) || '',
      email: (emp.email as string) || '',
      phone: (emp.phone as string) || '',
      departmentId: (emp.departmentId as string) || '',
      positionId: (emp.positionId as string) || '',
      joinDate: (emp.joinDate as string) || '',
      baseSalary: '',
      insuranceMode: 'AUTO',
    });
    setPanelMode('detail');
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('이름과 이메일은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        departmentId: form.departmentId || undefined,
        positionId: form.positionId || undefined,
        joinDate: form.joinDate || undefined,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
        insuranceMode: form.insuranceMode,
      };

      if (panelMode === 'create') {
        await createEmployee(payload);
        toast.success('직원이 등록되었습니다.');
      } else if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id as string, payload);
        toast.success('직원 정보가 수정되었습니다.');
      }
      await mutate();
      setPanelMode(null);
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'employeeNumber', label: '사번', sortable: true },
    { key: 'name', label: '이름', sortable: true },
    {
      key: 'departmentName',
      label: '부서',
      render: (row: Record<string, unknown>) => (row.departmentName as string) || '-',
    },
    {
      key: 'positionName',
      label: '직급',
      render: (row: Record<string, unknown>) => (row.positionName as string) || '-',
    },
    {
      key: 'joinDate',
      label: '입사일',
      render: (row: Record<string, unknown>) =>
        row.joinDate ? formatDate(row.joinDate as string) : '-',
    },
    {
      key: 'employeeStatus',
      label: '상태',
      render: (row: Record<string, unknown>) => getStatusBadge(row.employeeStatus as string),
    },
  ];

  return (
    <div>
      <PageHeader title="직원 목록" subtitle="전체 직원을 조회하고 관리합니다.">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          직원 등록
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="이름, 사번, 이메일 검색..."
          className="w-64"
        />
        <Select
          options={departmentFilterOptions}
          value={departmentFilter}
          onChange={setDepartmentFilter}
          placeholder="전체 부서"
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="전체 상태"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner text="직원 목록을 불러오는 중..." className="py-20" />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="등록된 직원이 없습니다"
          description="직원 등록 버튼을 클릭하여 첫 직원을 등록하세요."
          action={
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4" />
              직원 등록
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-lg border border-gray-200">
            <Table
              columns={columns}
              data={employees as unknown as Record<string, unknown>[]}
            />
          </div>

          {/* Clickable row overlay via table row click */}
          {employees.length > 0 && (
            <div className="mt-1">
              <p className="text-xs text-gray-400">
                행을 클릭하면 상세 정보를 확인할 수 있습니다.
              </p>
              <div className="mt-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => openDetail(emp as unknown as Record<string, unknown>)}
                    className="sr-only"
                    aria-label={`${emp.name} 상세 보기`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">총 {total}명</p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* SlidePanel: Create / Detail */}
      <SlidePanel
        open={panelMode !== null}
        onClose={() => setPanelMode(null)}
        title={panelMode === 'create' ? '직원 등록' : '직원 상세'}
        size="lg"
      >
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>
          <Input
            label="이름"
            placeholder="홍길동"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="이메일"
            type="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="연락처"
            placeholder="010-1234-5678"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Select
            label="부서"
            options={departmentOptions}
            value={form.departmentId}
            onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
            placeholder="부서 선택"
          />
          <Select
            label="직급"
            options={positionOptions}
            value={form.positionId}
            onChange={(v) => setForm((f) => ({ ...f, positionId: v }))}
            placeholder="직급 선택"
          />
          <DatePicker
            label="입사일"
            value={form.joinDate}
            onChange={(v) => setForm((f) => ({ ...f, joinDate: v }))}
          />

          <hr className="border-gray-200" />

          <h3 className="text-sm font-semibold text-gray-700">급여 정보</h3>
          <Input
            label="기본급"
            type="number"
            placeholder="3,000,000"
            value={form.baseSalary}
            onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
          />
          {form.baseSalary && (
            <p className="text-xs text-gray-500">{formatKRW(Number(form.baseSalary))}</p>
          )}
          <Select
            label="보험 모드"
            options={insuranceModeOptions}
            value={form.insuranceMode}
            onChange={(v) => setForm((f) => ({ ...f, insuranceMode: v }))}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPanelMode(null)}
            >
              취소
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
