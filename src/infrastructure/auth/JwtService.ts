import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  companyId: string;
  role: 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  canViewSensitive: boolean;
}

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is required.');
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required.');
  }
  return secret;
}

class JwtService {
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, getAccessSecret(), { expiresIn: '1h' });
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, getRefreshSecret(), { expiresIn: '7d' });
  }

  verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, getAccessSecret());
    return decoded as TokenPayload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, getRefreshSecret());
    return decoded as TokenPayload;
  }
}

export const jwtService = new JwtService();
