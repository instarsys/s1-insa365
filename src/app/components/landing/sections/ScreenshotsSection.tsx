'use client';

import { useState } from 'react';
import { LayoutDashboard, Wallet, Calendar, FileText } from 'lucide-react';

const SCREENSHOTS = [
  { id: 'dashboard', title: '대시보드', description: '한눈에 보는 HR 현황. 오늘의 출근 현황, 휴가 신청, 급여 통계를 실시간으로 확인하세요.', Icon: LayoutDashboard, image: '/screenshots/dashboard.png' },
  { id: 'payroll', title: '급여 계산', description: '4대보험, 소득세, 지방소득세까지 자동 계산. 300명 급여도 클릭 한 번으로 완료.', Icon: Wallet, image: '/screenshots/payroll.png' },
  { id: 'attendance', title: '근태 관리', description: 'GPS 기반 출퇴근 체크, 월간 캘린더 뷰, 근무시간 자동 집계까지.', Icon: Calendar, image: '/screenshots/attendance.png' },
  { id: 'certificate', title: '증명서 발급', description: '재직증명서, 경력증명서 등 10초 내 PDF 발급. 직원이 직접 발급받을 수 있어요.', Icon: FileText, image: '/screenshots/certificate.png' },
];

export default function ScreenshotsSection() {
  const [activeTab, setActiveTab] = useState(0);
  const active = SCREENSHOTS[activeTab];

  return (
    <section id="screenshots" className="bg-gray-50 py-24 lg:py-32">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">
            <span className="text-blue-600">직관적인 인터페이스</span>로
            <br />누구나 쉽게
          </h2>
          <p className="section-subtitle">복잡한 HR 업무를 단순하게. 교육 없이도 바로 사용할 수 있어요.</p>
        </div>

        {/* Tabs */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {SCREENSHOTS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === i
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <s.Icon className="h-4 w-4" />
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Screenshot image */}
        <div className="mx-auto mt-10 max-w-5xl">
          <img
            src={active.image}
            alt={active.title}
            className="w-full rounded-2xl border border-gray-200 shadow-xl"
          />

          <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <active.Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div>
                <h3 className="font-bold text-gray-900">{active.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{active.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
