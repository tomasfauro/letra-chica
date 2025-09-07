import type { Finding } from "./types";

/**
 * Devuelve un recorte legible alrededor del índice detectado.
 * Intenta usar el párrafo completo (delimitado por dobles saltos \n\n);
 * si no, recorta ±window caracteres.
 */
export function extractEvidence(text: string, index: number, window = 300): string {
  if (!text) return "";
  const prev = text.lastIndexOf("\n\n", index);
  const next = text.indexOf("\n\n", index);

  const start = Math.max(0, prev === -1 ? Math.max(0, index - window) : prev);
  const end = Math.min(text.length, next === -1 ? Math.min(text.length, index + window) : next);

  return text.slice(start, end).trim();
}

/**
 * Crea un hallazgo con evidencia automática (firma por OBJETO).
 */
export function makeFinding(opts: {
  id: string;
  title: string;
  severity: Finding["severity"];
  description: string;
  text: string;     // texto ORIGINAL (no lowercased)
  index: number;    // posición donde matcheó el patrón (sobre 'lower')
  window?: number;  // opcional, tamaño de ventana si no hay párrafo (default 300)
  meta?: Record<string, unknown>;
}): Finding {
  const { id, title, severity, description, text, index, window, meta } = opts;

  return {
    id,
    title,
    severity,
    description,
    evidence: extractEvidence(text, index, window),
    meta,
  };
}
