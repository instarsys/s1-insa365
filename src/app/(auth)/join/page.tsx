'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Input, Button } from '@/components/ui';
import { apiPost, fetcher } from '@/lib/api';
import { mutate as globalMutate } from 'swr';
import Link from 'next/link';

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'register'>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async () => {
    setError('');
    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await fetcher(`/api/auth/join/verify?code=${inviteCode.trim()}`) as { valid: boolean; name: string; companyName: string; message?: string };
      if (result.valid) {
        setName(result.name);
        setCompanyName(result.companyName);
        setStep('register');
      } else {
        setError(result.message || '유효하지 않은 코드입니다.');
      }
    } catch {
      setError('코드 확인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('이메일을 입력해주세요.'); return; }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }

    setIsSubmitting(true);
    try {
      await apiPost('/api/auth/join', { inviteCode, email, password });
      await globalMutate('/api/auth/me');
      router.push('/employee/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : '합류에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-600">s1-insa365</h1>
          <p className="mt-2 text-sm text-gray-500">합류 초대</p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 'code' && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-600">
              회사 관리자로부터 받은 6자리 초대 코드를 입력해주세요.
            </p>
            <Input
              label="초대 코드"
              placeholder="ABCDEF"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              autoFocus
            />
            <Button
              type="button"
              className="w-full"
              onClick={handleVerify}
              disabled={isSubmitting}
            >
              {isSubmitting ? '확인 중...' : '코드 확인'}
            </Button>
          </div>
        )}

        {step === 'register' && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="rounded-lg bg-indigo-50 px-4 py-3">
              <p className="text-sm font-medium text-indigo-800">{companyName}</p>
              <p className="text-xs text-indigo-600">{name}님으로 초대되었습니다</p>
            </div>

            <Input
              label="이메일"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="비밀번호"
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label="비밀번호 확인"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep('code')}>
                이전
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? '합류 중...' : '합류하기'}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            로그인
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
