'use client';

import { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';
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
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div>
      <PageHeader title="휴가 설정" subtitle="휴가 그룹, 유형, 발생 규칙을 관리합니다." />

      {/* 연차 규정 안내 Info Box */}
      <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50">
        <button
          type="button"
          onClick={() => setInfoOpen(!infoOpen)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          <Info className="h-4 w-4 shrink-0 text-sky-600" />
          <span className="text-sm font-medium text-sky-800">연차 규정 안내</span>
          <ChevronDown className={`ml-auto h-4 w-4 text-sky-600 transition-transform ${infoOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="grid transition-all duration-200" style={{ gridTemplateRows: infoOpen ? '1fr' : '0fr' }}>
          <div className="overflow-hidden">
            <div className="px-4 pb-4 text-sm text-sky-700 leading-relaxed">
              <p className="mb-2">근로기준법에 따라 다음 조건 충족 시 연차 유급휴가가 발생합니다:</p>
              <ul className="mb-3 list-disc space-y-1 pl-5">
                <li>상시 5인 이상 사업장의 모든 근로자 (월급제/시급제/일급제 무관)</li>
                <li>주 15시간 이상 근무 (15시간 미만: 연차 미적용)</li>
                <li>1년 미만: 1개월 개근 시 1일</li>
                <li>1년 이상: 15일 (3년 이상 2년마다 +1일, 최대 25일)</li>
              </ul>
              <p className="mb-2">단시간 근로자(파트타임)는 통상 근로자 대비 근로시간 비례로 연차가 부여됩니다.</p>
              <p>유급 휴가 사용 시 시급제 근로자에게도 1일 소정근로시간(근무정책 기준) x 시급의 급여가 지급됩니다.</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'groups' && <LeaveGroupsTab />}
      {activeTab === 'types' && <LeaveTypesTab />}
      {activeTab === 'accrual-rules' && <LeaveAccrualRulesTab />}
    </div>
  );
}
