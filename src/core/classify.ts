
console.log("[classify] v2 labels ON");

// src/core/classify.ts
export type ContractType = "alquiler" | "servicios" | "laboral" | "bancario" | "otro";

export interface Classification {
  type: ContractType;
  confidence: number;               // 0..1
  reasons: string[];                // pistas legibles para UI/debug
  features: Record<string, number>; // puntajes por categoría
}

/** Un patrón puede ser:
 *  - string o RegExp (sin etiqueta → se formatea a algo legible),
 *  - { test, label } para forzar etiqueta humana.
 */
type LabeledPat = { test: string | RegExp; label: string };
type Pat = string | RegExp | LabeledPat;

type Dict = Record<string, Pat[]>;

/* -------------------------------------------------------------------------- */
/* Diccionario con ETIQUETAS HUMANAS                                          */
/* -------------------------------------------------------------------------- */

const KW: Record<ContractType, Dict> = {
  alquiler: {
    core: [
      { test: /\blocat(ario|or|iva|ivo)\b/i, label: "locador/locatario" },
      { test: /\barrend(amiento|ador|atario)\b/i, label: "arrendamiento" },
      { test: /\balquiler(es)?\b/i, label: "alquiler" },
      { test: /\bc[aá]non\b/i, label: "canon" },
      { test: /\bdep[oó]sito\b/i, label: "depósito" },
      { test: /\bexpensas\b/i, label: "expensas" },
      { test: /\bABL\b/, label: "ABL" },
      { test: /\bgarant[ií]a\b/i, label: "garantía" },
      { test: /\brenovaci[oó]n\b/i, label: "renovación" },
      { test: /\bpropietario\b/i, label: "propietario" },
      { test: /\binquilino\b/i, label: "inquilino" },
      { test: /\binmueble\b/i, label: "inmueble" },
    ],
    title: [
      { test: /\bcontrato\s+de\s+(locaci[oó]n|alquiler|arrendamiento)\b/i, label: "Contrato de locación/alquiler" },
    ],
  },
  servicios: {
    core: [
      { test: /\bservicios?\b/i, label: "servicio(s)" },
      { test: /\bSLA\b/i, label: "SLA" },
      { test: /\bnivel(es)?\s+de\s+servicio\b/i, label: "niveles de servicio" },
      { test: /\bmantenimient(o|os)\b/i, label: "mantenimiento" },
      { test: /\bsoporte\b/i, label: "soporte" },
      { test: /\bmesa\s+de\s+ayuda\b/i, label: "mesa de ayuda" },
      { test: /\bprestaci[oó]n\b/i, label: "prestación" },
      { test: /\bsuministro\b/i, label: "suministro" },
      { test: /\bsoftware\s+as\s+a\s+service\b/i, label: "Software as a Service" },
      { test: /\bsaas\b/i, label: "SaaS" },
      { test: /\bsuscripci[oó]n\b/i, label: "suscripción" },
      { test: /\bhosting\b/i, label: "hosting" },
    ],
    title: [
      { test: /\bcontrato\s+de\s+servicios?\b/i, label: "Contrato de servicios" },
      { test: /\bacuerdo\s+de\s+nivel\s+de\s+servicio\b/i, label: "Acuerdo de nivel de servicio" },
    ],
  },
  laboral: {
    core: [
      { test: /\bempleador\b/i, label: "empleador" },
      { test: /\bempleado\b/i, label: "empleado" },
      { test: /\btrabajador\b/i, label: "trabajador" },
      { test: /\brelaci[oó]n\s+de\s+dependencia\b/i, label: "relación de dependencia" },
      { test: /\bLCT\b/i, label: "LCT" },
      { test: /\bLey\s*20\.?744\b/i, label: "Ley 20.744" },
      { test: /\bsalario\b/i, label: "salario" },
      { test: /\bremuneraci[oó]n\b/i, label: "remuneración" },
      { test: /\bjornada\b/i, label: "jornada" },
      { test: /\bvacacione?s?\b/i, label: "vacaciones" },
      { test: /\bper[ií]odo\s+de\s+prueba\b/i, label: "período de prueba" },
      { test: /\bteletrabajo\b/i, label: "teletrabajo" },
      { test: /\bART\b/i, label: "ART" },
      { test: /\bconvenio\s+colectivo\b/i, label: "convenio colectivo" },
      { test: /\bCCT\b/i, label: "CCT" },
      { test: /\bpreaviso\b/i, label: "preaviso" },
    ],
    title: [
      { test: /\bcontrato\s+de\s+trabajo\b/i, label: "Contrato de trabajo" },
      { test: /\bcontrato\s+laboral\b/i, label: "Contrato laboral" },
    ],
  },
  bancario: {
    core: [
      { test: /\bentidad\s+financier(a|o)\b/i, label: "entidad financiera" },
      { test: /\bBanco\b/i, label: "banco" },
      { test: /\btarjeta\s+de\s+cr[eé]dito\b/i, label: "tarjeta de crédito" },
      { test: /\bcuenta\s+(corriente|sueldo|caja\s+de\s+ahorro)\b/i, label: "cuenta bancaria" },
      { test: /\bpr[eé]stamo\b/i, label: "préstamo" },
      { test: /\bmutuo\b/i, label: "mutuo" },
      { test: /\bCF(?:T|TEA)\b/i, label: "CFT/CFTEA" },
      { test: /\bTNA\b/i, label: "TNA" },
      { test: /\binter[eé]s\s+(punitorio|moratorio)\b/i, label: "interés punitorio/moratorio" },
      { test: /\banatocismo\b/i, label: "anatocismo" },
      { test: /\bhipoteca\b/i, label: "hipoteca" },
    ],
    title: [
      { test: /\bcontrato\s+(bancario|de\s+pr[eé]stamo|de\s+tarjeta|de\s+cuenta)\b/i, label: "Contrato bancario/préstamo/tarjeta" },
    ],
  },
  otro: { core: [], title: [] },
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const WEIGHTS = { title: 2.5, header: 1.5, core: 1.0, glossary: 0.8 };

function slice(text: string, start: number, len: number) {
  return text.slice(start, Math.min(text.length, start + len));
}

// ——— type guard seguro: un RegExp NO tiene 'label' ———
function isLabeled(p: any): p is LabeledPat {
  return typeof p === "object" && p !== null && "label" in p;
}

function toRegex(p: Pat): RegExp {
  const test = isLabeled(p) ? p.test : p;
  return typeof test === "string" ? new RegExp(`\\b${test}\\b`, "i") : test;
}

function labelOf(p: Pat, rx: RegExp): string {
  if (isLabeled(p)) return p.label;
  // fallback: “limpiar” el source del regex a algo legible
  return rx.source
    .replace(/\\b/g, "")
    .replace(/\(\?:/g, "(")
    .replace(/\[[^\]]+\]/g, (m) => m.replace(/[\[\]\\]/g, "")) // [aá] -> aá
    .replace(/\(([^)]+)\)/g, "…") // grupos -> …
    .replace(/\s+/g, " ")
    .trim();
}

