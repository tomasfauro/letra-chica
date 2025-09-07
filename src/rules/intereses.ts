import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

/**
 * Intereses moratorios / punitorios: co-ocurrencia de 'interes' con
 * 'punitorio/moratorio' y porcentaje cercano.
 */
export const ruleInteresesPunitorios: Rule = (raw) => {
  const lower = raw.toLowerCase();

  // Encontrar 'interes' y 'punitorio|moratorio' a distancia corta
  const interesIdx = lower.search(/\binter[eé]s(?:es)?\b/);
  if (interesIdx === -1) return [];

  const window = 100;
  const ctx = lower.slice(Math.max(0, interesIdx - window), interesIdx + window);

  const hasTipo = /(punitori[oó]s?|moratori[oó]s?)/.test(ctx);
  const hasPercent = /\b\d{1,3}\s*%/.test(ctx) || /\bpor\s+ciento\b/.test(ctx);

  if (!hasTipo && !hasPercent) return [];

  const severity = hasPercent ? "high" : "medium";

  return [
    makeFinding({
      id: "intereses-punitorios",
      title: "Intereses moratorios / punitorios elevados",
      severity,
      description:
        "Se detectan intereses moratorios o punitorios. Verificá porcentajes y acumulación con otros cargos.",
      text: raw,
      index: interesIdx,
      meta: {
        bullets: [
          "Comprobá si se expresan como % y si hay tope legal.",
          "Revisá si se acumulan con otros punitorios o gastos administrativos.",
          "Chequeá periodicidad: diario, mensual o anual."
        ],
        keywords: ["interés", "punitorio", "moratorio", "%", "por ciento"]
      }
    }),
  ];
};
