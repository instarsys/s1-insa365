'use client';

import { Badge } from '@/components/ui';

export type AttendanceStatus = 'ON_TIME' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'LEAVE' | 'HOLIDAY';

export function getStatusBadge(status: string) {
  switch (status) {
    case 'ON_TIME':
    case 'PRESENT':
      return <Badge variant="success">출근</Badge>;
    case 'ABSENT':
      return <Badge variant="error">결근</Badge>;
    case 'LATE':
      return <Badge variant="warning">지각</Badge>;
    case 'EARLY_LEAVE':
      return <Badge variant="warning">조퇴</Badge>;
    case 'LEAVE':
      return <Badge variant="info">휴가</Badge>;
    case 'HOLIDAY':
      return <Badge variant="gray">공휴일</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'ON_TIME':
    case 'PRESENT':
      return '출근';
    case 'ABSENT':
      return '결근';
    case 'LATE':
      return '지각';
    case 'EARLY_LEAVE':
      return '조퇴';
    case 'LEAVE':
      return '휴가';
    case 'HOLIDAY':
      return '공휴일';
    default:
      return status;
  }
}

export function formatTime(time?: string | null): string {
  if (!time) return '-';
  return new Date(time).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeShort(time?: string | null): string {
  if (!time) return '-';
  const d = new Date(time);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getDayOfWeek(year: number, month: number, day: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(year, month - 1, day).getDay()];
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

export function isSunday(year: number, month: number, day: number): boolean {
  return new Date(year, month - 1, day).getDay() === 0;
}

export function isSaturday(year: number, month: number, day: number): boolean {
  return new Date(year, month - 1, day).getDay() === 6;
}

export function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}

/** 상태에 따른 셀 좌측 색상 바 */
export function getStatusBarColor(status: string): string {
  switch (status) {
    case 'ON_TIME':
    case 'PRESENT':
      return 'bg-emerald-400';
    case 'LATE':
    case 'ABSENT':
      return 'bg-red-400';
    case 'EARLY_LEAVE':
      return 'bg-amber-400';
    case 'LEAVE':
      return 'bg-indigo-400';
    case 'HOLIDAY':
      return 'bg-gray-300';
    default:
      return '';
  }
}

/** 상태에 따른 셀 텍스트 색상 */
export function getStatusTextColor(status: string): string {
  switch (status) {
    case 'ON_TIME':
    case 'PRESENT':
      return 'text-gray-700';
    case 'LATE':
    case 'ABSENT':
      return 'text-red-500';
    case 'EARLY_LEAVE':
      return 'text-amber-600';
    case 'LEAVE':
      return 'text-indigo-500';
    case 'HOLIDAY':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

/** 부서별 고유 색상 해시 */
const DEPT_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];
export function getDepartmentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_COLORS[Math.abs(hash) % DEPT_COLORS.length];
}

/** Haversine으로 가장 가까운 WorkLocation 반환 (1km 이내) */
export function findNearestLocation(
  lat: number,
  lng: number,
  locations: { name: string; latitude: number; longitude: number; radius: number }[],
): { name: string; distance: number } | null {
  let nearest: { name: string; distance: number } | null = null;
  for (const loc of locations) {
    const R = 6371e3;
    const dLat = (loc.latitude - lat) * Math.PI / 180;
    const dLng = (loc.longitude - lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d < 1000 && (!nearest || d < nearest.distance)) nearest = { name: loc.name, distance: Math.round(d) };
  }
  return nearest;
}

/**
 * WorkPolicy.workDays 기반 근무일 판정.
 * workDayPattern: "1,2,3,4,5" (1=Mon..7=Sun, ISO 8601)
 */
export function isScheduledWorkDay(year: number, month: number, day: number, workDayPattern: string): boolean {
  const jsDay = new Date(year, month - 1, day).getDay(); // 0=Sun..6=Sat
  const isoDay = jsDay === 0 ? 7 : jsDay; // 1=Mon..7=Sun
  return workDayPattern.split(',').map(Number).includes(isoDay);
}

export const STATUS_OPTIONS = [
  { value: 'ON_TIME', label: '정상' },
  { value: 'LATE', label: '지각' },
  { value: 'EARLY_LEAVE', label: '조퇴' },
  { value: 'ABSENT', label: '결근' },
  { value: 'LEAVE', label: '휴가' },
  { value: 'HOLIDAY', label: '공휴일' },
] as const;
