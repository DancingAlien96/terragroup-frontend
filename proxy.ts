import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('tg_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect /admin/panel (the actual panel, /admin itself is the admin login)
  if (pathname.startsWith('/admin/panel')) {
    const token = request.cookies.get('tg_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Redirect logged-in users away from /login
  if (pathname === '/login') {
    const token = request.cookies.get('tg_token')?.value;
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/panel/:path*', '/login'],
};
