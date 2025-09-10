// src/rules/laboral/periodoPrueba.ts
import type { Rule } from "../types.ts";
import {
  makeFinding,
  sliceAround,
  hasNegationNear,
  score,
  computeScore,
  alignIndex,
} from "../rules/types.ts";
import { getLegalContext } from "../../lib/legal.ts";

/** Ancla “período de prueba” (variantes comunes) */
const ANCHOR_RE =
  /\b(per[ií]odo\s+de\s+prueba|periodo\s+de\s+prueba|per[ií]odo\s+probatorio|prueba\s+laboral)\b/gi;

/** Mapea palabras a número (spanish básico) */
function wordToNumber(word: string): number | null {
  const map: Record<string, number> = {
    uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
    siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
    treinta: 30, sesenta: 60, noventa: 90,
  };
  const w = word.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return map[w] ?? null;
}

/** Extrae duración en días/meses si está cerca del match */
function extractDurationNear(lower: string, index: number): { months?: number; days?: number } {
  const around = sliceAround(lower, index, 240);

  // “tres (3) meses”, “noventa (90) días”
  let m = /\b([a-záéíóú]+)\s*\((\d{1,3})\)\s*(mes(?:es)?|d[ií]as?)\b/.exec(around);
  if (m) {
    const n = parseInt(m[2], 10);
    return m[3].startsWith("mes") ? { months: n } : { days: n };
  }

  // “3 meses”, “90 días”
  m = /\b(\d{1,3})\s*(mes(?:es)?|d[ií]as?)\b/.exec(around);
  if (m) {
    const n = parseInt(m[1], 10);
    return m[2].startsWith("mes") ? { months: n } : { days: n };
  }

  // “noventa días”, “tres meses” (en palabras)
  m = /\b(uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|treinta|sesenta|noventa)\s*(mes(?:es)?|d[ií]as?)\b/.exec(
    around
  );
  if (m) {
    const num = wordToNumber(m[1]);
    if (num != null) return m[2].startsWith("mes") ? { months: num } : { days: num };
  }

  return {};
}

/** Normaliza a meses si viene en días (aprox. 30 d = 1 mes) */
function normalizeToMonths(d: { months?: number; days?: number }): number | null {
  if (d.months != null) return d.months;
  if (d.days != null) return Math.round(d.days / 30);
  return null;
}

export const ruleLaboralPeriodoPrueba: Rule = (raw: string) => {
  const text = raw ?? "";
  const lower = text.toLowerCase();
  const ctx = getLegalContext(text);

  // Gate mínimo: que parezca contrato laboral (o contexto laboral)
  const isEmployment =
    String(ctx.contractType || "").toLowerCase().includes("employment") ||
    /\b(empleador|empleado|trabajador|relaci[oó]n\s+de\s+dependencia|lct|legajo|remuneraci[oó]n|salario)\b/.test(
      lower
    );
  if (!isEmployment) return [];

  // AR por ahora (LCT art. 92 bis). Si no viene país, asumimos AR.
  const country = (ctx.country as string) ?? "AR";
  if (country !== "AR") return [];

  // Buscar “período de prueba”
  const m = ANCHOR_RE.exec(lower);
  if (!m) return [];

  // Alinear índice a RAW (acentos/mayúsculas) para evidencia correcta
  const idxRaw = alignIndex(text, lower, m.index!, m[0]);

  // Contexto alrededor
  const around = sliceAround(text, idxRaw, 300);
  const aroundLower = around.toLowerCase();

  // Extraer duración (usamos el índice original; la función ya crea su ventana)
  const dur = extractDurationNear(lower, idxRaw);
  const months = normalizeToMonths(dur);

  // Negaciones cerca (por ej. “no habrá período de prueba”)
  const neg = hasNegationNear(lower, m.index!, 160);

  // Mini-heurística: suma señales
  const heuristicConf = score([!neg, months != null, months != null && months > 3], [0.8, 0.6, 0.6]);

  // Boost específico:
  //  - >3 meses declarado → +0.25
  //  - 3 meses explícito → +0.10
  let extraBoost = 0;
  if (months != null) {
    if (months > 3) extraBoost += 0.25;
    else if (months >= 3) extraBoost += 0.1;
  }

  // Scoring compuesto
  const { confidence, severity: sevFromScore } = computeScore({
    matched: true,
    text,
    index: idxRaw,
    extraBoost: extraBoost + Math.max(0, heuristicConf - 0.6),
  });

  if (confidence < 0.6) return [];

  // Regla de negocio: si >3 meses → HIGH sí o sí
  const severity: "low" | "medium" | "high" =
    months != null && months > 3 ? "high" : sevFromScore;

  return [
    makeFinding({
      id: "laboral-periodo-prueba",
      title:
        months != null && months > 3
          ? "Período de prueba superior al tope legal (92 bis)"
          : "Período de prueba (verificar límites legales, art. 92 bis)",
      severity,
      description:
        months != null && months > 3
          ? "El período de prueba informado supera el máximo legal usual de tres meses (art. 92 bis LCT, AR). Revisar validez y adecuar la redacción."
          : "Se menciona período de prueba. En Argentina (art. 92 bis LCT) suele ser de hasta tres meses para contratos por tiempo indeterminado.",
      text,
      index: idxRaw,
      window: 300,
      meta: {
        type: "legal+composite",
        confidence,
        heuristicConfidence: heuristicConf,
        country,
        regime: ctx.regime ?? "LCT",
        contractType: ctx.contractType ?? "employment",
        contractDate: ctx.contractDate?.toISOString() ?? null,
        monthsDetected: months,
        legalBasis: [
          {
            law: "LCT — Art. 92 bis (AR)",
            note: "Período de prueba: hasta tres (3) meses — revisar excepciones y encuadre.",
            jurisdiction: "AR",
          },
        ],
        bullets: [
          "Verificá que no exceda tres (3) meses en contratos por tiempo indeterminado.",
          "Aclarar si hay preaviso/remuneración durante el período y cobertura de ART/seguridad social.",
          "Evitar renovaciones encubiertas del período probatorio.",
        ],
        keywords: ["período de prueba", "92 bis", "LCT", "tres meses", "empleo", "contrato laboral"],
      },
      // preferSentenceEvidence: true, // si querés evidencia más corta
    }),
  ];
};
