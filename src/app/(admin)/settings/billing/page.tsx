'use client';

import { CreditCard, Crown } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function BillingPage() {
  return (
    <div>
      <PageHeader title="플랜/결제" subtitle="구독 플랜과 결제 정보를 관리합니다." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>현재 플랜</CardTitle>
            <Badge variant="info">무료 체험</Badge>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                <Crown className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Free Trial</p>
                <p className="text-sm text-gray-500">30일 무료 체험 중</p>
              </div>
            </div>
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">직원 수 제한</p>
                  <p className="mt-0.5 font-medium">50명</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">남은 기간</p>
                  <p className="mt-0.5 font-medium">30일</p>
                </div>
              </div>
            </div>
            <Button className="mt-4 w-full" disabled>
              업그레이드 (Phase 1.5 예정)
            </Button>
          </CardBody>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>사용 현황</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">직원 수</span>
                  <span className="text-sm font-medium">0 / 50</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">급여 실행 횟수</span>
                  <span className="text-sm font-medium">0 / 무제한</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">저장 용량</span>
                  <span className="text-sm font-medium">0 MB / 1 GB</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Payment Method placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
          </CardHeader>
          <CardBody className="text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">결제 시스템은 Phase 1.5에서 제공됩니다.</p>
            <p className="mt-1 text-xs text-gray-400">토스페이먼츠 연동 예정</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
