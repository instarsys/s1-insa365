import { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

async function handler(_request: NextRequest, auth: AuthContext) {
  const { departmentRepo, positionRepo, excelService } = getContainer();

  const [depts, positions] = await Promise.all([
    departmentRepo.findAll(auth.companyId),
    positionRepo.findAll(auth.companyId),
  ]);

  const deptNames = depts.map((d: { name: string }) => d.name);
  const posNames = positions.map((p: { name: string }) => p.name);

  const data = excelService.generateTemplate('update', deptNames, posNames);

  return new Response(data.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee_update_template.xlsx"',
    },
  });
}

export const GET = withAuth(handler);
