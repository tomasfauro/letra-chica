// src/lib/report.ts
import type { Finding } from "@/rules/types.ts";

export type Severity = "high" | "medium" | "low";
const SEV_RANK: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

export interface ReportBlock {
  severity: Severity;
  items: Finding[];
}

export interface ReportSummary {
  total: number;
  counts: { high: number; medium: number; low: number };
  globalRisk: Severity; // simple: high si hay >=1 high, si no medium si hay >=1 medium, si no low
}

/** Ordena por severidad (high→low) y, dentro de cada severidad, por posición del match. */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sa = SEV_RANK[(a.severity ?? "low") as Severity] ?? 1;
    const sb = SEV_RANK[(b.severity ?? "low") as Severity] ?? 1;
    if (sb !== sa) return sb - sa;
    return (a.index ?? 0) - (b.index ?? 0);
  });
}

/** Agrupa por severidad ya ordenado. */
export function groupFindings(findings: Finding[]): ReportBlock[] {
  const groups: Record<Severity, Finding[]> = { high: [], medium: [], low: [] };
  for (const f of sortFindings(findings)) {
    const sev = (f.severity ?? "low") as Severity;
    groups[sev].push(f);
  }
  return (["high", "medium", "low"] as Severity[]).map((s) => ({
    severity: s, items: groups[s],
  }));
}

/** Score global minimalista y efectivo. */
export function summarize(findings: Finding[]): ReportSummary {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    const s = (f.severity ?? "low") as Severity;
    counts[s] += 1;
  }
  const globalRisk: Severity =
      counts.high > 0 ? "high" : counts.medium > 0 ? "medium" : "low";
  return { total: findings.length, counts, globalRisk };
}

/** Limpia y corta la evidencia para mostrarla como extracto. */
// Simple utility: shorten text with ellipsis (default 120 chars)
export function excerpt(text: string, max = 120): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

/** Redacción objetiva y consistente para la tarjeta. */
// Accepts either a Finding or a rule id string
export function renderObjectiveDescription(f: Finding | string): string {
  if (typeof f !== "string") {
    if (f.description && f.description.trim().length > 0) return f.description.trim();
    return `${f.title}. Evaluación automática según criterios normativos y buenas prácticas.`;
  }
  const id = f;
  const map: Record<string, string> = {
    "alquiler-deposito": "Depósito o fianza exigido al inquilino (ver límite legal y meses equivalentes).",
    "alquiler-deposito-un-mes": "Depósito en garantía por 1 mes de alquiler (tope legal AR).",
    "alquiler-deposito-multiples-meses": "Depósito/fianza superior a 1 mes de alquiler.",
    "alquiler-clausula-penal": "Cláusula penal por mora u ocupación ilegítima.",
    "alquiler-indexacion": "Actualización del canon (indexación).",
    "alquiler-duracion": "Plazo de duración del contrato.",
    "servicios-jurisdiccion": "Jurisdicción/arbitraje pactado.",
    "bancario-intereses": "Intereses punitorios aplicables ante mora.",
  };
  return map[id] || `Condición detectada: ${id}`;
}

/** Etiqueta para el header de sección. */
export function labelForSeverity(s: Severity): string {
  if (s === "high") return "Riesgo Alto";
  if (s === "medium") return "Riesgo Medio";
  return "Riesgo Bajo";
}

/** Badge de color (usa Tailwind). */
// Accepts "high", "medium" (or "med"), "low"
export function badgeClass(s: Severity | "med" | string): string {
  const norm = ((): Severity => {
    const v = String(s || "low").toLowerCase();
    if (v === "high") return "high";
    if (v === "medium" || v === "med") return "medium";
    return "low";
  })();
  if (norm === "high") return "bg-red-100 text-red-800 border-red-200";
  if (norm === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}
