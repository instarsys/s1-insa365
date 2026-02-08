'use client';

import useSWR from 'swr';
import { Building2, Users, Wallet, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody, Spinner } from '@/components/ui';
import { fetcher } from '@/lib/api';

interface HealthData {
  companyCount: number;
  userCount: number;
  payroll: {
    year: number;
    month: number;
    confirmed: number;
    draft: number;
    paid: number;
  };
  uptime: number;
  timestamp: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간 ${m}분`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function SuperAdminDashboardPage() {
  const { data, isLoading } = useSWR<HealthData>('/api/super-admin/health', fetcher, {
    refreshInterval: 30000,
  });

  return (
    <div>
      <PageHeader title="시스템 대시보드" subtitle="시스템 전체 현황을 모니터링합니다." />

      {isLoading || !data ? (
        <Spinner text="시스템 상태 로딩중..." className="py-12" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Building2} label="전체 테넌트(회사)" value={data.companyCount} color="bg-indigo-500" />
            <StatCard icon={Users} label="전체 사용자" value={data.userCount} color="bg-blue-500" />
            <StatCard icon={Wallet} label={`${data.payroll.month}월 급여 확정`} value={data.payroll.confirmed} color="bg-emerald-500" />
            <StatCard icon={Clock} label="시스템 가동시간" value={formatUptime(data.uptime)} color="bg-slate-500" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h3 className="mb-4 text-sm font-semibold text-gray-700">
                  {data.payroll.year}년 {data.payroll.month}월 급여 처리 현황
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">확정 (CONFIRMED)</span>
                    <span className="text-sm font-medium text-emerald-600">{data.payroll.confirmed}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">작성중 (DRAFT)</span>
                    <span className="text-sm font-medium text-yellow-600">{data.payroll.draft}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">지급완료 (PAID)</span>
                    <span className="text-sm font-medium text-blue-600">{data.payroll.paid}건</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="mb-4 text-sm font-semibold text-gray-700">시스템 정보</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">가동 시간</span>
                    <span className="text-sm font-medium">{formatUptime(data.uptime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">마지막 확인</span>
                    <span className="text-sm font-medium">{new Date(data.timestamp).toLocaleString('ko-KR')}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
