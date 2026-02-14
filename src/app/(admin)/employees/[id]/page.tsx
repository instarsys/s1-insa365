'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Breadcrumb, PageHeader } from '@/components/layout';
import {
  Avatar, Badge, Button, Card, CardHeader, CardTitle, CardBody,
  Tabs, Spinner, EmptyState, Input, Select, DatePicker, useToast,
} from '@/components/ui';
import { useEmployee, useEmployees, useEmployeeMutations, useEmployeePii } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveRequests, useLeaveBalance } from '@/hooks/useLeave';
import { formatDate, formatKRW } from '@/lib/utils';
import { fetcher, apiPost } from '@/lib/api';
import { HIRE_TYPE_OPTIONS, KOREAN_BANKS } from '@/lib/constants';
import {
  ChevronLeft, ChevronRight, Pencil, X, Check,
  Briefcase, Phone, Mail, Calendar, Building2, MapPin, FileText,
  Home, Users, Landmark, Camera, Eye, EyeOff,
} from 'lucide-react';

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE': return <Badge variant="success">재직</Badge>;
    case 'ON_LEAVE': return <Badge variant="warning">휴직</Badge>;
    case 'RESIGNED': return <Badge variant="gray">퇴직</Badge>;
    default: return <Badge variant="gray">{status}</Badge>;
  }
}

const DETAIL_TABS = [
  { key: 'basic', label: '기본정보' },
  { key: 'salary', label: '급여' },
  { key: 'attendance', label: '근태' },
  { key: 'leave', label: '휴가' },
  { key: 'documents', label: '문서' },
];

interface DepartmentItem { id: string; name: string; }
interface PositionItem { id: string; name: string; }

interface EditFormState {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  joinDate: string;
  resignDate: string;
  resignReason: string;
  address: string;
  isHouseholder: boolean;
  dependents: string;
  hireType: string;
  bankName: string;
  bankAccount: string;
}

const emptyEditForm: EditFormState = {
  name: '', email: '', phone: '',
  departmentId: '', positionId: '',
  joinDate: '', resignDate: '', resignReason: '',
  address: '', isHouseholder: false, dependents: '1',
  hireType: '', bankName: '', bankAccount: '',
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user: authUser } = useAuth();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { employee, isLoading, mutate } = useEmployee(id);
  const { updateEmployee } = useEmployeeMutations();

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
  const { balance } = useLeaveBalance(id);
  const { requests: leaveRequests } = useLeaveRequests({ userId: id });

  // PII: bank account
  const { value: decryptedBankAccount, isLoading: piiLoading } = useEmployeePii(id, 'bankAccount', showBankAccount);

  // Edit form state
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);

  const startEdit = useCallback(() => {
    if (!employee) return;
    const emp = employee as Record<string, unknown>;
    setEditForm({
      name: (emp.name as string) ?? '',
      email: (emp.email as string) ?? '',
      phone: (emp.phone as string) ?? '',
      departmentId: (emp.departmentId as string) ?? '',
      positionId: (emp.positionId as string) ?? '',
      joinDate: emp.joinDate ? (emp.joinDate as string).slice(0, 10) : '',
      resignDate: emp.resignDate ? (emp.resignDate as string).slice(0, 10) : '',
      resignReason: (emp.resignReason as string) ?? '',
      address: (emp.address as string) ?? '',
      isHouseholder: (emp.isHouseholder as boolean) ?? false,
      dependents: String((emp.dependents as number) ?? 1),
      hireType: (emp.hireType as string) ?? '',
      bankName: (emp.bankName as string) ?? '',
      bankAccount: '',
    });
    setIsEditing(true);
  }, [employee]);

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm(emptyEditForm);
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.email || !editForm.phone) {
      toast.error('이름, 이메일, 연락처는 필수입니다.');
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
        joinDate: editForm.joinDate || null,
        resignDate: editForm.resignDate || null,
        resignReason: editForm.resignReason || null,
        address: editForm.address || null,
        isHouseholder: editForm.isHouseholder,
        dependents: parseInt(editForm.dependents) || 1,
        hireType: editForm.hireType || null,
        bankName: editForm.bankName || null,
      };
      if (editForm.bankAccount) {
        payload.bankAccount = editForm.bankAccount;
      }
      await updateEmployee(id, payload);
      toast.success('직원 정보가 수정되었습니다.');
      setIsEditing(false);
      await mutate();
    } catch {
      toast.error('수정에 실패했습니다.');
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
    } catch {
      toast.error('프로필 사진 업로드에 실패했습니다.');
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
  const maskedAccount = emp.hasBankAccount ? '●●●●●●●●●●' : '-';

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: '직원 관리', href: '/employees/list' },
          { label: emp.name as string },
        ]}
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
              {getStatusBadge(emp.employeeStatus as string)}
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
                <InfoItem
                  label="근무지"
                  value={(emp.workLocation as { name: string } | null)?.name ?? '-'}
                />
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
              </div>
            </CardBody>
          </Card>

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
                  <Input
                    label="연락처"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="010-1234-5678"
                  />
                ) : (
                  <InfoItem label="연락처" value={(emp.phone as string) || '-'} required />
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
              </div>
            </CardBody>
          </Card>

          {/* Section 3: 급여 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-gray-400" />
                급여 정보
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
                  <div className="w-full">
                    <p className="mb-1 text-xs font-medium text-gray-500">계좌번호</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-800">
                        {showBankAccount && decryptedBankAccount
                          ? decryptedBankAccount
                          : maskedAccount}
                      </p>
                      {(emp.hasBankAccount as boolean) && canViewSensitive && (
                        <button
                          onClick={() => setShowBankAccount(!showBankAccount)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title={showBankAccount ? '숨기기' : '조회'}
                        >
                          {piiLoading ? (
                            <Spinner className="h-4 w-4" />
                          ) : showBankAccount ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab Content: Salary */}
      {activeTab === 'salary' && (
        <Card>
          <CardHeader>
            <CardTitle>급여 항목</CardTitle>
            <Badge variant="info">{salaryItems.length}건</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {salaryItems.length === 0 ? (
              <EmptyState
                title="급여 항목이 없습니다"
                description="급여 규칙 설정에서 항목을 추가하세요."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">코드</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">항목명</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유형</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">금액</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">통상임금</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">비과세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salaryItems.map((item) => (
                    <tr key={item.id as string} className="hover:bg-indigo-50/30">
                      <td className="px-4 py-3 text-gray-500">{item.code as string}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.name as string}</td>
                      <td className="px-4 py-3">
                        <Badge variant={(item.type as string) === 'ALLOWANCE' ? 'info' : 'error'}>
                          {(item.type as string) === 'ALLOWANCE' ? '지급' : '공제'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatKRW(item.amount as number)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.isOrdinaryWage ? <Badge variant="success">Y</Badge> : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.isTaxExempt ? <Badge variant="warning">Y</Badge> : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab Content: Attendance */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader>
            <CardTitle>근태 현황</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-500">
              근태 관리 &gt; 일별 근태에서 이 직원의 출근 기록을 확인하세요.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => router.push('/attendance/daily')}
            >
              일별 근태 보기
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Tab Content: Leave */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
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
