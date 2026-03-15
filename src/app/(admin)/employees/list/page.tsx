'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Badge, SearchInput, Select, Pagination,
  Spinner, EmptyState, SlidePanel, Input, DatePicker, useToast,
  Tabs, Avatar,
} from '@/components/ui';
import { useEmployees, useEmployeeMutations } from '@/hooks';
import { formatDate, formatKRW } from '@/lib/utils';
import { fetcher } from '@/lib/api';
import { HIRE_TYPE_OPTIONS, SALARY_TYPE_OPTIONS } from '@/lib/constants';
import { Plus, Users, Download } from 'lucide-react';
import { useEmployeeImport } from '@/hooks/useEmployeeImport';

type PanelMode = 'create' | null;

interface DepartmentItem { id: string; name: string; }
interface PositionItem { id: string; name: string; }

const STATUS_TABS = [
  { key: '', label: '재직' },
  { key: 'ON_LEAVE', label: '휴직' },
  { key: 'RESIGNED', label: '퇴직' },
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
  hireType: string;
  address: string;
  isHouseholder: boolean;
  dependents: string;
  rrn: string;
  salaryType: string;
  baseSalary: string;
  hourlyRate: string;
  insuranceMode: string;
  workPolicyId: string;
  workLocationId: string;
}

const emptyForm: EmployeeForm = {
  name: '',
  email: '',
  phone: '',
  departmentId: '',
  positionId: '',
  joinDate: '',
  hireType: '',
  address: '',
  isHouseholder: false,
  dependents: '1',
  rrn: '',
  salaryType: 'MONTHLY',
  baseSalary: '',
  hourlyRate: '',
  insuranceMode: 'AUTO',
  workPolicyId: '',
  workLocationId: '',
};

