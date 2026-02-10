'use client';

import { useState } from 'react';
import { CreditCard, Crown, Zap, Building2, Check, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, Input, Select, Spinner, useToast } from '@/components/ui';
import { useBilling, usePaymentHistory, useBillingMutations } from '@/hooks/useBilling';
import { formatKRW, formatDate } from '@/lib/utils';

const PLAN_CARDS = [
  {
    key: 'TRIAL',
    name: 'Trial',
    price: 0,
    icon: Building2,
    features: ['직원 5명', '14일 무료', '기본 급여 계산', '이메일 지원'],
    color: 'gray',
  },
  {
    key: 'STARTER',
    name: 'Starter',
    price: 2000,
    icon: Zap,
    features: ['직원 50명', '급여 자동 계산', '4대보험 자동', '휴가 관리', '이메일 + 채팅 지원'],
    color: 'indigo',
    popular: true,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 3500,
    icon: Crown,
    features: ['직원 300명', 'Starter 전체 포함', '커스텀 리포트', '세무사 연동', '전담 매니저'],
    color: 'purple',
  },
];

const STATUS_LABEL: Record<string, string> = {
  TRIAL_ACTIVE: '무료 체험',
  ACTIVE: '활성',
  PAST_DUE: '결제 지연',
  CANCELLED: '취소됨',
};

const PAYMENT_STATUS: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'gray' }> = {
  PAID: { label: '완료', variant: 'success' },
  FAILED: { label: '실패', variant: 'error' },
  PENDING: { label: '대기', variant: 'warning' },
  REFUNDED: { label: '환불', variant: 'gray' },
};

