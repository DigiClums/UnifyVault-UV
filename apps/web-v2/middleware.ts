import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_HOST = 'v2.unifyvault.xyz';
const APP_HOST = 'app.unifyvault.xyz';
const MARKETING_HOST = 'unifyvault.xyz';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname, search } = request.nextUrl;

  // Normalise host: strip port for local dev comparison
  const hostname = host.split(':')[0] || '';

  // ── v2.unifyvault.xyz → Admin application ──────────────────────────
  if (hostname === ADMIN_HOST) {
    if (pathname.startsWith('/admin')) {
      if (pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/', request.url));
      }
      return NextResponse.next();
    }

    const rewrittenPathname = pathname === '/' ? '/admin' : `/admin${pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = rewrittenPathname;
    return NextResponse.rewrite(url);
  }

  // ── app.unifyvault.xyz → Public DeFi application ───────────────────
  if (hostname === APP_HOST) {
    // Redirect /admin/* to admin host
    if (pathname.startsWith('/admin')) {
      const targetPath = pathname === '/admin' ? '/' : pathname.replace(/^\/admin/, '');
      const redirectUrl = new URL(targetPath, `https://${ADMIN_HOST}`);
      redirectUrl.search = search;
      return NextResponse.redirect(redirectUrl, 307);
    }

    // Rewrite root / → /app-home so the compact dashboard renders
    // as the application home (not the marketing hero).
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/app-home';
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // ── unifyvault.xyz → Marketing Hero ONLY ───────────────────────────
  // The root domain serves the marketing landing page at / and
  // redirects all other paths to the app subdomain.
  if (hostname === MARKETING_HOST || hostname === 'www.unifyvault.xyz') {
    if (pathname === '/') {
      return NextResponse.next();
    }

    // Redirect everything else to app.unifyvault.xyz
    const redirectUrl = new URL(pathname, `https://${APP_HOST}`);
    redirectUrl.search = search;
    return NextResponse.redirect(redirectUrl, 307);
  }

  // ── Local development / other hosts ────────────────────────────────
  // In local dev the host is localhost:{port}.  To preview the
  // marketing experience use ?landing=1; otherwise the app dashboard
  // is shown by default.
  if (pathname.startsWith('/admin')) {
    // In dev, admin paths render directly (no v2 host rewrite needed)
    return NextResponse.next();
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
