// src/rules/utils.ts
import type { Finding } from "./types";

/** Devuelve un recorte legible alrededor del índice detectado.
 *  Prioriza párrafo completo (\n\n). Si no, ±window caracteres.
 */
export function extractEvidence(text: string, index: number, window = 300): string {
  if (!text) return "";
  const prev = text.lastIndexOf("\n\n", index);
  const next = text.indexOf("\n\n", index);
  const start = Math.max(0, prev === -1 ? Math.max(0, index - window) : prev);
  const end = Math.min(text.length, next === -1 ? Math.min(text.length, index + window) : next);
  return text.slice(start, end).trim();
}

/** Construye un finding con evidencia y meta enriquecida (bullets/keywords). */
export function makeFinding(opts: {
  id: string;
  title: string;
  severity: Finding["severity"];
  description: string;
  text: string;     // texto ORIGINAL (con mayúsculas/acentos)
  index: number;    // posición del match calculada sobre lower
  window?: number;
  meta?: Record<string, unknown>;
  bullets?: string[];
  keywords?: string[];
}): Finding {
  const { id, title, severity, description, text, index, window, meta, bullets, keywords } = opts;
  return {
    id,
    title,
    severity,
    description,
    evidence: extractEvidence(text, index, window),
    meta: {
      ...(meta ?? {}),
      ...(bullets ? { bullets } : {}),
      ...(keywords ? { keywords } : {}),
    },
  };
}
