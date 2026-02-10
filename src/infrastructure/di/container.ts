/**
 * DI Container — 모든 Repository, Domain Service, Use Case를 싱글톤으로 관리
 *
 * 의존성 방향: API Route → Use Case → Repository(Port) → Prisma
 *
 * 실용적 접근: Repository 구현체는 Prisma 리턴 타입을 그대로 반환하며,
 * Port 인터페이스와의 타입 불일치는 `as any`로 우회합니다.
 * 향후 DTO 매핑 레이어를 추가하여 완전한 타입 안전성을 확보할 예정입니다.
 */

// ─── Repositories ───────────────────────────────────────────────
import { EmployeeRepository } from '../persistence/repositories/EmployeeRepository';
import { UserRepository } from '../persistence/repositories/UserRepository';
import { AttendanceRepository } from '../persistence/repositories/AttendanceRepository';
import { SalaryCalculationRepository } from '../persistence/repositories/SalaryCalculationRepository';
import { CompanyRepository } from '../persistence/repositories/CompanyRepository';
import { DepartmentRepository } from '../persistence/repositories/DepartmentRepository';
import { PositionRepository } from '../persistence/repositories/PositionRepository';
import { SalaryRuleRepository } from '../persistence/repositories/SalaryRuleRepository';
import { EmployeeSalaryItemRepository } from '../persistence/repositories/EmployeeSalaryItemRepository';
import { SalaryAttendanceDataRepository } from '../persistence/repositories/SalaryAttendanceDataRepository';
import { InsuranceRateRepository } from '../persistence/repositories/InsuranceRateRepository';
import { TaxBracketRepository } from '../persistence/repositories/TaxBracketRepository';
import { TaxExemptLimitRepository } from '../persistence/repositories/TaxExemptLimitRepository';
import { MinimumWageRepository } from '../persistence/repositories/MinimumWageRepository';
import { LegalParameterRepository } from '../persistence/repositories/LegalParameterRepository';
import { PayrollMonthlyRepository } from '../persistence/repositories/PayrollMonthlyRepository';
import { LeaveRequestRepository } from '../persistence/repositories/LeaveRequestRepository';
import { LeaveBalanceRepository } from '../persistence/repositories/LeaveBalanceRepository';
import { NotificationRepository } from '../persistence/repositories/NotificationRepository';
import { WorkPolicyRepository } from '../persistence/repositories/WorkPolicyRepository';
import { AuditLogRepository } from '../persistence/repositories/AuditLogRepository';
import { LeaveGroupRepository } from '../persistence/repositories/LeaveGroupRepository';
import { LeaveTypeConfigRepository } from '../persistence/repositories/LeaveTypeConfigRepository';
import { LeaveAccrualRuleRepository } from '../persistence/repositories/LeaveAccrualRuleRepository';
import { LeaveAccrualRecordRepository } from '../persistence/repositories/LeaveAccrualRecordRepository';
import { WorkLocationRepository } from '../persistence/repositories/WorkLocationRepository';
import { AnnouncementRepository } from '../persistence/repositories/AnnouncementRepository';
import { InvitationRepository } from '../persistence/repositories/InvitationRepository';
import { SubscriptionRepository } from '../persistence/repositories/SubscriptionRepository';
import { PaymentRepository } from '../persistence/repositories/PaymentRepository';

// ─── Domain Services ────────────────────────────────────────────
import { PayrollCalculator } from '@domain/services/PayrollCalculator';

// ─── Infrastructure Services ────────────────────────────────────
import { jwtService } from '../auth/JwtService';
import { passwordService } from '../auth/PasswordService';

// ─── Use Cases ──────────────────────────────────────────────────
// Auth
import { LoginUseCase } from '@/application/use-cases/auth/LoginUseCase';
import { SignupUseCase } from '@/application/use-cases/auth/SignupUseCase';
import { RefreshTokenUseCase } from '@/application/use-cases/auth/RefreshTokenUseCase';

