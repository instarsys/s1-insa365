'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Breadcrumb, PageHeader } from '@/components/layout';
import {
  Avatar, Badge, Button, Card, CardHeader, CardTitle, CardBody,
  Tabs, Spinner, EmptyState, Input, Select, DatePicker, Modal, useToast,
  StatusBadgeDropdown, PhoneInput,
} from '@/components/ui';
import { useEmployee, useEmployees, useEmployeeMutations, useEmployeeSalaryItems, updateSalaryItems, toggleSalaryItemActive, syncSalaryItems } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveRequests, useLeaveBalance, useLeaveLedger, type LedgerEntry } from '@/hooks/useLeave';
import { LeaveAdjustmentModal } from '@/components/leave/LeaveAdjustmentModal';
import { formatDate, formatKRW } from '@/lib/utils';
import { formatPhoneNumber, stripPhoneNumber } from '@/lib/phone';
import { fetcher, apiPost, apiPut, apiDelete } from '@/lib/api';
import { HIRE_TYPE_OPTIONS, KOREAN_BANKS, SALARY_TYPE_OPTIONS, INSURANCE_MODE } from '@/lib/constants';
import {
  ChevronLeft, ChevronRight, ChevronDown, Pencil, X, Check,
  Briefcase, Phone, Mail, Calendar, Building2, MapPin, FileText,
  Home, Users, Landmark, Camera, Lock, Shield,
  UserMinus, UserCheck, LogOut, Clock, Info, AlertTriangle,
} from 'lucide-react';

const DETAIL_TABS = [
  { key: 'basic', label: '기본정보' },
  { key: 'salary', label: '급여' },
  { key: 'attendance', label: '근태' },
  { key: 'leave', label: '휴가' },
  { key: 'documents', label: '문서' },
];

interface DepartmentItem { id: string; name: string; }
interface PositionItem { id: string; name: string; }

interface WorkPolicyItem { id: string; name: string; isDefault: boolean; }

interface EditFormState {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  workPolicyId: string;
  joinDate: string;
  resignDate: string;
  resignReason: string;
  address: string;
  isHouseholder: boolean;
  dependents: string;
  hireType: string;
  bankName: string;
  bankAccount: string;
  rrn: string;
  attendanceExempt: boolean;
}

