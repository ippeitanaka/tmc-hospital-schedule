import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const viewerAuth = request.cookies.get("viewer_auth")?.value
  const adminAuth = request.cookies.get("admin_auth")?.value
  const { pathname } = request.nextUrl

  // Public paths that don't require auth
  if (pathname === "/login" || pathname === "/admin/login") {
    return NextResponse.next()
  }

  // Admin routes require admin auth
  if (pathname.startsWith("/admin")) {
    if (adminAuth !== "true") {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    return NextResponse.next()
  }

  // All other routes require at least viewer auth
  if (viewerAuth !== "true") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
}
