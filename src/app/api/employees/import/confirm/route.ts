import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';
import { passwordService } from '@/infrastructure/auth/PasswordService';

interface ImportRow {
  data: Record<string, string>;
  errors: string[];
}

async function handler(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const { type, rows } = body as { type: string; rows: ImportRow[] };

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ message: '데이터가 없습니다.' }, { status: 400 });
  }

  // 오류 행 제외
  const validRows = rows.filter((r) => r.errors.length === 0);
  if (validRows.length === 0) {
    return NextResponse.json({ message: '유효한 데이터가 없습니다.' }, { status: 400 });
  }

  const { employeeRepo, departmentRepo, positionRepo } = getContainer();
  const [depts, positions] = await Promise.all([
    departmentRepo.findAll(auth.companyId),
    positionRepo.findAll(auth.companyId),
  ]);
  const deptMap = new Map(depts.map((d: { id: string; name: string }) => [d.name, d.id]));
  const posMap = new Map(positions.map((p: { id: string; name: string }) => [p.name, p.id]));

  let created = 0;
  let updated = 0;
  let failed = 0;

  if (type === 'create') {
    for (const row of validRows) {
      try {
        const { data } = row;
        const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const employeeNumber = await employeeRepo.getNextEmployeeNumber(auth.companyId, prefix);
        const defaultPassword = await passwordService.hash('changeme123!');

        const insuranceMode = (['AUTO', 'MANUAL', 'NONE'].includes(data.insuranceMode) ? data.insuranceMode : 'AUTO') as 'AUTO' | 'MANUAL' | 'NONE';
        await employeeRepo.createUnchecked(auth.companyId, {
          companyId: auth.companyId,
          name: data.name,
          email: data.email,
          password: defaultPassword,
          phone: data.phone || null,
          employeeNumber,
          departmentId: deptMap.get(data.department) || null,
          positionId: posMap.get(data.position) || null,
          joinDate: data.joinDate ? new Date(data.joinDate) : null,
          nationalPensionMode: insuranceMode,
          healthInsuranceMode: insuranceMode,
          employmentInsuranceMode: insuranceMode,
          role: 'EMPLOYEE',
          employeeStatus: 'ACTIVE',
        });
        created++;
      } catch {
        failed++;
      }
    }
  }

  if (type === 'update') {
    for (const row of validRows) {
      try {
        const { data } = row;
        const employee = await employeeRepo.findByEmployeeNumber(auth.companyId, data.employeeNumber);
        if (!employee) { failed++; continue; }

        const updateData: Record<string, unknown> = {};
        if (data.name) updateData.name = data.name;
        if (data.email) updateData.email = data.email;
        if (data.phone) updateData.phone = data.phone;
        if (data.department && deptMap.has(data.department)) {
          updateData.departmentId = deptMap.get(data.department);
        }
        if (data.position && posMap.has(data.position)) {
          updateData.positionId = posMap.get(data.position);
        }

        await employeeRepo.update(auth.companyId, employee.id, updateData);
        updated++;
      } catch {
        failed++;
      }
    }
  }

  if (type === 'wages') {
    for (const row of validRows) {
      try {
        const { data } = row;
        const employee = await employeeRepo.findByEmployeeNumber(auth.companyId, data.employeeNumber);
        if (!employee) { failed++; continue; }

        const updateData: Record<string, unknown> = {};
        if (data.insuranceMode && ['AUTO', 'MANUAL', 'NONE'].includes(data.insuranceMode)) {
          updateData.nationalPensionMode = data.insuranceMode;
          updateData.healthInsuranceMode = data.insuranceMode;
          updateData.employmentInsuranceMode = data.insuranceMode;
        }

        await employeeRepo.update(auth.companyId, employee.id, updateData);
        updated++;
      } catch {
        failed++;
      }
    }
  }

  return NextResponse.json({ created, updated, failed, total: validRows.length });
}

export const POST = withAuth(handler);
