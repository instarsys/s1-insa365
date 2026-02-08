'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody, Badge, Select, SearchInput, DatePicker, Pagination, Spinner } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import { fetcher } from '@/lib/api';

interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  userName?: string;
}

const ACTION_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'gray' }> = {
  CREATE: { label: '생성', variant: 'success' },
  UPDATE: { label: '수정', variant: 'warning' },
  DELETE: { label: '삭제', variant: 'error' },
  READ: { label: '조회', variant: 'gray' },
  CONFIRM: { label: '확정', variant: 'info' },
  CANCEL: { label: '취소', variant: 'gray' },
  EXPORT: { label: '다운로드', variant: 'gray' },
  LOGIN: { label: '로그인', variant: 'info' },
  LOGOUT: { label: '로그아웃', variant: 'gray' },
};

const ENTITY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'InsuranceRate', label: '보험요율' },
  { value: 'TaxBracket', label: '간이세액표' },
  { value: 'MinimumWage', label: '최저임금' },
  { value: 'LegalParameter', label: '법정상수' },
  { value: 'SalaryCalculation', label: '급여' },
  { value: 'User', label: '직원' },
  { value: 'SalaryRule', label: '급여항목' },
  { value: 'Employee', label: '직원(PII)' },
];

const ACTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'CREATE', label: '생성' },
  { value: 'UPDATE', label: '수정' },
  { value: 'DELETE', label: '삭제' },
  { value: 'READ', label: '조회' },
  { value: 'CONFIRM', label: '확정' },
  { value: 'CANCEL', label: '취소' },
  { value: 'EXPORT', label: '다운로드' },
  { value: 'LOGIN', label: '로그인' },
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

interface AuditLogResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build query params
  const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
  if (entityType) params.set('entityType', entityType);
  if (action) params.set('action', action);
  if (userSearch) params.set('userId', userSearch);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const { data, isLoading } = useSWR<AuditLogResponse>(
    `/api/system/audit-log?${params}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const logs = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

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
              onChange={(v) => { setEntityType(v); setCurrentPage(1); }}
            />
            <Select
              label="액션"
              options={ACTION_OPTIONS}
              value={action}
              onChange={(v) => { setAction(v); setCurrentPage(1); }}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-gray-700">사용자</p>
              <SearchInput
                value={userSearch}
                onChange={(v) => { setUserSearch(v); setCurrentPage(1); }}
                placeholder="사용자 ID 검색..."
              />
            </div>
            <DatePicker label="시작일" value={startDate} onChange={(v) => { setStartDate(v); setCurrentPage(1); }} />
            <DatePicker label="종료일" value={endDate} onChange={(v) => { setEndDate(v); setCurrentPage(1); }} />
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
            <div className="col-span-2">엔티티ID</div>
            <div className="col-span-3">요약</div>
            <div className="col-span-1"></div>
          </div>

          {isLoading ? (
            <Spinner text="감사 로그 로딩중..." className="py-12" />
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">감사 로그가 없습니다</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const actionInfo = ACTION_BADGE[log.action] ?? { label: log.action, variant: 'gray' as const };
                const hasDiff = log.before !== null || log.after !== null;

                return (
                  <div key={log.id}>
                    <button
                      onClick={() => hasDiff && setExpandedId(isExpanded ? null : log.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left text-sm',
                        hasDiff && 'cursor-pointer hover:bg-indigo-50/30',
                        'lg:grid lg:grid-cols-12 lg:items-center lg:gap-2',
                      )}
                    >
                      <div className="col-span-2 text-xs text-gray-500">{formatDate(log.createdAt, 'datetime')}</div>
                      <div className="col-span-1 text-xs font-medium text-gray-800">{log.userId?.slice(0, 8) ?? '-'}</div>
                      <div className="col-span-1">
                        <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                      </div>
                      <div className="col-span-2 text-xs text-gray-600">{log.entityType}</div>
                      <div className="col-span-2 truncate text-xs text-gray-400">{log.entityId ?? '-'}</div>
                      <div className="col-span-3 text-xs text-gray-700">
                        {log.action} {log.entityType}
                      </div>
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
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}
