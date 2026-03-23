'use client';

import { useState, useMemo } from 'react';
import { Mail, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { usePayslipEmailMutations, usePayslipEmailHistory } from '@/hooks';

interface Employee {
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  userId?: string;
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  employees: Employee[];
}

export function EmailSendDialog({ open, onClose, year, month, employees }: Props) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const { sendEmails } = usePayslipEmailMutations();
  const { history, mutate: mutateHistory } = usePayslipEmailHistory(year, month);

  // 발송 이력에서 userId별 최신 상태 매핑
  const sentStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of history) {
      if (!map.has(item.userId)) {
        map.set(item.userId, item.status);
      }
    }
    return map;
  }, [history]);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const allFilteredIds = useMemo(
    () => new Set(filteredEmployees.map((e) => e.employeeNumber)),
    [filteredEmployees],
  );

  const isAllSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selected.has(e.employeeNumber));

  function toggleAll() {
    if (isAllSelected) {
      const next = new Set(selected);
      allFilteredIds.forEach((id) => next.delete(id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      allFilteredIds.forEach((id) => next.add(id));
      setSelected(next);
    }
  }

  function toggleOne(empNumber: string) {
    const next = new Set(selected);
    if (next.has(empNumber)) next.delete(empNumber);
    else next.add(empNumber);
    setSelected(next);
  }

  // employeeNumber → userId 매핑 (ledger 데이터에 userId가 없을 수 있으므로 history에서 보완)
  const empNumberToUserIdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of history) {
      if (item.employeeNumber) {
        map.set(item.employeeNumber, item.userId);
      }
    }
    for (const emp of employees) {
      if (emp.userId) map.set(emp.employeeNumber, emp.userId as string);
    }
    return map;
  }, [employees, history]);

  async function handleSend() {
    const userIds = Array.from(selected)
      .map((empNum) => empNumberToUserIdMap.get(empNum))
      .filter(Boolean) as string[];

    if (userIds.length === 0) {
      toast.error('발송할 직원을 선택해주세요.');
      return;
    }

    setSending(true);
    try {
      const result = await sendEmails({ year, month, userIds });
      toast.success(
        `이메일 발송 완료: 성공 ${result.sentCount}명${result.failedCount > 0 ? `, 실패 ${result.failedCount}명` : ''}`,
      );
      mutateHistory();
      setSelected(new Set());
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '이메일 발송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  }

  function getStatusLabel(empNumber: string) {
    const userId = empNumberToUserIdMap.get(empNumber);
    if (!userId) return null;
    const status = sentStatusMap.get(userId);
    if (!status) return null;

    switch (status) {
      case 'SENT':
        return <span className="text-xs text-indigo-600">발송완료</span>;
      case 'OPENED':
        return <span className="text-xs text-emerald-600">열람</span>;
      case 'FAILED':
        return <span className="text-xs text-red-600">실패</span>;
      case 'PENDING':
        return <span className="text-xs text-gray-500">대기</span>;
      default:
        return null;
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="급여명세서 이메일 발송"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending || selected.size === 0}>
            {sending ? (
              <Spinner text="" className="h-4 w-4" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {sending ? '발송 중...' : `${selected.size}명 발송`}
          </Button>
        </>
      }
    >
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {year}년 {month}월 급여명세서를 선택한 직원의 이메일로 발송합니다.
        </p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="이름 또는 사번으로 검색..."
      />

      <div className="mt-3 max-h-[350px] overflow-y-auto rounded-lg border border-gray-200">
        {/* Header */}
        <div className="sticky top-0 flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <Checkbox checked={isAllSelected} onChange={toggleAll} />
          <span className="text-xs font-medium text-gray-500">
            전체 선택 ({filteredEmployees.length}명)
          </span>
        </div>

        {/* Employee list */}
        {filteredEmployees.map((emp) => (
          <div
            key={emp.employeeNumber}
            className={`flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 transition-colors hover:bg-indigo-50/50 ${
              selected.has(emp.employeeNumber) ? 'bg-indigo-50/30' : ''
            }`}
          >
            <Checkbox
              checked={selected.has(emp.employeeNumber)}
              onChange={() => toggleOne(emp.employeeNumber)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{emp.employeeName}</p>
              <p className="text-xs text-gray-500 truncate">
                {emp.employeeNumber} / {emp.departmentName || '-'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusLabel(emp.employeeNumber)}
              {sentStatusMap.has(empNumberToUserIdMap.get(emp.employeeNumber) ?? '') && (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
