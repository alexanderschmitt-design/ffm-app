import { SiteHeader } from "@/app/site-header";
import { ResultAnimation } from "./result-animation";

export const dynamic = "force-dynamic";

const TOTAL = 6;

function parseCorrect(raw: string | string[] | undefined): number {
  if (Array.isArray(raw)) raw = raw[0];
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(TOTAL, Math.floor(n)));
}

export default async function QuizTestResultPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const correct = parseCorrect(sp?.correct);

  return (
    <main className="flex min-h-dvh flex-col bg-white text-ink">
      <SiteHeader title="Product Configuration Solutions" />
      <div className="flex flex-1 flex-col p-5">
        <ResultAnimation correct={correct} total={TOTAL} />
      </div>
    </main>
  );
}
