import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/signup', '/api/auth', '/api/health'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const token = request.cookies.get('access_token')?.value;

  if (isPublicPath) {
    // If logged in and trying to access login/signup, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected route — redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
