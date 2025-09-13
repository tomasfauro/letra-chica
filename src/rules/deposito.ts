// src/rules/deposito.ts
import type { Rule } from "./types";
import {
  makeFinding,
  sliceAround,
  hasPriceTermsNear,
  hasNegationNear,
  score,            // lo seguimos usando para tu mini-heurística interna
  computeScore,     // NUEVO: scoring compuesto estándar
  alignIndex,       // NUEVO: alinear índice raw/lower para evidencia correcta
} from "./utils";
import { getLegalContext } from "../lib/legal";

/** Ancla para depósito/fianza/garantía (evita “depósito bancario …”) */
const ANCHOR_RE =
  /\b(dep[oó]sito(?:\s+(?:en|de)\s+garant[ií]a)?|fianza|garant[ií]a)(?!\s+bancari[oa])\b/giu;

/** Descarta “depósito bancario”, etc. (usa lower/cerca del índice) */
function looksLikeBankDeposit(lower: string, index: number): boolean {
  const ctx = sliceAround(lower, index, 140);
  return /\bbancari[oa]|cuenta\s+bancaria|plazo\s+fijo|caja\s+de\s+ahorro\b/.test(ctx);
}

/** Mapea números en palabras → número */
function wordToNumber(word: string): number | null {
  const map: Record<string, number> = {
    uno: 1, un: 1, una: 1, primero: 1, primer: 1,
    dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
    siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  };
  const w = word.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return map[w] ?? null;
}

/** Extrae meses cerca (maneja varias formas comunes). */
function extractMonthsNear(lower: string, index: number): { months: number; at: number } | null {
  const win = 240;
  const start = Math.max(0, index - win);
  const end = Math.min(lower.length, index + win);
  const around = lower.slice(start, end);

  // “dos (2) meses”, “tres (3) meses”
  let m = /\b([a-záéíóú]+)\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[2], 10), at: start + (m.index ?? 0) };

  // “2 meses”
  m = /\b(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10), at: start + (m.index ?? 0) };

  // “dos meses” (palabra sin paréntesis)
  m = /\b(uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s*mes(?:es)?\b/.exec(around);
  if (m) {
    const n = wordToNumber(m[1]);
    if (n != null) return { months: n, at: start + (m.index ?? 0) };
  }

  // “equivalente al primer mes” → 1
  m = /\bequivalente\s+al\s+primer\s+mes\b/.exec(around);
  if (m) return { months: 1, at: start + (m.index ?? 0) };

  // “equivalente a un (1) mes (de alquiler)” → 1
  m = /\bequivalente\s+a\s+(?:un|uno)\s*\(?(:?1|1º|1o)?\)?\s*mes(?:es)?(?:\s+de\s+alquiler)?\b/.exec(around);
  if (m) return { months: 1, at: start + (m.index ?? 0) };

  // “primer (1º) mes” / “primero (1o) mes” / “primer mes” → 1
  m = /\bprimer(?:o)?\s*(?:\((?:1|1º|1o)\))?\s*mes\b/.exec(around);
  if (m) return { months: 1, at: start + (m.index ?? 0) };

  return null;
}

/** Recorre anclas y suma meses + primer índice útil (sobre `lower`). */
function collectDeposits(lower: string) {
  const indices: number[] = [];
  let totalMonths = 0;
  let lastMonthsAt = -1_000_000; // absolute index of last months match counted

  // Reiniciamos la búsqueda global
  const re = new RegExp(ANCHOR_RE.source, "giu");
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    const idx = m.index!;
    if (looksLikeBankDeposit(lower, idx)) continue;

    const hit = extractMonthsNear(lower, idx);
    if (hit != null) {
      // Avoid double counting if another anchor shares the same months phrase nearby
      if (Math.abs(hit.at - lastMonthsAt) > 80) {
        totalMonths += hit.months;
        lastMonthsAt = hit.at;
      }
    }
    indices.push(idx);
  }

  const firstIndex = indices.length ? indices[0] : -1;
  return { totalMonths, firstIndex, foundAny: indices.length > 0 };
}