// Employees
import { CreateEmployeeUseCase } from '@/application/use-cases/employees/CreateEmployeeUseCase';
import { UpdateEmployeeUseCase } from '@/application/use-cases/employees/UpdateEmployeeUseCase';
import { ListEmployeesUseCase } from '@/application/use-cases/employees/ListEmployeesUseCase';
import { GetEmployeeDetailUseCase } from '@/application/use-cases/employees/GetEmployeeDetailUseCase';
import { TerminateEmployeeUseCase } from '@/application/use-cases/employees/TerminateEmployeeUseCase';

// Attendance
import { RecordAttendanceUseCase } from '@/application/use-cases/attendance/RecordAttendanceUseCase';
import { GetDailyAttendanceUseCase } from '@/application/use-cases/attendance/GetDailyAttendanceUseCase';
import { GetMonthlyAttendanceUseCase } from '@/application/use-cases/attendance/GetMonthlyAttendanceUseCase';
import { ConfirmAttendanceUseCase } from '@/application/use-cases/attendance/ConfirmAttendanceUseCase';
import { Get52HourStatusUseCase } from '@/application/use-cases/attendance/Get52HourStatusUseCase';

// Leave
import { CreateLeaveRequestUseCase } from '@/application/use-cases/leave/CreateLeaveRequestUseCase';
import { ApproveLeaveRequestUseCase } from '@/application/use-cases/leave/ApproveLeaveRequestUseCase';
import { RejectLeaveRequestUseCase } from '@/application/use-cases/leave/RejectLeaveRequestUseCase';
import { GetLeaveBalanceUseCase } from '@/application/use-cases/leave/GetLeaveBalanceUseCase';

// Payroll
import { CalculatePayrollUseCase } from '@/application/use-cases/payroll/CalculatePayrollUseCase';
import { GetPayrollSpreadsheetUseCase } from '@/application/use-cases/payroll/GetPayrollSpreadsheetUseCase';
import { UpdatePayrollItemUseCase } from '@/application/use-cases/payroll/UpdatePayrollItemUseCase';
import { GetPayrollSummaryUseCase } from '@/application/use-cases/payroll/GetPayrollSummaryUseCase';
import { ConfirmPayrollUseCase } from '@/application/use-cases/payroll/ConfirmPayrollUseCase';
import { CancelPayrollUseCase } from '@/application/use-cases/payroll/CancelPayrollUseCase';
import { SkipEmployeePayrollUseCase } from '@/application/use-cases/payroll/SkipEmployeePayrollUseCase';
import { GetPayrollHistoryUseCase } from '@/application/use-cases/payroll/GetPayrollHistoryUseCase';
import { GetPayrollLedgerUseCase } from '@/application/use-cases/payroll/GetPayrollLedgerUseCase';

// Dashboard
import { GetDashboardTodosUseCase } from '@/application/use-cases/dashboard/GetDashboardTodosUseCase';
import { GetDashboardWidgetsUseCase } from '@/application/use-cases/dashboard/GetDashboardWidgetsUseCase';

// Settings
import { GetCompanySettingsUseCase } from '@/application/use-cases/settings/GetCompanySettingsUseCase';
import { UpdateCompanySettingsUseCase } from '@/application/use-cases/settings/UpdateCompanySettingsUseCase';
import { CrudSalaryRulesUseCase } from '@/application/use-cases/settings/CrudSalaryRulesUseCase';
import { CrudWorkPolicyUseCase } from '@/application/use-cases/settings/CrudWorkPolicyUseCase';

// System
import { CrudInsuranceRateUseCase } from '@/application/use-cases/system/CrudInsuranceRateUseCase';
import { CrudTaxBracketUseCase } from '@/application/use-cases/system/CrudTaxBracketUseCase';
import { CrudMinimumWageUseCase } from '@/application/use-cases/system/CrudMinimumWageUseCase';
import { CrudLegalParameterUseCase } from '@/application/use-cases/system/CrudLegalParameterUseCase';
import { GetAuditLogUseCase } from '@/application/use-cases/system/GetAuditLogUseCase';

// Notifications
import { CreateNotificationUseCase } from '@/application/use-cases/notifications/CreateNotificationUseCase';
import { GetNotificationsUseCase } from '@/application/use-cases/notifications/GetNotificationsUseCase';
import { MarkNotificationReadUseCase } from '@/application/use-cases/notifications/MarkNotificationReadUseCase';

