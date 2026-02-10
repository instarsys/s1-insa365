import { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { ExcelService } from '@/infrastructure/excel/ExcelService';

async function handler(_request: NextRequest, _auth: AuthContext) {
  const excelService = new ExcelService();
  const data = excelService.generateTemplate('wages');

  return new Response(data.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee_wages_template.xlsx"',
    },
  });
}

export const GET = withAuth(handler);
