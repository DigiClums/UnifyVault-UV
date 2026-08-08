import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_HOST = 'v2.unifyvault.xyz';
const APP_HOST = 'app.unifyvault.xyz';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname, search } = request.nextUrl;

  // ── v2.unifyvault.xyz → Admin application ──────────────────────────
  // Rewrite all paths to their /admin/* equivalents so the admin
  // layout and pages render.  Admin pages already enforce on-chain
  // DEFAULT_ADMIN_ROLE checks; hostname alone confers no access.
  if (host === ADMIN_HOST) {
    // Paths already under /admin pass through untouched
    if (pathname.startsWith('/admin')) {
      // Redirect bare /admin to /admin/ for consistency with the sidebar
      if (pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/', request.url));
      }
      return NextResponse.next();
    }

    // Rewrite root and all other paths into /admin/*
    const rewrittenPathname = pathname === '/' ? '/admin' : `/admin${pathname}`;

    const url = request.nextUrl.clone();
    url.pathname = rewrittenPathname;
    return NextResponse.rewrite(url);
  }

  // ── app.unifyvault.xyz → Public application ────────────────────────
  // /admin and /admin/* are no longer served here.
  // Redirect to the admin host, stripping the /admin prefix.
  if (pathname.startsWith('/admin')) {
    const targetPath = pathname === '/admin' ? '/' : pathname.replace(/^\/admin/, '');

    const redirectUrl = new URL(targetPath, `https://${ADMIN_HOST}`);
    redirectUrl.search = search;
    return NextResponse.redirect(redirectUrl, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, branding/* (static assets)
     * - api/* (API routes must pass through)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|branding/|api/).*)',
  ],
};
