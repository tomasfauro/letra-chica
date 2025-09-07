import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

/**
 * Renuncias amplias de derechos / exoneración de responsabilidad.
 */
export const ruleRenunciaDerechos: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m = /\b(renuncia(?:r)?\s+a|exime(?:r)?\s+de\s+responsabilidad|indemnidad\s+amplia)\b/.exec(lower);
  if (!m) return [];

  return [
    makeFinding({
      id: "renuncia-derechos",
      title: "Renuncia/limitación amplia de derechos",
      severity: "high",
      description:
        "Se observan renuncias o exoneraciones amplias. Revisá alcance, excepciones y compatibilidad con derechos irrenunciables.",
      text: raw,
      index: m.index!,
      meta: {
        bullets: [
          "Detectá si limita reclamos o reduce garantías básicas.",
          "Buscá cláusulas espejo de responsabilidad de la otra parte.",
          "Revisá si contradice derechos que son irrenunciables por ley."
        ],
        keywords: ["renuncia", "responsabilidad", "indemnidad"]
      }
    }),
  ];
};
