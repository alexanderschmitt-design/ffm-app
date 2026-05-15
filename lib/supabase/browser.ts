"use client";

import { createClient } from "@supabase/supabase-js";

// Anon-key browser client — used only for Realtime subscriptions on the beamer view.
// All writes go through the server (route handler) using the service role.
export function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    },
  );
}
