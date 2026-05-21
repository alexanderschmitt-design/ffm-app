function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function boothEnvKey(slug: string): string {
  return `BOOTH_PASSWORD_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  adminSessionSecret: () =>
    required("ADMIN_SESSION_SECRET", process.env.ADMIN_SESSION_SECRET),

  // Per-booth password. Each booth slug has its own env var
  // (e.g. BOOTH_PASSWORD_TAX, BOOTH_PASSWORD_HR). Returns null if not configured.
  // Legacy fallback: ADMIN_PASSWORD still works for the "tax" booth so the
  // initial deploy keeps running without re-setting env vars on Vercel.
  boothPassword: (slug: string): string | null => {
    const key = boothEnvKey(slug);
    const pw = process.env[key];
    if (pw && pw.length > 0) return pw;
    if (slug === "tax" && process.env.ADMIN_PASSWORD) {
      return process.env.ADMIN_PASSWORD;
    }
    return null;
  },
} as const;
