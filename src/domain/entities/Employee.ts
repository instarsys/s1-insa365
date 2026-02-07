/**
 * Employee domain entity.
 *
 * Represents an employee within a company. Contains domain logic for
 * determining salary eligibility, mid-month proration triggers, etc.
 */

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
export type InsuranceMode = 'AUTO' | 'MANUAL' | 'NONE';

export interface EmployeeProps {
  id: string;
  companyId: string;
  employeeNumber: string;
  name: string;
  status: EmployeeStatus;
  joinDate: Date;
  resignDate?: Date;
  departmentId?: string;
  positionId?: string;
  dependents: number;
  nationalPensionMode: InsuranceMode;
  healthInsuranceMode: InsuranceMode;
  employmentInsuranceMode: InsuranceMode;
}

export class Employee {
  readonly id: string;
  readonly companyId: string;
  readonly employeeNumber: string;
  readonly name: string;
  private _status: EmployeeStatus;
  readonly joinDate: Date;
  private _resignDate?: Date;
  readonly departmentId?: string;
  readonly positionId?: string;
  readonly dependents: number;
  readonly nationalPensionMode: InsuranceMode;
  readonly healthInsuranceMode: InsuranceMode;
  readonly employmentInsuranceMode: InsuranceMode;

  constructor(props: EmployeeProps) {
    this.id = props.id;
    this.companyId = props.companyId;
    this.employeeNumber = props.employeeNumber;
    this.name = props.name;
    this._status = props.status;
    this.joinDate = props.joinDate;
    this._resignDate = props.resignDate;
    this.departmentId = props.departmentId;
    this.positionId = props.positionId;
    this.dependents = props.dependents;
    this.nationalPensionMode = props.nationalPensionMode;
    this.healthInsuranceMode = props.healthInsuranceMode;
    this.employmentInsuranceMode = props.employmentInsuranceMode;
  }

  get status(): EmployeeStatus {
    return this._status;
  }

  get resignDate(): Date | undefined {
    return this._resignDate;
  }

  /** Employee is currently working and can appear in payroll */
  isActive(): boolean {
    return this._status === 'ACTIVE' || this._status === 'ON_LEAVE';
  }

  /** Employee can receive salary (active or on leave — on leave may still get partial pay) */
  canReceiveSalary(): boolean {
    return this._status === 'ACTIVE' || this._status === 'ON_LEAVE';
  }

  /** Mark employee as terminated with a resignation date */
  terminate(date: Date): void {
    this._status = 'RESIGNED';
    this._resignDate = date;
  }

  /**
   * Check if this employee was hired during the given month (new hire proration).
   * A new hire is someone whose joinDate falls within the specified year/month
   * but NOT on the first day of the month (first day = full month).
   */
  isNewHire(year: number, month: number): boolean {
    const jd = this.joinDate;
    return (
      jd.getFullYear() === year &&
      jd.getMonth() + 1 === month
    );
  }

  /**
   * Check if the employee joined mid-month (not on the 1st).
   * Used to determine if proration should be applied.
   */
  isMidMonthJoin(year: number, month: number): boolean {
    return this.isNewHire(year, month) && this.joinDate.getDate() > 1;
  }

  /**
   * Check if the employee resigned mid-month (not on the last day).
   * Used to determine if proration should be applied.
   */
  isMidMonthResign(year: number, month: number): boolean {
    if (!this._resignDate) return false;
    const rd = this._resignDate;
    if (rd.getFullYear() !== year || rd.getMonth() + 1 !== month) return false;
    // Check if resign date is before the last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    return rd.getDate() < lastDay;
  }
}
