// src/core/text.ts

/** ─────────── Utilidades de normalización básica ─────────── */

export function fixQuotesDashesLigatures(s: string): string {
  if (!s) return s;
  return s
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"') // comillas
    .replace(/[\u2018\u2019]/g, "'")             // apóstrofos
    .replace(/[\u2013\u2014]/g, "-")             // guiones – —
    .replace(/\uFB01/g, "fi")                    // ﬁ
    .replace(/\uFB02/g, "fl")                    // ﬂ
    .replace(/\u00A0/g, " ");                    // espacio duro
}

export function dehyphenate(s: string): string {
  if (!s) return s;
  // une palabra-\nsiguiente → palabrasiguiente (solo si hay alfanum a ambos lados)
  return s.replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9])-\n(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9])/g, "$1");
}

export function collapseWhitespace(s: string): string {
  if (!s) return s;
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n");
}

/**
 * Elimina encabezados/pies de página repetidos (heurística simple).
 * Divide por separadores de página comunes y remueve primera/última línea
 * si aparecen en >50% de las páginas.
 */
export function stripFrequentHeadersFooters(s: string): string {
  if (!s) return s;
  const pages = s.split(/\f|\n{3,}|(?:\n)Página\s+\d+(?:\/\d+)?\s*\n/gi);
  if (pages.length < 3) return s;

  const firstLines: Record<string, number> = {};
  const lastLines: Record<string, number> = {};
  const norm = (t: string) => t.trim().toLowerCase().replace(/[ \t]+/g, " ").slice(0, 140);

  for (const pg of pages) {
    const lines = pg.split("\n").filter(Boolean);
    if (!lines.length) continue;
    const head = norm(lines[0] ?? "");
    const tail = norm(lines[lines.length - 1] ?? "");
    if (head) firstLines[head] = (firstLines[head] ?? 0) + 1;
    if (tail) lastLines[tail] = (lastLines[tail] ?? 0) + 1;
  }

  const threshold = Math.max(2, Math.floor(pages.length * 0.5));
  const commonHeads = new Set(Object.entries(firstLines).filter(([, c]) => c >= threshold).map(([k]) => k));
  const commonTails = new Set(Object.entries(lastLines).filter(([, c]) => c >= threshold).map(([k]) => k));

  const cleaned = pages.map((pg) => {
    let lines = pg.split("\n");
    if (!lines.length) return pg;
    if (lines[0] && commonHeads.has(norm(lines[0]))) lines = lines.slice(1);
    if (lines.length && commonTails.has(norm(lines[lines.length - 1]))) lines = lines.slice(0, -1);
    return lines.join("\n");
  });

  return cleaned.join("\n\n");
}

/** ─────────── Limpieza heurística de dominio & normalización semántica ─────────── */

/**
 * Limpieza heurística de dominio: quita basura ligera, arregla bullets raros, etc.
 * (puedes ampliar con reglas propias sin tocar el pipeline)
 */
export function heuristicsCleanup(s: string): string {
  if (!s) return s;
  let t = s;

  // bullets Unicode exóticos → "-"
  t = t.replace(/[•·◦▪►▼◆■]/g, "-");

  // líneas enteras compuestas solo de decoraciones
  t = t.replace(/^[\s\-–—_=*·•◦▪►◆■]{3,}\s*$/gm, "");

  // espacios extra antes de signos de puntuación
  t = t.replace(/\s+([,;:.!?])/g, "$1");

  // títulos en MAYÚSCULAS con mucho ruido → conserva
  // (placeholder; añade tus reglas si lo necesitas)

  return t;
}

/**
 * Normalización semántica ligera para números / fechas / moneda.
 * - "un (1) mes" → "1 mes"
 * - "3,5%" → "3.5%"
 * - "$ 100.000,50" → "$100000.50"
 */
export function normalizeNumbersDatesCurrency(s: string): string {
  if (!s) return s;
  let t = s;

  // Mapa básico 1–24 (añade más si necesitas)
  const mapa: Record<string, string> = {
    "un": "1","uno":"1","una":"1",
    "dos":"2","tres":"3","cuatro":"4","cinco":"5","seis":"6","siete":"7","ocho":"8","nueve":"9",
    "diez":"10","once":"11","doce":"12","trece":"13","catorce":"14","quince":"15",
    "dieciseis":"16","dieciséis":"16","diecisiete":"17","dieciocho":"18","diecinueve":"19",
    "veinte":"20","veintiuno":"21","veintidos":"22","veintidós":"22","veintitres":"23","veintitrés":"23","veinticuatro":"24"
  };

  const palabras = Object.keys(mapa).sort((a,b)=>b.length-a.length).join("|");

  // Caso 1: "dos (2) meses" -> "2 meses" (prefiere el dígito entre paréntesis si coincide)
  t = t.replace(new RegExp(`\\b(${palabras})\\s*\\((\\d{1,3})\\)\\s+(mes(?:es)?|cuotas?)\\b`, "gi"),
    (_m, _w, n, unidad) => `${n} ${unidad}`);

  // Caso 2: "dos meses" -> "2 meses"
  t = t.replace(new RegExp(`\\b(${palabras})\\s+(mes(?:es)?|cuotas?)\\b`, "gi"),
    (_m, w, unidad) => `${mapa[w.toLowerCase()]} ${unidad}`);

  // números con coma decimal y % → punto decimal
  t = t.replace(/(\d+),(\d+)\s*%/g, (_m, a, b) => `${a}.${b}%`);

  // moneda $ con miles latino → sin puntos, coma→punto
  t = t.replace(/\$\s*([\d.\,]+)/g, (_m, num) => {
    const flat = String(num).replace(/\./g, "").replace(",", ".");
    return `$${flat}`;
  });

  return t;
}


/** ─────────── Segmentación y mapeos ─────────── */

export type SegmentResult = {
  paragraphs: string[];
  indexMap: number[];          // mapa de offsets (clean -> raw) o identidad
  reverseIndexMap: number[];   // mapa inverso (raw -> clean) o identidad
  paragraphSpans: Array<[number, number]>; // offsets [start,end) por párrafo en “clean”
};

/**
 * Segmenta por doble salto de línea (puedes mejorar con encabezados "Cláusula/Artículo").
 * Aquí generamos mapas identidad; si en tu extracción construyes un mapping real,
 * sustitúyelos por los que ya tengas.
 */
export function segment(clean: string): SegmentResult {
  const paragraphs = clean.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  // Mapas identidad (mismo texto clean==raw en esta etapa)
  const indexMap = Array.from({ length: clean.length }, (_, i) => i);
  const reverseIndexMap = indexMap.slice();

  // Spans de cada párrafo en el texto limpio
  const paragraphSpans: Array<[number, number]> = [];
  let cursor = 0;
  for (const p of paragraphs) {
    const start = clean.indexOf(p, cursor);
    const end = start + p.length;
    paragraphSpans.push([start, end]);
    cursor = end;
  }

  return { paragraphs, indexMap, reverseIndexMap, paragraphSpans };
}

/**
 * Crea un mapper de offsets a partir de un vector de mapeo.
 * `map[i]` = posición equivalente de i en el otro texto (si no hay, usa i).
 */
export function makeOffsetMapper(_baseText: string, map: number[]) {
  return function mapOffsets(start: number, end: number): [number, number] {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const s = clamp(start | 0, 0, map.length - 1);
    const e = clamp(end | 0, 0, map.length - 1);
    const ms = Number.isFinite(map[s]) ? map[s] : s;
    const me = Number.isFinite(map[e]) ? map[e] : e;
    return [ms, me];
  };
}
