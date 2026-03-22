import { prisma } from '../prisma/client';
import { DEFAULT_MANAGER_PERMISSIONS } from '@domain/value-objects/Permission';

export class RolePermissionRepository {
  /** 역할별 모든 권한 조회 */
  async findByRole(companyId: string, role: string) {
    return prisma.rolePermission.findMany({
      where: { companyId, role: role as 'MANAGER' },
      orderBy: [{ category: 'asc' }, { permission: 'asc' }],
    });
  }

  /** 특정 권한 확인 (캐시 전 DB 직접 조회) */
  async checkPermission(companyId: string, role: string, category: string, permission: string): Promise<boolean> {
    const record = await prisma.rolePermission.findUnique({
      where: {
        companyId_role_category_permission: {
          companyId,
          role: role as 'MANAGER',
          category,
          permission,
        },
      },
    });
    return record?.enabled ?? false;
  }

  /** 역할별 권한 일괄 저장 (upsert) */
  async upsertMany(companyId: string, role: string, permissions: { category: string; permission: string; enabled: boolean }[]) {
    const results = [];
    for (const p of permissions) {
      const result = await prisma.rolePermission.upsert({
        where: {
          companyId_role_category_permission: {
            companyId,
            role: role as 'MANAGER',
            category: p.category,
            permission: p.permission,
          },
        },
        update: { enabled: p.enabled },
        create: {
          companyId,
          role: role as 'MANAGER',
          category: p.category,
          permission: p.permission,
          enabled: p.enabled,
        },
      });
      results.push(result);
    }
    return results;
  }

  /** 기본 권한 시드 (회사 가입 시 호출) */
  async seedDefaults(companyId: string) {
    const existing = await prisma.rolePermission.findFirst({ where: { companyId } });
    if (existing) return; // 이미 시드된 경우 스킵

    const records: { companyId: string; role: 'MANAGER'; category: string; permission: string; enabled: boolean }[] = [];
    for (const [category, permissions] of Object.entries(DEFAULT_MANAGER_PERMISSIONS)) {
      for (const [permission, enabled] of Object.entries(permissions)) {
        records.push({ companyId, role: 'MANAGER', category, permission, enabled });
      }
    }
    await prisma.rolePermission.createMany({ data: records });
  }
}
