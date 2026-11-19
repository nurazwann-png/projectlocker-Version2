import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/sessionToken";

// Pages a signed-out visitor is sent to /sign-in from. API routes check the
// session themselves and answer 401, so they aren't listed here.
const PROTECTED_PAGES = [/^\/$/];
// Signed-in users have no reason to see these, so send them to their locker.
const AUTH_PAGES = [/^\/sign-in\/?$/, /^\/sign-up\/?$/];

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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
  matcher: ["/", "/sign-in", "/sign-up"],
};
