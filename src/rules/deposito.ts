// src/rules/deposito.ts
import type { Rule } from "./types";
import {
  makeFinding,
  sliceAround,
  hasPriceTermsNear,
  hasNegationNear,
  score,
} from "./utils";
import { getLegalContext } from "../lib/legal";

/** Ancla para depósito/fianza/garantía (evita “depósito bancario …”) */
const ANCHOR_RE =
  /\b(dep[oó]sito(?:\s+(?:en|de)\s+garant[ií]a)?|fianza|garant[ií]a)(?!\s+bancari[oa])\b/g;

/** Descarta “depósito bancario”, etc. */
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
function extractMonthsNear(lower: string, index: number): number | null {
  const around = sliceAround(lower, index, 240);

  // “dos (2) meses”, “tres (3) meses”
  let m = /\b([a-záéíóú]+)\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(around);
  if (m) return parseInt(m[2], 10);

  // “2 meses”
  m = /\b(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return parseInt(m[1], 10);

  // “dos meses” (palabra sin paréntesis)
  m = /\b(uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s*mes(?:es)?\b/.exec(around);
  if (m) {
    const n = wordToNumber(m[1]);
    if (n != null) return n;
  }

  // “equivalente al primer mes” → 1
  if (/\bequivalente\s+al\s+primer\s+mes\b/.test(around)) return 1;

  // “equivalente a un (1) mes (de alquiler)” → 1
  if (/\bequivalente\s+a\s+(?:un|uno)\s*\(?(?:1|1º|1o)?\)?\s*mes(?:es)?(?:\s+de\s+alquiler)?\b/.test(around)) return 1;

  // “primer (1º) mes” / “primero (1o) mes” / “primer mes” → 1
  if (/\bprimer(?:o)?\s*(?:\((?:1|1º|1o)\))?\s*mes\b/.test(around)) return 1;

  return null;
}

/** Recorre anclas y suma meses + primer índice útil. */
function collectDeposits(lower: string) {
  const indices: number[] = [];
  let totalMonths = 0;

  ANCHOR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANCHOR_RE.exec(lower)) !== null) {
    const idx = m.index!;
    if (looksLikeBankDeposit(lower, idx)) continue;

    const months = extractMonthsNear(lower, idx);
    if (months != null) {
      totalMonths += months;
      indices.push(idx);
    } else {
      indices.push(idx);
    }
  }

  const firstIndex = indices.length ? indices[0] : -1;
  return { totalMonths, firstIndex, foundAny: indices.length > 0 };
}

export const ruleDepositoUnMes: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);

  // AR-only (la app hoy es AR). Si no viene país, asumimos AR.
  const country = (ctx.country as string) ?? "AR";

  // Gate mínimo: que parezca contrato de locación
  const isLease =
    String(ctx.contractType || "").toLowerCase() === "lease" ||
    /\b(locaci[oó]n|alquiler|locador(?:a)?|locatari[oa]|inmueble|vivienda|canon|renta)\b/.test(lower);
  if (!isLease) return [];

  // Regímenes AR donde aplica el tope de 1 mes
  const appliesRegime = ctx.regime === "LEY_27551" || ctx.regime === "LEY_27737";
  if (!appliesRegime) return [];

  const { totalMonths, firstIndex, foundAny } = collectDeposits(lower);
  if (!foundAny) return [];

  const idx = firstIndex >= 0 ? firstIndex : 0;

  // Señales de contexto
  const talksLease = hasPriceTermsNear(lower, idx, 200); // canon/alquiler/precio…
  const leaseNear = /\b(locador|locatari[oa]|inmueble|vivienda|alquiler|canon)\b/.test(
    sliceAround(lower, idx, 200)
  );
  const neg = hasNegationNear(lower, idx, 160); // “sin depósito”, “no se exigirá…”

  // Confianza (permitimos disparar aun sin meses si el contexto es claro)
  const confidence = score([talksLease || leaseNear, totalMonths > 0, !neg], [1.3, 1.0, 0.8]);

  // Severidad
  let severity: "low" | "medium" | "high" = "medium";
  if (totalMonths > 1) severity = "high";

  // Si NO pudimos extraer meses y la confianza es muy baja, no disparamos
  if (totalMonths === 0 && confidence < 0.6) return [];

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
      text: raw,
      index: idx,
      window: 260,
      meta: {
        type: "legal",
        confidence,
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
