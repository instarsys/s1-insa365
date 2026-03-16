import { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { employeeRepo, excelService } = getContainer();
  const employees = await employeeRepo.findAllForExport(auth.companyId);

  const data = excelService.exportEmployees(employees);

  return new Response(data.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="employees_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}

export const GET = withAuth(handler);
