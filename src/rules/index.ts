/**
 * Define la estructura de un hallazgo detectado en un contrato.
 */
export interface Finding {
  /** Identificador único de la regla */
  id: string;
  /** Título breve del hallazgo */
  title: string;
  /** Severidad estimada: low, medium o high */
  severity: "low" | "medium" | "high";
  /** Descripción en lenguaje claro del riesgo */
  description: string;
  /** Fragmento de texto que disparó la regla */
  evidence?: string;
}

/** Tipo de una regla, recibe el texto normalizado y devuelve hallazgos */
type Rule = (text: string) => Finding[];

// --- Regla 1: Cláusula de permanencia o penalización
const rulePermanencia: Rule = (text) => {
  const findings: Finding[] = [];
  const rgx = /\b(permanenc|penalizaci[oó]n|multa|resarcimiento)\b/i;
  const match = text.match(rgx);
  if (match) {
    const idx = match.index ?? 0;
    const start = Math.max(0, idx - 100);
    const end = Math.min(text.length, idx + 100);
    findings.push({
      id: "permanencia",
      title: "Posible cláusula de permanencia o penalización",
      severity: "medium",
      description:
        "Se detectaron términos relacionados con permanencia o penalizaciones. Revisa si hay importes fijos, porcentajes o plazos mínimos.",
      evidence: text.slice(start, end).trim(),
    });
  }
  return findings;
};

// --- Regla 2: Cesión de datos / consentimiento amplio
const ruleDatos: Rule = (text) => {
  const findings: Finding[] = [];
  const rgx = /\b(cesi[oó]n de datos|terceros|fines comerciales|perfilado|leg[ií]timo inter[eé]s)\b/i;
  const match = text.match(rgx);
  if (match) {
    const idx = match.index ?? 0;
    const start = Math.max(0, idx - 100);
    const end = Math.min(text.length, idx + 100);
    findings.push({
      id: "proteccion-datos",
      title: "Tratamiento o cesión de datos potencialmente amplia",
      severity: "high",
      description:
        "El contrato podría habilitar cesiones o tratamientos con fines comerciales o de perfilado. Verifica la base legal, finalidad, derechos y plazos.",
      evidence: text.slice(start, end).trim(),
    });
  }
  return findings;
};

// --- Lista de reglas, para poder iterar y extender fácilmente
const rules: Rule[] = [rulePermanencia, ruleDatos];

/**
 * Ejecuta todas las reglas sobre un texto normalizado.
 *
 * @param raw Texto original del contrato o cláusula.
 * @returns Lista de hallazgos encontrados.
 */
export function runRules(raw: string): Finding[] {
  const text = (raw || "").toLowerCase();
  return rules.flatMap((rule) => rule(text));
}