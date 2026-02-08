import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { calculatePayrollSchema } from '@/presentation/api/schemas';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(calculatePayrollSchema, body);
    if (!validation.success) return validation.response;
    const { year, month } = validation.data;

    // Get active employees
    const employees = await prisma.user.findMany({
      where: {
        companyId: auth.companyId,
        deletedAt: null,
        employeeStatus: 'ACTIVE',
      },
      include: {
        employeeSalaryItems: {
          where: { deletedAt: null, isActive: true },
        },
      },
    });

    // Get insurance rates for the period
    const calcDate = new Date(year, month - 1, 15);
    const insuranceRates = await prisma.insuranceRate.findMany({
      where: {
        effectiveStartDate: { lte: calcDate },
        effectiveEndDate: { gte: calcDate },
      },
    });

    // Get tax brackets
    const taxBrackets = await prisma.taxBracket.findMany({
      where: { year },
      orderBy: [{ dependents: 'asc' }, { minIncome: 'asc' }],
    });

    // Get tax exempt limits
    const taxExemptLimits = await prisma.taxExemptLimit.findMany({
      where: { year },
    });

    // Get attendance snapshots
    const attendanceData = await prisma.salaryAttendanceData.findMany({
      where: { companyId: auth.companyId, year, month },
      orderBy: { version: 'desc' },
    });

    const results = [];

    for (const emp of employees) {
      // Check if calculation already exists
      const existing = await prisma.salaryCalculation.findFirst({
        where: { companyId: auth.companyId, userId: emp.id, year, month },
      });

      const salaryItems = emp.employeeSalaryItems;
      const attendance = attendanceData.find((a) => a.userId === emp.id);

      // Phase 1: Ordinary wage
      const ordinaryItems = salaryItems.filter(
        (item) => item.isOrdinaryWage && (item.type === 'BASE' || item.type === 'ALLOWANCE'),
      );
      const ordinaryWageMonthly = ordinaryItems.reduce(
        (sum, item) => sum + Number(item.amount),
        0,
      );
      const ordinaryWageHourly = Math.floor(ordinaryWageMonthly / 209);

      // Phase 2: Gross pay
      const basePay = Number(salaryItems.find((i) => i.type === 'BASE')?.amount ?? 0);
      const fixedAllowances = salaryItems
        .filter((i) => i.type === 'ALLOWANCE' && i.paymentType === 'FIXED')
        .reduce((sum, i) => sum + Number(i.amount), 0);

      const overtimeMinutes = attendance?.totalOvertimeMinutes ?? 0;
      const nightMinutes = attendance?.totalNightMinutes ?? 0;
      const nightOvertimeMinutes = attendance?.totalNightOvertimeMinutes ?? 0;
      const holidayMinutes = attendance?.totalHolidayMinutes ?? 0;
      const holidayOvertimeMinutes = attendance?.totalHolidayOvertimeMinutes ?? 0;
      const holidayNightMinutes = attendance?.totalHolidayNightMinutes ?? 0;
      const holidayNightOvertimeMinutes = attendance?.totalHolidayNightOvertimeMinutes ?? 0;

      const overtimePay = Math.floor(ordinaryWageHourly * 1.5 * overtimeMinutes / 60);
      const nightPay = Math.floor(ordinaryWageHourly * 0.5 * nightMinutes / 60);
      const nightOvertimePay = Math.floor(ordinaryWageHourly * 2.0 * nightOvertimeMinutes / 60);
      const holidayPay = Math.floor(ordinaryWageHourly * 1.5 * holidayMinutes / 60);
      const holidayOvertimePay = Math.floor(ordinaryWageHourly * 2.0 * holidayOvertimeMinutes / 60);
      const holidayNightPay = Math.floor(ordinaryWageHourly * 2.0 * holidayNightMinutes / 60);
      const holidayNightOvertimePay = Math.floor(ordinaryWageHourly * 2.5 * holidayNightOvertimeMinutes / 60);

      const totalPay = basePay + fixedAllowances + overtimePay + nightPay + nightOvertimePay + holidayPay + holidayOvertimePay + holidayNightPay + holidayNightOvertimePay;

      // Phase 3: Tax-exempt separation
      let totalNonTaxable = 0;
      for (const item of salaryItems) {
        if (item.isTaxExempt && item.taxExemptCode) {
          const limit = taxExemptLimits.find((l) => l.code === item.taxExemptCode);
          const amount = Number(item.amount);
          totalNonTaxable += limit ? Math.min(amount, Number(limit.monthlyLimit)) : amount;
        }
      }
      const taxableIncome = totalPay - totalNonTaxable;

      // Phase 4: Deductions
      const pensionRate = insuranceRates.find((r) => r.type === 'NATIONAL_PENSION');
      const healthRate = insuranceRates.find((r) => r.type === 'HEALTH_INSURANCE');
      const ltcRate = insuranceRates.find((r) => r.type === 'LONG_TERM_CARE');
      const empInsRate = insuranceRates.find((r) => r.type === 'EMPLOYMENT_INSURANCE');

      let nationalPension = 0;
      if (pensionRate && emp.nationalPensionMode !== 'NONE') {
        let pensionBase = taxableIncome;
        if (emp.nationalPensionMode === 'MANUAL' && emp.manualNationalPensionBase) {
          pensionBase = Number(emp.manualNationalPensionBase);
        }
        if (pensionRate.minBase) pensionBase = Math.max(pensionBase, Number(pensionRate.minBase));
        if (pensionRate.maxBase) pensionBase = Math.min(pensionBase, Number(pensionRate.maxBase));
        nationalPension = Math.floor(pensionBase * Number(pensionRate.employeeRate) / 10) * 10;
      }

      let healthInsurance = 0;
      if (healthRate && emp.healthInsuranceMode !== 'NONE') {
        let healthBase = taxableIncome;
        if (emp.healthInsuranceMode === 'MANUAL' && emp.manualHealthInsuranceBase) {
          healthBase = Number(emp.manualHealthInsuranceBase);
        }
        if (healthRate.minBase) healthBase = Math.max(healthBase, Number(healthRate.minBase));
        if (healthRate.maxBase) healthBase = Math.min(healthBase, Number(healthRate.maxBase));
        healthInsurance = Math.floor(healthBase * Number(healthRate.employeeRate));
      }

      let longTermCare = 0;
      if (ltcRate) {
        longTermCare = Math.floor(healthInsurance * Number(ltcRate.employeeRate));
      }

      let employmentInsurance = 0;
      if (empInsRate && emp.employmentInsuranceMode !== 'NONE') {
        employmentInsurance = Math.floor(taxableIncome * Number(empInsRate.employeeRate));
      }

      // Income tax lookup
      let incomeTax = 0;
      const bracket = taxBrackets.find(
        (b) => b.dependents === emp.dependents && Number(b.minIncome) <= taxableIncome && Number(b.maxIncome) > taxableIncome,
      );
      if (bracket) incomeTax = Number(bracket.taxAmount);

      const localIncomeTax = Math.floor(incomeTax * 0.1);
      const totalDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + localIncomeTax;

      // Phase 5: Net pay
      const netPay = totalPay - totalDeduction;

      const calcData = {
        companyId: auth.companyId,
        userId: emp.id,
        year,
        month,
        status: 'DRAFT' as const,
        ordinaryWageMonthly,
        ordinaryWageHourly,
        basePay,
        fixedAllowances,
        overtimePay,
        nightPay,
        nightOvertimePay,
        holidayPay,
        holidayOvertimePay,
        holidayNightPay,
        holidayNightOvertimePay,
        variableAllowances: 0,
        attendanceDeductions: 0,
        totalPay,
        totalNonTaxable,
        taxableIncome,
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
        incomeTax,
        localIncomeTax,
        otherDeductions: 0,
        totalDeduction,
        netPay,
        insuranceRatesSnapshot: JSON.parse(JSON.stringify(insuranceRates)),
        calculatedAt: new Date(),
      };

      const calc = existing
        ? await prisma.salaryCalculation.update({ where: { id: existing.id }, data: calcData })
        : await prisma.salaryCalculation.create({ data: calcData });

      results.push(calc);
    }

    await auditLogService.log({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CREATE',
      entityType: 'SalaryCalculation',
      after: { year, month, employeeCount: results.length } as Record<string, unknown>,
    });

    return successResponse({
      year,
      month,
      calculatedCount: results.length,
      items: results,
    });
  } catch {
    return errorResponse('급여 계산 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
