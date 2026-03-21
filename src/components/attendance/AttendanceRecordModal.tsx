'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import {
  Modal, Button, Input, Select, Textarea, Checkbox, Spinner, useToast,
} from '@/components/ui';
import { useAttendanceMutations } from '@/hooks';
import { useCompanyHolidays } from '@/hooks';
import { fetcher } from '@/lib/api';
import { STATUS_OPTIONS, formatTimeShort, findNearestLocation } from '@/lib/attendance-utils';
import { Trash2 } from 'lucide-react';

interface AttendanceRecordForModal {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: string;
  isConfirmed: boolean;
  isHoliday?: boolean;
  note?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  createdAt?: string;
}

interface AttendanceRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  mode: 'create' | 'edit';
  record?: AttendanceRecordForModal | null;
  defaultDate?: string;
  defaultUserId?: string;
}

export function AttendanceRecordModal({
  open,
  onClose,
  onSave,
  mode,
  record,
  defaultDate,
  defaultUserId,
}: AttendanceRecordModalProps) {
  const toast = useToast();
  const { manualEntry, batchManualEntry, deleteAttendance } = useAttendanceMutations();

  // Create mode: date range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);

  // Edit mode: single date
  const [date, setDate] = useState('');

  const [userId, setUserId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState('ON_TIME');
  const [isHoliday, setIsHoliday] = useState(false);
  const [note, setNote] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch employee list for create mode
  const { data: empData } = useSWR<{ items: { id: string; name: string; employeeNumber: string }[] }>(
    open && mode === 'create' ? '/api/employees?limit=200' : null,
    fetcher,
  );

  // Fetch work locations for GPS matching
  const { data: locData } = useSWR<{ items: { name: string; latitude: number; longitude: number; radius: number }[] }>(
    open && mode === 'edit' && record && (record.checkInLatitude || record.checkOutLatitude) ? '/api/work-locations' : null,
    fetcher,
  );
  const workLocations = locData?.items ?? [];

  // Company holidays for preview count
  const startYear = startDate ? Number(startDate.split('-')[0]) : new Date().getFullYear();
  const { holidays: companyHolidays } = useCompanyHolidays(startYear);

  const employeeOptions = useMemo(() => {
    if (!empData?.items) return [];
    return empData.items.map((e) => ({
      value: e.id,
      label: `${e.name} (${e.employeeNumber || ''})`,
    }));
  }, [empData]);

  // Preview count for batch create
  const previewCount = useMemo(() => {
    if (mode !== 'create' || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return null;

    const holidaySet = new Set(
      companyHolidays.map((h: { date: string }) => new Date(h.date).toISOString().slice(0, 10)),
    );

    let total = 0;
    let weekendCount = 0;
    let holidayCount = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      const dateStr = d.toISOString().slice(0, 10);
      if (excludeWeekends && (day === 0 || day === 6)) {
        weekendCount++;
        continue;
      }
      if (excludeHolidays && holidaySet.has(dateStr)) {
        holidayCount++;
        continue;
      }
      total++;
    }
    return { total, weekendCount, holidayCount };
  }, [mode, startDate, endDate, excludeWeekends, excludeHolidays, companyHolidays]);

  const isBatchMode = mode === 'create' && startDate && endDate && startDate !== endDate;

  // Initialize form on open
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && record) {
      setDate(record.date.split('T')[0]);
      setStartDate('');
      setEndDate('');
      setUserId(record.userId);
      setCheckIn(record.checkInTime ? formatTimeShort(record.checkInTime) : '');
      setCheckOut(record.checkOutTime ? formatTimeShort(record.checkOutTime) : '');
      setIsWorking(!!record.checkInTime && !record.checkOutTime);
      setStatus(record.status);
      setIsHoliday(record.isHoliday ?? false);
      setNote(record.note ?? '');
      setIsConfirmed(record.isConfirmed);
    } else {
      const defaultD = defaultDate ?? new Date().toISOString().split('T')[0];
      setStartDate(defaultD);
      setEndDate(defaultD);
      setDate('');
      setUserId(defaultUserId ?? '');
      setCheckIn('09:00');
      setCheckOut('18:00');
      setIsWorking(false);
      setStatus('ON_TIME');
      setIsHoliday(false);
      setNote('');
      setIsConfirmed(false);
      setExcludeWeekends(true);
      setExcludeHolidays(true);
    }
  }, [open, mode, record, defaultDate, defaultUserId]);

  const handleSave = async () => {
    if (!userId) {
      toast.error('직원을 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      if (isBatchMode) {
        // Batch create
        const result = await batchManualEntry({
          userId,
          startDate,
          endDate,
          checkInTime: checkIn,
          checkOutTime: !isWorking && checkOut ? checkOut : undefined,
          status,
          isHoliday,
          note: note || undefined,
          isConfirmed,
          excludeWeekends,
          excludeHolidays,
        }) as { totalCreated: number; totalSkipped: number };
        const msg = result.totalSkipped > 0
          ? `${result.totalCreated}일 근태 기록이 추가되었습니다. (${result.totalSkipped}일 건너뜀)`
          : `${result.totalCreated}일 근태 기록이 추가되었습니다.`;
        toast.success(msg);
      } else {
        // Single create or edit
        const singleDate = mode === 'edit' ? date : startDate;
        const checkInTime = checkIn ? new Date(`${singleDate}T${checkIn}:00`).toISOString() : undefined;
        const checkOutTime = !isWorking && checkOut ? new Date(`${singleDate}T${checkOut}:00`).toISOString() : undefined;

        await manualEntry({
          userId,
          date: singleDate,
          checkInTime,
          checkOutTime,
          status,
          isHoliday,
          note: note || undefined,
          isConfirmed,
        });
        toast.success(mode === 'edit' ? '근태 기록이 수정되었습니다.' : '근태 기록이 추가되었습니다.');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!record?.id) return;
    if (!confirm('이 근태 기록을 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      await deleteAttendance(record.id);
      toast.success('근태 기록이 삭제되었습니다.');
      onSave();
      onClose();
    } catch {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isReadOnly = mode === 'edit' && !!record?.isConfirmed;

  const statusOptions = STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReadOnly ? '출퇴근기록 조회' : (mode === 'edit' ? '출퇴근기록 수정' : '출퇴근기록 추가')}
      size="lg"
      footer={
        isReadOnly ? (
          <div className="flex w-full justify-end">
            <Button variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between">
            <div>
              {mode === 'edit' && record && (
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="!text-red-600 hover:!bg-red-50"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {isDeleting ? '삭제 중...' : '삭제하기'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                닫기
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* 확정 상태 안내 배너 */}
        {isReadOnly && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="mt-0.5 shrink-0">&#9888;</span>
            <span>확정된 근태 기록입니다. 수정하려면 근태 확정을 취소해주세요.</span>
          </div>
        )}

        {/* Date + Employee */}
        {mode === 'create' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="시작일"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
              <Input
                label="종료일"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
            <Select
              label="직원"
              options={employeeOptions.length > 0 ? employeeOptions : [{ value: '', label: '로딩 중...' }]}
              value={userId}
              onChange={setUserId}
              placeholder="직원 선택"
            />
            {isBatchMode && (
              <>
                <div className="flex items-center gap-6">
                  <Checkbox
                    label="주말 제외 (토·일)"
                    checked={excludeWeekends}
                    onChange={setExcludeWeekends}
                  />
                  <Checkbox
                    label="공휴일 제외"
                    checked={excludeHolidays}
                    onChange={setExcludeHolidays}
                  />
                </div>
                {previewCount && (
                  <p className="text-sm font-medium text-indigo-600">
                    &rarr; {previewCount.total}일분 생성 예정
                    {(previewCount.weekendCount > 0 || previewCount.holidayCount > 0) && (
                      <span className="ml-1 font-normal text-gray-500">
                        ({[
                          previewCount.weekendCount > 0 && `주말 ${previewCount.weekendCount}일`,
                          previewCount.holidayCount > 0 && `공휴일 ${previewCount.holidayCount}일`,
                        ].filter(Boolean).join(', ')} 제외)
                      </span>
                    )}
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="날짜"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={mode === 'edit'}
            />
            <Input label="직원" value={record?.userName || userId} disabled onChange={() => {}} />
          </div>
        )}

        {/* 근무 정보 */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">근무 정보</p>
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="출근 시간"
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                disabled={isReadOnly}
              />
              <Input
                label="퇴근 시간"
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                disabled={isReadOnly || isWorking}
              />
            </div>
            <Checkbox
              label="현재 근무 중 (퇴근 시간 비활성)"
              checked={isWorking}
              onChange={setIsWorking}
              disabled={isReadOnly}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="상태"
                options={statusOptions}
                value={status}
                onChange={setStatus}
                disabled={isReadOnly}
              />
              <div className="flex items-end pb-1">
                <Checkbox
                  label="공휴일"
                  checked={isHoliday}
                  onChange={setIsHoliday}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        </div>

        {/* GPS (읽기전용, edit만) */}
        {mode === 'edit' && record && (record.checkInLatitude || record.checkOutLatitude) && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">GPS 기록 (읽기전용)</p>
            <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500 space-y-1">
              {record.checkInLatitude != null && record.checkInLongitude != null && (() => {
                const loc = findNearestLocation(record.checkInLatitude, record.checkInLongitude, workLocations);
                return (
                  <p>출근 장소: {loc ? `${loc.name} (${loc.distance}m)` : `${record.checkInLatitude}, ${record.checkInLongitude}`}</p>
                );
              })()}
              {record.checkOutLatitude != null && record.checkOutLongitude != null && (() => {
                const loc = findNearestLocation(record.checkOutLatitude, record.checkOutLongitude, workLocations);
                return (
                  <p>퇴근 장소: {loc ? `${loc.name} (${loc.distance}m)` : `${record.checkOutLatitude}, ${record.checkOutLongitude}`}</p>
                );
              })()}
            </div>
          </div>
        )}

        {/* 기타 */}
        <Textarea
          label="비고"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="비고 사항을 입력하세요"
          disabled={isReadOnly}
        />

        {/* 관리 */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">관리</p>
          <div className="space-y-2">
            <Checkbox
              label="확정됨"
              checked={isConfirmed}
              onChange={setIsConfirmed}
              disabled={isReadOnly}
            />
            {mode === 'edit' && record?.createdAt && (
              <p className="text-xs text-gray-400">
                생성일자: {new Date(record.createdAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
