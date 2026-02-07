'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, Input, Button, Stepper } from '@/components/ui';
import { useAuth } from '@/hooks';

const steps = [
  { label: '회사 정보' },
  { label: '관리자 정보' },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Company info
  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [representativeName, setRepresentativeName] = useState('');

  // Step 2: Admin info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = '상호명을 입력해주세요.';
    if (!businessNumber.trim()) errors.businessNumber = '사업자번호를 입력해주세요.';
    if (!representativeName.trim()) errors.representativeName = '대표자명을 입력해주세요.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = '이름을 입력해주세요.';
    if (!email.trim()) errors.email = '이메일을 입력해주세요.';
    if (!password) errors.password = '비밀번호를 입력해주세요.';
    else if (password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다.';
    if (password !== passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(1);
      setFieldErrors({});
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      await signup({
        companyName,
        businessNumber,
        representativeName,
        name,
        email,
        password,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '가입에 실패했습니다. 다시 시도해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-purple-600">s1-insa365</h1>
          <p className="mt-2 text-sm text-gray-500">한국 중소기업 급여 자동화</p>
        </div>

        <div className="mt-6">
          <Stepper steps={steps} currentStep={step} />
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {step === 0 ? '회사 정보' : '관리자 정보'}
          </h2>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {step === 0 && (
            <>
              <Input
                label="상호 (회사명)"
                placeholder="주식회사 인사365"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={fieldErrors.companyName}
              />
              <Input
                label="사업자번호"
                placeholder="000-00-00000"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                error={fieldErrors.businessNumber}
              />
              <Input
                label="대표자명"
                placeholder="홍길동"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                error={fieldErrors.representativeName}
              />
              <Button type="button" className="w-full" onClick={handleNext}>
                다음
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <Input
                label="이름"
                placeholder="관리자 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
              />
              <Input
                label="이메일"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                autoComplete="email"
              />
              <Input
                label="비밀번호"
                type="password"
                placeholder="8자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                autoComplete="new-password"
              />
              <Input
                label="비밀번호 확인"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                error={fieldErrors.passwordConfirm}
                autoComplete="new-password"
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setStep(0);
                    setFieldErrors({});
                  }}
                >
                  이전
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? '가입 중...' : '가입하기'}
                </Button>
              </div>
            </>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            className="font-medium text-purple-600 hover:text-purple-700"
          >
            로그인
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
