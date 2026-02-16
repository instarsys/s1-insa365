/**
 * SalaryItem domain entity — represents an individual salary component.
 *
 * Each employee has multiple SalaryItems (copied from company SalaryRule on hire).
 * Items can be: BASE (base salary), ALLOWANCE (수당), or DEDUCTION (공제).
 *
 * Key flags:
 * - isOrdinaryWage: Included in ordinary wage (통상임금) calculation.
 *   Per 2024 Supreme Court ruling, "fixedness" requirement abolished.
 *   All regular/uniform allowances qualify.
 * - isTaxExempt: Amount (or portion up to limit) is non-taxable (비과세).
 * - paymentCycle: Non-monthly items are converted to monthly equivalent
 *   for ordinary wage calculation.
 */

export type SalaryItemType = 'BASE' | 'ALLOWANCE' | 'DEDUCTION';
export type PaymentType = 'FIXED' | 'FORMULA' | 'VARIABLE';
export type PaymentCycle = 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface SalaryItemProps {
  id: string;
  code: string;
  name: string;
  type: SalaryItemType;
  paymentType: PaymentType;
  paymentCycle: PaymentCycle;
  amount: number;
  isOrdinaryWage: boolean;
  isTaxExempt: boolean;
  taxExemptCode?: string;
  /** 산식 문자열 (FORMULA 타입인 경우). 레거시 키워드 또는 실제 수식 */
  formula?: string;
}

export class SalaryItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: SalaryItemType;
  readonly paymentType: PaymentType;
  readonly paymentCycle: PaymentCycle;
  readonly amount: number;
  readonly isOrdinaryWage: boolean;
  readonly isTaxExempt: boolean;
  readonly taxExemptCode?: string;
  readonly formula?: string;

  constructor(props: SalaryItemProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.type = props.type;
    this.paymentType = props.paymentType;
    this.paymentCycle = props.paymentCycle;
    this.amount = Number(props.amount); // Prisma Decimal → plain number 변환 (문자열 연결 방지)
    this.isOrdinaryWage = props.isOrdinaryWage;
    this.isTaxExempt = props.isTaxExempt;
    this.taxExemptCode = props.taxExemptCode;
    this.formula = props.formula;
  }

  /**
   * Convert the item amount to its monthly equivalent.
   * Non-monthly items are divided by their cycle:
   * - MONTHLY: amount (no change)
   * - BIMONTHLY: amount / 2
   * - QUARTERLY: amount / 3
   * - ANNUAL: amount / 12
   */
  toMonthlyAmount(): number {
    switch (this.paymentCycle) {
      case 'MONTHLY':
        return this.amount;
      case 'BIMONTHLY':
        return Math.floor(this.amount / 2);
      case 'QUARTERLY':
        return Math.floor(this.amount / 3);
      case 'ANNUAL':
        return Math.floor(this.amount / 12);
    }
  }

  isBase(): boolean {
    return this.type === 'BASE';
  }

  isAllowance(): boolean {
    return this.type === 'ALLOWANCE';
  }

  isDeduction(): boolean {
    return this.type === 'DEDUCTION';
  }

  isFixed(): boolean {
    return this.paymentType === 'FIXED';
  }

  isFormula(): boolean {
    return this.paymentType === 'FORMULA';
  }

  isVariable(): boolean {
    return this.paymentType === 'VARIABLE';
  }
}
