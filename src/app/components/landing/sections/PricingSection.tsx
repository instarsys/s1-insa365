'use client';

import { useState } from 'react';
import Link from 'next/link';

type BillingCycle = 'monthly' | 'yearly';

interface PricingPlan {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  annualDiscount: number;
  maxEmployees: string;
  description: string;
  features: string[];
  isRecommended?: boolean;
  cta: string;
}

const PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    monthlyPrice: 4900,
    yearlyPrice: 3900,
    annualDiscount: 20,
    maxEmployees: '최대 10명',
    description: '소규모 팀을 위한 기본 HR 기능',
    features: [
      '급여 자동 계산',
      '4대보험 자동 계산',
      'GPS 출퇴근 체크',
      '휴가 관리',
      '모바일 앱',
      '관리자 2명',
    ],
    cta: '시작하기',
  },
  {
    name: 'Professional',
    monthlyPrice: 6900,
    yearlyPrice: 5700,
    annualDiscount: 17,
    maxEmployees: '최대 300명',
    description: '중소기업을 위한 완전한 HR 자동화',
    features: [
      'Starter의 모든 기능',
      '급여명세서 자동 발송',
      '급여 일괄 계산/확정',
      '휴가 승인 워크플로우',
      '고급 근태 관리',
      '관리자 5명',
    ],
    isRecommended: true,
    cta: '21일 무료 체험',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 11900,
    yearlyPrice: 10100,
    annualDiscount: 15,
    maxEmployees: '무제한',
    description: '대규모 조직을 위한 프리미엄 솔루션',
    features: [
      'Professional의 모든 기능',
      '전담 고객 지원',
      '맞춤 컨설팅 (월 2회)',
      '데이터 마이그레이션 지원',
      '무제한 데이터 보관',
      '관리자 무제한',
    ],
    cta: '도입 문의',
  },
];

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');

  return (
    <section id="pricing" className="bg-white py-24 lg:py-32">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">합리적인 요금제</h2>
          <p className="section-subtitle">귀사의 규모에 맞는 최적의 플랜을 선택하세요</p>
        </div>

        {/* Billing toggle */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
                billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
                billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              연간 결제
              <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                최대 20% 절약
              </span>
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
            21일 무료 체험 · 신용카드 불필요
          </span>
        </div>

        {/* Plans */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const discount = billingCycle === 'yearly' ? plan.annualDiscount : 0;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
                  plan.isRecommended ? 'border-blue-600 shadow-lg' : 'border-gray-200'
                }`}
              >
                {plan.isRecommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    인기
                  </span>
                )}

                <div className="text-xl font-bold text-gray-900">{plan.name}</div>
                <p className="mt-1 text-xs text-gray-500">{plan.maxEmployees}</p>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">{price.toLocaleString()}원</span>
                  <span className="ml-1 text-gray-500">/명, 월</span>
                  {discount > 0 && (
                    <div className="mt-1 text-sm font-medium text-blue-600">연간 결제 시 {discount}% 절약</div>
                  )}
                </div>

                <Link
                  href={plan.name === 'Enterprise' ? '/contact' : '/signup'}
                  className={`mt-6 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                    plan.isRecommended
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="mt-8 flex-1">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">주요 기능</div>
                  <ul className="space-y-2.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="mt-0.5 text-blue-600">&#10003;</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          추가 문의사항이 있으신가요?{' '}
          <Link href="/contact" className="font-semibold text-blue-600 hover:underline">
            고객 지원팀에 문의하기
          </Link>
        </div>
      </div>
    </section>
  );
}
