interface IRolePermissionRepository {
  findByRole(companyId: string, role: string): Promise<{ category: string; permission: string; enabled: boolean }[]>;
  checkPermission(companyId: string, role: string, category: string, permission: string): Promise<boolean>;
  upsertMany(companyId: string, role: string, permissions: { category: string; permission: string; enabled: boolean }[]): Promise<unknown[]>;
  seedDefaults(companyId: string): Promise<void>;
}

export class ManageRolePermissionsUseCase {
  constructor(private readonly repo: IRolePermissionRepository) {}

  async getPermissions(companyId: string, role: string) {
    return this.repo.findByRole(companyId, role);
  }

  async updatePermissions(companyId: string, role: string, permissions: { category: string; permission: string; enabled: boolean }[]) {
    return this.repo.upsertMany(companyId, role, permissions);
  }

  async checkPermission(companyId: string, role: string, category: string, permission: string) {
    return this.repo.checkPermission(companyId, role, category, permission);
  }

  async seedDefaults(companyId: string) {
    return this.repo.seedDefaults(companyId);
  }
}
