import Image from "next/image";
import { notFound } from "next/navigation";
import { titleForBoothSlug } from "@/app/site-header";
import { supabaseAdmin } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import type { Booth } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getBooth(slug: string) {
  const sb = supabaseAdmin();
  const { data: booth } = await sb
    .from("booths")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!booth) return null;
  return booth as Booth;
}

export default async function BoothPrintPage(
  props: PageProps<"/booth/[slug]/print">,
) {
  const { slug } = await props.params;
  const booth = await getBooth(slug);
  if (!booth) notFound();

  // Printed posters must point at the production host so QR codes keep
  // working off-network. Override via PRINT_BASE_URL if needed.
  const baseUrl = (
    process.env.PRINT_BASE_URL ?? "https://fmm-2026.vercel.app"
  ).replace(/\/$/, "");
  const playUrl = `${baseUrl}/start/${booth.slug}`;
  const qr = await qrDataUrl(playUrl);

  return (
    <>
      <style>{`
        @page { size: A2 portrait; margin: 0; }
        html, body { background: #ffffff; }
        body { margin: 0; }
        .print-page {
          width: 420mm;
          min-height: 594mm;
          margin: 0 auto;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }
        .print-header h1 {
          font-size: 44px !important;
          letter-spacing: 0.18em !important;
        }
        .print-header .brand-mark {
          font-size: 36px !important;
        }
        .print-header .brand-divider {
          height: 72px !important;
        }
        .print-yellow-stripe { height: 6px; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="print-page">
        <div className="print-header">
          <header className="relative">
            <div className="bg-gradient-to-r from-[#0a1f5c] via-[#15348c] to-[#2b58c8]">
              <div className="mx-auto flex max-w-[400mm] items-center justify-between gap-6 px-10 py-10">
                <h1 className="font-display font-bold uppercase tracking-[0.18em] text-white">
                  {titleForBoothSlug(booth.slug)}
                </h1>
                <div
                  aria-label="Güntner Group home"
                  className="flex items-center gap-5 text-white"
                >
                  <span
                    aria-hidden
                    className="brand-divider block w-px bg-[#f5c518]"
                  />
                  <span className="brand-mark text-right font-sans font-bold leading-[1.05]">
                    <span className="block">Güntner</span>
                    <span className="block">Group</span>
                  </span>
                </div>
              </div>
            </div>
            <div aria-hidden className="print-yellow-stripe w-full bg-[#f5c518]" />
          </header>
        </div>

        <main className="flex flex-1 flex-col items-center bg-white px-4 pt-16 pb-14">
          <Image
            src="/headline-ready-to-test.svg"
            alt='Ready to test your "tax auditor logic"?'
            width={502}
            height={54}
            className="h-[40mm] w-auto"
            priority
          />

          <div className="mt-[22mm] border border-slate-200 bg-white p-3 shadow-sm">
            <Image
              src={qr}
              alt="QR code to play"
              width={320}
              height={320}
              unoptimized
              priority
            />
          </div>

          <div className="mt-4 px-4 text-center font-mono text-[14px] text-ink-muted">
            {playUrl}
          </div>

          <div className="mt-[22mm] w-full">
            <Image
              src="/cbcr-karte-tabelle_v2.svg"
              alt=""
              width={1000}
              height={520}
              className="h-auto w-full"
              priority
            />
          </div>

          <Image
            src="/headline-lets-talk-global-tax.svg"
            alt="Let's talk about Global Tax!"
            width={368}
            height={49}
            className="mt-[22mm] h-[40mm] w-auto"
          />
        </main>
      </div>
    </>
  );
}
