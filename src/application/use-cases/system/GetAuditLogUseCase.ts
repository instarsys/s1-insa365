import type { IAuditLogRepository, AuditLogDto, AuditLogFilters } from '../../ports/IAuditLogRepository';
import type { PaginatedResult } from '../../dtos/common';

export class GetAuditLogUseCase {
  constructor(private auditLogRepo: IAuditLogRepository) {}

  async execute(companyId: string, filters: AuditLogFilters): Promise<PaginatedResult<AuditLogDto>> {
    return this.auditLogRepo.findAll(companyId, {
      ...filters,
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
    });
  }
}
