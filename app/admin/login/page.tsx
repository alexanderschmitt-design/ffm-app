import { redirect } from "next/navigation";
import { isAdmin, loginWithPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function loginAction(formData: FormData) {
  "use server";
  const pw = String(formData.get("password") ?? "");
  const ok = await loginWithPassword(pw);
  if (!ok) {
    redirect("/admin/login?error=1");
  }
  redirect("/admin");
}

export default async function LoginPage(props: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const sp = await props.searchParams;
  const showError = sp?.error === "1";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <form
        action={loginAction}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="text-2xl font-semibold">Admin-Login</h1>
        <p className="text-sm text-slate-500">
          Zum Verwalten der Spiele und Fragen.
        </p>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Passwort</span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        {showError && <p className="text-sm text-rose-600">Falsches Passwort.</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Anmelden
        </button>
      </form>
    </main>
  );
}
