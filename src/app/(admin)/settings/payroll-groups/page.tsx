'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Plus, Pencil, Trash2, Users, ToggleLeft, ToggleRight, Search, UserPlus, UserMinus } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { useToast } from '@/components/ui/Toast';
import { usePayrollGroups, usePayrollGroupMembers, usePayrollGroupMutations } from '@/hooks/usePayrollGroups';
import { fetcher } from '@/lib/api';

interface FormData {
  name: string;
  code: string;
  payDay: number;
  description: string;
}

const defaultForm: FormData = {
  name: '',
  code: '',
  payDay: 25,
  description: '',
};

type GroupRow = Record<string, unknown>;

interface EmployeeItem {
  id: string;
  name: string;
  email: string;
  employeeNumber: string | null;
  department: { name: string } | null;
  [key: string]: unknown;
}

export default function PayrollGroupsPage() {
  const toast = useToast();
  const { groups, isLoading, mutate } = usePayrollGroups();
  const { createGroup, updateGroup, deleteGroup, assignMembers, unassignMembers } = usePayrollGroupMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  // 멤버 관리 모달 상태
  const [memberGroupId, setMemberGroupId] = useState<string | null>(null);
  const [memberTab, setMemberTab] = useState<'members' | 'assign'>('members');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedAssignIds, setSelectedAssignIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [isMemberSaving, setIsMemberSaving] = useState(false);

  const memberGroupName = useMemo(() => {
    if (!memberGroupId) return '';
    const group = groups.find((g) => g.id === memberGroupId);
    return (group?.name as string) ?? '';
  }, [memberGroupId, groups]);

  const { members, isLoading: isMembersLoading, mutate: membersMutate } = usePayrollGroupMembers(memberGroupId);
  const { data: employeesData, isLoading: isEmployeesLoading } = useSWR<{ items: EmployeeItem[] }>(
    memberGroupId && memberTab === 'assign' ? '/api/employees?status=ACTIVE&limit=1000' : null,
    fetcher,
  );

  // 미배정 직원 목록 (전체 활성 직원 - 현재 멤버)
  const unassignedEmployees = useMemo(() => {
    if (!employeesData?.items) return [];
    const memberIdSet = new Set(members.map((m) => m.id));
    return employeesData.items.filter((e) => !memberIdSet.has(e.id));
  }, [employeesData?.items, members]);

  // 검색 필터링
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.department?.name ?? '').toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  const filteredUnassigned = useMemo(() => {
    if (!assignSearch.trim()) return unassignedEmployees;
    const q = assignSearch.toLowerCase();
    return unassignedEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department?.name ?? '').toLowerCase().includes(q),
    );
  }, [unassignedEmployees, assignSearch]);

  const handleOpenMemberModal = (groupId: string) => {
    setMemberGroupId(groupId);
    setMemberTab('members');
    setSelectedMemberIds(new Set());
    setSelectedAssignIds(new Set());
    setMemberSearch('');
    setAssignSearch('');
  };

  const handleCloseMemberModal = () => {
    setMemberGroupId(null);
  };

  const handleUnassign = useCallback(async () => {
    if (!memberGroupId || selectedMemberIds.size === 0) return;
    setIsMemberSaving(true);
    try {
      await unassignMembers(memberGroupId, Array.from(selectedMemberIds));
      toast.success(`${selectedMemberIds.size}명이 그룹에서 해제되었습니다.`);
      setSelectedMemberIds(new Set());
      await Promise.all([membersMutate(), mutate()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '멤버 해제에 실패했습니다.');
    } finally {
      setIsMemberSaving(false);
    }
  }, [memberGroupId, selectedMemberIds, unassignMembers, membersMutate, mutate, toast]);

  const handleAssign = useCallback(async () => {
    if (!memberGroupId || selectedAssignIds.size === 0) return;
    setIsMemberSaving(true);
    try {
      await assignMembers(memberGroupId, Array.from(selectedAssignIds));
      toast.success(`${selectedAssignIds.size}명이 그룹에 배정되었습니다.`);
      setSelectedAssignIds(new Set());
      await Promise.all([membersMutate(), mutate()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '멤버 배정에 실패했습니다.');
    } finally {
      setIsMemberSaving(false);
    }
  }, [memberGroupId, selectedAssignIds, assignMembers, membersMutate, mutate, toast]);

  const handleCreate = () => {
    setForm(defaultForm);
    setEditId(null);
    setModalOpen(true);
  };

  const handleEdit = (group: GroupRow) => {
    setForm({
      name: group.name as string,
      code: (group.code as string) ?? '',
      payDay: (group.payDay as number) ?? 25,
      description: (group.description as string) ?? '',
    });
    setEditId(group.id as string);
    setModalOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error('그룹명은 필수입니다.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        payDay: form.payDay,
        description: form.description.trim() || undefined,
      };

      if (editId) {
        await updateGroup(editId, payload);
        toast.success('급여 그룹이 수정되었습니다.');
      } else {
        await createGroup(payload);
        toast.success('급여 그룹이 추가되었습니다.');
      }
      setModalOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [form, editId, createGroup, updateGroup, mutate, toast]);

  const handleDelete = useCallback(async (id: string, name: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error('기본 급여 그룹은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`"${name}" 급여 그룹을 삭제하시겠습니까?`)) return;
    try {
      await deleteGroup(id);
      toast.success('급여 그룹이 삭제되었습니다.');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  }, [deleteGroup, mutate, toast]);

  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
    try {
      await updateGroup(id, { isActive: !currentActive });
      toast.success(currentActive ? '비활성화되었습니다.' : '활성화되었습니다.');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '변경에 실패했습니다.');
    }
  }, [updateGroup, mutate, toast]);

  const columns = [
    {
      key: 'name',
      label: '그룹명',
      render: (row: GroupRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{row.name as string}</span>
          {Boolean(row.isDefault) && (
            <Badge variant="info">기본</Badge>
          )}
          {!row.isActive && (
            <Badge variant="gray">비활성</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'code',
      label: '코드',
      render: (row: GroupRow) => (
        <span className="text-gray-500">{(row.code as string) || '-'}</span>
      ),
    },
    {
      key: 'payDay',
      label: '급여일',
      render: (row: GroupRow) => (
        <span>매월 {row.payDay as number}일</span>
      ),
    },
    {
      key: 'managers',
      label: '관리자',
      render: (row: GroupRow) => {
        const managers = row.payrollGroupManagers as Array<{ user: { id: string; name: string; email: string } }> | undefined;
        if (!managers || managers.length === 0) {
          return <span className="text-xs text-gray-300">-</span>;
        }
        return (
          <span className="text-sm text-gray-600">
            {managers.map((m) => m.user.name).join(', ')}
          </span>
        );
      },
    },
    {
      key: 'userCount',
      label: '직원수',
      render: (row: GroupRow) => {
        const count = (row._count as { users: number })?.users ?? 0;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenMemberModal(row.id as string); }}
            className="flex items-center gap-1 text-blue-600 hover:underline"
            title="멤버 관리"
          >
            <Users className="h-3.5 w-3.5" />
            <span>{count}명</span>
          </button>
        );
      },
    },
    {
      key: 'description',
      label: '설명',
      render: (row: GroupRow) => (
        <span className="text-sm text-gray-500 truncate max-w-[200px] block">
          {(row.description as string) || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: GroupRow) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleActive(row.id as string, row.isActive as boolean); }}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={(row.isActive as boolean) ? '비활성화' : '활성화'}
          >
            {(row.isActive as boolean)
              ? <ToggleRight className="h-5 w-5 text-indigo-600" />
              : <ToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!row.isDefault && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(row.id as string, row.name as string, row.isDefault as boolean); }}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="급여 그룹" subtitle="급여 그룹을 관리합니다. 그룹별로 급여일과 관리자를 설정할 수 있습니다.">
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4" />
          그룹 추가
        </Button>
      </PageHeader>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="급여 그룹을 불러오는 중..." className="py-12" />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="등록된 급여 그룹이 없습니다"
              description="급여 그룹을 추가하면 직원을 그룹별로 관리할 수 있습니다."
              action={
                <Button size="sm" onClick={handleCreate}>
                  그룹 추가
                </Button>
              }
            />
          ) : (
            <Table
              columns={columns}
              data={groups as unknown as GroupRow[]}
              onRowClick={(row) => handleEdit(row)}
            />
          )}
        </CardBody>
      </Card>

      {/* 추가/수정 모달 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? '급여 그룹 수정' : '급여 그룹 추가'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name.trim()}>
              {isSaving ? '저장 중...' : editId ? '수정' : '추가'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="그룹명"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="예: 정규직 A그룹"
          />
          <Input
            label="코드"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="예: PG-01"
          />
          <Input
            label="급여일"
            type="number"
            value={String(form.payDay)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setForm({ ...form, payDay: Math.max(1, Math.min(31, val)) });
            }}
            placeholder="1~31"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="그룹에 대한 설명을 입력하세요"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-400"
            />
          </div>
        </div>
      </Modal>

      {/* 멤버 관리 모달 */}
      <Modal
        open={!!memberGroupId}
        onClose={handleCloseMemberModal}
        title={`급여 그룹 멤버 관리 — ${memberGroupName}`}
        size="lg"
        footer={
          memberTab === 'members' ? (
            <>
              <Button variant="ghost" onClick={handleCloseMemberModal}>
                닫기
              </Button>
              <Button
                onClick={handleUnassign}
                disabled={isMemberSaving || selectedMemberIds.size === 0}
                variant="danger"
              >
                <UserMinus className="h-4 w-4" />
                {isMemberSaving ? '처리 중...' : `선택 해제 (${selectedMemberIds.size})`}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleCloseMemberModal}>
                닫기
              </Button>
              <Button
                onClick={handleAssign}
                disabled={isMemberSaving || selectedAssignIds.size === 0}
              >
                <UserPlus className="h-4 w-4" />
                {isMemberSaving ? '처리 중...' : `선택 배정 (${selectedAssignIds.size})`}
              </Button>
            </>
          )
        }
      >
        {/* 탭 헤더 */}
        <div className="mb-4 flex border-b border-gray-200">
          <button
            onClick={() => { setMemberTab('members'); setSelectedMemberIds(new Set()); setMemberSearch(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              memberTab === 'members'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            현재 멤버 ({members.length})
          </button>
          <button
            onClick={() => { setMemberTab('assign'); setSelectedAssignIds(new Set()); setAssignSearch(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              memberTab === 'assign'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            직원 배정
          </button>
        </div>

        {memberTab === 'members' ? (
          /* 현재 멤버 탭 */
          <div>
            {/* 검색 */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="이름, 이메일, 부서 검색"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-400"
              />
            </div>

            {isMembersLoading ? (
              <Spinner text="멤버를 불러오는 중..." className="py-8" />
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                {members.length === 0 ? '배정된 멤버가 없습니다.' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {/* 전체 선택 */}
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                  <Checkbox
                    checked={filteredMembers.length > 0 && filteredMembers.every((m) => selectedMemberIds.has(m.id))}
                    indeterminate={filteredMembers.some((m) => selectedMemberIds.has(m.id)) && !filteredMembers.every((m) => selectedMemberIds.has(m.id))}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedMemberIds(new Set(filteredMembers.map((m) => m.id)));
                      } else {
                        setSelectedMemberIds(new Set());
                      }
                    }}
                    label={`전체 선택 (${filteredMembers.length}명)`}
                  />
                </div>
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 last:border-b-0 hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedMemberIds.has(member.id)}
                      onChange={(checked) => {
                        const next = new Set(selectedMemberIds);
                        if (checked) next.add(member.id);
                        else next.delete(member.id);
                        setSelectedMemberIds(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{member.name}</span>
                        {member.employeeNumber && (
                          <span className="text-xs text-gray-400">{member.employeeNumber}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{member.email}</span>
                        {member.department?.name && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{member.department.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 직원 배정 탭 */
          <div>
            {/* 검색 */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="이름, 이메일, 부서 검색"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-400"
              />
            </div>

            {isEmployeesLoading || isMembersLoading ? (
              <Spinner text="직원 목록을 불러오는 중..." className="py-8" />
            ) : filteredUnassigned.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                {unassignedEmployees.length === 0 ? '배정 가능한 직원이 없습니다.' : '검색 결과가 없습니다.'}
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {/* 전체 선택 */}
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                  <Checkbox
                    checked={filteredUnassigned.length > 0 && filteredUnassigned.every((e) => selectedAssignIds.has(e.id))}
                    indeterminate={filteredUnassigned.some((e) => selectedAssignIds.has(e.id)) && !filteredUnassigned.every((e) => selectedAssignIds.has(e.id))}
                    onChange={(checked) => {
                      if (checked) {
                        setSelectedAssignIds(new Set(filteredUnassigned.map((e) => e.id)));
                      } else {
                        setSelectedAssignIds(new Set());
                      }
                    }}
                    label={`전체 선택 (${filteredUnassigned.length}명)`}
                  />
                </div>
                {filteredUnassigned.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 last:border-b-0 hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedAssignIds.has(emp.id)}
                      onChange={(checked) => {
                        const next = new Set(selectedAssignIds);
                        if (checked) next.add(emp.id);
                        else next.delete(emp.id);
                        setSelectedAssignIds(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                        {emp.employeeNumber && (
                          <span className="text-xs text-gray-400">{emp.employeeNumber}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{emp.email}</span>
                        {emp.department?.name && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{emp.department.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
