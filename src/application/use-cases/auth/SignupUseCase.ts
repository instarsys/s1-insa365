import type { IUserRepository } from '../../ports/IUserRepository';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import type { IDepartmentRepository } from '../../ports/IDepartmentRepository';
import type { IPositionRepository } from '../../ports/IPositionRepository';
import type { IWorkPolicyRepository } from '../../ports/IWorkPolicyRepository';
import type { ISalaryRuleRepository } from '../../ports/ISalaryRuleRepository';
import type { IMinimumWageRepository } from '../../ports/IMinimumWageRepository';
import type { ILegalParameterRepository } from '../../ports/ILegalParameterRepository';
import type { SignupDto, TokenResponseDto } from '../../dtos/auth';
import type { IPasswordService, ITokenService } from './LoginUseCase';
import { ValidationError } from '@domain/errors';

export class SignupUseCase {
  constructor(
    private userRepo: IUserRepository,
    private companyRepo: ICompanyRepository,
    private departmentRepo: IDepartmentRepository,
    private positionRepo: IPositionRepository,
    private workPolicyRepo: IWorkPolicyRepository,
    private salaryRuleRepo: ISalaryRuleRepository,
    private minimumWageRepo: IMinimumWageRepository,
    private legalParameterRepo: ILegalParameterRepository,
    private passwordService: IPasswordService,
    private tokenService: ITokenService,
  ) {}

