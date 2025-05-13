import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // DEBUG: Log the pathname for every request
  // Remove this after debugging
  // @ts-ignore
  console.log('MIDDLEWARE DEBUG - pathname:', pathname);

  // Always allow public access to the home page and index
  if (
    pathname === '/' ||
    pathname === '' ||
    pathname === '/index' ||
    pathname.startsWith('/?')
  ) {
    return NextResponse.next();
  }

  // Only require authentication for specific protected routes
  const protectedPaths = [
    '/session',
    '/api/sessions',
    '/api/stripe/charge',
    // Add more protected paths as needed
  ];
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
    // Optionally, enforce roles for session flows if needed
    if (pathname.startsWith('/session') && token.role !== 'client') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  // All other routes are public
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/session/:path*', '/api/sessions/:path*', '/api/stripe/charge/:path*'],
};