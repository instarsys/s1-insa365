import type { PaginatedResult } from '../dtos/common';

export interface AuditLogDto {
  id: string;
  companyId: string | null;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface CreateAuditLogData {
  companyId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface IAuditLogRepository {
  create(data: CreateAuditLogData): Promise<AuditLogDto>;
  findAll(companyId: string, filters: AuditLogFilters): Promise<PaginatedResult<AuditLogDto>>;
}
