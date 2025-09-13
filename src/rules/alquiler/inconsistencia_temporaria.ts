import type { Finding, Rule } from "@/rules";

export const ruleAlquilerInconsistenciaTemporaria: Rule = (text) => {
  const hasTemporaria = /locaci[oó]n\s+temporaria/i.test(text);
  const hasVivienda = /(destino|uso)\s+(?:de\s+)?vivienda/i.test(text);
  const plazo1Anio = /(plazo|duraci[oó]n)[^\n]{0,80}\b(1|un|uno)\s*(?:\(\s*1\s*\))?\s*(a[nñ]o|años|anio|años)/i.test(text)
                   || /\b(12)\s+mes(?:es)?\b/i.test(text);

  if (!(hasTemporaria && hasVivienda && plazo1Anio)) return [];

  const idx = text.search(/locaci[oó]n\s+temporaria/i);
  const start = Math.max(0, idx - 80);
  const evidence = text.slice(start, Math.min(text.length, start + 700));

  const f: Finding = {
    id: "alquiler-inconsistencia-temporaria",
    title: "Inconsistencia: temporaria vs vivienda + 1 año",
    description: "Se declara 'locación temporaria' pero también 'destino vivienda' y plazo de 1 año (posible contradicción legal).",
    severity: "medium",
    evidence,
    index: idx >= 0 ? idx : undefined,
    meta: {
      type: "heuristic",
      confidence: 0.75,
      keywords: ["locación temporaria", "vivienda", "plazo 1 año"],
    },
  };
  return [f];
};
