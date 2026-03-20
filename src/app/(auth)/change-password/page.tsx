'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Input, Button } from '@/components/ui';
import { apiPut } from '@/lib/api';
import { mutate as globalMutate } from 'swr';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPut('/api/auth/change-password', { newPassword });
      await globalMutate('/api/auth/me');
      const role = document.cookie.split('; ').find(r => r.startsWith('user_role='))?.split('=')[1];
      router.push(role === 'EMPLOYEE' ? '/home' : role === 'SYSTEM_ADMIN' ? '/super-admin/dashboard' : '/dashboard');
    } catch {
      setError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-600">s1-insa365</h1>
          <p className="mt-2 text-sm text-gray-500">보안을 위해 비밀번호를 변경해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">비밀번호 변경</h2>
          <p className="text-sm text-gray-500">
            임시 비밀번호로 로그인하셨습니다. 새 비밀번호를 설정해주세요.
          </p>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="새 비밀번호"
            type="password"
            placeholder="8자 이상 입력하세요"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />

          <Input
            label="새 비밀번호 확인"
            type="password"
            placeholder="새 비밀번호를 다시 입력하세요"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
