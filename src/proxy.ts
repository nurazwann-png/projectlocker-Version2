import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
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
