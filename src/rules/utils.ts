// src/rules/utils.ts
import type { Finding, Severity } from "./types";

/* ========================================================================== */
/* Normalización y helpers                                                    */
/* ========================================================================== */

export function normalize(s: string) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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

/** Toma una sola oración (., !, ?) alrededor del índice. Útil para evidence concisa. */
export function extractSentence(text: string, index: number, fallbackWindow = 220): string {
  if (!text) return "";
  // límites izquierdos (incluye signos iniciales y \n)
  const lefts = [
    text.lastIndexOf(". ", index),
    text.lastIndexOf("! ", index),
    text.lastIndexOf("? ", index),
    text.lastIndexOf("¡", index),
    text.lastIndexOf("¿", index),
    text.lastIndexOf("\n", index),
  ].filter((x) => x >= 0);
  const L = (lefts.length ? Math.max(...lefts) : Math.max(0, index - fallbackWindow)) + 1;

  // límites derechos
  const rights = [
    text.indexOf(". ", index),
    text.indexOf("! ", index),
    text.indexOf("? ", index),
    text.indexOf("\n", index),
  ].filter((x) => x >= 0);
  const R = rights.length ? Math.min(...rights) + 1 : Math.min(text.length, index + fallbackWindow);

  return text.slice(Math.max(0, L - 1), Math.min(R + 1, text.length)).trim();
}

/** Elige la mejor evidencia: prioriza oración si es suficientemente larga; si no, párrafo. */
export function bestEvidence(text: string, index: number, preferSentence = true): string {
  const sent = extractSentence(text, index);
  if (preferSentence && sent && sent.length >= 40) return sent;
  return extractEvidence(text, index);
}

/** Construye un finding con evidencia y meta enriquecida (bullets/keywords). */
export function makeFinding(opts: {
  id: string;
  title: string;
  severity: Finding["severity"];
  description: string;
  text: string;     // texto ORIGINAL (con mayúsculas/acentos)
  index: number;    // posición del match calculada sobre el texto original/lower mapeado
  window?: number;
  meta?: Record<string, unknown>;
  bullets?: string[];
  keywords?: string[];
  preferSentenceEvidence?: boolean; // true = oración; false = párrafo
}): Finding {
  const {
    id, title, severity, description, text, index, window, meta, bullets, keywords,
    preferSentenceEvidence = true,
  } = opts;

  const evidence = preferSentenceEvidence
    ? bestEvidence(text, index)
    : extractEvidence(text, index, window);

  return {
    id,
    title,
    severity,
    description,
    evidence,
    index,     // ⬅️ importante para mapOffsets(...)
    window,
    meta: {
      ...(meta ?? {}),
      ...(bullets ? { bullets } : {}),
      ...(keywords ? { keywords } : {}),
    },
  };
}

/* ========================================================================== */
/* Helpers para precisión (lo que ya tenías) + ampliaciones                   */
/* ========================================================================== */

/** Palabras que indican NEGACIÓN o “no aplica” */
const NEGATIONS = /\b(no|sin|queda?\s+prohibid[ao]|no\s+se|no\s+aplica|salvo|excepto|sin\s+perjuicio\s+de)\b/i;

/** Términos que suelen aparecer cuando se habla de PRECIO/ALQUILER */
const PRICE_TERMS = /\b(renta|canon|alquiler|precio|locaci[oó]n|arrendamiento)\b/i;

/** Anclas legales útiles para boostear score (art., LCT, 92 bis, 245, ley, etc.) */
const LEGAL_ANCHORS: RegExp[] = [
  /\bart[íi]culo?\b/i,
  /\bley\b/i,
  /\b(lct|ley\s*20\.?744|27\.?742|27\.?555)\b/i,
  /\b92\s*bis\b/i,
  /\b245\b/i,
];

/** Números “de riesgo” (meses, días, %, años) */
const RISK_NUMBERS = /\b(\d{1,3})\s*(mes(?:es)?|d[ií]as|a[nñ]os|%)\b/i;

/** Devuelve un slice de texto alrededor de un índice. */
export function sliceAround(text: string, index: number, win = 200) {
  const start = Math.max(0, index - win);
  const end = Math.min(text.length, index + win);
  return text.slice(start, end);
}

/** Quita flag 'g' para evitar lastIndex compartido */
function withoutGlobal(rx: RegExp) {
  const flags = rx.flags.replace(/g/g, "");
  return new RegExp(rx.source, flags);
}

/** ¿Existe r2 cerca de r1 dentro de 'win' caracteres? */
export function near(text: string, r1: RegExp, r2: RegExp, win = 180): boolean {
  const safeR1 = withoutGlobal(r1);
  const m = text.search(safeR1);
  if (m < 0) return false;
  const ctx = sliceAround(text, m, win);
  return withoutGlobal(r2).test(ctx);
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

/** ¿Hay anclas legales cerca? */
export function hasLegalAnchor(text: string, index: number, win = 220) {
  const ctx = sliceAround(text, index, win);
  return LEGAL_ANCHORS.some((rx) => rx.test(ctx));
}

/** ¿Hay números relevantes (plazos/%) cerca? */
export function hasRiskNumbersNear(text: string, index: number, win = 220) {
  const ctx = sliceAround(text, index, win);
  return RISK_NUMBERS.test(ctx);
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

/** Scoring compuesto estándar: base + anclas + números − negación + extraBoost */
export function computeScore(opts: {
  matched: boolean;       // hubo match principal
  text: string;           // texto ORIGINAL
  index: number;          // índice del match
  extraBoost?: number;    // +0..+0.4 aprox por riesgos específicos
  negationPenalty?: number; // default 0.2
}): { confidence: number; severity: Severity } {
  const { matched, text, index, extraBoost = 0, negationPenalty = 0.2 } = opts;
  if (!matched) return { confidence: 0, severity: "low" };

  let conf = 0.5; // base por match principal
  if (hasLegalAnchor(text, index)) conf += 0.2;
  if (hasRiskNumbersNear(text, index)) conf += 0.2;
  if (extraBoost) conf += extraBoost;
  if (hasNegationNear(text, index)) conf -= negationPenalty;

  conf = Math.max(0, Math.min(1, conf));
  const severity: Severity = conf >= 0.8 ? "high" : conf >= 0.6 ? "medium" : "low";
  return { confidence: +conf.toFixed(2), severity };
}

/** Alinea el índice de un match hecho sobre `lower` a su posición real en `raw`. */
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

  const esc = matchedLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(esc, "i");
  const m = rx.exec(rawSlice);
  if (!m) return lowerIndex;
  return start + m.index;
}

/** Evidencia garantizada si sólo vino index */
export function ensureEvidence(f: Finding, text: string): Finding {
  if (f.evidence || f.index == null) return f;
  const win = f.window ?? 300;
  return { ...f, evidence: extractEvidence(text, f.index, win) };
}
