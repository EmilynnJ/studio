import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = [
    '/login',
    '/signup',
    '/api/auth',
    '/_next',
    '/static',
    '/favicon.ico'
  ];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get JWT token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Redirect unauthenticated users to login page
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce reader role for reader dashboard
  if (pathname.startsWith('/readers') && token.role !== 'reader') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Enforce client role for session flows
  if (pathname.startsWith('/session') && token.role !== 'client') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Allow all other requests
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except static files and next internals
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};