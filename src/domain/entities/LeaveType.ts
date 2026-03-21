/**
 * 휴가 유형 (Domain 레이어 타입)
 *
 * Prisma enum과 동일한 값이지만 domain 자체 타입으로 독립.
 * Application/Domain 레이어는 이 타입을 참조하고,
 * Infrastructure 레이어에서 Prisma 타입과 매핑한다.
 */
export type LeaveType =
  | 'ANNUAL'
  | 'HALF_DAY_AM'
  | 'HALF_DAY_PM'
  | 'SICK'
  | 'FAMILY_EVENT'
  | 'UNPAID'
  | 'OTHER';
