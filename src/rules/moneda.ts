import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

/**
 * Pago en moneda extranjera (USD/dólares).
 */
export const ruleMonedaExtranjera: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m = /\b(d[oó]lares?|usd|u\$d|moneda extranjera)\b/.exec(lower);
  if (!m) return [];

  return [
    makeFinding({
      id: "moneda-extranjera",
      title: "Pago en moneda extranjera",
      severity: "medium",
      description:
        "Se pacta el pago en moneda extranjera. Revisá tipo de cambio aplicado, fecha de conversión y comisiones.",
      text: raw,
      index: m.index!,
      meta: {
        bullets: [
          "Identificá cuándo y cómo se determina el tipo de cambio.",
          "Controlá si hay diferencias a tu cargo (spread o comisión).",
          "Chequeá si tenés opción de pagar en pesos y con qué cotización."
        ],
        keywords: ["dólar", "USD", "tipo de cambio", "moneda extranjera"]
      }
    }),
  ];
};
