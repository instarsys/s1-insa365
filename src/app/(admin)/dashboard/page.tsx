'use client';

import { Users, Banknote, Clock, AlertTriangle, CalendarCheck, FileText, ChevronRight, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDashboardTodos, useDashboardWidgets } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { formatKRW } from '@/lib/utils';
import Link from 'next/link';

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

  return (
    <div>
      {/* Personalized Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {user?.name ?? '관리자'}님
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {user?.companyName ?? '회사'}의 오늘 현황입니다.
        </p>
      </div>

      {/* Main Layout: Left 2/3 (To-Do) + Right 1/3 (Stats + Attendance) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: To-Do (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
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
                        className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-purple-50/50"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          todo.priority === 'HIGH'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-purple-50 text-purple-600'
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
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 opacity-0 transition-opacity group-hover:opacity-100">
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

          {/* Attendance Summary (below To-Do, left column) */}
          {widgets?.todayAttendance && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>오늘 출근 현황</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{widgets.todayAttendance.total}</p>
                    <p className="mt-1 text-xs text-gray-500">전체</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{widgets.todayAttendance.present}</p>
                    <p className="mt-1 text-xs text-gray-500">출근</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{widgets.todayAttendance.absent}</p>
                    <p className="mt-1 text-xs text-gray-500">결근</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{widgets.todayAttendance.late}</p>
                    <p className="mt-1 text-xs text-gray-500">지각</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-500">{widgets.todayAttendance.leave}</p>
                    <p className="mt-1 text-xs text-gray-500">휴가</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right: Stats (1/3 width) */}
        <div className="space-y-4">
          {widgetsLoading ? (
            <Spinner text="지표 로딩중..." className="py-8" />
          ) : (
            <>
              <StatCard
                title="총 직원수"
                value={widgets?.totalEmployees ?? 0}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="금월 인건비"
                value={widgets ? formatKRW(widgets.monthlyPayroll) : '0원'}
                icon={<Banknote className="h-5 w-5" />}
              />
              <StatCard
                title="오늘 출근율"
                value={`${attendanceRate}%`}
                icon={<Clock className="h-5 w-5" />}
              />
              <StatCard
                title="52시간 경고"
                value={widgets?.overtimeWarnings ?? 0}
                icon={<AlertTriangle className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
