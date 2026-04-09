import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    const token = request.cookies.get('auth_token')
    
    if (!token || token.value !== 'admin_logged_in') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }
}

export const config = {
  matcher: ['/admin/dashboard/:path*'],
}
