import type { Finding, Rule } from "@/rules";

export const ruleAlquilerJurisdiccion: Rule = (text) => {
  const hits = [
    /jurisdicci[oó]n/i,
    /competencia\s+(?:judicial|territorial)/i,
    /(tribunales|juzgados)\s+de\s+[A-ZÁÉÍÓÚÑ][\w\s\.]+/i,
    /renuncia(n|)\w*\s+a\s+(cualquier\s+otro\s+)?(fuero|jurisdicci[oó]n)/i,
    /domicilio\s+constituid[oa]/i,
  ];
  const matched = hits.some((rx) => rx.test(text));
  if (!matched) return [];

  const idx = hits.map((rx) => text.search(rx)).filter((i) => i >= 0).sort((a,b)=>a-b)[0] ?? 0;
  const start = Math.max(0, idx - 80);
  const evidence = text.slice(start, Math.min(text.length, start + 600));

  const f: Finding = {
    id: "alquiler-jurisdiccion",
    title: "Jurisdicción/competencia pactada",
    description: "El contrato fija tribunales/competencia y renuncia a otros fueros.",
    severity: "low",
    evidence,
    index: idx,
    meta: {
      type: "heuristic",
      confidence: 0.7,
      keywords: ["jurisdicción", "competencia", "tribunales", "fuero", "renuncia"],
    },
  };
  return [f];
};
