"use client";
import { useState } from "react";
import type { Finding } from "@/rules";

const sevStyle: Record<Finding["severity"], { badge: string; label: string }> = {
  low:    { badge: "bg-green-100 text-green-800 border border-green-300",  label: "Bajo" },
  medium: { badge: "bg-yellow-100 text-yellow-800 border border-yellow-300", label: "Medio" },
  high:   { badge: "bg-red-100 text-red-800 border border-red-300",         label: "Alto" },
};

export function FindingsList({ items }: { items: Finding[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-neutral-500">No se detectaron hallazgos con las reglas actuales.</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Hallazgos ({items.length})</h2>
      {items.map((f, i) => (
        <FindingCard key={`${f.id}-${i}`} finding={f} />
      ))}
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const sev = sevStyle[finding.severity];
  const [open, setOpen] = useState(true);
  const evidence = finding.evidence?.trim() ?? "";
  const long = evidence.length > 380;
  const display = !long || open ? evidence : `${evidence.slice(0, 360)}…`;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-900 text-base">{finding.title}</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${sev.badge}`}>{sev.label}</span>
      </div>
      <p className="mt-2 text-sm text-neutral-700">{finding.description}</p>

      {evidence && (
        <div className="mt-3">
          <pre className="text-xs bg-gray-100 border border-gray-300 rounded-md p-3 whitespace-pre-wrap text-gray-800 font-mono">
            {display}
          </pre>
          {long && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 text-xs text-blue-700 hover:underline"
            >
              {open ? "Mostrar menos" : "Mostrar más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