export const ruleDepositoUnMes: Rule = (raw) => {
  const text = raw ?? "";
  const lower = text.toLowerCase();
  const ctx = getLegalContext(text);

  // AR-only (la app hoy es AR). Si no viene país, asumimos AR.
  // Si el país es UNKNOWN, asumimos AR (app enfocada en AR)
  const country = (ctx.country === "UNKNOWN" ? "AR" : ctx.country) as string;

  // Gate mínimo: que parezca contrato de locación
  const isLease =
    String(ctx.contractType || "").toLowerCase() === "lease" ||
    /\b(locaci[oó]n|alquiler|locador(?:a)?|locatari[oa]|inquilino|inmueble|vivienda|canon|renta)\b/.test(lower);
  if (!isLease) return [];

  // Regímenes AR donde aplica el tope de 1 mes
const appliesRegime =
  country === "AR" &&
  (ctx.regime === "LEY_27551" || ctx.regime === "LEY_27737" || ctx.regime === "DNU_70_2023" || ctx.regime === "UNKNOWN");

  if (!appliesRegime) return [];

  const { totalMonths, firstIndex, foundAny } = collectDeposits(lower);
  if (!foundAny) return [];

  // Alinear índice al RAW (acentos/mayúsculas) para evidencia correcta
  // Volvemos a ejecutar un regex "no global" desde firstIndex para obtener el texto matcheado
  const re = new RegExp(ANCHOR_RE.source, "i");
  const subLower = lower.slice(firstIndex >= 0 ? firstIndex : 0);
  const m2 = re.exec(subLower);
  const idxLower = (firstIndex >= 0 ? firstIndex : 0) + (m2?.index ?? 0);
  const idxRaw = alignIndex(text, lower, idxLower, m2?.[0] ?? "deposito");

  // Señales de contexto
  const talksLease = hasPriceTermsNear(lower, idxLower, 200); // canon/alquiler/precio…
  const leaseNear = /\b(locador|locatari[oa]|inquilino|inmueble|vivienda|alquiler|canon)\b/.test(
    sliceAround(lower, idxLower, 200)
  );
  const neg = hasNegationNear(lower, idxLower, 160); // “sin depósito”, “no se exigirá…”

  // Mini-heurística tuya (la mantenemos como plus para el computeScore)
  const heuristicConf = score([talksLease || leaseNear, totalMonths > 0, !neg], [1.3, 1.0, 0.8]);

  // Extra boost por riesgo:
  //  - >1 mes detectado → +0.20
  //  - 1 mes explícito → +0.10 (porque está cuantificado)
  let extraBoost = 0;
  if (totalMonths > 1) extraBoost += 0.2;
  else if (totalMonths === 1) extraBoost += 0.1;

  // Scoring compuesto estándar: anclas legales + números + negación + boost + heurística
  const { confidence, severity: sevFromScore } = computeScore({
    matched: true,
    text,         // computeScore inspecciona alrededor de idxRaw en el RAW
    index: idxRaw,
    extraBoost: extraBoost + Math.max(0, heuristicConf - 0.6),
  });

  if (confidence < 0.6) return [];

  // Regla de negocio: si detectamos >1 mes, forzar "high"
  const severity: "low" | "medium" | "high" =
    totalMonths > 1 ? "high" : sevFromScore;

  return [
    makeFinding({
      id: "deposito-max-1",
      title:
        totalMonths > 1
          ? "Depósito/garantías superiores al tope legal"
          : "Depósito / fianza (verificar tope legal de 1 mes)",
      severity,
      description:
        totalMonths > 1
          ? "Se detecta un total de garantías/depósitos mayor a un (1) mes de alquiler. En AR no deben superar el equivalente al primer mes y su devolución debe ser clara."
          : "Se menciona depósito/fianza. Verificá que el total de garantías no supere un (1) mes y que la modalidad/valor de devolución sea clara.",
      text,
      index: idxRaw,
      window: 260,
      meta: {
        type: "legal+composite",
        confidence,
        heuristicConfidence: heuristicConf,
        country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
  totalMonths: totalMonths || null,
        legalBasis: [
          {
            law: "Ley 27.551 / CCyC (AR)",
            note: "Depósito/garantía de locación: tope de 1 mes y devolución alineada al último mes abonado.",
            jurisdiction: "AR",
          },
          ...(ctx.regime === "LEY_27737"
            ? [
                {
                  law: "Ley 27.737 (AR)",
                  note: "Modificaciones transitorias: validar redacción contra régimen aplicable por fecha.",
                  jurisdiction: "AR",
                },
              ]
            : []),
        ],
        bullets: [
          "Comprobá que el total de garantías/depósitos no exceda un (1) mes.",
          "La devolución debe indicar momento y valor de referencia (último mes abonado).",
          "Evitá redacciones ambiguas sobre garantías adicionales o acumulativas.",
        ],
        keywords: ["depósito", "fianza", "garantía", "mes", "alquiler", "canon"],
      },
    }),
  ];
};

/** Nueva regla: depósitos/garantías de múltiples meses (>=1) con severidad por cantidad.
 *  id: "alquiler-deposito-multiples-meses"
 */
export const ruleDepositoMultiplesMeses: Rule = (raw) => {
  const text = raw ?? "";
  const lower = text.toLowerCase();
  const ctx = getLegalContext(text);

  // AR (o UNKNOWN se asume AR) y contexto de alquiler vivienda
  const country = (ctx.country === "UNKNOWN" ? "AR" : ctx.country) as string;
  const isLease = /\b(locaci[oó]n|alquiler|locador(?:a)?|locatari[oa]|inquilino|inmueble|vivienda|canon|renta)\b/.test(lower);
  if (country !== "AR" || !isLease) return [];

  const { totalMonths, firstIndex, foundAny } = collectDeposits(lower);
  if (!foundAny) return [];

  const re = new RegExp(ANCHOR_RE.source, "iu");
  const sub = lower.slice(Math.max(0, firstIndex));
  const m = re.exec(sub);
  const idxLower = Math.max(0, firstIndex) + (m?.index ?? 0);
  const idxRaw = alignIndex(text, lower, idxLower, m?.[0] ?? "deposito");

  // Sólo reportamos si encontramos una cantidad explícita (>=1)
  if (!totalMonths || totalMonths < 1) return [];

  const severity: "low" | "medium" | "high" = totalMonths >= 2 ? "high" : "low";
  const confidence = totalMonths >= 2 ? 0.9 : 0.8;

  return [
    makeFinding({
      id: "alquiler-deposito-multiples-meses",
      title:
        totalMonths >= 2
          ? "Depósito/fianza por múltiples meses (posible exceso legal)"
          : "Depósito/fianza equivalente a 1 mes",
      severity,
      description:
        totalMonths >= 2
          ? "Se menciona un depósito/garantía equivalente a 2 o más meses. En alquiler de vivienda en AR, el tope legal suele ser 1 mes."
          : "Se menciona un depósito/garantía equivalente a 1 mes. Verificá modalidad y devolución según normativa vigente.",
      text,
      index: idxRaw,
      window: 260,
      meta: {
        type: "legal",
        confidence,
        country,
        regime: ctx.regime,
        contractType: ctx.contractType,
  totalMonths,
        keywords: ["depósito", "fianza", "garantía", "mes", "alquiler"],
      },
    }),
  ];
};
