'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, Input, Button, Stepper, Select, Checkbox } from '@/components/ui';
import { useAuth } from '@/hooks';
import { validateBusinessNumber, formatBusinessNumber } from '@/domain/value-objects/BusinessNumber';

const steps = [
  { label: '회사 정보' },
  { label: '관리자 정보' },
  { label: '약관 동의' },
];

const employeeCountOptions = [
  { value: '1-10', label: '1~10명' },
  { value: '11-30', label: '11~30명' },
  { value: '31-50', label: '31~50명' },
  { value: '51-100', label: '51~100명' },
  { value: '101-300', label: '101~300명' },
  { value: '300+', label: '300명 이상' },
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
  const [employeeCountRange, setEmployeeCountRange] = useState('');

  // Step 2: Admin info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Step 3: Terms
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const allRequiredAgreed = termsAgreed && privacyAgreed;
  const allAgreed = termsAgreed && privacyAgreed && marketingAgreed;

  const handleAgreeAll = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setMarketingAgreed(checked);
  };

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = '상호명을 입력해주세요.';
    if (!businessNumber.trim()) {
      errors.businessNumber = '사업자번호를 입력해주세요.';
    } else {
      const result = validateBusinessNumber(businessNumber);
      if (!result.valid) errors.businessNumber = result.error!;
    }
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
    if (step === 0 && validateStep1()) {
      setStep(1);
      setFieldErrors({});
    } else if (step === 1 && validateStep2()) {
      setStep(2);
      setFieldErrors({});
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequiredAgreed) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        companyName,
        businessNumber,
        representativeName,
        employeeCountRange: employeeCountRange || undefined,
        name,
        email,
        password,
        termsAgreed,
        privacyAgreed,
        marketingAgreed,
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
          <h1 className="text-2xl font-bold text-indigo-600">s1-insa365</h1>
          <p className="mt-2 text-sm text-gray-500">한국 중소기업 급여 자동화</p>
        </div>

        <div className="mt-6 mb-6">
          <Stepper steps={steps} currentStep={step} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {step === 0 ? '회사 정보' : step === 1 ? '관리자 정보' : '약관 동의'}
          </h2>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step 1: Company Info */}
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
                onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
                error={fieldErrors.businessNumber}
                maxLength={12}
              />
              <Input
                label="대표자명"
                placeholder="홍길동"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                error={fieldErrors.representativeName}
              />
              <Select
                label="직원 수 (선택)"
                options={employeeCountOptions}
                placeholder="직원 수를 선택해주세요"
                value={employeeCountRange}
                onChange={(val) => setEmployeeCountRange(val)}
              />
              <Button type="button" className="w-full" onClick={handleNext}>
                다음
              </Button>
            </>
          )}

          {/* Step 2: Admin Info */}
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
                <Button type="button" className="flex-1" onClick={handleNext}>
                  다음
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Terms */}
          {step === 2 && (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                {/* 전체 동의 */}
                <div className="border-b border-gray-200 pb-3">
                  <Checkbox
                    label="전체 동의하기"
                    checked={allAgreed}
                    onChange={handleAgreeAll}
                    className="font-semibold"
                  />
                </div>

                {/* 이용약관 (필수) */}
                <Checkbox
                  label="이용약관 동의 (필수)"
                  checked={termsAgreed}
                  onChange={setTermsAgreed}
                />

                {/* 개인정보 처리방침 (필수) */}
                <Checkbox
                  label="개인정보 처리방침 동의 (필수)"
                  checked={privacyAgreed}
                  onChange={setPrivacyAgreed}
                />

                {/* 마케팅 수신 (선택) */}
                <Checkbox
                  label="마케팅 정보 수신 동의 (선택)"
                  checked={marketingAgreed}
                  onChange={setMarketingAgreed}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setStep(1);
                    setFieldErrors({});
                  }}
                >
                  이전
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || !allRequiredAgreed}
                >
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
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            로그인
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
