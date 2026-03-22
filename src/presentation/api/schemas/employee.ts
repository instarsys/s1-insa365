import { z } from 'zod';

export const HIRE_TYPES = ['NEW', 'EXPERIENCED', 'REHIRE', 'CONTRACT_CONVERT', 'CONTRACT'] as const;

export const SALARY_TYPES = ['MONTHLY', 'HOURLY'] as const;

// 공통 필드 검증 규칙 (생성/수정 스키마에서 동일하게 사용)
const phoneField = z.preprocess(
  (val) => typeof val === 'string' ? val.replace(/\D/g, '') : val,
  z.string().min(8, '연락처는 최소 8자리입니다.').max(11, '연락처는 최대 11자리입니다.'),
);

const rrnField = z.string().regex(
  /^\d{6}-?\d{7}$/,
  '주민등록번호 형식이 올바르지 않습니다. (예: 870601-1234567)',
);

export const createEmployeeSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  phone: phoneField,
  role: z.enum(['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  workPolicyId: z.string().uuid(),
  workLocationId: z.string().uuid().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  dependents: z.number().int().min(0).max(20).optional(),
  rrn: rrnField,
  bankAccount: z.string().max(50).optional().nullable(),
  bankName: z.string().max(50).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  isHouseholder: z.boolean().optional(),
  hireType: z.enum(HIRE_TYPES).optional().nullable(),
  baseSalary: z.number().min(0).optional(),
  salaryType: z.enum(SALARY_TYPES).optional(),
  hourlyRate: z.number().min(0).optional().nullable(),
  attendanceExempt: z.boolean().optional(),
  payrollGroupId: z.string().uuid().optional().nullable(),
  profileImageUrl: z.string().max(500).optional().nullable(),
}).refine(
  (data) => !(data.salaryType === 'HOURLY' && data.attendanceExempt === true),
  { message: '시급제 직원은 근태 면제를 설정할 수 없습니다.', path: ['attendanceExempt'] },
);

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: phoneField.optional(),
  role: z.enum(['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  employeeStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  workPolicyId: z.string().uuid().optional().nullable(),
  workLocationId: z.string().uuid().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  resignDate: z.string().optional().nullable(),
  resignReason: z.string().max(200).optional().nullable(),
  leaveStartDate: z.string().optional().nullable(),
  leaveEndDate: z.string().optional().nullable(),
  leaveReason: z.string().max(200).optional().nullable(),
  dependents: z.number().int().min(0).max(20).optional(),
  rrn: rrnField.optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  bankName: z.string().max(50).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  isHouseholder: z.boolean().optional(),
  hireType: z.enum(HIRE_TYPES).optional().nullable(),
  profileImageUrl: z.string().max(500).optional().nullable(),
  salaryType: z.enum(SALARY_TYPES).optional(),
  hourlyRate: z.number().min(0).optional().nullable(),
  nationalPensionMode: z.enum(['AUTO', 'MANUAL', 'NONE']).optional(),
  healthInsuranceMode: z.enum(['AUTO', 'MANUAL', 'NONE']).optional(),
  employmentInsuranceMode: z.enum(['AUTO', 'NONE']).optional(),
  manualNationalPensionBase: z.number().min(0).nullable().optional(),
  manualHealthInsuranceBase: z.number().min(0).nullable().optional(),
  attendanceExempt: z.boolean().optional(),
  dailyWorkHours: z.number().min(1).max(24).optional(),
  payrollGroupId: z.string().uuid().optional().nullable(),
}).strict().refine(
  (data) => !(data.salaryType === 'HOURLY' && data.attendanceExempt === true),
  { message: '시급제 직원은 근태 면제를 설정할 수 없습니다.', path: ['attendanceExempt'] },
);

export const startLeaveSchema = z.object({
  leaveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD입니다.'),
  leaveReason: z.string().min(1, '휴직 사유를 입력해주세요.').max(200),
});

export const returnFromLeaveSchema = z.object({
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD입니다.'),
});

export const rehireSchema = z.object({
  rehireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cancel: z.boolean().optional(),
}).refine((d) => d.cancel || d.rehireDate, { message: '재입사일 또는 취소 여부를 지정해주세요.' });

export const updateSalaryItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    amount: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    isOrdinaryWage: z.boolean().optional(),
    isTaxExempt: z.boolean().optional(),
    paymentMonths: z.string().nullable().optional(),
  })).min(1, '최소 1개 이상의 항목이 필요합니다.'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
