import type { Finding, Rule } from "@/rules";

// Detect third-party guarantor/fiador/codeudor solidario and renunciations
export const ruleAlquilerGaranteSolidario: Rule = (text) => {
  const findings: Finding[] = [];
  const anchor = /(garante\s+solidario|fiador|codeudor\s+solidario)/i;
  if (!anchor.test(text)) return findings;

  // Renunciations to benefits: excusión, división, notificación/aviso
  const renExc = /renuncia(?:n|)\w*[^\n]{0,40}(excusi[oó]n|exclusi[oó]n)/gi;
  const renDiv = /renuncia(?:n|)\w*[^\n]{0,40}divisi[oó]n/gi;
  const renNot = /renuncia(?:n|)\w*[^\n]{0,40}(notificaci[oó]n|aviso)/gi;
  const solid = /(solidari[oa]|incondicional|irrevocable)/gi;

  let score = 0;
  let renunciations: string[] = [];
  const addAll = (rg: RegExp, label: string) => {
    const m = text.match(rg);
    if (m && m.length > 0) { score += 1; renunciations.push(label); }
  };
  addAll(renExc, "excusión");
  addAll(renDiv, "división");
  addAll(renNot, "notificación");
  const strong = !!text.match(solid);

  const idx = text.search(anchor);
  const window = 600;
  const start = Math.max(0, idx - 60);
  const evidence = text.slice(start, Math.min(text.length, start + window));

  const severity: Finding["severity"] = score >= 2 || strong ? "high" : score === 1 ? "medium" : "medium";
  findings.push({
    id: "alquiler-garante-solidario",
    title: "Garante solidario (renuncia a beneficios)",
    description: "Se detecta garante/fiador/codeudor solidario y renuncia a beneficios (excusión, división, notificación).",
    severity,
    evidence,
    index: idx >= 0 ? idx : undefined,
    meta: {
      type: "heuristic",
      confidence: 0.75,
      keywords: ["garante", "fiador", "codeudor", "solidario", ...renunciations],
      renunciations,
    },
  });

  return findings;
};
