'use client';

import { useState } from 'react';
import { LogOut, Lock, Bell, Mail, Phone, Calendar } from 'lucide-react';
import { Card, CardBody, Avatar, Button, Input, Modal } from '@/components/ui';
import { useAuth } from '@/hooks';
import { apiPut } from '@/lib/api';

export default function EmployeeMyPage() {
  const { user, logout } = useAuth();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phone, setPhone] = useState('010-0000-0000');

  const [notifPayroll, setNotifPayroll] = useState(true);
  const [notifAttendance, setNotifAttendance] = useState(true);
  const [notifLeave, setNotifLeave] = useState(true);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('비밀번호는 8자 이상이어야 합니다');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다');
      return;
    }
    setChangingPassword(true);
    try {
      await apiPut('/api/auth/password', { currentPassword, newPassword });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('비밀번호 변경에 실패했습니다');
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePhoneSave = async () => {
    try {
      await apiPut('/api/employees/me/phone', { phone });
      setPhoneEditing(false);
    } catch {
      // Error handled by API client
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <Card className="rounded-2xl">
        <CardBody className="flex flex-col items-center p-6">
          <Avatar name={user?.name ?? '?'} size="lg" className="h-16 w-16 text-xl" />
          <p className="mt-3 text-lg font-semibold text-gray-800">{user?.name ?? '-'}</p>
          <p className="mt-0.5 text-xs text-gray-500">{user?.employeeNumber ?? '-'}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span>{user?.role === 'EMPLOYEE' ? '직원' : user?.role ?? '-'}</span>
          </div>
        </CardBody>
      </Card>

      {/* Info cards */}
      <div className="space-y-2">
        <Card className="rounded-2xl">
          <CardBody className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">입사일</p>
                  <p className="text-xs font-medium text-gray-800">2024.01.02</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
                  <Mail className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">이메일</p>
                  <p className="text-xs font-medium text-gray-800">{user?.email ?? '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
                  <Phone className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400">연락처</p>
                    {phoneEditing ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-8 w-32 text-xs"
                        />
                        <Button size="sm" onClick={handlePhoneSave} className="h-7 px-2 text-xs">
                          저장
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPhoneEditing(false)} className="h-7 px-2 text-xs">
                          취소
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-gray-800">{phone}</p>
                    )}
                  </div>
                  {!phoneEditing && (
                    <button onClick={() => setPhoneEditing(true)} className="text-xs text-purple-600">
                      수정
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Lock className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-800">비밀번호 변경</span>
        </button>
        <button
          onClick={() => setShowNotifModal(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Bell className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-800">알림 설정</span>
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <span className="text-sm font-medium text-red-600">로그아웃</span>
        </button>
      </div>

      {/* Password change modal */}
      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="비밀번호 변경"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>
              취소
            </Button>
            <Button onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword ? '변경 중...' : '변경'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="현재 비밀번호"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="새 비밀번호"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
          />
        </div>
      </Modal>

      {/* Notification settings modal */}
      <Modal
        open={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        title="알림 설정"
        footer={
          <Button onClick={() => setShowNotifModal(false)}>닫기</Button>
        }
      >
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">급여 알림</span>
            <input
              type="checkbox"
              checked={notifPayroll}
              onChange={(e) => setNotifPayroll(e.target.checked)}
              className="h-5 w-5 accent-purple-600"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">근태 알림</span>
            <input
              type="checkbox"
              checked={notifAttendance}
              onChange={(e) => setNotifAttendance(e.target.checked)}
              className="h-5 w-5 accent-purple-600"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">휴가 알림</span>
            <input
              type="checkbox"
              checked={notifLeave}
              onChange={(e) => setNotifLeave(e.target.checked)}
              className="h-5 w-5 accent-purple-600"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
