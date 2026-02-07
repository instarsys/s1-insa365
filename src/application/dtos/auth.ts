/**
 * Auth-related DTOs.
 */

export interface LoginDto {
  email: string;
  password: string;
}

export interface SignupDto {
  companyName: string;
  businessNumber: string;
  representativeName: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  adminPhone?: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    companyName: string;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}
