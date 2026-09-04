import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="page-gradient min-h-screen font-body text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-ink-soft">{intro}</p>
        <div className="mt-10 space-y-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-line">
      <h2 className="font-display text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}
