import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Protect customer dashboard and learning player routes
  if (path.startsWith('/dashboard') || path.startsWith('/learn')) {
    const sessionToken = request.cookies.get('sb-access-token')?.value;
    if (!sessionToken) {
      // Redirect unauthorized users to login, keeping track of where they wanted to go
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Protect existing /admin routes (except /admin/login)
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;

    // Simple check: if the token is not present or not valid, redirect to login
    if (!token || token !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 3. Redirect authenticated admins away from the login page
  if (path === '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (token === 'authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/dashboard',
    '/learn/:path*',
    '/learn'
  ],
};
