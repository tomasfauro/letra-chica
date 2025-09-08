// src/rules/intereses.ts
import type { Rule } from "./types.ts";
import {
  makeFinding, sliceAround, hasPriceTermsNear, hasNegationNear, score
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/**
 * Intereses moratorios / punitorios.
 * – Gating AR (evita FP fuera de jurisdicción).
 * – Proximidad a términos de alquiler/canon para bajar ruido.
 * – Negación cerca baja la confianza (“no se aplicarán intereses…”).
 * – HIGH solo si hay %/frecuencia fuerte y sin tope claro.
 */
export const ruleInteresesPunitorios: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);
  if (ctx.country !== "AR") return [];

  // Disparador base
  const m = /\binter[eé]s(?:es)?\b/.exec(lower);
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 300);

  // Señales
  const hasTipo = /(punitori[oó]s?|moratori[oó]s?)/.test(around);
  const hasPercent = /\b\d{1,2}\s*%\b|\bpor\s+ciento\b/.test(around);
  const hasFreq = /\b(diari[oa]|mensual|mensualmente|por\s+d[ií]a|por\s+mes)\b/.test(around);
  const hasCap = /\b(tope|m[aá]ximo|no\s+exceder[áa]?|cap(?:\s+anual)?)\b/.test(around);

  const lease = hasPriceTermsNear(lower, idx, 220);   // “alquiler/canon/precio/locación…”
  const neg = hasNegationNear(lower, idx, 150);       // “no se aplicarán intereses…”, etc.

  // Confianza (0–1): semántica + (% o frecuencia). Negación baja.
  const confidence = score(
    [lease, (hasPercent || hasFreq || hasTipo), !neg],
    [1.2, 1.0, 0.8]
  );
  if (confidence < 0.6) return [];

  // Severidad:
  // - HIGH si hay % o frecuencia intensa y NO se ve tope claro
  // - MEDIUM en el resto (informativo)
  const high = (hasPercent || hasFreq) && !hasCap;
  const severity: "low" | "medium" | "high" = high ? "high" : "medium";

  return [
    makeFinding({
      id: "intereses-punitorios",
      title: high
        ? "Intereses moratorios/punitorios con posible exceso"
        : "Intereses moratorios/punitorios",
      severity,
      description: high
        ? "Intereses con porcentaje/frecuencia y sin tope claro. Revisá proporcionalidad y acumulación con otros cargos."
        : "Se prevén intereses por mora. Verificá porcentaje, base de cálculo, tope y si acumulan con otros cargos.",
      text: raw,
      index: idx,
      window: 300,
      meta: {
        type: "legal",
        confidence,
        country: ctx.country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        bullets: [
          "Confirmá el porcentaje y la base de cálculo.",
          "Revisá si existe tope (cap) y su redacción.",
          "Chequeá la frecuencia (diaria/mensual) y si acumula con punitorios/gastos.",
        ],
        keywords: ["interés", "punitorio", "moratorio", "%", "cap", "tope", "diario", "mensual"],
      },
    }),
  ];
};
