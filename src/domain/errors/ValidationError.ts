import { DomainError } from './DomainError';

export class ValidationError extends DomainError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}
