import { defineConfig } from "@neon/config/v1";

// Lakebase Postgres only. Sign-in is handled by Clerk and uploaded images by
// Vercel Blob (Neon Object Storage isn't available in this project's Singapore region).
export default defineConfig({});
