import type { Finding } from "../types";

export function ruleDebugCanaryAlquiler(text: string): Finding[] {
  const hay = /\b(alquiler|locador|locatario|inmueble|dep[oó]sito|canon)\b/i.test(text);
  if (!hay) return [];
  const lower = text.toLowerCase();
  const idx = Math.max(0, lower.indexOf("alquiler"));
  return [{
    id: "debug-canary-alquiler",
    title: "Canario de alquiler (pipeline OK)",
    severity: "low",
    description: "Confirma que el motor ejecutó reglas sobre texto con léxico de alquiler.",
    text: text.slice(0, 300),
    index: idx,
    meta: {
      confidence: 0.95,
      type: "heuristic",
      keywords: ["debug", "canario", "alquiler", "locador", "locatario"],
      bullets: [
        "El motor recibió texto y corrió reglas.",
        "El gateo/whitelist permitió ejecutar al menos esta regla.",
        "Ajustá las reglas específicas si no aparecen otros hallazgos."
      ],
    },
  }];
}
