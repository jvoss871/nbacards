import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/api/admin/auth', '/api/admin/is-admin']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_ADMIN_PATHS.some(p => pathname === p)) return NextResponse.next()

  const adminUserId = process.env.ADMIN_USER_ID
  const cookie = req.cookies.get('admin_session')?.value

  // Fail closed: an unconfigured ADMIN_USER_ID must deny access, not wave every request
  // through — same as a cookie that doesn't match.
  if (!adminUserId || cookie !== adminUserId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const loginUrl = new URL('/admin/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // /api/dev/* and /api/prestige/dev are unauthenticated-by-default dev/test tooling routes
  // (service-role key, no per-route auth check) — gate them behind the same admin cookie.
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/dev/:path*', '/api/prestige/dev'],
}
