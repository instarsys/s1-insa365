import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { IEmployeeSalaryItemRepository } from '../../ports/IEmployeeSalaryItemRepository';
import type { ISalaryRuleRepository } from '../../ports/ISalaryRuleRepository';
import type { CreateEmployeeDto, EmployeeDto } from '../../dtos/employee';
import { ValidationError } from '@domain/errors';

export class CreateEmployeeUseCase {
  constructor(
    private employeeRepo: IEmployeeRepository,
    private salaryRuleRepo: ISalaryRuleRepository,
    private employeeSalaryItemRepo: IEmployeeSalaryItemRepository,
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

    // 연차는 GenerateEmployeeAccrualsUseCase가 규칙 기반으로 발생 (API Route에서 호출)

    return employee;
  }
}
