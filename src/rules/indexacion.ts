// src/rules/indexacion.ts
import type { Rule } from "./types.ts";
import {
  makeFinding,
  sliceAround,
  hasPriceTermsNear,
  hasNegationNear,
  score,
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/** Disparador amplio de actualización/indexación/ajuste (sin decidir periodicidad). */
const TRIGGER =
  /\b(ajuste|reajuste|actualizaci[oó]n|actualizar|indexaci[oó]n|readecuaci[oó]n|revisi[oó]n|variaci[oó]n|incremento|incrementar|aument(?:o|ar))\b/;

/** Señales típicas de “índice de referencia” cerca del disparador. */
function hasIndexNear(lower: string, index: number): boolean {
  const ctx = sliceAround(lower, index, 260);
  // Índices comunes + fuentes típicas + mención expresa de “índice”
  return /\b(ipc|uvas?|inflaci[oó]n|icl|ripte|coef(?:iciente)?|casa\s+propia|salarios?|[íi]ndice|bcra|indec)\b/.test(
    ctx
  );
}

/** Placeholder de índice poco claro: “índice a definir/a acordar/a criterio…”. */
function hasPlaceholderIndexNear(lower: string, index: number): boolean {
  const ctx = sliceAround(lower, index, 260);
  return (
    /\b[íi]ndice\b.*\b(a\s+(?:definir|determinar|acordar|convenir|elecci[oó]n|criterio))\b/.test(
      ctx
    ) ||
    /\bcoef(?:iciente)?\b.*\b(a\s+(?:definir|determinar|acordar|convenir))\b/.test(ctx)
  );
}

/** Señales de periodicidad/porcentaje (informativas; la legalidad la decide otra regla). */
function hasPeriodOrPercentNear(lower: string, index: number) {
  const ctx = sliceAround(lower, index, 260);
  const hasPeriodicidad = /\b(mensual|bimestral|trimestral|semestral|anual|cada\s+\d+\s*mes(?:es)?)\b/.test(
    ctx
  );
  const hasPorcentaje =
    /\b\d{1,3}\s*%\b/.test(ctx) ||
    /\bpor\s+ciento\b/.test(ctx) ||
    /[_\.·•]{2,}\s*%/.test(ctx) ||
    /%/.test(ctx);
  return { hasPeriodicidad, hasPorcentaje };
}

export const ruleAlquilerIndexacion: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);

  // 0) Solo Argentina (el set actual es AR)
  if (ctx.country && ctx.country !== "AR") return [];

  // 1) Disparador
  const m = TRIGGER.exec(lower);
  if (!m) return [];

  // 2) Señales cercanas
  const talksLease = hasPriceTermsNear(lower, m.index!, 240); // “alquiler/canon/precio/locación…”
  const neg = hasNegationNear(lower, m.index!, 160); // “no se ajustará…”
  const indexRef = hasIndexNear(lower, m.index!); // IPC/UVA/ICL/RIPTE/índice…
  const placeholderIndex = hasPlaceholderIndexNear(lower, m.index!); // “índice a definir…”
  const { hasPeriodicidad, hasPorcentaje } = hasPeriodOrPercentNear(lower, m.index!);

  // 3) Confianza: pedimos contexto de canon + algún rastro de índice (real o placeholder)
  const confidence = score(
    [talksLease, (indexRef || placeholderIndex), !neg],
    [1.3,        1.1,                         0.8]
  );
  if (confidence < 0.65) return [];

  // 4) Severidad: informativa/heurística para no pisar la regla de periodicidad
  // MEDIUM si hay índice + (periodicidad o %/placeholder); LOW en el resto.
  const severity: "low" | "medium" =
    (indexRef || placeholderIndex) && (hasPeriodicidad || hasPorcentaje)
      ? "medium"
      : "low";

  return [
    makeFinding({
      id: "alquiler-indexacion",
      title: "Actualización / indexación del canon",
      severity,
      description:
        "Se menciona una cláusula de ajuste/indexación. Verificá el índice de referencia, la periodicidad y si existen topes. Si la periodicidad o el % no cumplen el régimen aplicable, otra regla lo marcará aparte.",
      text: raw,
      index: m.index!,
      window: 300,
      meta: {
        type: "legal",
        confidence,
        country: ctx.country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        indexRef,
        placeholderIndex,
        hasPeriodicidad,
        hasPorcentaje,
        legalBasis: [
          {
            law: "Ley 27.551 (AR)",
            note: "Marco sobre actualización del canon locativo (antes del DNU).",
            jurisdiction: "AR",
          },
          {
            law: "DNU 70/2023 (AR)",
            note: "Reformas: revisar validez/forma de indexaciones vigentes.",
            jurisdiction: "AR",
          },
        ],
        bullets: [
          "Identificá el índice aplicado (IPC/UVA/ICL/RIPTE/Casa Propia) y su fuente oficial.",
          "Controlá la periodicidad declarada (mensual/semestral/anual/cada N meses).",
          "Buscá topes o límites a subas desproporcionadas.",
          "Evitá placeholders ambiguos: “índice a definir/a acordar”.",
        ],
        keywords: [
          "actualización",
          "indexación",
          "IPC",
          "UVA",
          "ICL",
          "RIPTE",
          "coeficiente",
          "Casa Propia",
          "porcentaje",
          "periodicidad",
          "alquiler",
          "canon",
        ],
      },
    }),
  ];
};
