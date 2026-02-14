import { z } from 'zod';

export const HIRE_TYPES = ['NEW', 'EXPERIENCED', 'REHIRE', 'CONTRACT_CONVERT'] as const;

export const SALARY_TYPES = ['MONTHLY', 'HOURLY'] as const;

export const createEmployeeSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(100),
  phone: z.string().min(1, '연락처를 입력해주세요.').max(20),
  role: z.enum(['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  workPolicyId: z.string().uuid().optional().nullable(),
  workLocationId: z.string().uuid().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  dependents: z.number().int().min(0).max(20).optional(),
  rrn: z.string().max(20).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  bankName: z.string().max(50).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  isHouseholder: z.boolean().optional(),
  hireType: z.enum(HIRE_TYPES).optional().nullable(),
  baseSalary: z.number().min(0).optional(),
  salaryType: z.enum(SALARY_TYPES).optional(),
  hourlyRate: z.number().min(0).optional().nullable(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1, '연락처를 입력해주세요.').max(20).optional(),
  role: z.enum(['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  employeeStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  workPolicyId: z.string().uuid().optional().nullable(),
  workLocationId: z.string().uuid().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  resignDate: z.string().optional().nullable(),
  resignReason: z.string().max(200).optional().nullable(),
  dependents: z.number().int().min(0).max(20).optional(),
  rrn: z.string().max(20).optional().nullable(),
  bankAccount: z.string().max(50).optional().nullable(),
  bankName: z.string().max(50).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  isHouseholder: z.boolean().optional(),
  hireType: z.enum(HIRE_TYPES).optional().nullable(),
  profileImageUrl: z.string().max(500).optional().nullable(),
  salaryType: z.enum(SALARY_TYPES).optional(),
  hourlyRate: z.number().min(0).optional().nullable(),
}).strict();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
