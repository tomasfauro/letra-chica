import type { Rule } from "../types";
import { makeFinding, sliceAround, hasNegationNear } from "../utils";
import { getLegalContext } from "../../lib/legal";

// Verbos relevantes (flexión libre con \w*)
const VERBS = /(devengar\w*|aplicar\w*|cobrar\w*|generar\w*)/iu;

// Abreviaturas de tasas
const RATE_ABBR = /\b(TEM|TNA|TEA)\b/iu;

// % con opcional decimal + periodo mensual
const PERCENT = /\b\d{1,3}(?:[\.,]\d{1,2})?\s*%\b/iu;
const PERIOD_MONTH = /\b(mensual(?:es)?|por\s+mes)\b/iu;

// Anclas semánticas: interés(es) + (punitorio|moratorio|por mora)
const INTERES = /\binter[eé]s(?:es)?\b/iu;
const PUNIT_MORA = /(punitori\w*|moratori\w*|por\s+mora)\b/iu;

export const ruleInteresesPunitorios: Rule = (raw) => {
  const text = raw ?? "";
  const lower = text.toLowerCase();
  const ctx = getLegalContext(text);

  // Ámbito: AR (o UNKNOWN se asume AR)
  const country = ctx.country === "UNKNOWN" ? "AR" : ctx.country;
  if (country !== "AR") return [];

  // Buscar primer "interes(es)" como ancla y verificar contexto cercano
  const mInteres = INTERES.exec(lower);
  if (!mInteres) return [];
  const idx = mInteres.index;
  const around = sliceAround(lower, idx, 320);

  // Señales cercanas
  const hasQual = PUNIT_MORA.test(around); // punitorio/moratorio/por mora
  const hasVerb = VERBS.test(around);      // devengar/aplicar/cobrar/generar
  const hasPct = PERCENT.test(around);
  const hasMonth = PERIOD_MONTH.test(around);
  const hasAbbr = RATE_ABBR.test(around);
  // Negación específica de INTERESES (evita confundir "sin tope")
  const negInterest = /\b(no\s+(se\s+)?(aplicar(?:[áa]n)?|devengar(?:[áa]n)?|cobrar(?:[áa]n)?|generar(?:[áa]n)?)\s+inter[eé]s(?:es)?|sin\s+inter[eé]s(?:es)?)\b/iu.test(around);
  if (negInterest) return [];

  // Reglas de disparo (flexibles, pero deben cumplir al menos una combinación fuerte)
  const strongCombo =
    (hasQual && (hasPct || hasAbbr || hasMonth || hasVerb)) || // calificador + (tasa/mes/verbo)
    (hasPct && hasMonth);                                     // % + mensual/por mes

  if (!strongCombo) return [];

  // Señales de riesgo: % + mensual o abreviatura de tasa sin tope
  const mentionsCap = /\b(tope|m[aá]ximo|cap)\b/.test(around);
  const saysNoCap = /\bsin\s+(tope|m[aá]ximo|cap)\b/.test(around);
  const noClearCap = saysNoCap || !mentionsCap;
  const high = ((hasPct && hasMonth) || hasAbbr) && noClearCap;
  const severity: "low" | "medium" | "high" = high ? "high" : "medium";

  const confidence = high ? 0.9 : 0.7;

  return [
    makeFinding({
      id: "bancario-intereses-punitorios",
      title: high
        ? "Intereses punitorios/moratorios con posible exceso"
        : "Intereses punitorios/moratorios",
      severity,
      description: high
        ? "Se detectan intereses punitorios/moratorios con tasa mensual o abreviaturas (TEM/TNA/TEA) sin tope claro. Revisá base de cálculo y acumulación."
        : "Se mencionan intereses punitorios/moratorios. Verificá porcentaje, base de cálculo, periodicidad y topes.",
      text,
      index: idx,
      window: 300,
      meta: {
        type: "legal",
        confidence,
        country,
        regime: ctx.regime,
        keywords: [
          "interés", "intereses", "punitorio", "moratorio", "%", "mensual", "por mes", "TEM", "TNA", "TEA",
        ],
      },
    }),
  ];
};

export default ruleInteresesPunitorios;