function countHits(text: string, pats: Pat[]) {
  let n = 0;
  const reasons: string[] = [];
  for (const p of pats) {
    const rx = toRegex(p);
    if (rx.test(text)) {
      n += 1;
      reasons.push(labelOf(p, rx));
    }
  }
  return { n, reasons };
}

/* -------------------------------------------------------------------------- */
/* Clasificador                                                                */
/* -------------------------------------------------------------------------- */

export function classifyContract(textRaw: string): Classification {
  const text = textRaw ?? "";
  const lower = text.toLowerCase();

  const title = slice(lower, 0, 220);                // título/encabezado
  const header = slice(lower, 0, 1200);              // primeras ~2–3 págs
  const glossary = slice(lower, Math.max(0, lower.length - 1500), 1500); // final

  const features: Record<string, number> = {};
  const reasonsAll: string[] = [];

  (["alquiler", "servicios", "laboral", "bancario"] as ContractType[]).forEach((cat) => {
    const dict = KW[cat];
    let score = 0;
    const r: string[] = [];

    // title
    const th = countHits(title, dict.title ?? []);
    if (th.n) { score += th.n * WEIGHTS.title; r.push(...th.reasons.map(s => `[título] ${s}`)); }

    // header
    const hh = countHits(header, dict.core ?? []);
    if (hh.n) { score += hh.n * WEIGHTS.header; r.push(...hh.reasons.map(s => `[inicio] ${s}`)); }

    // core (todo)
    const ch = countHits(lower, dict.core ?? []);
    if (ch.n) { score += ch.n * WEIGHTS.core; r.push(...ch.reasons.map(s => `[cuerpo] ${s}`)); }

    // glossary (final)
    const gh = countHits(glossary, dict.core ?? []);
    if (gh.n) { score += gh.n * WEIGHTS.glossary; r.push(...gh.reasons.map(s => `[final] ${s}`)); }

    features[cat] = +score.toFixed(2);
    if (r.length) reasonsAll.push(...r.slice(0, 10));
  });

  // ganador y normalización a 0..1
  const entries = Object.entries(features) as [ContractType, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [topCat, topScore] = entries[0];

  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const confidence = Math.min(1, Math.max(0.2, topScore / (total || 1)));

  const type: ContractType = topScore < 1.5 ? "otro" : topCat;

  // razones (humanas)
  const reasons = reasonsAll.slice(0, 12);

  return {
    type,
    confidence: +confidence.toFixed(2),
    reasons,
    features: Object.fromEntries(entries),
  };
}
