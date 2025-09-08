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

// ---------------------
// Helpers para precisión
// ---------------------

// Palabras que indican NEGACIÓN o “no aplica”
const NEGATIONS = /\b(no|sin|queda? prohibid[ao]|no se|no aplica)\b/i;

// Términos que suelen aparecer cuando se habla de PRECIO/ALQUILER
const PRICE_TERMS = /\b(renta|canon|alquiler|precio|locaci[oó]n|arrendamiento)\b/i;

/** Devuelve un slice de texto alrededor de un índice. */
export function sliceAround(text: string, index: number, win = 200) {
  const start = Math.max(0, index - win);
  const end = Math.min(text.length, index + win);
  return text.slice(start, end);
}

/** ¿Existe r2 cerca de r1 dentro de 'win' caracteres? */
export function near(text: string, r1: RegExp, r2: RegExp, win = 180): boolean {
  const m = r1.exec(text);
  if (!m) return false;
  const ctx = sliceAround(text, m.index!, win);
  return r2.test(ctx);
}

/** ¿Aparece negación cerca de index? */
export function hasNegationNear(text: string, index: number, win = 120) {
  const ctx = sliceAround(text, index, win);
  return NEGATIONS.test(ctx);
}

/** ¿Hay “términos de precio” cerca de index? */
export function hasPriceTermsNear(text: string, index: number, win = 160) {
  const ctx = sliceAround(text, index, win);
  return PRICE_TERMS.test(ctx);
}

/** Scoring simple 0–1 sumando evidencias */
export function score(parts: Array<boolean | number>, weights?: number[]) {
  let s = 0, w = 0;
  parts.forEach((p, i) => {
    const val = typeof p === "number" ? p : (p ? 1 : 0);
    const wi = weights?.[i] ?? 1;
    s += val * wi; w += wi;
  });
  return w > 0 ? +(s / w).toFixed(2) : 0;
}

/** 
 * Alinea el índice de un match hecho sobre `lower` a su posición real en `raw`.
 * Útil para que la evidencia (extraída de `raw`) quede anclada exactamente al texto que disparó.
 *
 * @param raw         Texto original (con mayúsculas/acentos)
 * @param lower       Texto en minúsculas usado para los regex
 * @param lowerIndex  Índice obtenido sobre `lower`
 * @param matchedLower Texto que matcheó (tal como se buscó en `lower`)
 * @param win         Ventana alrededor del índice para buscar el match en `raw`
 * @returns índice alineado sobre `raw` (si falla, devuelve `lowerIndex` como fallback)
 */
export function alignIndex(
  raw: string,
  lower: string,
  lowerIndex: number,
  matchedLower: string,
  win = 120
): number {
  if (!raw || !lower || lowerIndex == null || lowerIndex < 0) return lowerIndex ?? 0;
  const start = Math.max(0, lowerIndex - win);
  const end = Math.min(lower.length, lowerIndex + matchedLower.length + win);
  const rawSlice = raw.slice(start, end);

  // escapamos regex metacaracteres del texto matcheado
  const esc = matchedLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(esc, "i");
  const m = rx.exec(rawSlice);
  if (!m) return lowerIndex; // fallback si no encontramos coincidencia en el raw

  return start + m.index;
}
