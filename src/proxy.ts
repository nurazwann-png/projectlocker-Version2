import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The locker itself — only for signed-in users.
const isLockerRoute = createRouteMatcher(["/"]);

const isPublicRoute = createRouteMatcher([
  "/landing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/u/(.*)",
  "/s/(.*)",
  "/community(.*)",
  "/api/public/(.*)",
  "/api/community",
  "/api/admin/(.*)",
  "/admin",
  // PWA static assets — must be publicly accessible for install to work
  "/manifest.json",
  "/sw.js",
  "/icon(.*)",
  "/bg.jpg",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isLockerRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      // Send signed-out visitors to our own sign-in page, then back to the locker.
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set("redirect_url", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(signIn);
    }
    return;
  }
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