export default function EmployeeListPage() {
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusTab, setStatusTab] = useState('');
  const [page, setPage] = useState(1);

  // Dynamic department & position data
  const { data: deptData } = useSWR<{ items: DepartmentItem[] }>('/api/departments', fetcher);
  const { data: posData } = useSWR<{ items: PositionItem[] }>('/api/positions', fetcher);
  const { data: wpData } = useSWR<{ items: { id: string; name: string; isDefault: boolean }[] }>('/api/settings/work-policy', fetcher);
  const { data: wlData } = useSWR<{ items: { id: string; name: string }[] }>('/api/work-locations', fetcher);

  const departmentFilterOptions = useMemo(() => [
    { value: '', label: '전체 부서' },
    ...(deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
  ], [deptData]);

  const departmentOptions = useMemo(() =>
    (deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
    [deptData]
  );

  const positionOptions = useMemo(() =>
    (posData?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
    [posData]
  );

  const hireTypeOptions = useMemo(() =>
    HIRE_TYPE_OPTIONS.map((h) => ({ value: h.value, label: h.label })),
    []
  );

  const workPolicyOptions = useMemo(() =>
    (wpData?.items ?? []).map((wp) => ({
      value: wp.id,
      label: wp.isDefault ? `${wp.name} (기본)` : wp.name,
    })),
    [wpData]
  );

  const workLocationOptions = useMemo(() =>
    (wlData?.items ?? []).map((wl) => ({ value: wl.id, label: wl.name })),
    [wlData]
  );

  // statusTab '' = ACTIVE
  const statusFilter = statusTab || 'ACTIVE';

  const { employees, total, isLoading, mutate } = useEmployees({
    search,
    departmentId: departmentFilter || undefined,
    status: statusFilter,
    page,
    limit: 20,
  });

  // Separate counts for each tab
  const { employees: allActive } = useEmployees({ status: 'ACTIVE', limit: 1 });
  const { total: activeTotal } = useEmployees({ status: 'ACTIVE', limit: 1 });
  const { total: onLeaveTotal } = useEmployees({ status: 'ON_LEAVE', limit: 1 });
  const { total: resignedTotal } = useEmployees({ status: 'RESIGNED', limit: 1 });

  const tabsWithCount = useMemo(() => [
    { key: '', label: '재직', count: activeTotal },
    { key: 'ON_LEAVE', label: '휴직', count: onLeaveTotal },
    { key: 'RESIGNED', label: '퇴직', count: resignedTotal },
  ], [activeTotal, onLeaveTotal, resignedTotal]);

  const { createEmployee } = useEmployeeMutations();
  const { downloadExport } = useEmployeeImport();

  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.ceil(total / 20);

  const openCreate = useCallback(() => {
    setForm(emptyForm);
    setPanelMode('create');
  }, []);

  const handleTabChange = useCallback((key: string) => {
    setStatusTab(key);
    setPage(1);
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.email || !form.phone || !form.rrn) {
      toast.error('이름, 이메일, 연락처, 주민등록번호는 필수입니다.');
      return;
    }
    if (!form.workPolicyId) {
      toast.error('근무정책은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        departmentId: form.departmentId || undefined,
        positionId: form.positionId || undefined,
        joinDate: form.joinDate || undefined,
        hireType: form.hireType || undefined,
        address: form.address || undefined,
        isHouseholder: form.isHouseholder,
        dependents: parseInt(form.dependents) || 1,
        salaryType: form.salaryType as 'MONTHLY' | 'HOURLY',
        baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
        hourlyRate: form.salaryType === 'HOURLY' && form.hourlyRate ? Number(form.hourlyRate) : undefined,
        rrn: form.rrn,
        insuranceMode: form.insuranceMode,
        workPolicyId: form.workPolicyId || undefined,
        workLocationId: form.workLocationId || undefined,
      };

      const created = await createEmployee(payload) as { id: string };
      toast.success('직원이 등록되었습니다. 급여 항목을 확인하세요.');
      router.push(`/employees/${created.id}?tab=salary`);
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'employeeNumber', label: '사번', sortable: true },
    {
      key: 'name',
      label: '이름',
      sortable: true,
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-3">
          <Avatar name={(row.name as string) || '?'} size="sm" />
          <span className="font-medium text-gray-900">{row.name as string}</span>
        </div>
      ),
    },
    {
      key: 'departmentName',
      label: '부서',
      render: (row: Record<string, unknown>) => (row.departmentName as string) || (row.department as Record<string, unknown>)?.name as string || '-',
    },
    {
      key: 'positionName',
      label: '직급',
      render: (row: Record<string, unknown>) => (row.positionName as string) || (row.position as Record<string, unknown>)?.name as string || '-',
    },
    {
      key: 'salaryType',
      label: '급여구분',
      render: (row: Record<string, unknown>) => {
        const type = row.salaryType as string;
        if (type === 'HOURLY') {
          return <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">시급제</span>;
        }
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">월급제</span>;
      },
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadExport}>
            <Download className="h-4 w-4" />
            다운로드
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            직원 등록
          </Button>
        </div>
      </PageHeader>

      {/* Lifecycle Tabs */}
      <Tabs
        tabs={tabsWithCount}
        activeKey={statusTab}
        onChange={handleTabChange}
        className="mb-4"
      />

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
          wrapperClassName="w-40"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner text="직원 목록을 불러오는 중..." className="py-20" />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={
            statusTab === 'ON_LEAVE'
              ? '휴직 중인 직원이 없습니다'
              : statusTab === 'RESIGNED'
                ? '퇴직한 직원이 없습니다'
                : '등록된 직원이 없습니다'
          }
          description={
            statusTab === 'ON_LEAVE'
              ? '직원 상세에서 휴직 처리할 수 있습니다.'
              : statusTab === 'RESIGNED'
                ? '직원 상세에서 퇴직 처리할 수 있습니다.'
                : '직원 등록 버튼을 클릭하여 첫 직원을 등록하세요.'
          }
          action={
            !statusTab ? (
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4" />
                직원 등록
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-lg border border-gray-200">
            <Table
              columns={columns}
              data={employees as unknown as Record<string, unknown>[]}
              onRowClick={(row) => {
                const id = row.id as string;
                if (id) router.push(`/employees/${id}`);
              }}
            />
          </div>

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

      {/* SlidePanel: Create */}
      <SlidePanel
        open={panelMode !== null}
        onClose={() => setPanelMode(null)}
        title="직원 등록"
        size="lg"
      >
        <div className="space-y-5">
          {/* Section 1: 기본 정보 */}
          <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>
          <Input
            label="이름"
            required
            placeholder="홍길동"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="주민등록번호"
            placeholder="000000-0000000"
            maxLength={14}
            value={form.rrn}
            onChange={(e) => setForm((f) => ({ ...f, rrn: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="이메일"
              required
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="연락처"
              required
              placeholder="010-1234-5678"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Input
            label="주소"
            placeholder="주소 입력"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />

          <hr className="border-gray-200" />

          {/* Section 2: 인사 정보 */}
          <h3 className="text-sm font-semibold text-gray-700">인사 정보</h3>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="입사일"
              value={form.joinDate}
              onChange={(v) => setForm((f) => ({ ...f, joinDate: v }))}
            />
            <Select
              label="입사구분"
              options={hireTypeOptions}
              value={form.hireType}
              onChange={(v) => setForm((f) => ({ ...f, hireType: v }))}
              placeholder="선택"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="근무정책"
              options={workPolicyOptions}
              value={form.workPolicyId}
              onChange={(v) => setForm((f) => ({ ...f, workPolicyId: v }))}
              placeholder="근무정책 선택"
              required
            />
            <Select
              label="근무지"
              options={workLocationOptions}
              value={form.workLocationId}
              onChange={(v) => setForm((f) => ({ ...f, workLocationId: v }))}
              placeholder="근무지 선택"
            />
          </div>

          <hr className="border-gray-200" />

          {/* Section 3: 급여 정보 */}
          <h3 className="text-sm font-semibold text-gray-700">급여 정보</h3>
          <Select
            label="급여구분"
            options={[
              { value: 'MONTHLY', label: '월급제' },
              { value: 'HOURLY', label: '시급제' },
            ]}
            value={form.salaryType}
            onChange={(v) => setForm((f) => ({ ...f, salaryType: v }))}
          />
          {form.salaryType === 'MONTHLY' ? (
            <>
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
            </>
          ) : (
            <>
              <Input
                label="시급"
                type="number"
                placeholder="11,000"
                value={form.hourlyRate}
                onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
              />
              {form.hourlyRate && (
                <p className="text-xs text-gray-500">{formatKRW(Number(form.hourlyRate))}/시간</p>
              )}
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <label className="mb-1 block text-xs font-medium text-gray-700">세대주여부</label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isHouseholder: !f.isHouseholder }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.isHouseholder ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.isHouseholder ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="ml-2 text-sm text-gray-600">
                {form.isHouseholder ? '세대주' : '세대원'}
              </span>
            </div>
            <Input
              label="부양가족수"
              type="number"
              min="0"
              max="20"
              value={form.dependents}
              onChange={(e) => setForm((f) => ({ ...f, dependents: e.target.value }))}
            />
          </div>
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
