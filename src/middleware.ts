import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // We only want to protect /admin routes, but leave /admin/login open
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;

    // Simple check: if the token is not present or not valid, redirect to login
    // In a real production app, this would be a JWT or a session ID validated against a DB
    if (!token || token !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // If user goes to /admin/login but is already authenticated, redirect to /admin
  if (path === '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (token === 'authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
