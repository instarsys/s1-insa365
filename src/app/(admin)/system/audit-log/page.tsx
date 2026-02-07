'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody, Badge, Select, SearchInput, DatePicker, Pagination } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

const MOCK_LOGS: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2025-02-07T14:30:00Z',
    userId: 'u1',
    userName: '김관리',
    action: 'UPDATE',
    entityType: 'InsuranceRate',
    entityId: 'ir-1',
    summary: '국민연금 요율 변경',
    before: { employeeRate: 4.5, maxBase: 6170000 },
    after: { employeeRate: 4.5, maxBase: 6370000 },
  },
  {
    id: '2',
    timestamp: '2025-02-07T13:15:00Z',
    userId: 'u1',
    userName: '김관리',
    action: 'CREATE',
    entityType: 'MinimumWage',
    entityId: 'mw-2',
    summary: '2026년 최저임금 등록',
    before: null,
    after: { year: 2026, hourlyWage: 10320, monthlyWage: 2156880 },
  },
  {
    id: '3',
    timestamp: '2025-02-06T11:00:00Z',
    userId: 'u2',
    userName: '이매니저',
    action: 'CONFIRM',
    entityType: 'Payroll',
    entityId: 'pr-202501',
    summary: '2025년 1월 급여 확정',
    before: { status: 'DRAFT' },
    after: { status: 'CONFIRMED' },
  },
  {
    id: '4',
    timestamp: '2025-02-05T09:30:00Z',
    userId: 'u1',
    userName: '김관리',
    action: 'DECRYPT',
    entityType: 'Employee',
    entityId: 'emp-42',
    summary: '주민등록번호 조회 (홍길동)',
    before: null,
    after: null,
  },
  {
    id: '5',
    timestamp: '2025-02-04T16:45:00Z',
    userId: 'u1',
    userName: '김관리',
    action: 'UPDATE',
    entityType: 'SalaryRule',
    entityId: 'sr-3',
    summary: '식대 비과세한도 변경',
    before: { monthlyLimit: 100000 },
    after: { monthlyLimit: 200000 },
  },
];

const ACTION_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'gray' }> = {
  CREATE: { label: '생성', variant: 'success' },
  UPDATE: { label: '수정', variant: 'warning' },
  DELETE: { label: '삭제', variant: 'error' },
  CONFIRM: { label: '확정', variant: 'info' },
  CANCEL: { label: '취소', variant: 'gray' },
  DECRYPT: { label: 'PII조회', variant: 'error' },
  DOWNLOAD: { label: '다운로드', variant: 'gray' },
};

const ENTITY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'InsuranceRate', label: '보험요율' },
  { value: 'TaxBracket', label: '간이세액표' },
  { value: 'MinimumWage', label: '최저임금' },
  { value: 'LegalParameter', label: '법정상수' },
  { value: 'Payroll', label: '급여' },
  { value: 'Employee', label: '직원' },
  { value: 'SalaryRule', label: '급여항목' },
];

const ACTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'CREATE', label: '생성' },
  { value: 'UPDATE', label: '수정' },
  { value: 'DELETE', label: '삭제' },
  { value: 'CONFIRM', label: '확정' },
  { value: 'CANCEL', label: '취소' },
  { value: 'DECRYPT', label: 'PII조회' },
  { value: 'DOWNLOAD', label: '다운로드' },
];

function JsonDiff({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = MOCK_LOGS.filter((log) => {
    if (entityType && log.entityType !== entityType) return false;
    if (action && log.action !== action) return false;
    if (userSearch && !log.userName.includes(userSearch)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="감사 로그" subtitle="시스템 변경 이력을 조회합니다." />

      {/* Filters */}
      <Card className="mb-4">
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="엔티티 타입"
              options={ENTITY_OPTIONS}
              value={entityType}
              onChange={setEntityType}
            />
            <Select
              label="액션"
              options={ACTION_OPTIONS}
              value={action}
              onChange={setAction}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-gray-700">사용자</p>
              <SearchInput
                value={userSearch}
                onChange={setUserSearch}
                placeholder="이름 검색..."
              />
            </div>
            <DatePicker label="시작일" value={startDate} onChange={setStartDate} />
            <DatePicker label="종료일" value={endDate} onChange={setEndDate} />
          </div>
        </CardBody>
      </Card>

      {/* Log entries */}
      <Card>
        <CardBody className="p-0">
          {/* Header row */}
          <div className="hidden border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 lg:grid lg:grid-cols-12 lg:gap-2">
            <div className="col-span-2">일시</div>
            <div className="col-span-1">사용자</div>
            <div className="col-span-1">액션</div>
            <div className="col-span-2">엔티티타입</div>
            <div className="col-span-1">엔티티ID</div>
            <div className="col-span-4">변경내역</div>
            <div className="col-span-1"></div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">감사 로그가 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((log) => {
                const isExpanded = expandedId === log.id;
                const actionInfo = ACTION_BADGE[log.action] ?? { label: log.action, variant: 'gray' as const };
                const hasDiff = log.before !== null || log.after !== null;

                return (
                  <div key={log.id}>
                    <button
                      onClick={() => hasDiff && setExpandedId(isExpanded ? null : log.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left text-sm',
                        hasDiff && 'cursor-pointer hover:bg-purple-50/30',
                        'lg:grid lg:grid-cols-12 lg:items-center lg:gap-2',
                      )}
                    >
                      <div className="col-span-2 text-xs text-gray-500">{formatDate(log.timestamp, 'datetime')}</div>
                      <div className="col-span-1 text-xs font-medium text-gray-800">{log.userName}</div>
                      <div className="col-span-1">
                        <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                      </div>
                      <div className="col-span-2 text-xs text-gray-600">{log.entityType}</div>
                      <div className="col-span-1 text-xs text-gray-400">{log.entityId}</div>
                      <div className="col-span-4 text-xs text-gray-700">{log.summary}</div>
                      <div className="col-span-1 flex justify-end">
                        {hasDiff && (
                          isExpanded
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && hasDiff && (
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <JsonDiff label="변경 전 (Before)" data={log.before} />
                          <JsonDiff label="변경 후 (After)" data={log.after} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      <div className="mt-4 flex justify-center">
        <Pagination currentPage={currentPage} totalPages={3} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}