const emptyEditForm: EditFormState = {
  name: '', email: '', phone: '',
  departmentId: '', positionId: '', workPolicyId: '',
  joinDate: '', resignDate: '', resignReason: '',
  address: '', isHouseholder: false, dependents: '1',
  hireType: '', bankName: '', bankAccount: '', rrn: '',
  attendanceExempt: false,
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { user: authUser } = useAuth();
  const id = params.id as string;
  const from = searchParams.get('from');

  const tabParam = searchParams.get('tab');
  const initialTab = DETAIL_TABS.some(t => t.key === tabParam) ? tabParam! : 'basic';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [resignDate, setResignDate] = useState(new Date().toISOString().slice(0, 10));
  const [resignReason, setResignReason] = useState('');
  const [isResigning, setIsResigning] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [isReturning, setIsReturning] = useState(false);
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [rehireDate, setRehireDate] = useState(new Date().toISOString().slice(0, 10));
  const [isRehiring, setIsRehiring] = useState(false);
  const [isCancellingResign, setIsCancellingResign] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [ledgerYear, setLedgerYear] = useState(new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { employee, isLoading, mutate } = useEmployee(id);
  const { updateEmployee, deleteEmployee } = useEmployeeMutations();

  // Department & position lists for select dropdowns
  const { data: deptData } = useSWR<{ items: DepartmentItem[] }>('/api/departments', fetcher);
  const { data: posData } = useSWR<{ items: PositionItem[] }>('/api/positions', fetcher);

  const departmentOptions = useMemo(() => [
    { value: '', label: '부서 선택' },
    ...(deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
  ], [deptData]);

  const positionOptions = useMemo(() => [
    { value: '', label: '직급 선택' },
    ...(posData?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
  ], [posData]);

  // WorkPolicy list for select dropdown
  const { data: wpData } = useSWR<{ items: WorkPolicyItem[] }>('/api/settings/work-policy', fetcher);
  const workPolicyOptions = useMemo(() => [
    { value: '', label: '근무정책 선택' },
    ...(wpData?.items ?? []).map((wp) => ({
      value: wp.id,
      label: wp.isDefault ? `${wp.name} (기본)` : wp.name,
    })),
  ], [wpData]);

  const hireTypeOptions = useMemo(() => [
    { value: '', label: '선택' },
    ...HIRE_TYPE_OPTIONS.map((h) => ({ value: h.value, label: h.label })),
  ], []);

  const bankOptions = useMemo(() => [
    { value: '', label: '은행 선택' },
    ...KOREAN_BANKS.map((b) => ({ value: b.value, label: b.label })),
  ], []);

  // For prev/next navigation
  const { employees: allEmployees } = useEmployees({ limit: 200 });
  const currentIndex = useMemo(
    () => allEmployees.findIndex((e) => e.id === id),
    [allEmployees, id],
  );
  const prevId = currentIndex > 0 ? allEmployees[currentIndex - 1]?.id : null;
  const nextId = currentIndex < allEmployees.length - 1 ? allEmployees[currentIndex + 1]?.id : null;

  // Leave data for leave tab
  const { balance, mutate: mutateBalance } = useLeaveBalance(id);
  const { requests: leaveRequests } = useLeaveRequests({ userId: id });
  const { entries: ledgerEntries, isLoading: ledgerLoading, mutate: mutateLedger } = useLeaveLedger(id, ledgerYear);

  // Edit form state
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);

  const startEdit = useCallback(() => {
    if (!employee) return;
    const emp = employee as Record<string, unknown>;
    setEditForm({
      name: (emp.name as string) ?? '',
      email: (emp.email as string) ?? '',
      phone: stripPhoneNumber((emp.phone as string) ?? ''),
      departmentId: (emp.departmentId as string) ?? '',
      positionId: (emp.positionId as string) ?? '',
      workPolicyId: (emp.workPolicyId as string) ?? '',
      joinDate: emp.joinDate ? (emp.joinDate as string).slice(0, 10) : '',
      resignDate: emp.resignDate ? (emp.resignDate as string).slice(0, 10) : '',
      resignReason: (emp.resignReason as string) ?? '',
      address: (emp.address as string) ?? '',
      isHouseholder: (emp.isHouseholder as boolean) ?? false,
      dependents: String((emp.dependents as number) ?? 1),
      hireType: (emp.hireType as string) ?? '',
      bankName: (emp.bankName as string) ?? '',
      bankAccount: (emp.bankAccount as string) ?? '',
      rrn: (emp.rrn as string) ?? '',
      attendanceExempt: (emp.attendanceExempt as boolean) ?? false,
    });
    setIsEditing(true);
  }, [employee]);

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm(emptyEditForm);
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.email || !editForm.phone || !editForm.rrn) {
      toast.error('이름, 이메일, 연락처, 주민등록번호는 필수입니다.');
      return;
    }
    if (!editForm.workPolicyId) {
      toast.error('근무정책을 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        departmentId: editForm.departmentId || null,
        positionId: editForm.positionId || null,
        workPolicyId: editForm.workPolicyId || null,
        joinDate: editForm.joinDate || null,
        resignDate: editForm.resignDate || null,
        resignReason: editForm.resignReason || null,
        address: editForm.address || null,
        isHouseholder: editForm.isHouseholder,
        dependents: parseInt(editForm.dependents) || 1,
        hireType: editForm.hireType || null,
        bankName: editForm.bankName || null,
        attendanceExempt: editForm.attendanceExempt,
      };
      if (editForm.bankAccount) {
        payload.bankAccount = editForm.bankAccount;
      }
      payload.rrn = editForm.rrn;
      await updateEmployee(id, payload);
      toast.success('직원 정보가 수정되었습니다.');
      setIsEditing(false);
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `수정에 실패했습니다: ${msg}` : '수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      const { uploadUrl, imageUrl } = await apiPost<{ uploadUrl: string; imageUrl: string }>(
        `/api/employees/${id}/profile-image`,
        { contentType: file.type },
      );
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      await updateEmployee(id, { profileImageUrl: imageUrl });
      toast.success('프로필 사진이 업로드되었습니다.');
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `프로필 사진 업로드에 실패했습니다: ${msg}` : '프로필 사진 업로드에 실패했습니다.');
    }
  };

  const handleResign = async () => {
    if (!resignDate) {
      toast.error('퇴사일을 입력해주세요.');
      return;
    }
    setIsResigning(true);
    try {
      await deleteEmployee(id, { resignDate, resignReason: resignReason || undefined });
      toast.success('퇴직 처리되었습니다.');
      setShowResignModal(false);
      router.push('/employees/list');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `퇴직 처리에 실패했습니다: ${msg}` : '퇴직 처리에 실패했습니다.');
    } finally {
      setIsResigning(false);
    }
  };

  const handleLeave = async () => {
    if (!leaveStartDate) {
      toast.error('휴직 시작일을 입력해주세요.');
      return;
    }
    if (!leaveReason.trim()) {
      toast.error('휴직 사유를 입력해주세요.');
      return;
    }
    setIsLeaving(true);
    try {
      await apiPost(`/api/employees/${id}/leave`, { leaveStartDate, leaveReason });
      toast.success('휴직 처리되었습니다.');
      setShowLeaveModal(false);
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `휴직 처리에 실패했습니다: ${msg}` : '휴직 처리에 실패했습니다.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleReturn = async () => {
    if (!returnDate) {
      toast.error('복귀일을 입력해주세요.');
      return;
    }
    setIsReturning(true);
    try {
      await apiDelete(`/api/employees/${id}/leave`, { returnDate });
      toast.success('복귀 처리되었습니다.');
      setShowReturnModal(false);
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `복귀 처리에 실패했습니다: ${msg}` : '복귀 처리에 실패했습니다.');
    } finally {
      setIsReturning(false);
    }
  };

  const handleRehire = async () => {
    if (!rehireDate) {
      toast.error('재입사일을 입력해주세요.');
      return;
    }
    setIsRehiring(true);
    try {
      await apiPost(`/api/employees/${id}/rehire`, { rehireDate });
      toast.success('재입사 처리되었습니다.');
      setShowRehireModal(false);
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `재입사 처리에 실패했습니다: ${msg}` : '재입사 처리에 실패했습니다.');
    } finally {
      setIsRehiring(false);
    }
  };

  const handleCancelResign = async () => {
    setIsCancellingResign(true);
    try {
      await apiPost(`/api/employees/${id}/rehire`, { cancel: true });
      toast.success('퇴직이 취소되었습니다.');
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `퇴직 취소에 실패했습니다: ${msg}` : '퇴직 취소에 실패했습니다.');
    } finally {
      setIsCancellingResign(false);
    }
  };

  if (isLoading) {
    return <Spinner text="직원 정보를 불러오는 중..." className="py-20" />;
  }

  if (!employee) {
    return (
      <EmptyState
        title="직원을 찾을 수 없습니다"
        description="존재하지 않거나 삭제된 직원입니다."
        action={
          <Button variant="secondary" onClick={() => router.push('/employees/list')}>
            목록으로 돌아가기
          </Button>
        }
      />
    );
  }

  const emp = employee as Record<string, unknown>;
  const dept = emp.department as { id: string; name: string } | null;
  const pos = emp.position as { id: string; name: string } | null;
  const salaryItems = (emp.employeeSalaryItems as Array<Record<string, unknown>>) ?? [];
  const canViewSensitive = authUser?.canViewSensitive ?? false;

  const hireTypeLabel = HIRE_TYPE_OPTIONS.find((h) => h.value === emp.hireType)?.label ?? '-';
  const bankNameLabel = KOREAN_BANKS.find((b) => b.value === emp.bankName)?.label ?? (emp.bankName as string) ?? '-';
  const displayBankAccount = canViewSensitive ? ((emp.bankAccount as string) || '-') : (emp.hasBankAccount ? '●●●●●●●●●●' : '-');
  const displayRrn = canViewSensitive ? ((emp.rrn as string) || '-') : (emp.hasRrn ? '●●●●●●-●●●●●●●' : '-');

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        items={
          from === 'attendance-calendar'
            ? [{ label: '달력형 근태', href: '/attendance/calendar' }, { label: emp.name as string }]
            : [{ label: '직원 관리', href: '/employees/list' }, { label: emp.name as string }]
        }
        className="mb-4"
      />

      {/* Profile Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              name={(emp.name as string) || '?'}
              imageUrl={emp.profileImageUrl as string | undefined}
              size="lg"
            />
            {isEditing && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfileImageUpload(file);
                  }}
                />
              </>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{emp.name as string}</h1>
              <StatusBadgeDropdown
                status={emp.employeeStatus as string}
                onLeave={() => {
                  setLeaveStartDate(new Date().toISOString().slice(0, 10));
                  setLeaveReason('');
                  setShowLeaveModal(true);
                }}
                onReturn={() => {
                  setReturnDate(new Date().toISOString().slice(0, 10));
                  setShowReturnModal(true);
                }}
                onResign={() => {
                  setResignDate(new Date().toISOString().slice(0, 10));
                  setResignReason('');
                  setShowResignModal(true);
                }}
                onRehire={() => {
                  setRehireDate(new Date().toISOString().slice(0, 10));
                  setShowRehireModal(true);
                }}
                onCancelResign={handleCancelResign}
              />
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {emp.employeeNumber as string}
              {dept && <> &middot; {dept.name}</>}
              {pos && <> &middot; {pos.name}</>}
            </p>
          </div>
        </div>

        {/* Prev/Next navigation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${allEmployees.length}` : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!prevId}
            onClick={() => prevId && router.push(`/employees/${prevId}`)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!nextId}
            onClick={() => nextId && router.push(`/employees/${nextId}`)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={DETAIL_TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* Tab Content: Basic Info */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Edit Controls */}
          <div className="flex justify-end">
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4" />
                수정
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4" />
                  취소
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={isSaving}>
                  <Check className="h-4 w-4" />
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section 1: 인사 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-400" />
                인사 정보
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <InfoItem label="사번" value={emp.employeeNumber as string} />
                {isEditing ? (
                  <Select
                    label="입사구분"
                    options={hireTypeOptions}
                    value={editForm.hireType}
                    onChange={(v) => setEditForm((f) => ({ ...f, hireType: v }))}
                  />
                ) : (
                  <InfoItem label="입사구분" value={hireTypeLabel} />
                )}
                {isEditing ? (
                  <Select
                    label="부서"
                    options={departmentOptions}
                    value={editForm.departmentId}
                    onChange={(v) => setEditForm((f) => ({ ...f, departmentId: v }))}
                  />
                ) : (
                  <InfoItem label="부서" value={dept?.name ?? '-'} />
                )}
                {isEditing ? (
                  <Select
                    label="직급"
                    options={positionOptions}
                    value={editForm.positionId}
                    onChange={(v) => setEditForm((f) => ({ ...f, positionId: v }))}
                  />
                ) : (
                  <InfoItem label="직급" value={pos?.name ?? '-'} />
                )}
                {isEditing ? (
                  <DatePicker
                    label="입사일"
                    value={editForm.joinDate}
                    onChange={(v) => setEditForm((f) => ({ ...f, joinDate: v }))}
                  />
                ) : (
                  <InfoItem label="입사일" value={emp.joinDate ? formatDate(emp.joinDate as string) : '-'} />
                )}
                {(emp.employeeStatus as string) === 'RESIGNED' && (
                  <>
                    {isEditing ? (
                      <DatePicker
                        label="퇴사일"
                        value={editForm.resignDate}
                        onChange={(v) => setEditForm((f) => ({ ...f, resignDate: v }))}
                      />
                    ) : (
                      <InfoItem label="퇴사일" value={emp.resignDate ? formatDate(emp.resignDate as string) : '-'} />
                    )}
                    {isEditing ? (
                      <Input
                        label="퇴사사유"
                        value={editForm.resignReason}
                        onChange={(e) => setEditForm((f) => ({ ...f, resignReason: e.target.value }))}
                        placeholder="사유 입력"
                        maxLength={200}
                      />
                    ) : (
                      <InfoItem label="퇴사사유" value={(emp.resignReason as string) || '-'} />
                    )}
                  </>
                )}
                {(emp.employeeStatus as string) === 'ON_LEAVE' && (
                  <>
                    <InfoItem label="휴직시작일" value={emp.leaveStartDate ? formatDate(emp.leaveStartDate as string) : '-'} />
                    <InfoItem label="휴직사유" value={(emp.leaveReason as string) || '-'} />
                    {Boolean(emp.leaveEndDate) && (
                      <InfoItem label="복귀일" value={formatDate(emp.leaveEndDate as string)} />
                    )}
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Section: 근무 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                근무 설정
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {isEditing ? (
                  <Select
                    label="근무정책"
                    options={workPolicyOptions}
                    value={editForm.workPolicyId}
                    onChange={(v) => setEditForm((f) => ({ ...f, workPolicyId: v }))}
                  />
                ) : (
                  <InfoItem
                    label="근무정책"
                    value={(emp.workPolicy as { name: string } | null)?.name ?? '기본 정책'}
                  />
                )}
                <InfoItem
                  label="근무지"
                  value={(emp.workLocation as { name: string } | null)?.name ?? '-'}
                />
                <div className="sm:col-span-2">
                  {isEditing ? (
                    <div className="w-full">
                      <label className="mb-1 block text-xs font-medium text-gray-700">근태 면제</label>
                      <button
                        type="button"
                        onClick={() => {
                          if ((emp.salaryType as string) === 'HOURLY') return;
                          setEditForm((f) => ({ ...f, attendanceExempt: !f.attendanceExempt }));
                        }}
                        disabled={(emp.salaryType as string) === 'HOURLY'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          editForm.attendanceExempt ? 'bg-indigo-600' : 'bg-gray-300'
                        } ${(emp.salaryType as string) === 'HOURLY' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            editForm.attendanceExempt ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-sm text-gray-600">
                        {editForm.attendanceExempt ? 'ON' : 'OFF'}
                      </span>
                      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-start gap-2">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <div className="text-xs text-gray-500">
                            <p>근태면제 기능은 월급제 직원만 사용할 수 있습니다. 설정 시 출퇴근 기록 없이 매월 기본급과 고정수당이 지급됩니다.</p>
                            <p className="mt-1">시급제는 근무시간을 기준으로 급여가 산정되므로 근태면제를 사용할 수 없습니다.</p>
                          </div>
                        </div>
                      </div>
                      {(emp.salaryType as string) === 'HOURLY' && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <p className="text-xs text-amber-700">현재 이 직원은 시급제이므로 근태면제를 설정할 수 없습니다.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <InfoItem
                        label="근태 면제"
                        value={(emp.attendanceExempt as boolean) ? 'ON' : 'OFF'}
                      />
                      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-start gap-2">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <div className="text-xs text-gray-500">
                            <p>근태면제 기능은 월급제 직원만 사용할 수 있습니다. 설정 시 출퇴근 기록 없이 매월 기본급과 고정수당이 지급됩니다.</p>
                            <p className="mt-1">시급제는 근무시간을 기준으로 급여가 산정되므로 근태면제를 사용할 수 없습니다.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section 2: 개인 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                개인 정보
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {isEditing ? (
                  <Input
                    label="이메일"
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                ) : (
                  <InfoItem label="이메일" value={emp.email as string} required />
                )}
                {isEditing ? (
                  <PhoneInput
                    label="연락처"
                    required
                    value={editForm.phone}
                    onChange={(digits) => setEditForm((f) => ({ ...f, phone: digits }))}
                    placeholder="010-1234-5678"
                  />
                ) : (
                  <InfoItem label="연락처" value={formatPhoneNumber((emp.phone as string) || '')} required />
                )}
                <div className="sm:col-span-2">
                  {isEditing ? (
                    <Input
                      label="주소"
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="주소 입력"
                      maxLength={200}
                    />
                  ) : (
                    <InfoItem label="주소" value={(emp.address as string) || '-'} />
                  )}
                </div>
                {isEditing ? (
                  <div className="w-full">
                    <label className="mb-1 block text-xs font-medium text-gray-700">세대주여부</label>
                    <button
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, isHouseholder: !f.isHouseholder }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editForm.isHouseholder ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.isHouseholder ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="ml-2 text-sm text-gray-600">
                      {editForm.isHouseholder ? '세대주' : '세대원'}
                    </span>
                  </div>
                ) : (
                  <InfoItem label="세대주여부" value={(emp.isHouseholder as boolean) ? '세대주' : '세대원'} />
                )}
                {isEditing ? (
                  <Input
                    label="부양가족수"
                    type="number"
                    min="0"
                    max="20"
                    value={editForm.dependents}
                    onChange={(e) => setEditForm((f) => ({ ...f, dependents: e.target.value }))}
                  />
                ) : (
                  <InfoItem label="부양가족수" value={`${(emp.dependents as number) ?? 1}명`} />
                )}
                {isEditing ? (
                  <Input
                    label="주민등록번호"
                    value={editForm.rrn}
                    onChange={(e) => setEditForm((f) => ({ ...f, rrn: e.target.value }))}
                    placeholder="000000-0000000"
                    maxLength={14}
                    required
                  />
                ) : (
                  <InfoItem label="주민등록번호" value={displayRrn} />
                )}
              </div>
            </CardBody>
          </Card>

          {/* Section 3: 계좌 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-gray-400" />
                계좌 정보
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {isEditing ? (
                  <Select
                    label="은행명"
                    options={bankOptions}
                    value={editForm.bankName}
                    onChange={(v) => setEditForm((f) => ({ ...f, bankName: v }))}
                  />
                ) : (
                  <InfoItem label="은행명" value={bankNameLabel} />
                )}
                {isEditing ? (
                  <Input
                    label="계좌번호"
                    value={editForm.bankAccount}
                    onChange={(e) => setEditForm((f) => ({ ...f, bankAccount: e.target.value }))}
                    placeholder="계좌번호 입력 (변경 시에만)"
                    maxLength={50}
                  />
                ) : (
                  <InfoItem label="계좌번호" value={displayBankAccount} />
                )}
              </div>
            </CardBody>
          </Card>
          </div>
        </div>
      )}

      {/* Tab Content: Salary */}
      {activeTab === 'salary' && (
        <SalaryTab
          employeeId={id}
          employee={emp}
          onEmployeeUpdate={mutate}
        />
      )}

      {/* Tab Content: Attendance */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader>
            <CardTitle>근태 현황</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-500">
              근태 관리 &gt; 목록형에서 이 직원의 출근 기록을 확인하세요.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => router.push(`/attendance/records?search=${encodeURIComponent(emp.name as string)}`)}
            >
              근태 기록 보기
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Tab Content: Leave */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          {/* 잔여 휴가 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>잔여 휴가</CardTitle>
            </CardHeader>
            <CardBody>
              {balance ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{balance.totalDays}</p>
                    <p className="mt-1 text-xs text-gray-500">총 부여</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{balance.usedDays}</p>
                    <p className="mt-1 text-xs text-gray-500">사용</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{balance.remainingDays}</p>
                    <p className="mt-1 text-xs text-gray-500">잔여</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">휴가 잔여 정보가 없습니다.</p>
              )}
            </CardBody>
          </Card>

          {/* 연차 원장 */}
          <Card>
            <CardHeader>
              <CardTitle>연차 원장</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={ledgerYear}
                  onChange={(e) => setLedgerYear(Number(e.target.value))}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAdjustModal(true)}
                >
                  + 보정
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {ledgerLoading ? (
                <div className="py-8"><Spinner text="원장을 불러오는 중..." /></div>
              ) : ledgerEntries.length === 0 ? (
                <EmptyState
                  title="발생/사용 이력이 없습니다"
                  description={`${ledgerYear}년도 연차 발생 또는 사용 이력이 없습니다.`}
                />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">날짜</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구분</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">일수</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">잔여</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledgerEntries.map((entry: LedgerEntry, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-gray-600">{entry.date}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              entry.type === 'ACCRUAL' ? 'success' :
                              entry.type === 'USAGE' ? 'info' :
                              entry.type === 'ADJUSTMENT' ? 'warning' : 'gray'
                            }
                          >
                            {entry.type === 'ACCRUAL' ? '자동발생' :
                             entry.type === 'USAGE' ? '사용' :
                             entry.type === 'ADJUSTMENT' ? '보정' : '이월'}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${entry.days > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {entry.days > 0 ? `+${entry.days}` : entry.days}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{entry.runningBalance}</td>
                        <td className="px-4 py-3 text-gray-500">{entry.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          {/* 휴가 신청 이력 */}
          <Card>
            <CardHeader>
              <CardTitle>휴가 신청 이력</CardTitle>
              <Badge variant="info">{leaveRequests.length}건</Badge>
            </CardHeader>
            <CardBody className="p-0">
              {leaveRequests.length === 0 ? (
                <EmptyState
                  title="휴가 신청 기록이 없습니다"
                  description="아직 휴가 신청 이력이 없습니다."
                />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유형</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">기간</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">일수</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaveRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-4 py-3">{req.type}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(req.startDate)} ~ {formatDate(req.endDate)}
                        </td>
                        <td className="px-4 py-3">{req.days}일</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              req.status === 'APPROVED' ? 'success' :
                              req.status === 'REJECTED' ? 'error' :
                              req.status === 'PENDING' ? 'warning' : 'gray'
                            }
                          >
                            {req.status === 'APPROVED' ? '승인' :
                             req.status === 'REJECTED' ? '반려' :
                             req.status === 'PENDING' ? '대기' : req.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          {/* 보정 모달 */}
          {emp && (
            <LeaveAdjustmentModal
              open={showAdjustModal}
              onClose={() => setShowAdjustModal(false)}
              userId={id}
              userName={emp.name as string}
              year={ledgerYear}
              onSuccess={() => { mutateLedger(); mutateBalance(); }}
            />
          )}
        </div>
      )}

      {/* Tab Content: Documents */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>문서</CardTitle>
          </CardHeader>
          <CardBody>
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="문서 기능 준비 중"
              description="직원 문서 관리 기능은 다음 업데이트에서 제공됩니다."
            />
          </CardBody>
        </Card>
      )}

      {/* 퇴직 처리 Modal */}
      <Modal
        open={showResignModal}
        onClose={() => setShowResignModal(false)}
        title="퇴직 처리"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowResignModal(false)} disabled={isResigning}>
              취소
            </Button>
            <Button variant="danger" size="sm" onClick={handleResign} disabled={isResigning}>
              {isResigning ? '처리 중...' : '퇴직 처리'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{emp.name as string}</span>님을 퇴직 처리하시겠습니까?
          </p>
          <DatePicker
            label="퇴사일"
            value={resignDate}
            onChange={(v) => setResignDate(v)}
            required
          />
          <Input
            label="퇴사사유"
            value={resignReason}
            onChange={(e) => setResignReason(e.target.value)}
            placeholder="퇴사 사유를 입력하세요 (선택)"
            maxLength={200}
          />
          <p className="text-xs text-gray-500">
            퇴직 처리 시 해당 직원은 비활성화되며, 직원 목록에서 제외됩니다.
          </p>
        </div>
      </Modal>

      {/* 휴직 처리 Modal */}
      <Modal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="휴직 처리"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowLeaveModal(false)} disabled={isLeaving}>
              취소
            </Button>
            <Button size="sm" onClick={handleLeave} disabled={isLeaving}>
              {isLeaving ? '처리 중...' : '휴직 처리'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{emp.name as string}</span>님을 휴직 처리하시겠습니까?
          </p>
          <DatePicker
            label="휴직 시작일"
            value={leaveStartDate}
            onChange={(v) => setLeaveStartDate(v)}
            required
          />
          <Input
            label="휴직 사유"
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="휴직 사유를 입력하세요"
            maxLength={200}
            required
          />
          <p className="text-xs text-gray-500">
            휴직 중인 직원은 급여 계산 대상에 포함됩니다.
          </p>
        </div>
      </Modal>

      {/* 복귀 처리 Modal */}
      <Modal
        open={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="복귀 처리"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowReturnModal(false)} disabled={isReturning}>
              취소
            </Button>
            <Button size="sm" onClick={handleReturn} disabled={isReturning}>
              {isReturning ? '처리 중...' : '복귀 처리'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{emp.name as string}</span>님을 복귀 처리하시겠습니까?
          </p>
          {Boolean(emp.leaveStartDate) && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">휴직 시작일:</span> {formatDate(emp.leaveStartDate as string)}
              </p>
              {Boolean(emp.leaveReason) && (
                <p className="mt-1 text-gray-600">
                  <span className="font-medium text-gray-700">휴직 사유:</span> {emp.leaveReason as string}
                </p>
              )}
            </div>
          )}
          <DatePicker
            label="복귀일"
            value={returnDate}
            onChange={(v) => setReturnDate(v)}
            required
          />
        </div>
      </Modal>

      {/* 재입사 처리 Modal */}
      <Modal
        open={showRehireModal}
        onClose={() => setShowRehireModal(false)}
        title="재입사 처리"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowRehireModal(false)} disabled={isRehiring}>
              취소
            </Button>
            <Button size="sm" onClick={handleRehire} disabled={isRehiring}>
              {isRehiring ? '처리 중...' : '재입사 처리'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{emp.name as string}</span>님을 재입사 처리하시겠습니까?
          </p>
          {Boolean(emp.resignDate) && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="text-gray-600">
                <span className="font-medium text-gray-700">퇴사일:</span> {formatDate(emp.resignDate as string)}
              </p>
              {Boolean(emp.resignReason) && (
                <p className="mt-1 text-gray-600">
                  <span className="font-medium text-gray-700">퇴사사유:</span> {emp.resignReason as string}
                </p>
              )}
            </div>
          )}
          <DatePicker
            label="재입사일"
            value={rehireDate}
            onChange={(v) => setRehireDate(v)}
            required
          />
          <p className="text-xs text-gray-500">
            재입사 처리 시 입사일이 재입사일로 변경되고, 퇴사일/퇴사사유가 초기화됩니다.
          </p>
        </div>
      </Modal>
    </div>
  );
}

// 법정 공제 코드 (비활성화 불가)
const SYSTEM_MANAGED_CODES = new Set(['D01', 'D02', 'D03', 'D04', 'D05', 'D06']);

function ToggleSwitch({ checked, onChange, disabled, title }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function SalaryTab({
  employeeId,
  employee,
  onEmployeeUpdate,
}: {
  employeeId: string;
  employee: Record<string, unknown>;
  onEmployeeUpdate: () => void;
}) {
  const toast = useToast();
  const { items: salaryItems, mutate: mutateSalaryItems } = useEmployeeSalaryItems(employeeId);
  const { updateEmployee } = useEmployeeMutations();

  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [editSalaryType, setEditSalaryType] = useState((employee.salaryType as string) || 'MONTHLY');
  const [editHourlyRate, setEditHourlyRate] = useState(employee.hourlyRate ? String(employee.hourlyRate) : '');
  const [editDailyWorkHours, setEditDailyWorkHours] = useState(
    (employee as Record<string, unknown>).dailyWorkHours ? String((employee as Record<string, unknown>).dailyWorkHours) : '8',
  );
  const [isSavingBasic, setIsSavingBasic] = useState(false);

  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showSystemDeductions, setShowSystemDeductions] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setShowSyncConfirmModal(false);
    try {
      const result = await syncSalaryItems(employeeId) as { created: number; updated?: number };
      await mutateSalaryItems();
      if (result.created > 0 || (result.updated ?? 0) > 0) {
        toast.success(`${result.created}개 추가, ${result.updated ?? 0}개 업데이트되었습니다.`);
      } else {
        toast.info('추가할 항목이 없습니다. 모든 급여 규칙이 이미 등록되어 있습니다.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `동기화에 실패했습니다: ${msg}` : '동기화에 실패했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 4대보험 설정 상태
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);
  const [isSavingInsurance, setIsSavingInsurance] = useState(false);
  const [editNPMode, setEditNPMode] = useState('AUTO');
  const [editHIMode, setEditHIMode] = useState('AUTO');
  const [editEIMode, setEditEIMode] = useState('AUTO');
  const [editManualNPBase, setEditManualNPBase] = useState('');
  const [editManualHIBase, setEditManualHIBase] = useState('');

  const salaryTypeLabel = SALARY_TYPE_OPTIONS.find((o) => o.value === (employee.salaryType as string))?.label ?? '월급제';

  // 통상시급 계산 (월급제: ordinaryWage items / 209, 시급제: hourlyRate)
  const ordinaryHourly = useMemo(() => {
    if ((employee.salaryType as string) === 'HOURLY' && employee.hourlyRate) {
      return Number(employee.hourlyRate);
    }
    const ordinaryTotal = salaryItems
      .filter((i) => i.isOrdinaryWage && i.isActive && i.type !== 'DEDUCTION')
      .reduce((sum, i) => sum + Number(i.amount), 0);
    return ordinaryTotal > 0 ? Math.floor(ordinaryTotal / 209) : 0;
  }, [employee, salaryItems]);

  const salaryTypeOptions = useMemo(() =>
    SALARY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  []);

  const startEditBasic = () => {
    setEditSalaryType((employee.salaryType as string) || 'MONTHLY');
    setEditHourlyRate(employee.hourlyRate ? String(employee.hourlyRate) : '');
    setEditDailyWorkHours(
      (employee as Record<string, unknown>).dailyWorkHours ? String((employee as Record<string, unknown>).dailyWorkHours) : '8',
    );
    setIsEditingBasic(true);
  };

  const saveBasic = async () => {
    setIsSavingBasic(true);
    try {
      await updateEmployee(employeeId, {
        salaryType: editSalaryType,
        hourlyRate: editSalaryType === 'HOURLY' && editHourlyRate ? Number(editHourlyRate) : null,
        dailyWorkHours: editDailyWorkHours ? Number(editDailyWorkHours) : 8,
        ...(editSalaryType === 'HOURLY' ? { attendanceExempt: false } : {}),
      });
      toast.success('급여 기본 정보가 저장되었습니다.');
      setIsEditingBasic(false);
      onEmployeeUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `저장에 실패했습니다: ${msg}` : '저장에 실패했습니다.');
    } finally {
      setIsSavingBasic(false);
    }
  };

  const insuranceModeOptions = useMemo(() => [
    { value: 'AUTO', label: '자동 계산' },
    { value: 'MANUAL', label: '수동 입력' },
    { value: 'NONE', label: '미가입' },
  ], []);

  const insuranceModeNoManualOptions = useMemo(() => [
    { value: 'AUTO', label: '자동 계산' },
    { value: 'NONE', label: '미가입' },
  ], []);

  const insuranceModeLabel = (mode: string) => {
    if (mode === 'MANUAL') return '수동 입력';
    if (mode === 'NONE') return '미가입';
    return '자동 계산';
  };

  const startEditInsurance = () => {
    setEditNPMode((employee.nationalPensionMode as string) || 'AUTO');
    setEditHIMode((employee.healthInsuranceMode as string) || 'AUTO');
    setEditEIMode((employee.employmentInsuranceMode as string) || 'AUTO');
    setEditManualNPBase(employee.manualNationalPensionBase ? String(Number(employee.manualNationalPensionBase)) : '');
    setEditManualHIBase(employee.manualHealthInsuranceBase ? String(Number(employee.manualHealthInsuranceBase)) : '');
    setIsEditingInsurance(true);
  };

  const saveInsurance = async () => {
    setIsSavingInsurance(true);
    try {
      await updateEmployee(employeeId, {
        nationalPensionMode: editNPMode,
        healthInsuranceMode: editHIMode,
        employmentInsuranceMode: editEIMode,
        manualNationalPensionBase: editNPMode === 'MANUAL' && editManualNPBase ? Number(editManualNPBase) : null,
        manualHealthInsuranceBase: editHIMode === 'MANUAL' && editManualHIBase ? Number(editManualHIBase) : null,
      });
      toast.success('4대보험 설정이 저장되었습니다.');
      setIsEditingInsurance(false);
      onEmployeeUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `저장에 실패했습니다: ${msg}` : '저장에 실패했습니다.');
    } finally {
      setIsSavingInsurance(false);
    }
  };

  const startEditItems = () => {
    const amounts: Record<string, string> = {};
    for (const item of salaryItems) {
      if ((item.paymentType === 'FIXED' || item.paymentType === 'VARIABLE') && item.isActive) {
        amounts[item.id] = String(Number(item.amount));
      }
    }
    setEditAmounts(amounts);
    setIsEditingItems(true);
  };

  const saveItems = async () => {
    setIsSavingItems(true);
    try {
      const updates = Object.entries(editAmounts).map(([id, amount]) => ({
        id,
        amount: Number(amount) || 0,
      }));
      await updateSalaryItems(employeeId, updates);
      toast.success('급여 항목이 저장되었습니다.');
      setIsEditingItems(false);
      await mutateSalaryItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `저장에 실패했습니다: ${msg}` : '저장에 실패했습니다.');
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleToggleActive = async (itemId: string, isActive: boolean) => {
    setTogglingId(itemId);
    try {
      await toggleSalaryItemActive(employeeId, itemId, isActive);
      await mutateSalaryItems();
    } catch (err: unknown) {
      const errObj = err as unknown as Record<string, unknown>;
      const msg = errObj?.data ? (errObj.data as { message?: string })?.message : undefined;
      toast.error(msg || '토글에 실패했습니다.');
    } finally {
      setTogglingId(null);
    }
  };

  // 지급/공제 분리 + 활성 항목만 합계
  const payItems = salaryItems.filter((i) => i.type !== 'DEDUCTION');
  const deductionItems = salaryItems.filter((i) => i.type === 'DEDUCTION');
  const systemDeductionItems = deductionItems.filter((i) => SYSTEM_MANAGED_CODES.has(i.code));
  const customDeductionItems = deductionItems.filter((i) => !SYSTEM_MANAGED_CODES.has(i.code));
  const activePayItems = payItems.filter((i) => i.isActive);
  const activeDeductionItems = deductionItems.filter((i) => i.isActive);
  const totalPay = activePayItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalDeduction = activeDeductionItems.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      {/* 급여 기본 정보 + 4대보험 설정 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-gray-400" />
            급여 기본 정보
          </CardTitle>
          {!isEditingBasic ? (
            <Button variant="ghost" size="sm" onClick={startEditBasic}>
              <Pencil className="h-4 w-4" />
              편집
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingBasic(false)} disabled={isSavingBasic}>
                <X className="h-4 w-4" />
                취소
              </Button>
              <Button size="sm" onClick={saveBasic} disabled={isSavingBasic}>
                <Check className="h-4 w-4" />
                {isSavingBasic ? '저장 중...' : '저장'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {isEditingBasic ? (
              <Select
                label="급여구분"
                options={salaryTypeOptions}
                value={editSalaryType}
                onChange={(v) => setEditSalaryType(v)}
              />
            ) : (
              <InfoItem label="급여구분" value={salaryTypeLabel} />
            )}
            {isEditingBasic && editSalaryType === 'HOURLY' ? (
              <Input
                label="시급"
                type="number"
                value={editHourlyRate}
                onChange={(e) => setEditHourlyRate(e.target.value)}
                placeholder="10,320"
              />
            ) : (employee.salaryType as string) === 'HOURLY' ? (
              <InfoItem label="시급" value={formatKRW(Number(employee.hourlyRate ?? 0))} />
            ) : null}
            <InfoItem label="통상시급 (자동)" value={formatKRW(ordinaryHourly)} />
            {isEditingBasic ? (
              <div>
                <Input
                  label="통상 일일 근무시간"
                  type="number"
                  value={editDailyWorkHours}
                  onChange={(e) => setEditDailyWorkHours(e.target.value)}
                  placeholder="8"
                />
                <p className="mt-1 text-xs text-gray-500">연차 유급휴가 급여 산정 기준입니다. 시급 x 통상 일일 근무시간으로 계산됩니다.</p>
              </div>
            ) : (
              <InfoItem label="통상 일일 근무시간" value={`${(employee as Record<string, unknown>).dailyWorkHours ?? 8}시간`} />
            )}
          </div>
        </CardBody>
      </Card>

      {/* 4대보험 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            4대보험 설정
          </CardTitle>
          {!isEditingInsurance ? (
            <Button variant="ghost" size="sm" onClick={startEditInsurance}>
              <Pencil className="h-4 w-4" />
              편집
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingInsurance(false)} disabled={isSavingInsurance}>
                <X className="h-4 w-4" />
                취소
              </Button>
              <Button size="sm" onClick={saveInsurance} disabled={isSavingInsurance}>
                <Check className="h-4 w-4" />
                {isSavingInsurance ? '저장 중...' : '저장'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">보험</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">모드</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">수동 기준액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* 국민연금 */}
              <tr className="hover:bg-indigo-50/30">
                <td className="px-4 py-3 font-medium text-gray-800">국민연금</td>
                <td className="px-4 py-3">
                  {isEditingInsurance ? (
                    <Select
                      options={insuranceModeOptions}
                      value={editNPMode}
                      onChange={(v) => setEditNPMode(v)}
                    />
                  ) : (
                    <Badge variant={
                      (employee.nationalPensionMode as string) === 'NONE' ? 'gray' :
                      (employee.nationalPensionMode as string) === 'MANUAL' ? 'warning' : 'success'
                    }>
                      {insuranceModeLabel((employee.nationalPensionMode as string) || 'AUTO')}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {isEditingInsurance ? (
                    editNPMode === 'MANUAL' ? (
                      <input
                        type="number"
                        className="w-40 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editManualNPBase}
                        onChange={(e) => setEditManualNPBase(e.target.value)}
                        placeholder="기준액 입력"
                      />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )
                  ) : (
                    (employee.nationalPensionMode as string) === 'MANUAL' && employee.manualNationalPensionBase
                      ? formatKRW(Number(employee.manualNationalPensionBase))
                      : <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
              {/* 건강보험 */}
              <tr className="hover:bg-indigo-50/30">
                <td className="px-4 py-3 font-medium text-gray-800">건강보험</td>
                <td className="px-4 py-3">
                  {isEditingInsurance ? (
                    <Select
                      options={insuranceModeOptions}
                      value={editHIMode}
                      onChange={(v) => setEditHIMode(v)}
                    />
                  ) : (
                    <Badge variant={
                      (employee.healthInsuranceMode as string) === 'NONE' ? 'gray' :
                      (employee.healthInsuranceMode as string) === 'MANUAL' ? 'warning' : 'success'
                    }>
                      {insuranceModeLabel((employee.healthInsuranceMode as string) || 'AUTO')}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {isEditingInsurance ? (
                    editHIMode === 'MANUAL' ? (
                      <input
                        type="number"
                        className="w-40 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editManualHIBase}
                        onChange={(e) => setEditManualHIBase(e.target.value)}
                        placeholder="기준액 입력"
                      />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )
                  ) : (
                    (employee.healthInsuranceMode as string) === 'MANUAL' && employee.manualHealthInsuranceBase
                      ? formatKRW(Number(employee.manualHealthInsuranceBase))
                      : <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
              {/* 고용보험 */}
              <tr className="hover:bg-indigo-50/30">
                <td className="px-4 py-3 font-medium text-gray-800">고용보험</td>
                <td className="px-4 py-3">
                  {isEditingInsurance ? (
                    <Select
                      options={insuranceModeNoManualOptions}
                      value={editEIMode}
                      onChange={(v) => setEditEIMode(v)}
                    />
                  ) : (
                    <Badge variant={
                      (employee.employmentInsuranceMode as string) === 'NONE' ? 'gray' : 'success'
                    }>
                      {insuranceModeLabel((employee.employmentInsuranceMode as string) || 'AUTO')}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
          {/* 안내 텍스트 */}
          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              · 장기요양보험은 건강보험 모드를 자동으로 따릅니다.
            </p>
            {((isEditingInsurance && (editNPMode === 'NONE' || editHIMode === 'NONE' || editEIMode === 'NONE')) ||
              (!isEditingInsurance && (
                (employee.nationalPensionMode as string) === 'NONE' ||
                (employee.healthInsuranceMode as string) === 'NONE' ||
                (employee.employmentInsuranceMode as string) === 'NONE'
              ))) && (
              <p className="mt-1 text-xs text-amber-600">
                · &quot;미가입&quot; 설정된 보험은 급여 계산 시 해당 보험료가 0원으로 처리됩니다.
              </p>
            )}
          </div>
        </CardBody>
      </Card>
      </div>

      {salaryItems.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="급여 항목이 없습니다"
              description="급여 규칙에서 항목을 가져와 이 직원의 급여 항목을 설정하세요."
              action={
                <Button onClick={() => handleSync()} disabled={isSyncing}>
                  {isSyncing ? '가져오는 중...' : '급여 규칙에서 항목 가져오기'}
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
      <Card>
      {/* 지급 항목 */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            지급 항목
            <Badge variant="info">
              활성 {activePayItems.length} / 전체 {payItems.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isEditingItems && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setShowSyncConfirmModal(true)} disabled={isSyncing}
                  title="급여규칙의 항목명·과세설정 등을 반영합니다. 금액은 변경되지 않습니다.">
                  급여규칙으로 동기화
                </Button>
              </>
            )}
            {!isEditingItems ? (
              <Button variant="ghost" size="sm" onClick={startEditItems}>
                <Pencil className="h-4 w-4" />
                편집
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditingItems(false)} disabled={isSavingItems}>
                  <X className="h-4 w-4" />
                  취소
                </Button>
                <Button size="sm" onClick={saveItems} disabled={isSavingItems}>
                  <Check className="h-4 w-4" />
                  {isSavingItems ? '저장 중...' : '저장'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {payItems.length === 0 ? (
            <EmptyState
              title="지급 항목이 없습니다"
              description="급여 규칙에서 항목을 가져오거나, 설정에서 항목을 추가하세요."
              action={
                <Button variant="ghost" size="sm" onClick={() => handleSync()} disabled={isSyncing}>
                  {isSyncing ? '가져오는 중...' : '급여 규칙에서 가져오기'}
                </Button>
              }
            />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {isEditingItems && <th className="w-16 px-4 py-3 text-center text-xs font-medium text-gray-500">활성</th>}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">코드</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">항목명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구분</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">금액</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">통상임금</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">비과세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payItems.map((item) => {
                    const isFormula = item.paymentType === 'FORMULA';
                    const isEditable = !isFormula && isEditingItems && item.isActive;
                    const typeLabel = item.paymentType === 'FIXED' ? '고정' : item.paymentType === 'FORMULA' ? '산식' : '변동';
                    const isBase = item.type === 'BASE';
                    const canToggle = !isBase;
                    const inactive = !item.isActive;

                    return (
                      <tr key={item.id} className={`${inactive ? 'bg-gray-50 opacity-50' : 'hover:bg-indigo-50/30'}`}>
                        {isEditingItems && (
                          <td className="px-4 py-3 text-center">
                            {canToggle ? (
                              <ToggleSwitch
                                checked={item.isActive}
                                onChange={(v) => handleToggleActive(item.id, v)}
                                disabled={togglingId === item.id}
                              />
                            ) : (
                              <span title="기본급은 비활성화할 수 없습니다">
                                <Lock className="mx-auto h-4 w-4 text-gray-400" />
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500">{item.code}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={item.paymentType === 'FORMULA' ? 'gray' : 'info'}>
                            {typeLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {inactive ? (
                            <span className="text-gray-400">-</span>
                          ) : isEditable ? (
                            <input
                              type="number"
                              className="w-32 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={editAmounts[item.id] ?? ''}
                              onChange={(e) => setEditAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            />
                          ) : isFormula ? (
                            <span className="flex items-center justify-end gap-1 text-gray-400">
                              <Lock className="h-3 w-3" />
                              (자동)
                            </span>
                          ) : (
                            formatKRW(Number(item.amount))
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.isOrdinaryWage ? <Badge variant="success">Y</Badge> : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.isTaxExempt ? <Badge variant="warning">Y</Badge> : <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-end border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-600">
                  지급 합계: <span className="font-semibold text-gray-900">{formatKRW(totalPay)}</span>
                </span>
              </div>
            </>
          )}
        </CardBody>

      {/* 공제 항목 */}
      <div className="border-t-2 border-gray-200">
        <CardHeader className="border-b-0">
          <CardTitle className="flex items-center gap-2">
            공제 항목
            <Badge variant="error">
              활성 {activeDeductionItems.length} / 전체 {deductionItems.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <div className="p-0">
          {deductionItems.length === 0 ? (
            <EmptyState
              title="공제 항목이 없습니다"
              description="급여 규칙에서 항목을 가져오거나, 설정에서 공제 항목을 추가하세요."
              action={
                <Button variant="ghost" size="sm" onClick={() => handleSync()} disabled={isSyncing}>
                  {isSyncing ? '가져오는 중...' : '급여 규칙에서 가져오기'}
                </Button>
              }
            />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {isEditingItems && <th className="w-16 px-4 py-3 text-center text-xs font-medium text-gray-500">활성</th>}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">코드</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">항목명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구분</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* 법정 공제 요약행 — 클릭 시 접기/펼치기 */}
                  {systemDeductionItems.length > 0 && (
                    <tr
                      onClick={() => setShowSystemDeductions((v) => !v)}
                      className="cursor-pointer select-none hover:bg-gray-50"
                    >
                      {isEditingItems && <td className="px-4 py-3" />}
                      <td className="px-4 py-3" colSpan={isEditingItems ? undefined : 1}>
                        <ChevronDown
                          className={`inline h-4 w-4 text-gray-400 transition-transform ${showSystemDeductions ? '' : '-rotate-90'}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">법정 공제</span>
                        <span className="ml-1.5 text-xs text-gray-400">({systemDeductionItems.length}개)</span>
                        <span className="ml-2 hidden text-xs text-gray-400 sm:inline">
                          {systemDeductionItems.map((i) => i.name).join(', ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="gray">산식</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        <span className="flex items-center justify-end gap-1">
                          <Lock className="h-3 w-3" />
                          (자동)
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* 펼치면 D01~D06 상세행 표시 */}
                  {showSystemDeductions && systemDeductionItems.map((item) => {
                    const typeLabel = item.paymentType === 'FIXED' ? '고정' : item.paymentType === 'FORMULA' ? '산식' : '변동';
                    return (
                      <tr key={item.id} className="bg-gray-50/50 hover:bg-indigo-50/30">
                        {isEditingItems && (
                          <td className="px-4 py-3 text-center">
                            <span title="법정 공제 항목은 비활성화할 수 없습니다">
                              <Lock className="mx-auto h-4 w-4 text-gray-400" />
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500">{item.code}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {item.name}
                          <span className="ml-1.5 text-xs text-gray-400">(법정)</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="gray">{typeLabel}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="flex items-center justify-end gap-1 text-gray-400">
                            <Lock className="h-3 w-3" />
                            (자동)
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* 임의 공제 D07~D12 — 항상 표시 */}
                  {customDeductionItems.map((item) => {
                    const isFormula = item.paymentType === 'FORMULA';
                    const isEditable = !isFormula && isEditingItems && item.isActive;
                    const typeLabel = item.paymentType === 'FIXED' ? '고정' : item.paymentType === 'FORMULA' ? '산식' : '변동';
                    const inactive = !item.isActive;

                    return (
                      <tr key={item.id} className={`${inactive ? 'bg-gray-50 opacity-50' : 'hover:bg-indigo-50/30'}`}>
                        {isEditingItems && (
                          <td className="px-4 py-3 text-center">
                            <ToggleSwitch
                              checked={item.isActive}
                              onChange={(v) => handleToggleActive(item.id, v)}
                              disabled={togglingId === item.id}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500">{item.code}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={isFormula ? 'gray' : 'error'}>
                            {typeLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {inactive ? (
                            <span className="text-gray-400">-</span>
                          ) : isEditable ? (
                            <input
                              type="number"
                              className="w-32 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={editAmounts[item.id] ?? ''}
                              onChange={(e) => setEditAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            />
                          ) : isFormula ? (
                            <span className="flex items-center justify-end gap-1 text-gray-400">
                              <Lock className="h-3 w-3" />
                              (자동)
                            </span>
                          ) : (
                            formatKRW(Number(item.amount))
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-end border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-600">
                  공제 합계: <span className="font-semibold text-red-600">{formatKRW(totalDeduction)}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 합계 요약 바 */}
      <div className="border-t-2 border-gray-200 bg-gray-50/80 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">총 지급</p>
            <p className="text-lg font-bold text-gray-900">{formatKRW(totalPay)}</p>
          </div>
          <span className="text-xl text-gray-400">-</span>
          <div className="text-center">
            <p className="text-xs text-gray-500">총 공제</p>
            <p className="text-lg font-bold text-red-600">{formatKRW(totalDeduction)}</p>
          </div>
          <span className="text-xl text-gray-400">=</span>
          <div className="text-center">
            <p className="text-xs text-gray-500">예상 실수령</p>
            <p className="text-lg font-bold text-indigo-600">{formatKRW(totalPay - totalDeduction)}</p>
          </div>
        </div>
      </div>
      </Card>
      )}

      {/* 동기화 확인 모달 (모드 A) */}
      <Modal
        open={showSyncConfirmModal}
        onClose={() => setShowSyncConfirmModal(false)}
        title="급여규칙으로 동기화"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>설정의 급여규칙을 이 직원에게 동기화합니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>항목명, 과세 설정 등이 급여규칙에 맞게 업데이트됩니다</li>
            <li>누락된 항목은 자동으로 추가됩니다</li>
            <li>금액은 변경되지 않습니다</li>
          </ul>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowSyncConfirmModal(false)}>취소</Button>
          <Button onClick={() => handleSync()} disabled={isSyncing}>
            {isSyncing ? '동기화 중...' : '동기화'}
          </Button>
        </div>
      </Modal>

    </div>
  );
}

function InfoItem({
  label,
  value,
  required,
}: {
  label: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <div className="w-full">
      <p className="mb-1 text-xs font-medium text-gray-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </p>
      <p className="text-sm text-gray-800">{value || '-'}</p>
    </div>
  );
}
