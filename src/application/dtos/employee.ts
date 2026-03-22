/**
 * Employee-related DTOs.
 */

export interface CreateEmployeeDto {
  email: string;
  password: string;
  name: string;
  phone: string;
  departmentId?: string;
  positionId?: string;
  workPolicyId?: string;
  workLocationId?: string;
  joinDate: string;
  dependents?: number;
  nationalPensionMode?: string;
  healthInsuranceMode?: string;
  employmentInsuranceMode?: string;
  address?: string;
  isHouseholder?: boolean;
  hireType?: string;
  baseSalary?: number;
  salaryType?: string;
  hourlyRate?: number | null;
  attendanceExempt?: boolean;
}

export interface UpdateEmployeeDto {
  name?: string;
  phone?: string;
  email?: string;
  departmentId?: string | null;
  positionId?: string | null;
  workPolicyId?: string | null;
  workLocationId?: string | null;
  dependents?: number;
  bankName?: string | null;
  nationalPensionMode?: string;
  healthInsuranceMode?: string;
  employmentInsuranceMode?: string;
  manualNationalPensionBase?: number | null;
  manualHealthInsuranceBase?: number | null;
  resignDate?: string | null;
  resignReason?: string | null;
  leaveStartDate?: string | null;
  leaveEndDate?: string | null;
  leaveReason?: string | null;
  address?: string | null;
  isHouseholder?: boolean;
  hireType?: string | null;
  salaryType?: string;
  hourlyRate?: number | null;
  attendanceExempt?: boolean;
  profileImageUrl?: string | null;
}

export interface EmployeeDto {
  id: string;
  companyId: string;
  employeeNumber: string | null;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  employeeStatus: string;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  workPolicyId: string | null;
  workLocationId: string | null;
  joinDate: string | null;
  resignDate: string | null;
  resignReason: string | null;
  leaveStartDate: string | null;
  leaveEndDate: string | null;
  leaveReason: string | null;
  dependents: number;
  bankName: string | null;
  hasBankAccount: boolean;
  address: string | null;
  isHouseholder: boolean;
  hireType: string | null;
  nationalPensionMode: string;
  healthInsuranceMode: string;
  employmentInsuranceMode: string;
  manualNationalPensionBase: number | null;
  manualHealthInsuranceBase: number | null;
  salaryType: string;
  hourlyRate: number | null;
  attendanceExempt: boolean;
  dailyWorkHours: number;
  profileImageUrl: string | null;
  createdAt: string;
}

export interface EmployeeListFilters {
  search?: string;
  departmentId?: string;
  positionId?: string;
  payrollGroupId?: string;
  status?: string;
  resignDateFrom?: Date;
  page?: number;
  limit?: number;
}

export interface TerminateEmployeeDto {
  resignDate: string;
}