  async execute(dto: SignupDto): Promise<TokenResponseDto> {
    // Check if email already exists
    const existing = await this.userRepo.findByEmail(dto.adminEmail);
    if (existing) {
      throw new ValidationError('Email already registered');
    }

    // Create company
    const company = await this.companyRepo.create({
      name: dto.companyName,
      businessNumber: dto.businessNumber,
      representativeName: dto.representativeName,
    });

    // Seed default data
    await this.seedDefaults(company.id);

    // Create admin user
    // Password is hashed at the repository/service layer
    const user = await this.userRepo.create({
      companyId: company.id,
      email: dto.adminEmail,
      password: dto.adminPassword, // Repository or service layer handles hashing
      name: dto.adminName,
      phone: dto.adminPhone,
      role: 'COMPANY_ADMIN',
      canViewSensitive: true,
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      companyId: company.id,
      role: user.role,
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      userId: user.id,
    });

    await this.userRepo.updateRefreshToken(company.id, user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: company.id,
        companyName: company.name,
      },
    };
  }

  private async seedDefaults(companyId: string): Promise<void> {
    // Seed 5 departments
    await this.departmentRepo.createMany(companyId, [
      { name: '경영지원', code: 'MGMT', sortOrder: 1 },
      { name: '인사팀', code: 'HR', sortOrder: 2 },
      { name: '개발팀', code: 'DEV', sortOrder: 3 },
      { name: '영업팀', code: 'SALES', sortOrder: 4 },
      { name: '마케팅팀', code: 'MKT', sortOrder: 5 },
    ]);

    // Seed 5 positions
    await this.positionRepo.createMany(companyId, [
      { name: '대표이사', level: 1 },
      { name: '부장', level: 2 },
      { name: '과장', level: 3 },
      { name: '대리', level: 4 },
      { name: '사원', level: 5 },
    ]);

    // Seed default work policy
    await this.workPolicyRepo.create(companyId, {
      name: '기본 근무',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      workDays: '1,2,3,4,5',
      isDefault: true,
    });

    // Seed 11 allowance rules (A01-A11) and 12 deduction rules (D01-D12)
    await this.salaryRuleRepo.createMany(companyId, [
      { code: 'A01', name: '기본급', type: 'BASE', paymentType: 'FIXED', isOrdinaryWage: true, sortOrder: 1 },
      { code: 'A02', name: '직책수당', type: 'ALLOWANCE', paymentType: 'FIXED', isOrdinaryWage: true, sortOrder: 2 },
      { code: 'A03', name: '식대', type: 'ALLOWANCE', paymentType: 'FIXED', isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS', defaultAmount: 200000, sortOrder: 3 },
      { code: 'A04', name: '자가운전보조금', type: 'ALLOWANCE', paymentType: 'FIXED', isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'VEHICLE', defaultAmount: 200000, sortOrder: 4 },
      { code: 'A05', name: '보육수당', type: 'ALLOWANCE', paymentType: 'FIXED', isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'CHILDCARE', sortOrder: 5 },
      { code: 'A06', name: '연장근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', isOrdinaryWage: false, sortOrder: 6 },
      { code: 'A07', name: '야간근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', isOrdinaryWage: false, sortOrder: 7 },
      { code: 'A08', name: '휴일근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', isOrdinaryWage: false, sortOrder: 8 },
      { code: 'A09', name: '상여금', type: 'ALLOWANCE', paymentType: 'VARIABLE', isOrdinaryWage: false, sortOrder: 9 },
      { code: 'A10', name: '성과급', type: 'ALLOWANCE', paymentType: 'VARIABLE', isOrdinaryWage: false, sortOrder: 10 },
      { code: 'A11', name: '가족수당', type: 'ALLOWANCE', paymentType: 'FIXED', isOrdinaryWage: true, sortOrder: 11 },
      { code: 'D01', name: '국민연금', type: 'DEDUCTION', paymentType: 'FORMULA', sortOrder: 1 },
      { code: 'D02', name: '건강보험', type: 'DEDUCTION', paymentType: 'FORMULA', sortOrder: 2 },
      { code: 'D03', name: '장기요양보험', type: 'DEDUCTION', paymentType: 'FORMULA', sortOrder: 3 },
      { code: 'D04', name: '고용보험', type: 'DEDUCTION', paymentType: 'FORMULA', sortOrder: 4 },
      { code: 'D05', name: '소득세', type: 'DEDUCTION', paymentType: 'FORMULA', sortOrder: 5 },
      { code: 'D06', name: '지방소득세', type: 'DEDUCTION', paymentType: 'FORMULA', sortOrder: 6 },
      { code: 'D07', name: '학자금상환', type: 'DEDUCTION', paymentType: 'FIXED', sortOrder: 7 },
      { code: 'D08', name: '노조비', type: 'DEDUCTION', paymentType: 'FIXED', sortOrder: 8 },
      { code: 'D09', name: '가불금', type: 'DEDUCTION', paymentType: 'VARIABLE', sortOrder: 9 },
      { code: 'D10', name: '기숙사비', type: 'DEDUCTION', paymentType: 'FIXED', sortOrder: 10 },
      { code: 'D11', name: '사내대출상환', type: 'DEDUCTION', paymentType: 'FIXED', sortOrder: 11 },
      { code: 'D12', name: '기타공제', type: 'DEDUCTION', paymentType: 'VARIABLE', sortOrder: 12 },
    ]);

    // Seed minimum wages
    await this.minimumWageRepo.create({ year: 2025, hourlyWage: 10030, monthlyWage: 2096270, description: '2025년 최저임금' });
    await this.minimumWageRepo.create({ year: 2026, hourlyWage: 10320, monthlyWage: 2156880, description: '2026년 최저임금' });

    // Seed legal parameters
    const legalParams = [
      { category: 'WORK_HOURS', key: 'STANDARD_MONTHLY_HOURS', value: '209', description: '월 소정근로시간', unit: '시간' },
      { category: 'WORK_HOURS', key: 'WEEKLY_WORK_LIMIT', value: '52', description: '주 최대 근무시간 (40+12)', unit: '시간' },
      { category: 'WORK_HOURS', key: 'WEEKLY_REGULAR_HOURS', value: '40', description: '주 소정근로시간', unit: '시간' },
      { category: 'WORK_HOURS', key: 'DAILY_REGULAR_HOURS', value: '8', description: '일 소정근로시간', unit: '시간' },
      { category: 'OVERTIME', key: 'OVERTIME_RATE', value: '1.5', description: '연장근로 할증률' },
      { category: 'OVERTIME', key: 'NIGHT_RATE', value: '0.5', description: '야간근로 가산률' },
      { category: 'OVERTIME', key: 'HOLIDAY_RATE_WITHIN_8H', value: '1.5', description: '휴일근로 할증률 (8시간 이내)' },
      { category: 'OVERTIME', key: 'HOLIDAY_RATE_OVER_8H', value: '2.0', description: '휴일근로 할증률 (8시간 초과)' },
      { category: 'OVERTIME', key: 'WEEKLY_WARNING_HOURS', value: '48', description: '주간 근무시간 경고 기준', unit: '시간' },
      { category: 'PENSION', key: 'NATIONAL_PENSION_EMPLOYEE_RATE', value: '0.045', description: '국민연금 근로자 부담률' },
    ];

    for (const p of legalParams) {
      await this.legalParameterRepo.create(p);
    }
  }
}
