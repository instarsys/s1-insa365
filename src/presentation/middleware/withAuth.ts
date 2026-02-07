import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthContext {
  userId: string;
  companyId: string;
  role: 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  canViewSensitive: boolean;
}

export function getAuthContext(request: NextRequest): AuthContext | null {
  const token = request.cookies.get('access_token')?.value;
  if (!token) return null;

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');
    const payload = jwt.verify(token, secret) as AuthContext;
    return payload;
  } catch {
    return null;
  }
}

export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
) {
  return async (request: NextRequest, _routeContext?: { params?: Promise<Record<string, string>> }) => {
    const auth = getAuthContext(request);
    if (!auth) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
    }
    return handler(request, auth);
  };
}