export default function BillingPage() {
  const toast = useToast();
  const { subscription, employeeCount, isLoading, mutate } = useBilling();
  const { payments } = usePaymentHistory();
  const { registerCard, removeCard, changePlan } = useBillingMutations();

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardDigits, setCardDigits] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState<string | null>(null);

  const currentPlan = subscription?.plan || 'TRIAL';
  const maxEmployees = subscription?.maxEmployees || 5;
  const usagePercent = maxEmployees > 0 ? Math.round((employeeCount / maxEmployees) * 100) : 0;
  const hasCard = !!subscription?.lastCardDigits;

  const handleRegisterCard = async () => {
    if (!cardDigits || !cardBrand) {
      toast.error('카드 정보를 입력해주세요.');
      return;
    }
    setIsRegistering(true);
    try {
      await registerCard(cardDigits, cardBrand);
      await mutate();
      setShowCardModal(false);
      setCardDigits('');
      setCardBrand('');
      toast.success('카드가 등록되었습니다.');
    } catch {
      toast.error('카드 등록에 실패했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemoveCard = async () => {
    try {
      await removeCard();
      await mutate();
      toast.success('카드가 삭제되었습니다.');
    } catch {
      toast.error('카드 삭제에 실패했습니다.');
    }
  };

  const handleChangePlan = async (plan: string) => {
    if (plan === currentPlan) return;
    if (plan !== 'TRIAL' && !hasCard) {
      toast.error('유료 플랜으로 변경하려면 먼저 카드를 등록해주세요.');
      return;
    }
    setIsChangingPlan(plan);
    try {
      await changePlan(plan);
      await mutate();
      toast.success(`${plan} 플랜으로 변경되었습니다.`);
    } catch {
      toast.error('플랜 변경에 실패했습니다.');
    } finally {
      setIsChangingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="플랜/결제" subtitle="구독 플랜과 결제 정보를 관리합니다." />
        <Spinner text="로딩 중..." className="py-20" />
      </div>
    );
  }

  // 다음 결제 예상 금액
  const nextPaymentAmount = (subscription?.pricePerEmployee || 0) * employeeCount;
  const nextPaymentDate = subscription?.currentPeriodEnd
    ? formatDate(subscription.currentPeriodEnd)
    : '-';

  return (
    <div>
      <PageHeader title="플랜/결제" subtitle="구독 플랜과 결제 정보를 관리합니다." />

      {/* Plan Selection */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLAN_CARDS.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.key;
          const borderColor = isCurrentPlan ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200';
          return (
            <Card key={plan.key} className={`relative ${borderColor}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="info">인기</Badge>
                </div>
              )}
              <CardBody className="text-center">
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-${plan.color}-50`}>
                  <Icon className={`h-6 w-6 text-${plan.color}-600`} />
                </div>
                <h3 className="mt-3 text-lg font-bold text-gray-800">{plan.name}</h3>
                <div className="mt-2">
                  {plan.price === 0 ? (
                    <span className="text-2xl font-bold text-gray-900">무료</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-gray-900">{formatKRW(plan.price)}</span>
                      <span className="text-sm text-gray-500">/인/월</span>
                    </>
                  )}
                </div>
                <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={isCurrentPlan ? 'secondary' : 'primary'}
                  disabled={isCurrentPlan || isChangingPlan !== null}
                  onClick={() => handleChangePlan(plan.key)}
                >
                  {isChangingPlan === plan.key ? '변경 중...' : isCurrentPlan ? '현재 플랜' : '선택'}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
          </CardHeader>
          <CardBody>
            {hasCard ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-800">
                      **** {subscription!.lastCardDigits}
                    </p>
                    <p className="text-xs text-gray-500">{subscription!.cardBrand}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowCardModal(true)}>
                    변경
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleRemoveCard}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">등록된 카드가 없습니다.</p>
                <Button className="mt-3" onClick={() => setShowCardModal(true)}>
                  카드 등록
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>사용 현황</CardTitle>
            <Badge variant={subscription?.status === 'ACTIVE' ? 'success' : 'info'}>
              {STATUS_LABEL[subscription?.status || 'TRIAL_ACTIVE']}
            </Badge>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">직원 수</span>
                  <span className="text-sm font-medium">
                    {employeeCount} / {maxEmployees}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
              {currentPlan !== 'TRIAL' && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">다음 결제</span>
                    <span className="font-medium text-gray-800">{nextPaymentDate}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-gray-600">예상 금액</span>
                    <span className="font-medium text-gray-800">{formatKRW(nextPaymentAmount)}</span>
                  </div>
                </div>
              )}
              {subscription?.trialEndsAt && currentPlan === 'TRIAL' && (
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-sm text-amber-800">
                    무료 체험 만료: {formatDate(subscription.trialEndsAt)}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Payment History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>결제 이력</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {payments.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                결제 이력이 없습니다.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">날짜</th>
                    <th className="px-4 py-3 text-left">설명</th>
                    <th className="px-4 py-3 text-right">직원 수</th>
                    <th className="px-4 py-3 text-right">금액</th>
                    <th className="px-4 py-3 text-center">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => {
                    const st = PAYMENT_STATUS[p.status] || { label: p.status, variant: 'gray' as const };
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {p.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {p.employeeCount}명
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                          {formatKRW(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Card Registration Modal */}
      <Modal open={showCardModal} onClose={() => setShowCardModal(false)} title="카드 등록">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            MVP에서는 카드 마지막 4자리와 카드사를 입력합니다.
            프로덕션에서는 토스페이먼츠 SDK를 통해 안전하게 카드 정보를 처리합니다.
          </p>
          <Input
            label="카드 마지막 4자리"
            placeholder="1234"
            value={cardDigits}
            onChange={(e) => setCardDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
          />
          <Select
            label="카드사"
            options={[
              { value: '', label: '카드사 선택' },
              { value: '삼성카드', label: '삼성카드' },
              { value: '현대카드', label: '현대카드' },
              { value: '신한카드', label: '신한카드' },
              { value: '국민카드', label: '국민카드' },
              { value: '롯데카드', label: '롯데카드' },
              { value: '하나카드', label: '하나카드' },
              { value: '우리카드', label: '우리카드' },
              { value: 'BC카드', label: 'BC카드' },
            ]}
            value={cardBrand}
            onChange={setCardBrand}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCardModal(false)}>
              취소
            </Button>
            <Button
              onClick={handleRegisterCard}
              disabled={isRegistering || cardDigits.length !== 4 || !cardBrand}
            >
              {isRegistering ? '등록 중...' : '카드 등록'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
