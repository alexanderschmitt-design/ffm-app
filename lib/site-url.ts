import { headers } from "next/headers";

// Returns the absolute base URL for building canonical links (e.g. QR codes).
// Priority order:
//   1. NEXT_PUBLIC_SITE_URL — explicit override (recommended for stable QR codes)
//   2. VERCEL_PROJECT_PRODUCTION_URL — auto-injected by Vercel at build time,
//      points at the canonical production host even on preview deploys
//   3. await headers() — runtime detection (forces dynamic rendering)
//
// The function is async because the headers() fallback needs to await; when
// either env var is present, no headers() call happens and the page can stay
// static.
export async function siteBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(
      /\/$/,
      "",
    );
  }
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0];
  return `${proto}://${host}`;
}
