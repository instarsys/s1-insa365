'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, Input, Button } from '@/components/ui';
import { useAuth } from '@/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ email, password });
      if (result.user?.mustChangePassword) {
        router.push('/change-password');
      } else {
        const role = result.user?.role;
        router.push(role === 'EMPLOYEE' ? '/home' : role === 'SYSTEM_ADMIN' ? '/super-admin/dashboard' : '/dashboard');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.',
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">로그인</h2>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="이메일"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          아직 계정이 없으신가요?{' '}
          <Link
            href="/signup"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            회사 등록하기
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
