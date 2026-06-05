import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow docs and API endpoints
  if (
    request.nextUrl.pathname.startsWith('/docs') || 
    request.nextUrl.pathname.startsWith('/api') || 
    request.nextUrl.pathname.startsWith('/login')
  ) {
    return NextResponse.next();
  }

  const isAuth = request.cookies.has('klb_auth');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboard && !isAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (request.nextUrl.pathname === '/' && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
