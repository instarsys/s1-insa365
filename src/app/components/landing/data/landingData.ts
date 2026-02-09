/**
 * 랜딩 페이지 콘텐츠 데이터
 * 기능, 후기, FAQ 등
 */

export interface Feature {
  iconName: string;
  title: string;
  description: string;
  highlight?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ComparisonItem {
  category: string;
  before: string;
  after: string;
}

export interface HowItWorksStep {
  step: number;
  iconName: string;
  title: string;
  description: string;
}

export interface CustomerStat {
  value: string;
  label: string;
  iconName: string;
}

export const FEATURES: Feature[] = [
  {
    iconName: 'Calculator',
    title: '출퇴근 기반 급여 자동계산',
    description: '출퇴근 데이터로 연장/지각/조퇴/외출까지 자동 계산. 4대보험, 소득세 완벽 반영',
    highlight: '급여 계산 시간 95% 절감',
  },
  {
    iconName: 'MapPin',
    title: 'GPS 기반 출퇴근 자동화',
    description: '위치 기반 출퇴근 자동 기록. 부정 출근 방지 + 실시간 근태 현황',
    highlight: '부정 출근 0%',
  },
  {
    iconName: 'FileSpreadsheet',
    title: '급여대장 원클릭 완성',
    description: '계산된 급여 데이터로 급여대장 자동 생성. 클릭 한 번으로 완료',
    highlight: '작업 시간 2일 → 10분',
  },
  {
    iconName: 'Mail',
    title: '급여명세서 원클릭 발송',
    description: '전 직원에게 급여명세서 일괄 발송. 암호화 PDF + 발송 이력 관리',
    highlight: '발송 시간 100% 단축',
  },
  {
    iconName: 'CalendarDays',
    title: '휴가 신청/승인 자동화',
    description: '연차 자동 계산 및 신청/승인 워크플로우. 잔여 연차 실시간 확인',
    highlight: '승인 시간 90% 단축',
  },
  {
    iconName: 'FileText',
    title: '증명서 즉시 발급',
    description: '재직증명서, 경력증명서 등 각종 증명서를 즉시 발급. PDF 다운로드 지원',
    highlight: '발급 시간 5분 → 10초',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: '무료 체험은 어떻게 신청하나요?',
    answer: '원하시는 플랜을 선택하시면 자동으로 21일 무료 체험이 시작됩니다. 카드 등록 없이 바로 시작할 수 있으며, Professional 플랜의 모든 기능을 제한 없이 사용하실 수 있습니다.',
  },
  {
    question: '직원 수가 변동되면 어떻게 하나요?',
    answer: '언제든지 설정 페이지에서 직원을 추가하거나 삭제할 수 있습니다. 요금은 실제 사용하는 직원 수에 따라 자동으로 조정되며, 일할 계산으로 정확하게 청구됩니다.',
  },
  {
    question: '데이터 보안은 어떻게 되나요?',
    answer: '주민등록번호 등 민감한 개인정보는 AES-256 암호화로 저장되며, 모든 데이터는 한국 내 AWS 서버에 보관됩니다. GDPR 및 개인정보보호법을 완벽하게 준수합니다.',
  },
  {
    question: '기존 시스템에서 데이터를 이전할 수 있나요?',
    answer: 'Excel 파일을 업로드하여 직원 정보를 일괄 등록할 수 있습니다. Enterprise 플랜을 선택하시면 전담 매니저가 데이터 마이그레이션을 무료로 지원해드립니다.',
  },
  {
    question: '모바일 앱도 제공되나요?',
    answer: '네, iOS와 Android 모바일 앱을 제공합니다. 직원들은 모바일 앱으로 출퇴근 체크, 휴가 신청, 급여명세서 조회 등을 할 수 있습니다.',
  },
  {
    question: '고객 지원은 어떻게 받나요?',
    answer: 'Starter/Professional 플랜은 이메일 지원, Enterprise 플랜은 전담 고객 지원팀과 월 2회 맞춤 컨설팅을 받으실 수 있습니다. 모든 플랜에서 온라인 가이드와 튜토리얼을 제공합니다.',
  },
];

export const COMPARISON_ITEMS: ComparisonItem[] = [
  { category: '출퇴근 기록', before: '엑셀로 수집 + 수동 통계', after: 'GPS 자동 기록 + 실시간 집계' },
  { category: '급여 계산', before: '연장/지각/조퇴 직접 계산 (2일)', after: '출퇴근 기반 자동 계산 (10분)' },
  { category: '급여대장', before: '항목별 수동 입력 + 검토', after: '원클릭 자동 생성' },
  { category: '급여명세서', before: '개별 발송 + 노출 위험', after: '원클릭 일괄 발송 + 암호화' },
  { category: '휴가 관리', before: '연차 계산 헷갈림, 수작업', after: '자동 계산 + 신청/승인 워크플로우' },
  { category: '증명서 발급', before: '요청 후 하루 기다림', after: '직원 직접 발급, 10초' },
];

export const CUSTOMER_STATS: CustomerStat[] = [
  { value: '3분', label: '급여 계산 완료', iconName: 'Zap' },
  { value: '95%', label: '업무 시간 절감', iconName: 'TrendingUp' },
  { value: '99.9%', label: '서비스 안정성', iconName: 'Shield' },
];

export const HOW_IT_WORKS: HowItWorksStep[] = [
  { step: 1, iconName: 'UserPlus', title: '회원가입', description: '이메일로 간단하게 가입하세요. 1분이면 충분합니다.' },
  { step: 2, iconName: 'Building2', title: '회사 정보 입력', description: '회사명, 사업자번호 등 기본 정보를 입력하세요.' },
  { step: 3, iconName: 'Users', title: '직원 등록', description: 'Excel 업로드로 직원 정보를 일괄 등록하세요.' },
  { step: 4, iconName: 'Rocket', title: '사용 시작', description: '모든 준비 완료! 지금 바로 HR 업무를 자동화하세요.' },
];
