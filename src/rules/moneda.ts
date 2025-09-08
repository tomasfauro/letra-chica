// src/rules/moneda.ts
import type { Rule } from "./types.ts";
import {
  makeFinding, sliceAround, hasPriceTermsNear, hasNegationNear, score
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/**
 * Pago en moneda extranjera (USD) / ajuste por tipo de cambio.
 * – Solo AR (si estás soportando ES, movelo a set ES con su lógica).
 * – Pide contexto de locación/canon cerca para bajar FP.
 * – Negación cerca baja la confianza (“no será exigible en USD…”).
 * – HIGH si exige pago estricto en USD sin TC claro/alternativa en ARS.
 */
export const ruleMonedaExtranjera: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);
  if (ctx.country !== "AR") return [];

  const m = /\b(d[oó]lares?|usd|u\$d|moneda\s+extranjera|tipo\s+de\s+cambio|cotizaci[oó]n)\b/.exec(lower);
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 320);

  // Semántica de locación/canon para recortar FP
  const lease = hasPriceTermsNear(lower, idx, 220);

  // Señales típicas de redacción en USD/TC
  const demandsUSD =
    /\b(deber[aá]\s+pagar|se\s+pag[aá]r[áa]|obligatoriamente)\b.*\b(d[oó]lares|usd|u\$d)\b/.test(around);
  const mentionsTC =
    /\b(tipo\s+de\s+cambio|cotizaci[oó]n|bna|bcra|mep|oficial| vendedor| comprador)\b/.test(around);
  const setsReference =
    /\b(referencia|seg[uú]n\s+cotizaci[oó]n|al\s+tipo\s+de\s+cambio\s+del?\s+(?:bna|bcra|mep)|equivalente\s+a)\b/.test(around);
  const allowsARS =
    /\b(pagar\s+en\s+pesos?|ars|moneda\s+de\s+curso\s+legal)\b/.test(around);

  const neg = hasNegationNear(lower, idx, 150); // “no será exigible en USD…”
  const confidence = score(
    [lease, (demandsUSD || mentionsTC || allowsARS), !neg],
    [1.2, 1.0, 0.8]
  );
  if (confidence < 0.6) return [];

  // Severidad: HIGH si exige USD sin alternativa/TC claro; MEDIUM si hay TC y/o alternativa en ARS
  const high = demandsUSD && (!mentionsTC || !setsReference) && !allowsARS;
  const severity: "low" | "medium" | "high" = high ? "high" : "medium";

  return [
    makeFinding({
      id: "moneda-extranjera",
      title: "Pago en moneda extranjera / tipo de cambio",
      severity,
      description:
        high
          ? "Se exige pago en USD sin alternativa clara en pesos ni tipo de cambio de referencia. Revisá validez, riesgos y eventuales restricciones."
          : "Se pacta pago o referencia a USD. Verificá tipo de cambio aplicable, fecha de conversión, comisiones y si podés pagar en pesos.",
      text: raw,
      index: idx,
      window: 320,
      meta: {
        type: "legal",
        confidence,
        country: ctx.country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        bullets: [
          "Identificá cuándo y cómo se determina el tipo de cambio (BNA/BCRA/MEP).",
          "Chequeá si existe opción de pagar en pesos y con qué cotización.",
          "Controlá diferencias a tu cargo (spread/comisión) y fecha/hora de referencia.",
        ],
        keywords: ["dólar", "USD", "tipo de cambio", "cotización", "BNA", "BCRA", "MEP", "ARS"],
      },
    }),
  ];
};
