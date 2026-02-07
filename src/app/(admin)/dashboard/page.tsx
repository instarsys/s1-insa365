'use client';

import { Users, Banknote, Clock, AlertTriangle, CalendarCheck, FileText, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDashboardTodos, useDashboardWidgets } from '@/hooks';
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

export default function DashboardPage() {
  const { todos, isLoading: todosLoading } = useDashboardTodos();
  const { widgets, isLoading: widgetsLoading } = useDashboardWidgets();

  const attendanceRate = widgets?.todayAttendance
    ? widgets.todayAttendance.total > 0
      ? Math.round((widgets.todayAttendance.present / widgets.todayAttendance.total) * 100)
      : 0
    : 0;

  return (
    <div>
      <PageHeader title="대시보드" subtitle="오늘의 할 일과 주요 지표를 확인하세요." />

      {/* Stat Cards */}
      {widgetsLoading ? (
        <Spinner text="지표 로딩중..." className="py-8" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      )}

      {/* To-do List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>오늘의 할 일</CardTitle>
          <Badge variant="info">{todos.length}건</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {todosLoading ? (
            <Spinner text="할 일 로딩중..." className="py-8" />
          ) : todos.length === 0 ? (
            <EmptyState
              title="처리할 할 일이 없습니다"
              description="모든 업무가 완료되었습니다."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {todos.map((todo) => (
                <li key={todo.id}>
                  <Link
                    href={todo.link}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      {TODO_ICON_MAP[todo.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{todo.title}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{todo.description}</p>
                    </div>
                    <Badge variant={PRIORITY_VARIANT[todo.priority]}>
                      {PRIORITY_LABEL[todo.priority]}
                    </Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Attendance Summary */}
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
  );
}
