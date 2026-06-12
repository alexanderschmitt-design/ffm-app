import { redirect } from "next/navigation";
import { adminBoothSlug } from "@/lib/auth";
import { SiteHeader } from "@/app/site-header";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const slug = await adminBoothSlug();
  if (!slug) redirect("/admin/login");

  const sb = supabaseAdmin();
  const { data: booth } = await sb
    .from("booths")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  // Booth row deleted while admin still logged in — treat as logged out.
  if (!booth) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-surface-muted text-ink">
      <SiteHeader
        title="Admin"
        action={
          <>
            <span className="font-display text-xs uppercase tracking-[0.18em] text-ink-muted">
              {booth.name}
            </span>
            <form action="/api/admin/logout" method="post">
              <button className="font-display text-xs uppercase tracking-[0.18em] text-ink-muted hover:text-brand">
                Abmelden
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-8 py-10">{children}</main>
    </div>
  );
}
