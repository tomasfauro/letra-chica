// src/lib/text/normalize.ts
/**
 * Normaliza texto de PDF:
 * - \r -> \n ; \u00A0 -> ' '
 * - Colapsa espacios antes de \n
 * - Máx. dos saltos consecutivos
 * - Remueve numeración de cláusulas típica si contamina (opcional)
 */
export function normalizeText(raw: string): string {
  const base = (raw ?? "")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Remover numeraciones tipo "1.1. Cláusula ..." al inicio de líneas, suave
  const cleaned = base.replace(/^\s*(?:\d+(?:\.\d+)*[.)-]\s*)/gm, "");
  return cleaned;
}