// ─── Port Adapters (Repository → Port 타입 변환) ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// ─── Container Interface ────────────────────────────────────────
export interface Container {
  // Repositories (직접 접근이 필요한 경우)
  employeeRepo: EmployeeRepository;
  userRepo: UserRepository;
  attendanceRepo: AttendanceRepository;
  salaryCalcRepo: SalaryCalculationRepository;
  companyRepo: CompanyRepository;
  departmentRepo: DepartmentRepository;
  positionRepo: PositionRepository;
  salaryRuleRepo: SalaryRuleRepository;
  employeeSalaryItemRepo: EmployeeSalaryItemRepository;
  salaryAttendanceRepo: SalaryAttendanceDataRepository;
  insuranceRateRepo: InsuranceRateRepository;
  taxBracketRepo: TaxBracketRepository;
  taxExemptLimitRepo: TaxExemptLimitRepository;
  minimumWageRepo: MinimumWageRepository;
  legalParameterRepo: LegalParameterRepository;
  payrollMonthlyRepo: PayrollMonthlyRepository;
  leaveRequestRepo: LeaveRequestRepository;
  leaveBalanceRepo: LeaveBalanceRepository;
  notificationRepo: NotificationRepository;
  workPolicyRepo: WorkPolicyRepository;
  auditLogRepo: AuditLogRepository;
  leaveGroupRepo: LeaveGroupRepository;
  leaveTypeConfigRepo: LeaveTypeConfigRepository;
  leaveAccrualRuleRepo: LeaveAccrualRuleRepository;
  leaveAccrualRecordRepo: LeaveAccrualRecordRepository;
  workLocationRepo: WorkLocationRepository;
  announcementRepo: AnnouncementRepository;
  invitationRepo: InvitationRepository;
  subscriptionRepo: SubscriptionRepository;
  paymentRepo: PaymentRepository;

  // Auth Use Cases
  loginUseCase: LoginUseCase;
  signupUseCase: SignupUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;

  // Employee Use Cases
  createEmployeeUseCase: CreateEmployeeUseCase;
  updateEmployeeUseCase: UpdateEmployeeUseCase;
  listEmployeesUseCase: ListEmployeesUseCase;
  getEmployeeDetailUseCase: GetEmployeeDetailUseCase;
  terminateEmployeeUseCase: TerminateEmployeeUseCase;

  // Attendance Use Cases
  recordAttendanceUseCase: RecordAttendanceUseCase;
  getDailyAttendanceUseCase: GetDailyAttendanceUseCase;
  getMonthlyAttendanceUseCase: GetMonthlyAttendanceUseCase;
  confirmAttendanceUseCase: ConfirmAttendanceUseCase;
  get52HourStatusUseCase: Get52HourStatusUseCase;

  // Leave Use Cases
  createLeaveRequestUseCase: CreateLeaveRequestUseCase;
  approveLeaveRequestUseCase: ApproveLeaveRequestUseCase;
  rejectLeaveRequestUseCase: RejectLeaveRequestUseCase;
  getLeaveBalanceUseCase: GetLeaveBalanceUseCase;

  // Payroll Use Cases
  calculatePayrollUseCase: CalculatePayrollUseCase;
  getPayrollSpreadsheetUseCase: GetPayrollSpreadsheetUseCase;
  updatePayrollItemUseCase: UpdatePayrollItemUseCase;
  getPayrollSummaryUseCase: GetPayrollSummaryUseCase;
  confirmPayrollUseCase: ConfirmPayrollUseCase;
  cancelPayrollUseCase: CancelPayrollUseCase;
  skipEmployeePayrollUseCase: SkipEmployeePayrollUseCase;
  getPayrollHistoryUseCase: GetPayrollHistoryUseCase;
  getPayrollLedgerUseCase: GetPayrollLedgerUseCase;

  // Dashboard Use Cases
  getDashboardTodosUseCase: GetDashboardTodosUseCase;
  getDashboardWidgetsUseCase: GetDashboardWidgetsUseCase;

