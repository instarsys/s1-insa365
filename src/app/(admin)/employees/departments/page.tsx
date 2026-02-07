'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Tabs, Modal, Input, useToast, EmptyState, Spinner,
} from '@/components/ui';
import { apiPost, apiPut, apiDelete } from '@/lib/api';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface Department {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
}

interface Position {
  id: string;
  name: string;
  level: number;
}

const tabs = [
  { key: 'departments', label: '부서' },
  { key: 'positions', label: '직급' },
];

export default function DepartmentsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('departments');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Department | Position | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Department form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptOrder, setDeptOrder] = useState('0');

  // Position form
  const [posName, setPosName] = useState('');
  const [posLevel, setPosLevel] = useState('1');

  const { data: deptsData, isLoading: deptsLoading, mutate: mutateDepts } =
    useSWR<{ items: Department[] }>('/api/departments', fetcher, { revalidateOnFocus: true });
  const { data: positionsData, isLoading: positionsLoading, mutate: mutatePositions } =
    useSWR<{ items: Position[] }>('/api/positions', fetcher, { revalidateOnFocus: true });

  const departments = deptsData?.items ?? [];
  const positions = positionsData?.items ?? [];

  const openCreateDept = () => {
    setEditItem(null);
    setDeptName('');
    setDeptCode('');
    setDeptOrder('0');
    setModalOpen(true);
  };

  const openEditDept = (dept: Department) => {
    setEditItem(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptOrder(String(dept.sortOrder));
    setModalOpen(true);
  };

  const openCreatePos = () => {
    setEditItem(null);
    setPosName('');
    setPosLevel('1');
    setModalOpen(true);
  };

  const openEditPos = (pos: Position) => {
    setEditItem(pos);
    setPosName(pos.name);
    setPosLevel(String(pos.level));
    setModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'departments') {
        if (!deptName.trim()) {
          toast.error('부서명을 입력해주세요.');
          return;
        }
        const payload = { name: deptName, code: deptCode, sortOrder: Number(deptOrder) };
        if (editItem) {
          await apiPut(`/api/departments/${editItem.id}`, payload);
          toast.success('부서가 수정되었습니다.');
        } else {
          await apiPost('/api/departments', payload);
          toast.success('부서가 추가되었습니다.');
        }
        await mutateDepts();
      } else {
        if (!posName.trim()) {
          toast.error('직급명을 입력해주세요.');
          return;
        }
        const payload = { name: posName, level: Number(posLevel) };
        if (editItem) {
          await apiPut(`/api/positions/${editItem.id}`, payload);
          toast.success('직급이 수정되었습니다.');
        } else {
          await apiPost('/api/positions', payload);
          toast.success('직급이 추가되었습니다.');
        }
        await mutatePositions();
      }
      setModalOpen(false);
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (activeTab === 'departments') {
        await apiDelete(`/api/departments/${id}`);
        toast.success('부서가 삭제되었습니다.');
        await mutateDepts();
      } else {
        await apiDelete(`/api/positions/${id}`);
        toast.success('직급이 삭제되었습니다.');
        await mutatePositions();
      }
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const deptColumns = [
    { key: 'name', label: '부서명', sortable: true },
    { key: 'code', label: '부서 코드' },
    { key: 'sortOrder', label: '정렬 순서' },
    {
      key: 'actions',
      label: '',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditDept(row as unknown as Department)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id as string)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const posColumns = [
    { key: 'name', label: '직급명', sortable: true },
    { key: 'level', label: '레벨' },
    {
      key: 'actions',
      label: '',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditPos(row as unknown as Position)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id as string)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const isLoading = activeTab === 'departments' ? deptsLoading : positionsLoading;
  const isEmpty = activeTab === 'departments' ? departments.length === 0 : positions.length === 0;

  return (
    <div>
      <PageHeader title="부서/직급 관리" subtitle="부서와 직급을 설정합니다.">
        <Button onClick={activeTab === 'departments' ? openCreateDept : openCreatePos}>
          <Plus className="h-4 w-4" />
          {activeTab === 'departments' ? '부서 추가' : '직급 추가'}
        </Button>
      </PageHeader>

      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} className="mb-6" />

      {isLoading ? (
        <Spinner text="데이터를 불러오는 중..." className="py-20" />
      ) : isEmpty ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title={activeTab === 'departments' ? '등록된 부서가 없습니다' : '등록된 직급이 없습니다'}
          description="추가 버튼을 클릭하여 등록하세요."
          action={
            <Button
              size="sm"
              onClick={activeTab === 'departments' ? openCreateDept : openCreatePos}
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'departments' ? '부서 추가' : '직급 추가'}
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-gray-200">
          {activeTab === 'departments' ? (
            <Table columns={deptColumns} data={departments as unknown as Record<string, unknown>[]} />
          ) : (
            <Table columns={posColumns} data={positions as unknown as Record<string, unknown>[]} />
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          activeTab === 'departments'
            ? editItem ? '부서 수정' : '부서 추가'
            : editItem ? '직급 수정' : '직급 추가'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {activeTab === 'departments' ? (
            <>
              <Input
                label="부서명"
                placeholder="예: 개발부"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
              />
              <Input
                label="부서 코드"
                placeholder="예: DEV"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
              />
              <Input
                label="정렬 순서"
                type="number"
                value={deptOrder}
                onChange={(e) => setDeptOrder(e.target.value)}
              />
            </>
          ) : (
            <>
              <Input
                label="직급명"
                placeholder="예: 과장"
                value={posName}
                onChange={(e) => setPosName(e.target.value)}
              />
              <Input
                label="레벨"
                type="number"
                value={posLevel}
                onChange={(e) => setPosLevel(e.target.value)}
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
