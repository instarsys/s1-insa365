/**
 * EmployeeNumber value object.
 *
 * Format: E{A-Z}{0000-9999}
 * Examples: EA0001, EB1234, EZ9999
 */

const EMPLOYEE_NUMBER_PATTERN = /^E[A-Z]\d{4}$/;

export class EmployeeNumber {
  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value;
  }

  /** Validate that a string matches the employee number format */
  static validate(value: string): boolean {
    return EMPLOYEE_NUMBER_PATTERN.test(value);
  }

  /**
   * Generate an employee number from prefix letter and sequence number.
   * @param prefix Single uppercase letter (A-Z)
   * @param sequence Number 0-9999
   * @example generate('A', 1234) → EmployeeNumber('EA1234')
   */
  static generate(prefix: string, sequence: number): EmployeeNumber {
    if (!/^[A-Z]$/.test(prefix)) {
      throw new Error(`Invalid prefix: "${prefix}". Must be a single uppercase letter A-Z.`);
    }
    if (!Number.isInteger(sequence) || sequence < 0 || sequence > 9999) {
      throw new Error(`Invalid sequence: ${sequence}. Must be an integer 0-9999.`);
    }
    const padded = sequence.toString().padStart(4, '0');
    return new EmployeeNumber(`E${prefix}${padded}`);
  }

  /** Create from an existing validated string */
  static from(value: string): EmployeeNumber {
    if (!EmployeeNumber.validate(value)) {
      throw new Error(`Invalid employee number format: "${value}". Expected E{A-Z}{0000-9999}.`);
    }
    return new EmployeeNumber(value);
  }

  equals(other: EmployeeNumber): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
