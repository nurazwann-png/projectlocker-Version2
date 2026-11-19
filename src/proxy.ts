import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/sessionToken";

// Pages a signed-out visitor is sent to /sign-in from. API routes check the
// session themselves and answer 401, so they aren't listed here.
const PROTECTED_PAGES = [/^\/$/];
// Signed-in users have no reason to see these, so send them to their locker.
const AUTH_PAGES = [/^\/sign-in\/?$/, /^\/sign-up\/?$/];
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Cross-site request check: a change made through the API must come from our own pages.
  if (pathname.startsWith("/api/") && UNSAFE_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const foreignOrigin = origin && (() => { try { return new URL(origin).host !== host; } catch { return true; } })();
    if (foreignOrigin || site === "cross-site") {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const signedIn = !!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!signedIn && PROTECTED_PAGES.some((re) => re.test(pathname))) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("redirect_url", pathname + search);
    return NextResponse.redirect(signIn);
  }
  if (signedIn && AUTH_PAGES.some((re) => re.test(pathname))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/sign-in", "/sign-up", "/api/:path*"],
};
