import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { IEmployeeSalaryItemRepository } from '../../ports/IEmployeeSalaryItemRepository';
import type { ISalaryRuleRepository } from '../../ports/ISalaryRuleRepository';
import type { ILeaveBalanceRepository } from '../../ports/ILeaveBalanceRepository';
import type { CreateEmployeeDto, EmployeeDto } from '../../dtos/employee';
import { ValidationError } from '@domain/errors';

export class CreateEmployeeUseCase {
  constructor(
    private employeeRepo: IEmployeeRepository,
    private salaryRuleRepo: ISalaryRuleRepository,
    private employeeSalaryItemRepo: IEmployeeSalaryItemRepository,
    private leaveBalanceRepo: ILeaveBalanceRepository,
  ) {}

  async execute(companyId: string, dto: CreateEmployeeDto): Promise<EmployeeDto> {
    // Check for duplicate email
    const existingEmployee = await this.employeeRepo.findByEmail(companyId, dto.email);
    if (existingEmployee) {
      throw new ValidationError('Employee with this email already exists', 'email');
    }

    // Generate employee number
    const employeeNumber = await this.employeeRepo.getNextEmployeeNumber(companyId, 'E');

    // Create employee
    const employee = await this.employeeRepo.create(companyId, {
      ...dto,
      employeeNumber,
    });

    // Copy active salary rules to EmployeeSalaryItems
    const salaryRules = await this.salaryRuleRepo.findActive(companyId);
    if (salaryRules.length > 0) {
      const salaryItems = salaryRules.map((rule) => ({
        companyId,
        userId: employee.id,
        code: rule.code,
        name: rule.name,
        type: rule.type,
        paymentType: rule.paymentType,
        paymentCycle: rule.paymentCycle,
        amount: rule.defaultAmount ?? 0,
        isOrdinaryWage: rule.isOrdinaryWage,
        isTaxExempt: rule.isTaxExempt,
        taxExemptCode: rule.taxExemptCode ?? undefined,
        isActive: true,
        sortOrder: rule.sortOrder,
        formula: rule.formula ?? undefined,
      }));
      await this.employeeSalaryItemRepo.createMany(salaryItems);
    }

    // Create leave balance for current year
    const currentYear = new Date().getFullYear();
    await this.leaveBalanceRepo.create({
      companyId,
      userId: employee.id,
      year: currentYear,
      totalDays: 15, // Default annual leave days
      usedDays: 0,
      remainingDays: 15,
    });

    return employee;
  }
}
