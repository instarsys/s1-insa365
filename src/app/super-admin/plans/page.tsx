'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody, Badge, Button } from '@/components/ui';

interface Plan {
  id: string;
  name: string;
  price: number;
  maxEmployees: number;
  features: string[];
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    maxEmployees: 5,
    features: ['기본 급여 계산', '직원 관리 (5명)', '기본 근태 관리'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49000,
    maxEmployees: 30,
    features: ['Free 모든 기능', '직원 관리 (30명)', '급여명세서 PDF', '휴가 관리', '이메일 지원'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 99000,
    maxEmployees: 100,
    recommended: true,
    features: ['Starter 모든 기능', '직원 관리 (100명)', '52시간 모니터링', '리포트 4종', 'API 접근', '전화 지원'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199000,
    maxEmployees: 300,
    features: ['Business 모든 기능', '직원 관리 (300명)', 'SSO 연동', '전용 서버', '세무사 연동', '24/7 지원'],
  },
];

function formatPrice(price: number): string {
  if (price === 0) return '무료';
  return `₩${price.toLocaleString('ko-KR')}/월`;
}

export default function PlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="플랜 관리" subtitle="SaaS 요금제를 관리하고 회사별 플랜 할당을 확인합니다." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${plan.recommended ? 'ring-2 ring-indigo-500' : ''}`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="info">추천</Badge>
              </div>
            )}
            <CardBody className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatPrice(plan.price)}</p>
              <p className="mt-1 text-sm text-gray-500">최대 {plan.maxEmployees}명</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-6 w-full ${plan.recommended ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                variant={plan.recommended ? 'primary' : 'secondary'}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {selectedPlan === plan.id ? '선택됨' : '플랜 선택'}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardBody>
          <h3 className="mb-4 text-sm font-semibold text-gray-700">회사별 플랜 할당 현황</h3>
          <p className="text-sm text-gray-500">
            플랜 관리 기능은 추후 업데이트 예정입니다. 현재는 모든 테넌트에 Business 플랜이 기본 적용됩니다.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
