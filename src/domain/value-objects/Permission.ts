/**
 * 세부 권한 시스템 — 카테고리별 권한 상수 정의
 * Domain 레이어: 외부 의존성 없음 (순수 TypeScript)
 */

export const PERMISSION_CATEGORIES = {
  ATTENDANCE_MGMT: '근태 관리',
  LEAVE_MGMT: '휴가 관리',
  PAYROLL_MGMT: '급여 관리',
  EMPLOYEE_MGMT: '직원 관리',
  GROUP_MGMT: '그룹 관리',
} as const;

export const PERMISSIONS = {
  ATTENDANCE_MGMT: {
    CONFIRM: '근태를 확정할 수 있습니다.',
    CANCEL: '근태 확정을 취소할 수 있습니다.',
    EDIT: '출퇴근기록을 추가/수정/삭제할 수 있습니다.',
  },
  LEAVE_MGMT: {
    APPROVE: '휴가를 승인/거부할 수 있습니다.',
    GRANT: '직원에게 휴가를 직접 부여할 수 있습니다.',
  },
  PAYROLL_MGMT: {
    VIEW: '급여 내역을 열람할 수 있습니다.',
    CALCULATE: '급여를 계산할 수 있습니다.',
    CONFIRM: '급여를 확정할 수 있습니다.',
  },
  EMPLOYEE_MGMT: {
    VIEW_SENSITIVE: '민감정보(주민번호/계좌)를 열람할 수 있습니다.',
  },
  GROUP_MGMT: {
    VIEW_ALL: '모든 그룹을 열람할 수 있습니다.',
    EDIT: '배정된 그룹 정보를 수정할 수 있습니다.',
  },
} as const;

export type PermissionCategory = keyof typeof PERMISSIONS;
export type PermissionKey<C extends PermissionCategory> = keyof typeof PERMISSIONS[C];

/** MANAGER 역할의 기본 권한 (회사 가입 시 시드) */
export const DEFAULT_MANAGER_PERMISSIONS: Record<string, Record<string, boolean>> = {
  ATTENDANCE_MGMT: { CONFIRM: true, CANCEL: false, EDIT: false },
  LEAVE_MGMT: { APPROVE: true, GRANT: false },
  PAYROLL_MGMT: { VIEW: true, CALCULATE: true, CONFIRM: true },
  EMPLOYEE_MGMT: { VIEW_SENSITIVE: false },
  GROUP_MGMT: { VIEW_ALL: false, EDIT: false },
};
