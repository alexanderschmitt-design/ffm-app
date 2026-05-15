import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 p-8">
      <div className="w-full max-w-xl rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Kalkulations- und Steuerabteilung
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Kalkulations-Quiz</h1>
        <p className="mt-4 text-slate-600">
          Diese Web-App läuft im Kongress-Setup live mit dem Moderator. Spieler scannen
          während des Vortrags den QR-Code auf dem aktuellen Slide und beantworten die
          Frage direkt auf ihrem Handy.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Du hast keinen QR-Code, sondern willst Fragen verwalten?
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-5 py-2 font-medium text-white hover:bg-slate-700"
        >
          Zum Admin-Bereich
        </Link>
      </div>
    </main>
  );
}
