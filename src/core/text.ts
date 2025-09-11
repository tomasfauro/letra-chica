// src/core/text.ts

/** Une líneas cortadas, normaliza espacios y corrige guiones de fin de línea */
export function heuristicsCleanup(raw: string): string {
  if (!raw) return "";

  let t = raw;

  // Normalizar tipos de salto
  t = t.replace(/\r\n?/g, "\n");

  // De-hyphenation al fin de línea: pa-
  // labra -> palabra (cuando la división parece artificial)
  t = t.replace(/([a-záéíóúñ])-\n([a-záéíóúñ])/gi, "$1$2");

  // Unwrap: unir líneas si no terminan en puntuación fuerte
  // (cuidado con listas). Usamos una heurística conservadora:
  t = t.replace(/([^\.\!\?\:;])\n(?!\n)/g, "$1 ");

  // Normalizar bullets simples a guiones
  t = t.replace(/^[\s•·●]\s*/gm, "- ");

  // Quitar dobles espacios
  t = t.replace(/[ \t]{2,}/g, " ");

  // Quitar espacios antes de puntuación
  t = t.replace(/ \,(?=\S)/g, ",");

  // Normalizar comillas y espacios no separables
  t = t.replace(/\u00A0/g, " ");

  // Recortar
  t = t.trim();

  return t;
}

/** Segmenta por párrafos (conservando offsets) */
export function segment(text: string): { paragraphs: string[]; indexMap: number[] } {
  const parts = text.split(/\n{2,}|\r{2,}/g); // párrafos = 1+ saltos en limpio
  const paragraphs: string[] = [];
  const indexMap: number[] = []; // índice absoluto de inicio de cada párrafo

  let offset = 0;
  for (const p of parts) {
    const clean = p.trim();
    if (!clean) {
      offset += p.length + 2; // compensación aproximada
      continue;
    }
    paragraphs.push(clean);
    indexMap.push(text.indexOf(clean, offset));
    offset = indexMap[indexMap.length - 1] + clean.length;
  }
  return { paragraphs, indexMap };
}

/** Mapea un índice absoluto → (párrafo, índice local) */
export function makeOffsetMapper(text: string, indexMap: number[]) {
  return (absIndex: number) => {
    if (absIndex < 0) return { paragraphIndex: 0, localIndex: 0 };
    let p = 0;
    for (let i = 0; i < indexMap.length; i++) {
      if (indexMap[i] <= absIndex) p = i;
      else break;
    }
    const base = indexMap[p] ?? 0;
    return { paragraphIndex: p, localIndex: Math.max(0, absIndex - base) };
  };
}

/** Normaliza formatos “humanos” → machine-friendly (números, porcentaje, moneda, fechas) 
 *  Devuelve el mismo texto (por principios de no destrucción), pero opcionalmente
 *  podés devolver diccionarios con matches si te sirven. Aquí solo demo.
 */
export function normalizeNumbersDatesCurrency(text: string): string {
  // Por ahora, solo limpiezas seguras: no toco contenido, pero puedo
  // estandarizar separadores decimales puntualmente si quieres.
  // Ejemplo: “12,50 %” → “12.50%” (muy opcional, cuidado con España/AR)
  // t = t.replace(/(\d),(\d)/g, "$1.$2");
  return text;
}
