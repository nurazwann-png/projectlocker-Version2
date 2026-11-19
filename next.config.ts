import type { NextConfig } from "next";

// Browser-level protections sent with every page and API response.
const SECURITY_HEADERS = [
  // Never let another site show Project Locker inside a frame (stops clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  // Don't let browsers guess file types (stops uploaded files being run as scripts).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send our origin, not full URLs (which can hold share tokens), to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Always use HTTPS once a browser has visited.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // The app uses none of these device features, so nothing embedded can ask for them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
