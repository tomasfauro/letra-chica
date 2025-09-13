import type { Rule } from "../types";
import { makeFinding, sliceAround, hasNegationNear } from "../utils";
import { getLegalContext } from "../../lib/legal";

// Dispara por menciones directas o por ocupación ilegítima / multiplicadores
const ANCHOR = /(cl[áa]usula\s+penal|ocupaci[óo]n\s+ileg[íi]tima|indemnizaci[óo]n\s+por\s+ocupaci[óo]n\s+ileg[íi]tima)/iu;

// Multiplicadores del alquiler/canon (dos veces/el doble/2x/3x)
const MULT = /(dos\s+veces|el\s+doble|\b\d{1,2}\s*veces\b|\b[23]x\b)/iu;
const RENT = /(alquiler|canon|renta|precio)/iu;

// % adicional por día
const PCT_DAILY = /\b\d{1,3}(?:[\.,]\d{1,2})?\s*%\b.*\b(por\s+d[ií]a|diari[oa])\b/iu;

export const ruleAlquilerClausulaPenal: Rule = (raw) => {
  const text = raw ?? "";
  const lower = text.toLowerCase();
  const ctx = getLegalContext(text);
  const country = ctx.country === "UNKNOWN" ? "AR" : ctx.country;
  if (country !== "AR") return [];

  const m = ANCHOR.exec(lower) || RENT.exec(lower);
  if (!m) return [];
  const idx = m.index;
  const around = sliceAround(lower, idx, 320);

  const neg = hasNegationNear(lower, idx, 160) || /\bno\s+(se\s+)?aplicar[áa]/i.test(around);
  if (neg) return [];

  const hasMultRent = (MULT.test(around) && RENT.test(around)) || /\bel\s+doble\s+del\s+(alquiler|canon)/iu.test(around);
  const hasDailyPct = PCT_DAILY.test(around);
  const hasExplicit = ANCHOR.test(around);

  if (!(hasExplicit || hasMultRent || hasDailyPct)) return [];

  const high = hasMultRent || hasDailyPct;

  return [
    makeFinding({
      id: "alquiler-clausula-penal",
      title: high ? "Cláusula penal / ocupación ilegítima (alto impacto)" : "Cláusula penal",
      severity: high ? "high" : "medium",
      description: high
        ? "Se detecta una penalidad elevada (p. ej., doble del alquiler o % diario). Revisá proporcionalidad y acumulación con otros cargos."
        : "Se menciona cláusula penal. Verificá condiciones, proporcionalidad y compatibilidad legal.",
      text,
      index: idx,
      window: 300,
      meta: {
        type: "legal",
        confidence: high ? 0.85 : 0.7,
  country,
        regime: ctx.regime,
        keywords: ["cláusula penal", "ocupación ilegítima", "doble del alquiler", "% diario"],
      },
    }),
  ];
};

export default ruleAlquilerClausulaPenal;
