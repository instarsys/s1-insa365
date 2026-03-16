import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const type = (formData.get('type') as string) || 'create';

  if (!file) {
    return NextResponse.json({ message: '파일을 선택해주세요.' }, { status: 400 });
  }

  if (!['create', 'update', 'wages'].includes(type)) {
    return NextResponse.json({ message: '유효하지 않은 업로드 타입입니다.' }, { status: 400 });
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json({ message: '파일 크기가 10MB를 초과합니다.' }, { status: 400 });
  }

  const { departmentRepo, positionRepo, excelService } = getContainer();
  const [depts, positions] = await Promise.all([
    departmentRepo.findAll(auth.companyId),
    positionRepo.findAll(auth.companyId),
  ]);

  const deptNames = depts.map((d: { name: string }) => d.name);
  const posNames = positions.map((p: { name: string }) => p.name);

  const arrayBuffer = await file.arrayBuffer();
  const result = excelService.parseEmployeeImport(
    new Uint8Array(arrayBuffer),
    type as 'create' | 'update' | 'wages',
    deptNames,
    posNames,
  );

  return NextResponse.json(result);
}

export const POST = withAuth(handler);
