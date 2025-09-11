// src/lib/pdf/text/normalize.ts
export function normalizeText(raw: string): string {
  if (!raw) return "";

  let t = raw;

  // Saltos de línea normalizados
  t = t.replace(/\r\n?/g, "\n");

  // De-hyphenation: “pa-\nlabra” → “palabra”
  t = t.replace(/([a-záéíóúñ])-\n([a-záéíóúñ])/gi, "$1$2");

  // Unwrap de líneas: une líneas si no terminan en puntuación fuerte
  // (conservador para no romper listas)
  t = t.replace(/([^\.\!\?\:;])\n(?!\n)/g, "$1 ");

  // Normaliza bullets simples a guiones
  t = t.replace(/^[\s•·●]\s*/gm, "- ");

  // Colapsa espacios múltiples
  t = t.replace(/[ \t]{2,}/g, " ");

  // Quita espacios antes de comas
  t = t.replace(/ \,(?=\S)/g, ",");

  // Espacios no separables → espacio normal
  t = t.replace(/\u00A0/g, " ");

  // Recorta extremos y limpia saltos extra al final
  t = t.trim();

  return t;
}
