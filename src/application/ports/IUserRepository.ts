/**
 * User repository for auth-related operations.
 * Separate from IEmployeeRepository since auth queries
 * work across companies (login by email without companyId).
 */

export interface UserDto {
  id: string;
  companyId: string;
  email: string;
  password: string;
  name: string;
  role: string;
  employeeStatus: string;
  canViewSensitive: boolean;
  refreshToken: string | null;
}

export interface CreateUserData {
  companyId: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: string;
  employeeNumber?: string;
  joinDate?: Date;
  canViewSensitive?: boolean;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserDto | null>;
  findById(id: string): Promise<UserDto | null>;
  create(data: CreateUserData): Promise<UserDto>;
  updateRefreshToken(companyId: string, id: string, refreshToken: string | null): Promise<void>;
  findByCompanyAndEmail(companyId: string, email: string): Promise<UserDto | null>;
  findActiveUsers(companyId: string, ids?: string[]): Promise<{ id: string }[]>;
}
