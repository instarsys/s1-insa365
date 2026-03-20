import { NextRequest, NextResponse } from 'next/server';

// --- Rate Limiting (in-memory, MVP) ---
const store = new Map<string, { count: number; resetAt: number }>();

if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  };
  setInterval(cleanup, 5 * 60 * 1000);
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}

function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request);
  const key = `api:${ip}`;
  const limit = 100;
  const windowMs = 60_000;
  const now = Date.now();

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    return NextResponse.json(
      { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) },
      },
    );
  }

  return null;
}

// --- Role-based routing helpers ---
const EMPLOYEE_PATHS = ['/home', '/e/', '/leave', '/salary', '/my'];
const ADMIN_PATHS = ['/dashboard', '/attendance', '/employees', '/payroll', '/reports', '/settings', '/tax'];

function getRoleDefaultPath(role: string | undefined): string {
  if (role === 'SYSTEM_ADMIN') return '/super-admin/dashboard';
  if (role === 'EMPLOYEE') return '/home';
  return '/dashboard';
}

// --- Auth Redirect ---
const publicPaths = ['/login', '/signup', '/join', '/super-admin/login', '/change-password', '/api/auth', '/api/health', '/about', '/contact', '/terms', '/privacy'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get('user_role')?.value;

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  // Landing page: `/` is public, but logged-in users go to role-appropriate page
  if (pathname === '/') {
    const token = request.cookies.get('access_token')?.value;
    if (token) {
      return NextResponse.redirect(new URL(getRoleDefaultPath(userRole), request.url));
    }
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const token = request.cookies.get('access_token')?.value;

  if (isPublicPath) {
    if (token && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL(getRoleDefaultPath(userRole), request.url));
    }
    return NextResponse.next();
  }

  // Protected route — redirect to login if no token
  if (!token) {
    const isSuperAdmin = pathname.startsWith('/super-admin');
    const loginUrl = new URL(isSuperAdmin ? '/super-admin/login' : '/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-path mismatch guard
  if (userRole === 'EMPLOYEE' && ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  if (userRole && userRole !== 'EMPLOYEE' && EMPLOYEE_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
