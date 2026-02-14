export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export const SALARY_STATUS = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

export const INSURANCE_MODE = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL',
  NONE: 'NONE',
} as const;

export const LAYOUT = {
  SIDEBAR_WIDTH: 240,
  SIDEBAR_COLLAPSED_WIDTH: 64,
  TOPBAR_HEIGHT: 56,
  MOBILE_TOPBAR_HEIGHT: 48,
  MOBILE_TABBAR_HEIGHT: 56,
  CONTENT_MAX_WIDTH: 1280,
  CONTENT_PADDING: 32,
} as const;

export const SALARY_TYPE = {
  MONTHLY: 'MONTHLY',
  HOURLY: 'HOURLY',
} as const;

export const SALARY_TYPE_OPTIONS = [
  { value: 'MONTHLY', label: '월급제' },
  { value: 'HOURLY', label: '시급제' },
] as const;

export const HIRE_TYPE_OPTIONS = [
  { value: 'NEW', label: '신규입사' },
  { value: 'EXPERIENCED', label: '경력입사' },
  { value: 'REHIRE', label: '재입사' },
  { value: 'CONTRACT_CONVERT', label: '계약직전환' },
] as const;

export const KOREAN_BANKS = [
  { value: 'KB', label: 'KB국민은행' },
  { value: 'SHINHAN', label: '신한은행' },
  { value: 'WOORI', label: '우리은행' },
  { value: 'HANA', label: '하나은행' },
  { value: 'IBK', label: 'IBK기업은행' },
  { value: 'NH', label: 'NH농협은행' },
  { value: 'SC', label: 'SC제일은행' },
  { value: 'CITI', label: '한국시티은행' },
  { value: 'KAKAO', label: '카카오뱅크' },
  { value: 'TOSS', label: '토스뱅크' },
  { value: 'KBANK', label: '케이뱅크' },
  { value: 'DGB', label: 'DGB대구은행' },
  { value: 'BNK_BUSAN', label: 'BNK부산은행' },
  { value: 'BNK_KYONGNAM', label: 'BNK경남은행' },
  { value: 'GWANGJU', label: '광주은행' },
  { value: 'JEONBUK', label: '전북은행' },
  { value: 'JEJU', label: '제주은행' },
  { value: 'SUHYUP', label: '수협은행' },
  { value: 'SHINHYUP', label: '신협' },
  { value: 'SAEMAUL', label: '새마을금고' },
  { value: 'POST', label: '우체국' },
  { value: 'KFCC', label: '산림조합' },
] as const;
