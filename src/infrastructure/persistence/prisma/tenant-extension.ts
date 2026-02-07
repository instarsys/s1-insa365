import { PrismaClient, Prisma } from '@/generated/prisma/client';

/**
 * Tenant models that require companyId filtering.
 * Global tables (companies, insurance_rates, tax_brackets, etc.) are excluded.
 */
const TENANT_MODELS = new Set([
  'User',
  'Department',
  'Position',
  'WorkPolicy',
  'WorkLocation',
  'SalaryRule',
  'EmployeeSalaryItem',
  'Attendance',
  'AttendanceSegment',
  'SalaryAttendanceData',
  'SalaryCalculation',
  'LeaveRequest',
  'LeaveBalance',
  'Notification',
  'PayrollMonthly',
  'AuditLog',
]);

/**
 * Creates a Prisma Client extension that auto-injects companyId
 * into all queries on tenant-scoped models, and sets the PostgreSQL
 * session variable `app.company_id` for RLS enforcement.
 */
export function createTenantExtension(companyId: string) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_MODELS.has(model)) {
          return query(args);
        }

        // For read operations, inject companyId into where clause
        if (
          operation === 'findMany' ||
          operation === 'findFirst' ||
          operation === 'findUnique' ||
          operation === 'count' ||
          operation === 'aggregate' ||
          operation === 'groupBy'
        ) {
          const where = (args as { where?: Record<string, unknown> }).where ?? {};
          // AuditLog allows company_id IS NULL for system logs
          if (model === 'AuditLog') {
            where.OR = where.OR ?? [
              { companyId },
              { companyId: null },
            ];
          } else {
            where.companyId = companyId;
          }
          (args as { where: Record<string, unknown> }).where = where;
        }

        // For updateMany / deleteMany, inject companyId into where
        if (operation === 'updateMany' || operation === 'deleteMany') {
          const where = (args as { where?: Record<string, unknown> }).where ?? {};
          where.companyId = companyId;
          (args as { where: Record<string, unknown> }).where = where;
        }

        // For create, inject companyId into data
        if (operation === 'create' || operation === 'createMany') {
          const data = (args as { data?: Record<string, unknown> }).data;
          if (data && !Array.isArray(data)) {
            data.companyId = companyId;
          } else if (Array.isArray(data)) {
            for (const item of data) {
              (item as Record<string, unknown>).companyId = companyId;
            }
          }
        }

        return query(args);
      },
    },
  });
}

/**
 * Sets the PostgreSQL session variable for RLS policies.
 * Must be called within a transaction or at the start of a request.
 */
export async function setTenantContext(prisma: PrismaClient, companyId: string) {
  await prisma.$executeRawUnsafe(`SET LOCAL app.company_id = '${companyId.replace(/'/g, "''")}'`);
}
