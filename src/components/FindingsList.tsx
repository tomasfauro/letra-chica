// src/components/FindingsList.tsx
"use client";
import { useMemo, useState } from "react";
import type { Finding } from "@/rules";
import {
  Shield,
  Clock,
  Slash,
  DollarSign,
  TrendingUp,
  Percent,
  FileText,
  RefreshCw,
  User,
  Gavel,
  Clipboard,
  ChevronDown,
  ChevronUp,
  Mail,
  Eye,
} from "lucide-react";

const sevStyle: Record<Finding["severity"], { badge: string; label: string; weight: number }> = {
  low:    { badge: "bg-green-100 text-green-800 border border-green-300",   label: "Bajo",  weight: 1 },
  medium: { badge: "bg-yellow-100 text-yellow-800 border border-yellow-300", label: "Medio", weight: 2 },
  high:   { badge: "bg-red-100 text-red-800 border border-red-300",          label: "Alto",  weight: 3 },
};

const iconFor = (id: string) => {
  if (id.startsWith("alquiler-fianza")) return Shield;
  if (id.startsWith("alquiler-duracion")) return Clock;
  if (id.startsWith("alquiler-desistimiento")) return Slash;
  if (id.startsWith("alquiler-gastos")) return DollarSign;
  if (id.startsWith("alquiler-indexacion")) return TrendingUp;
  if (id.startsWith("intereses-")) return Percent;
  if (id.startsWith("moneda-")) return DollarSign;
  if (id.startsWith("renuncia-")) return User;
  if (id.startsWith("renovacion-")) return RefreshCw;
  if (id.startsWith("datos-") || id.startsWith("proteccion-datos")) return FileText;
  if (id.startsWith("jurisdiccion-")) return Gavel;
  if (id.startsWith("notificaciones-")) return Mail;
  if (id.startsWith("inspecciones")) return Eye;
  return FileText;
};

function groupByTheme(items: Finding[]) {
  const groups: Record<string, Finding[]> = {};
  for (const f of items) {
    const theme = f.id.split("-")[0] || "otros";
    (groups[theme] ||= []).push(f);
  }
  return groups;
}

function highlightEvidence(evidence: string, keywords?: string[]) {
  if (!evidence || !keywords || keywords.length === 0) return evidence;
  const escaped = keywords.filter(Boolean).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return evidence;
  const rgx = new RegExp(`(${escaped.join("|")})`, "gi");
  return evidence.split(rgx).map((part, i) =>
    rgx.test(part)
      ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  );
}

export function FindingsList({ items }: { items: Finding[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-neutral-500">No se detectaron hallazgos con las reglas actuales.</p>;
  }

  // Orden: severidad (alto→bajo), y a igual severidad: legal → heurística
  const ordered = useMemo(() => {
    const typeWeight = (t?: string) => (t === "legal" ? 1 : 0);
    return [...items].sort((a, b) => {
      const bySev = sevStyle[b.severity].weight - sevStyle[a.severity].weight;
      if (bySev !== 0) return bySev;
      return typeWeight(b.meta?.type as string) - typeWeight(a.meta?.type as string);
    });
  }, [items]);

  const groups = useMemo(() => groupByTheme(ordered), [ordered]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Hallazgos ({items.length})</h2>

      {Object.entries(groups).map(([theme, findings]) => (
        <section key={theme} className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wide">{theme}</h3>
          {findings.map((f, i) => (
            <FindingCard key={`${f.id}-${i}`} finding={f} />
          ))}
        </section>
      ))}
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const sev = sevStyle[finding.severity];
  const [open, setOpen] = useState(false);
  const evidence = (finding.evidence ?? "").trim();
  const long = evidence.length > 420;
  const keywords = (finding.meta?.keywords as string[] | undefined) ?? [];

  const Icon = iconFor(finding.id);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(evidence);
    } catch {
      // noop
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="text-blue-600" size={18} />
          <h4 className="font-bold text-gray-900 text-base">{finding.title}</h4>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${sev.badge}`}>{sev.label}</span>
      </div>

      {/* NUEVO: Badges de tipo de regla y Base legal */}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {finding.meta?.type && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              finding.meta.type === "legal"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : "bg-purple-50 text-purple-800 border-purple-200"
            }`}
            title={finding.meta.type === "legal"
              ? "Respaldado por norma (regla dura)"
              : "Heurística (buenas prácticas y abusos comunes)"}
          >
            {finding.meta.type === "legal" ? "Regla legal" : "Heurística"}
          </span>
        )}

        {(finding.meta?.legalBasis?.length ?? 0) > 0 && (
          <details className="text-[11px]">
            <summary className="cursor-pointer inline-flex items-center px-2 py-0.5 rounded-full border bg-neutral-50 text-neutral-800">
              Base legal
            </summary>
            <ul className="mt-2 list-disc list-inside text-xs text-neutral-700">
              {finding.meta!.legalBasis!.map((b: any, i: number) => (
                <li key={i}>
                  <strong>{b.law}</strong>
                  {b.article ? ` – ${b.article}` : ""}{b.note ? `: ${b.note}` : ""}
                  {b.link && (
                    <>
                      {" "}
                      <a
                        className="text-blue-700 underline"
                        href={b.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ver
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <p className="mt-2 text-sm text-neutral-700">{finding.description}</p>

      {Array.isArray(finding.meta?.bullets) && (finding.meta!.bullets as string[]).length > 0 && (
        <ul className="mt-2 list-disc list-inside text-sm text-neutral-800 space-y-1">
          {(finding.meta!.bullets as string[]).slice(0, 4).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {evidence && (
        <div className="mt-3">
          <pre className="text-xs bg-gray-100 border border-gray-300 rounded-md p-3 whitespace-pre-wrap text-gray-800 font-mono">
            {highlightEvidence(!long || open ? evidence : `${evidence.slice(0, 380)}…`, keywords)}
          </pre>

          <div className="mt-1 flex items-center gap-3">
            {long && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
              >
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {open ? "Mostrar menos" : "Mostrar más"}
              </button>
            )}
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:underline"
              title="Copiar evidencia"
            >
              <Clipboard size={14} />
              Copiar evidencia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
