import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Server-side client using the service role key — bypasses RLS.
// Only import from server code (route handlers, server components, server actions).
export function supabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