  // Settings Use Cases
  getCompanySettingsUseCase: GetCompanySettingsUseCase;
  updateCompanySettingsUseCase: UpdateCompanySettingsUseCase;
  crudSalaryRulesUseCase: CrudSalaryRulesUseCase;
  crudWorkPolicyUseCase: CrudWorkPolicyUseCase;

  // System Use Cases
  crudInsuranceRateUseCase: CrudInsuranceRateUseCase;
  crudTaxBracketUseCase: CrudTaxBracketUseCase;
  crudMinimumWageUseCase: CrudMinimumWageUseCase;
  crudLegalParameterUseCase: CrudLegalParameterUseCase;
  getAuditLogUseCase: GetAuditLogUseCase;

  // Notification Use Cases
  createNotificationUseCase: CreateNotificationUseCase;
  getNotificationsUseCase: GetNotificationsUseCase;
  markNotificationReadUseCase: MarkNotificationReadUseCase;
}

// ─── Singleton Container ────────────────────────────────────────
let container: Container | null = null;

function createContainer(): Container {
  // 1. Repository 인스턴스 생성
  const employeeRepo = new EmployeeRepository();
  const userRepo = new UserRepository();
  const attendanceRepo = new AttendanceRepository();
  const salaryCalcRepo = new SalaryCalculationRepository();
  const companyRepo = new CompanyRepository();
  const departmentRepo = new DepartmentRepository();
  const positionRepo = new PositionRepository();
  const salaryRuleRepo = new SalaryRuleRepository();
  const employeeSalaryItemRepo = new EmployeeSalaryItemRepository();
  const salaryAttendanceRepo = new SalaryAttendanceDataRepository();
  const insuranceRateRepo = new InsuranceRateRepository();
  const taxBracketRepo = new TaxBracketRepository();
  const taxExemptLimitRepo = new TaxExemptLimitRepository();
  const minimumWageRepo = new MinimumWageRepository();
  const legalParameterRepo = new LegalParameterRepository();
  const payrollMonthlyRepo = new PayrollMonthlyRepository();
  const leaveRequestRepo = new LeaveRequestRepository();
  const leaveBalanceRepo = new LeaveBalanceRepository();
  const notificationRepo = new NotificationRepository();
  const workPolicyRepo = new WorkPolicyRepository();
  const auditLogRepo = new AuditLogRepository();
  const leaveGroupRepo = new LeaveGroupRepository();
  const leaveTypeConfigRepo = new LeaveTypeConfigRepository();
  const leaveAccrualRuleRepo = new LeaveAccrualRuleRepository();
  const leaveAccrualRecordRepo = new LeaveAccrualRecordRepository();
  const workLocationRepo = new WorkLocationRepository();
  const announcementRepo = new AnnouncementRepository();
  const invitationRepo = new InvitationRepository();
  const subscriptionRepo = new SubscriptionRepository();
  const paymentRepo = new PaymentRepository();

  // 2. Domain Service 어댑터 (PayrollCalculator.calculate는 static)
  const payrollCalculator = {
    calculate: (input: Parameters<typeof PayrollCalculator.calculate>[0]) =>
      PayrollCalculator.calculate(input),
  };

  // 3. Infrastructure Service 어댑터
  const passwordAdapter = {
    compare: (plain: string, hash: string) => passwordService.verify(plain, hash),
    hash: (plain: string) => passwordService.hash(plain),
  };

  const tokenAdapter = {
    generateAccessToken: (payload: { userId: string; companyId: string; role: string }) =>
      jwtService.generateAccessToken(payload as Any),
    generateRefreshToken: (payload: { userId: string }) =>
      jwtService.generateRefreshToken(payload as Any),
  };

  const refreshTokenValidator = {
    verify: (token: string) => {
      try {
        const decoded = jwtService.verifyRefreshToken(token);
        return { userId: decoded.userId };
      } catch {
        return null;
      }
    },
  };

  // 4. Use Case 인스턴스 생성 (Repository를 Port로 캐스팅)
  // Auth
  const loginUseCase = new LoginUseCase(
    userRepo as Any,
    companyRepo as Any,
    passwordAdapter,
    tokenAdapter,
  );
  const signupUseCase = new SignupUseCase(
    userRepo as Any,
    companyRepo as Any,
    departmentRepo as Any,
    positionRepo as Any,
    workPolicyRepo as Any,
    salaryRuleRepo as Any,
    minimumWageRepo as Any,
    legalParameterRepo as Any,
    passwordAdapter,
    tokenAdapter,
  );
  const refreshTokenUseCase = new RefreshTokenUseCase(
    userRepo as Any,
    companyRepo as Any,
    refreshTokenValidator,
    tokenAdapter,
  );

  // Employees
  const createEmployeeUseCase = new CreateEmployeeUseCase(
    employeeRepo as Any,
    salaryRuleRepo as Any,
    employeeSalaryItemRepo as Any,
    leaveBalanceRepo as Any,
  );
  const updateEmployeeUseCase = new UpdateEmployeeUseCase(employeeRepo as Any);
  const listEmployeesUseCase = new ListEmployeesUseCase(employeeRepo as Any);
  const getEmployeeDetailUseCase = new GetEmployeeDetailUseCase(
    employeeRepo as Any,
    employeeSalaryItemRepo as Any,
  );
  const terminateEmployeeUseCase = new TerminateEmployeeUseCase(employeeRepo as Any);

  // Attendance
  const recordAttendanceUseCase = new RecordAttendanceUseCase(attendanceRepo as Any);
  const getDailyAttendanceUseCase = new GetDailyAttendanceUseCase(attendanceRepo as Any);
  const getMonthlyAttendanceUseCase = new GetMonthlyAttendanceUseCase(attendanceRepo as Any);
  const confirmAttendanceUseCase = new ConfirmAttendanceUseCase(
    attendanceRepo as Any,
    salaryAttendanceRepo as Any,
  );
  const get52HourStatusUseCase = new Get52HourStatusUseCase(
    attendanceRepo as Any,
    employeeRepo as Any,
  );

  // Leave
  const createLeaveRequestUseCase = new CreateLeaveRequestUseCase(
    leaveRequestRepo as Any,
    leaveBalanceRepo as Any,
  );
  const approveLeaveRequestUseCase = new ApproveLeaveRequestUseCase(
    leaveRequestRepo as Any,
    leaveBalanceRepo as Any,
  );
  const rejectLeaveRequestUseCase = new RejectLeaveRequestUseCase(leaveRequestRepo as Any);
  const getLeaveBalanceUseCase = new GetLeaveBalanceUseCase(leaveBalanceRepo as Any);

  // Payroll
  const calculatePayrollUseCase = new CalculatePayrollUseCase(
    salaryCalcRepo as Any,
    employeeRepo as Any,
    employeeSalaryItemRepo as Any,
    salaryAttendanceRepo as Any,
    insuranceRateRepo as Any,
    taxBracketRepo as Any,
    taxExemptLimitRepo as Any,
    companyRepo as Any,
    payrollCalculator,
  );
  const getPayrollSpreadsheetUseCase = new GetPayrollSpreadsheetUseCase(salaryCalcRepo as Any);
  const updatePayrollItemUseCase = new UpdatePayrollItemUseCase(salaryCalcRepo as Any);
  const getPayrollSummaryUseCase = new GetPayrollSummaryUseCase(salaryCalcRepo as Any);
  const confirmPayrollUseCase = new ConfirmPayrollUseCase(
    salaryCalcRepo as Any,
    payrollMonthlyRepo as Any,
  );
  const cancelPayrollUseCase = new CancelPayrollUseCase(
    salaryCalcRepo as Any,
    payrollMonthlyRepo as Any,
  );
  const skipEmployeePayrollUseCase = new SkipEmployeePayrollUseCase(salaryCalcRepo as Any);
  const getPayrollHistoryUseCase = new GetPayrollHistoryUseCase(salaryCalcRepo as Any);
  const getPayrollLedgerUseCase = new GetPayrollLedgerUseCase(
    salaryCalcRepo as Any,
    companyRepo as Any,
  );

  // Dashboard
  const getDashboardTodosUseCase = new GetDashboardTodosUseCase(
    attendanceRepo as Any,
    leaveRequestRepo as Any,
    salaryCalcRepo as Any,
  );
  const getDashboardWidgetsUseCase = new GetDashboardWidgetsUseCase(
    employeeRepo as Any,
    salaryCalcRepo as Any,
    attendanceRepo as Any,
  );

  // Settings
  const getCompanySettingsUseCase = new GetCompanySettingsUseCase(companyRepo as Any);
  const updateCompanySettingsUseCase = new UpdateCompanySettingsUseCase(companyRepo as Any);
  const crudSalaryRulesUseCase = new CrudSalaryRulesUseCase(salaryRuleRepo as Any);
  const crudWorkPolicyUseCase = new CrudWorkPolicyUseCase(workPolicyRepo as Any);

  // System
  const crudInsuranceRateUseCase = new CrudInsuranceRateUseCase(insuranceRateRepo as Any);
  const crudTaxBracketUseCase = new CrudTaxBracketUseCase(taxBracketRepo as Any);
  const crudMinimumWageUseCase = new CrudMinimumWageUseCase(minimumWageRepo as Any);
  const crudLegalParameterUseCase = new CrudLegalParameterUseCase(legalParameterRepo as Any);
  const getAuditLogUseCase = new GetAuditLogUseCase(auditLogRepo as Any);

  // Notifications
  const createNotificationUseCase = new CreateNotificationUseCase(notificationRepo as Any);
  const getNotificationsUseCase = new GetNotificationsUseCase(notificationRepo as Any);
  const markNotificationReadUseCase = new MarkNotificationReadUseCase(notificationRepo as Any);

  return {
    // Repositories
    employeeRepo,
    userRepo,
    attendanceRepo,
    salaryCalcRepo,
    companyRepo,
    departmentRepo,
    positionRepo,
    salaryRuleRepo,
    employeeSalaryItemRepo,
    salaryAttendanceRepo,
    insuranceRateRepo,
    taxBracketRepo,
    taxExemptLimitRepo,
    minimumWageRepo,
    legalParameterRepo,
    payrollMonthlyRepo,
    leaveRequestRepo,
    leaveBalanceRepo,
    notificationRepo,
    workPolicyRepo,
    auditLogRepo,
    leaveGroupRepo,
    leaveTypeConfigRepo,
    leaveAccrualRuleRepo,
    leaveAccrualRecordRepo,
    workLocationRepo,
    announcementRepo,
    invitationRepo,
    subscriptionRepo,
    paymentRepo,
    // Auth
    loginUseCase,
    signupUseCase,
    refreshTokenUseCase,
    // Employees
    createEmployeeUseCase,
    updateEmployeeUseCase,
    listEmployeesUseCase,
    getEmployeeDetailUseCase,
    terminateEmployeeUseCase,
    // Attendance
    recordAttendanceUseCase,
    getDailyAttendanceUseCase,
    getMonthlyAttendanceUseCase,
    confirmAttendanceUseCase,
    get52HourStatusUseCase,
    // Leave
    createLeaveRequestUseCase,
    approveLeaveRequestUseCase,
    rejectLeaveRequestUseCase,
    getLeaveBalanceUseCase,
    // Payroll
    calculatePayrollUseCase,
    getPayrollSpreadsheetUseCase,
    updatePayrollItemUseCase,
    getPayrollSummaryUseCase,
    confirmPayrollUseCase,
    cancelPayrollUseCase,
    skipEmployeePayrollUseCase,
    getPayrollHistoryUseCase,
    getPayrollLedgerUseCase,
    // Dashboard
    getDashboardTodosUseCase,
    getDashboardWidgetsUseCase,
    // Settings
    getCompanySettingsUseCase,
    updateCompanySettingsUseCase,
    crudSalaryRulesUseCase,
    crudWorkPolicyUseCase,
    // System
    crudInsuranceRateUseCase,
    crudTaxBracketUseCase,
    crudMinimumWageUseCase,
    crudLegalParameterUseCase,
    getAuditLogUseCase,
    // Notifications
    createNotificationUseCase,
    getNotificationsUseCase,
    markNotificationReadUseCase,
  };
}

export function getContainer(): Container {
  if (!container) {
    container = createContainer();
  }
  return container;
}

/** 테스트용: 컨테이너 리셋 */
export function resetContainer(): void {
  container = null;
}
