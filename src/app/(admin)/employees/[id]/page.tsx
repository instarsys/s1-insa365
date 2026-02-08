'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb, PageHeader } from '@/components/layout';
import {
  Avatar, Badge, Button, Card, CardHeader, CardTitle, CardBody,
  Tabs, Spinner, EmptyState, Input, Select, DatePicker, useToast,
} from '@/components/ui';
import { useEmployee, useEmployees, useEmployeeMutations } from '@/hooks';
import { useLeaveRequests, useLeaveBalance } from '@/hooks/useLeave';
import { formatDate, formatKRW } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Pencil, X, Check,
  Briefcase, Phone, Mail, Calendar, Building2, MapPin, FileText,
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

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);

  const { employee, isLoading, mutate } = useEmployee(id);
  const { updateEmployee } = useEmployeeMutations();

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

  // Edit form state
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const startEdit = () => {
    if (!employee) return;
    const emp = employee as Record<string, unknown>;
    setEditForm({
      name: (emp.name as string) ?? '',
      email: (emp.email as string) ?? '',
      phone: (emp.phone as string) ?? '',
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    try {
      await updateEmployee(id, editForm);
      toast.success('직원 정보가 수정되었습니다.');
      setIsEditing(false);
      await mutate();
    } catch {
      toast.error('수정에 실패했습니다.');
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
          <Avatar name={(emp.name as string) || '?'} size="lg" />
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

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4" />
                수정
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                  취소
                </Button>
                <Button size="sm" onClick={saveEdit}>
                  <Check className="h-4 w-4" />
                  저장
                </Button>
              </div>
            )}
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoItem
                icon={<Mail className="h-4 w-4" />}
                label="이메일"
                value={isEditing ? undefined : (emp.email as string)}
              >
                {isEditing && (
                  <Input
                    value={editForm.email ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                )}
              </InfoItem>
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label="연락처"
                value={isEditing ? undefined : ((emp.phone as string) || '-')}
              >
                {isEditing && (
                  <Input
                    value={editForm.phone ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="010-1234-5678"
                  />
                )}
              </InfoItem>
              <InfoItem
                icon={<Building2 className="h-4 w-4" />}
                label="부서"
                value={dept?.name ?? '-'}
              />
              <InfoItem
                icon={<Briefcase className="h-4 w-4" />}
                label="직급"
                value={pos?.name ?? '-'}
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="입사일"
                value={emp.joinDate ? formatDate(emp.joinDate as string) : '-'}
              />
              <InfoItem
                icon={<MapPin className="h-4 w-4" />}
                label="근무지"
                value={(emp.workLocation as { name: string } | null)?.name ?? '-'}
              />
            </div>
          </CardBody>
        </Card>
      )}

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
                    <tr key={item.id as string} className="hover:bg-purple-50/30">
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

      {activeTab === 'leave' && (
        <div className="space-y-6">
          {/* Leave Balance */}
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

          {/* Leave History */}
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
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-gray-100 p-2 text-gray-500">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {children ?? <p className="mt-0.5 text-sm text-gray-800">{value}</p>}
      </div>
    </div>
  );
}
