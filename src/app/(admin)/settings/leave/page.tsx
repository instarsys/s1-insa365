'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Tabs } from '@/components/ui/Tabs';
import { LeaveGroupsTab } from '@/components/settings/LeaveGroupsTab';
import { LeaveTypesTab } from '@/components/settings/LeaveTypesTab';
import { LeaveAccrualRulesTab } from '@/components/settings/LeaveAccrualRulesTab';

const tabs = [
  { key: 'groups', label: '휴가 그룹' },
  { key: 'types', label: '휴가 유형' },
  { key: 'accrual-rules', label: '발생 규칙' },
];

export default function LeaveSettingsPage() {
  const [activeTab, setActiveTab] = useState('groups');

  return (
    <div>
      <PageHeader title="휴가 설정" subtitle="휴가 그룹, 유형, 발생 규칙을 관리합니다." />

      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'groups' && <LeaveGroupsTab />}
      {activeTab === 'types' && <LeaveTypesTab />}
      {activeTab === 'accrual-rules' && <LeaveAccrualRulesTab />}
    </div>
  );
}
