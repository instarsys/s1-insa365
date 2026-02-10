'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody, Tabs, Badge, Button, Spinner, EmptyState, Modal, Input, Select } from '@/components/ui';
import { useInvitations } from '@/hooks/useInvitations';
import { Copy, Send, X } from 'lucide-react';

const STATUS_TABS = [
  { id: 'all', label: '전체' },
  { id: 'PENDING', label: '대기' },
  { id: 'SENT', label: '발송' },
  { id: 'ACCEPTED', label: '수락' },
  { id: 'EXPIRED', label: '만료' },
];

const STATUS_VARIANT: Record<string, 'gray' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'gray',
  SENT: 'info',
  ACCEPTED: 'success',
  EXPIRED: 'warning',
  CANCELLED: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  SENT: '발송됨',
  ACCEPTED: '수락됨',
  EXPIRED: '만료',
  CANCELLED: '취소됨',
};

export default function InvitationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [sendMethod, setSendMethod] = useState('NONE');
  const [creating, setCreating] = useState(false);

  const statusFilter = activeTab === 'all' ? undefined : activeTab;
  const { invitations, isLoading, createInvitation, resendInvitation, cancelInvitation } = useInvitations(statusFilter);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createInvitation({
        name: newName,
        email: newEmail || undefined,
        sendMethod,
      });
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      setSendMethod('NONE');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div>
      <PageHeader
        title="합류 초대"
        subtitle="직원 합류 초대 코드를 관리합니다."
      >
        <Button onClick={() => setShowCreate(true)}>
          초대 생성
        </Button>
      </PageHeader>

      <Tabs
        tabs={STATUS_TABS.map((t) => ({ key: t.id, label: t.label }))}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      <Card className="mt-4">
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="로딩중..." className="py-8" />
          ) : invitations.length === 0 ? (
            <EmptyState title="초대 없음" description="생성된 초대가 없습니다." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">이름</th>
                  <th className="px-4 py-3 text-left">초대 코드</th>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-left">만료일</th>
                  <th className="px-4 py-3 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{inv.name}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-indigo-600">{inv.inviteCode}</span>
                      <button
                        onClick={() => copyCode(inv.inviteCode)}
                        className="ml-1.5 text-gray-400 hover:text-gray-600"
                        title="코드 복사"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{inv.email ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[inv.status] ?? 'gray'}>
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(inv.expiresAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {(inv.status === 'PENDING' || inv.status === 'SENT') && (
                          <>
                            <button
                              onClick={() => resendInvitation(inv.id)}
                              className="rounded p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                              title="재발송"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => cancelInvitation(inv.id)}
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="취소"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="합류 초대 생성">
        <div className="space-y-4">
          <Input
            label="이름"
            placeholder="직원 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            label="이메일 (선택)"
            type="email"
            placeholder="employee@company.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Select
            label="발송 방법"
            options={[
              { value: 'NONE', label: '발송 안 함 (코드만 생성)' },
              { value: 'IMMEDIATE', label: '즉시 발송' },
            ]}
            value={sendMethod}
            onChange={(val) => setSendMethod(val)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? '생성 중...' : '초대 생성'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
