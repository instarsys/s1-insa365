import { DomainError } from './DomainError';

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} not found: ${id}`);
  }
}
