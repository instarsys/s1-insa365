'use client';

import { Users, Banknote, Clock, AlertTriangle, CalendarCheck, FileText, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDashboardTodos, useDashboardWidgets } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { formatKRW } from '@/lib/utils';
import Link from 'next/link';
import { AttendanceMissingWidget } from '@/components/dashboard/AttendanceMissingWidget';
import { AnnouncementsWidget } from '@/components/dashboard/AnnouncementsWidget';
import { EmployeeAlertsWidget } from '@/components/dashboard/EmployeeAlertsWidget';
import { ReportStatusWidget } from '@/components/dashboard/ReportStatusWidget';
import { LeaveStatusWidget } from '@/components/dashboard/LeaveStatusWidget';

const TODO_ICON_MAP = {
  PAYROLL_DEADLINE: <Banknote className="h-4 w-4" />,
  UNCONFIRMED_ATTENDANCE: <CalendarCheck className="h-4 w-4" />,
  OVERTIME_WARNING: <AlertTriangle className="h-4 w-4" />,
  PENDING_LEAVE: <FileText className="h-4 w-4" />,
} as const;

const PRIORITY_VARIANT = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'gray',
} as const;

const PRIORITY_LABEL = {
  HIGH: '긴급',
  MEDIUM: '보통',
  LOW: '낮음',
} as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '안녕하세요';
  return '수고하셨습니다';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { todos, isLoading: todosLoading } = useDashboardTodos();
  const { widgets, isLoading: widgetsLoading } = useDashboardWidgets();

  const attendanceRate = widgets?.todayAttendance
    ? widgets.todayAttendance.total > 0
      ? Math.round((widgets.todayAttendance.present / widgets.todayAttendance.total) * 100)
      : 0
    : 0;

  const overdueTodos = todos.filter((t) => t.priority === 'HIGH');

  // 출근 현황 도넛 차트 데이터
  const attendance = widgets?.todayAttendance;
  const donutSegments = attendance ? [
    { label: '출근', value: attendance.present, color: '#10b981' },
    { label: '결근', value: attendance.absent,  color: '#ef4444' },
    { label: '지각', value: attendance.late,    color: '#f59e0b' },
    { label: '휴가', value: attendance.leave,   color: '#6366f1' },
    { label: '미확인', value: Math.max(0, attendance.total - attendance.present - attendance.absent - attendance.late - attendance.leave), color: '#d1d5db' },
  ] : [];
  const donutTotal = donutSegments.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      {/* Row 1: Personalized Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {user?.name ?? '관리자'}님
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {user?.companyName ?? '회사'}의 오늘 현황입니다.
        </p>
      </div>

      {/* Row 2: StatCards — 가로 4열 */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {widgetsLoading ? (
          <div className="col-span-full">
            <Spinner text="지표 로딩중..." className="py-8" />
          </div>
        ) : (
          <>
            <StatCard
              colorScheme="indigo"
              title="총 직원수"
              value={widgets?.totalEmployees ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              colorScheme="emerald"
              title="금월 인건비"
              value={widgets ? formatKRW(widgets.monthlyPayroll) : '0원'}
              icon={<Banknote className="h-5 w-5" />}
            />
            <StatCard
              colorScheme="sky"
              title="오늘 출근율"
              value={`${attendanceRate}%`}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              colorScheme="rose"
              title="52시간 경고"
              value={widgets?.overtimeWarnings ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Row 3: 출근 현황 (1/3) + To-Do (2/3) */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 좌: 출근 현황 — 도넛 차트 */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-500" />
                <CardTitle>오늘 출근 현황</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              {widgetsLoading || !attendance ? (
                <Spinner text="로딩중..." className="py-8" />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {/* SVG 도넛 차트 */}
                  <div className="relative">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {(() => {
                        const radius = 54;
                        const circumference = 2 * Math.PI * radius;
                        let cumulativeOffset = 0;
                        return donutSegments.filter(s => s.value > 0).map((seg, i) => {
                          const pct = donutTotal > 0 ? seg.value / donutTotal : 0;
                          const dashLen = pct * circumference;
                          const dashGap = circumference - dashLen;
                          const offset = -cumulativeOffset;
                          cumulativeOffset += dashLen;
                          return (
                            <circle
                              key={i}
                              cx="70" cy="70" r={radius}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="14"
                              strokeDasharray={`${dashLen} ${dashGap}`}
                              strokeDashoffset={offset}
                              transform="rotate(-90 70 70)"
                              className="transition-all duration-500"
                            />
                          );
                        });
                      })()}
                      {donutTotal === 0 && (
                        <circle cx="70" cy="70" r="54" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                      )}
                    </svg>
                    {/* 중앙 출근율 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-800">{attendanceRate}%</span>
                      <span className="text-[10px] text-gray-400">출근율</span>
                    </div>
                  </div>
                  {/* 범례 */}
                  <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
                    {donutSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-xs text-gray-600">{seg.label}</span>
                        <span className="ml-auto text-xs font-semibold text-gray-800">{seg.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* 우: To-Do (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>오늘의 할 일</CardTitle>
                <Badge variant="info">{todos.length}건</Badge>
                {overdueTodos.length > 0 && (
                  <Badge variant="error">{overdueTodos.length}건 긴급</Badge>
                )}
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {todosLoading ? (
                <Spinner text="할 일 로딩중..." className="py-8" />
              ) : todos.length === 0 ? (
                <EmptyState
                  title="처리할 할 일이 없습니다"
                  description="모든 업무가 완료되었습니다. 수고하셨습니다!"
                />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {todos.map((todo) => (
                    <li key={todo.id}>
                      <Link
                        href={todo.link}
                        className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-indigo-50/50"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          todo.priority === 'HIGH'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {TODO_ICON_MAP[todo.type]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800">{todo.title}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{todo.description}</p>
                        </div>
                        <Badge variant={PRIORITY_VARIANT[todo.priority]}>
                          {PRIORITY_LABEL[todo.priority]}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                          처리하기
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Row 4: 3열 위젯 (출퇴근 누락 + 공지사항 + 관리 필요 직원) */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AttendanceMissingWidget />
        <AnnouncementsWidget />
        <EmployeeAlertsWidget />
      </div>

      {/* Row 5: 2열 위젯 (리포트 현황 + 휴가 현황) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportStatusWidget />
        <LeaveStatusWidget />
      </div>
    </div>
  );
}
