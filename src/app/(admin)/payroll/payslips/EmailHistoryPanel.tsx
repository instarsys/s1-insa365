'use client';

import { useState } from 'react';
import { X, RefreshCw, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  usePayslipEmailHistory,
  usePayslipEmailMutations,
  type PayslipEmailHistoryItem,
} from '@/hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
}

function statusBadge(status: PayslipEmailHistoryItem['status']) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="gray">대기</Badge>;
    case 'SENT':
      return <Badge variant="info">발송완료</Badge>;
    case 'OPENED':
      return <Badge variant="success">열람</Badge>;
    case 'FAILED':
      return <Badge variant="error">실패</Badge>;
  }
}

function formatDateTime(dt: string | null) {
  if (!dt) return '-';
  return new Date(dt).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EmailHistoryPanel({ open, onClose, year, month }: Props) {
  const toast = useToast();
  const { history, isLoading, mutate } = usePayslipEmailHistory(year, month);
  const { sendEmails } = usePayslipEmailMutations();
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);

  async function handleResend(userId: string) {
    setResendingUserId(userId);
    try {
      const result = await sendEmails({ year, month, userIds: [userId] });
      if (result.sentCount > 0) {
        toast.success('이메일을 재발송했습니다.');
      } else {
        toast.error(result.results[0]?.error || '재발송에 실패했습니다.');
      }
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '재발송에 실패했습니다.');
    } finally {
      setResendingUserId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">발송 이력</h2>
            <p className="text-sm text-gray-500">
              {year}년 {month}월
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <Spinner text="이력 로딩중..." className="py-12" />
          ) : history.length === 0 ? (
            <EmptyState
              title="발송 이력이 없습니다"
              description="급여명세서를 이메일로 발송하면 이력이 표시됩니다."
              icon={<Mail className="h-10 w-10" />}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">직원</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">이메일</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">발송시간</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">열람시간</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">재발송</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{item.userName}</p>
                      <p className="text-xs text-gray-400">
                        {item.employeeNumber} / {item.departmentName || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 truncate max-w-[140px]">
                      {item.recipientEmail}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {statusBadge(item.status)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {formatDateTime(item.sentAt)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {formatDateTime(item.openedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(item.userId)}
                        disabled={resendingUserId === item.userId}
                      >
                        {resendingUserId === item.userId ? (
                          <Spinner text="" className="h-3.5 w-3.5" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
