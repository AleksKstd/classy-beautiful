import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Next.js proxy (formerly "middleware"). First line of defence for the admin area. Pages and server actions also
 * check the session themselves (requireAdmin), so this is not the only guard.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/admin", request.url);
  const response = NextResponse.redirect(loginUrl);
  if (token) response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
