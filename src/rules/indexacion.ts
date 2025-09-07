// src/rules/indexacion.ts
import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

/** Actualización / indexación del precio (IPC, UVA, índice, % cada N meses). */
export const ruleAlquilerIndexacion: Rule = (raw) => {
  const lower = raw.toLowerCase();

  const m = /\b(actualizaci[oó]n|indexaci[oó]n|ajuste|actualizar)\b/.exec(lower);
  if (!m) return [];

  const window = 160;
  const start = Math.max(0, m.index! - window);
  const end = m.index! + window;
  const ctx = lower.slice(start, end);

  const hasIndice =
    /\b(ipc|uva|inflaci[oó]n|icl|ripte|coef(?:iciente)?|[íi]ndice)\b/.test(ctx);
  const hasPeriodicidad =
    /\b(mensual|bimestral|trimestral|semestral|anual|cada\s+\d+\s*mes)\b/.test(ctx);
  const hasPorcentaje = /\b\d{1,2}\s*%/.test(ctx);

  const severity = hasIndice || (hasPeriodicidad && hasPorcentaje) ? "high" : "medium";

  return [
    makeFinding({
      id: "alquiler-indexacion",
      title: "Actualización / indexación del precio",
      severity,
      description:
        "Se detecta una cláusula de ajuste del alquiler. Revisá el índice de referencia, la periodicidad y topes máximos.",
      text: raw,
      index: m.index!,
      bullets: [
        "Verificá el índice aplicado (IPC/UVA/etc.) y su fuente oficial.",
        "Controlá la periodicidad del ajuste (mensual/trimestral/etc.).",
        "Buscá topes máximos o límites a subas desproporcionadas.",
      ],
      keywords: ["actualización", "indexación", "ipc", "uva", "%", "cada"],
    }),
  ];
};
