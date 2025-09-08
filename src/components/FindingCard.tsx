// src/components/FindingCard.tsx
"use client";

import React from "react";
import type { Finding } from "@/rules/types.ts";
import { excerpt, renderObjectiveDescription, badgeClass } from "@/lib/report";

type Props = { finding: Finding };

export default function FindingCard({ finding }: Props) {
  const sev = (finding.severity ?? "low") as "high" | "medium" | "low";
  const cite = (finding as any)?.meta?.cite as string | undefined;
  const regime = (finding as any)?.meta?.regime as string | undefined;
  const evidence = finding.text ? excerpt(finding.text) : undefined;

  return (
    <article className="rounded-2xl border p-4 shadow-sm bg-white">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{finding.title}</h3>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(sev)}`}>
          {sev.toUpperCase()}
        </span>
      </header>

      <p className="mt-2 text-slate-700">
        {renderObjectiveDescription(finding)}
      </p>

      {(cite || regime) && (
        <div className="mt-2 text-xs text-slate-500">
          {cite && <span className="mr-2">📎 {cite}</span>}
          {regime && <span className="opacity-80">• Régimen: {regime}</span>}
        </div>
      )}

      {evidence && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">
            Ver evidencia ↘
          </summary>
          <blockquote className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 border">
            “{evidence}”
          </blockquote>
        </details>
      )}
    </article>
  );
}
