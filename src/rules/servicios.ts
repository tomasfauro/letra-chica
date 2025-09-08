import type { Rule } from "./types.ts";
import {
  makeFinding,
  sliceAround,
  hasNegationNear,
  score,
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/** Contexto de servicios/planes/suscripciones cerca de un índice */
function hasServiceContextNear(lower: string, index: number, win = 220): boolean {
  const ctx = sliceAround(lower, index, win);
  return /\b(servicio|suscripci[oó]n|plan|proveedor|prestador|abono|baja|alta|cliente|consumidor)\b/.test(ctx);
}

/** Extrae meses o porcentaje de penalidad cerca de un índice. */
function extractPenaltyNear(lower: string, index: number): { months?: number; percent?: number } {
  const around = sliceAround(lower, index, 260);

  let m = /\b([a-záéíóú]+)\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[2], 10) };

  m = /\b(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10) };

  m = /\bequivalente\s+a\s+(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10) };

  m = /\b(\d{1,3})\s*%\b/.exec(around);
  if (m) return { percent: parseInt(m[1], 10) };
  if (/\bpor\s+ciento\b/.test(around)) return { percent: 100 };

  return {};
}

/** Extrae días (p. ej., preaviso) cerca de un índice. */
function extractDaysNear(lower: string, index: number): number | null {
  const around = sliceAround(lower, index, 260);
  const m = /\b(\d{1,3})\s*d[ií]as?\b/.exec(around);
  return m ? parseInt(m[1], 10) : null;
}

/** Base legal AR (única, porque el sitio es sólo Argentina) */
function legalBasisAR() {
  return [
    { law: "Ley 25.326 (AR)", note: "Protección de Datos Personales: consentimiento, finalidad, derechos, transferencias.", jurisdiction: "AR" },
    { law: "Decreto 1558/2001 (AR)", note: "Reglamentación de la Ley 25.326.", jurisdiction: "AR" },
  ];
}

/** ---------- Permanencia / Penalidad (servicios, planes) ---------- */
export const rulePlanPermanencia: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  // Disparador
  const m = /\b(permanenc|penalizaci[oó]n|multa|resarcimiento|punitori[oa]s?)\b/.exec(lower);
  if (!m) return [];

  // Gates de dominio
  const serviceCtxGlobal =
    /\b(servicio|suscripci[oó]n|plan|prestador|proveedor|abono|baja|alta|portabilidad|cliente|consumidor|telef(?:on[ií]a)?|internet|tv|cable|streaming|m[óo]vil|paquete)\b/.test(lower);
  const leaseCtxGlobal =
    /\b(locaci[oó]n|alquiler|locador(?:a)?|locatari[oa]|inmueble|vivienda|departamento|casa|garant[ií]a|dep[oó]sito|fianza)\b/.test(lower);

  const contractType = String(ctxLegal.contractType || "").toLowerCase();

  if (!serviceCtxGlobal || leaseCtxGlobal || contractType === "lease") {
    return [];
  }

  // Señales cercanas al match
  const idx = m.index!;
  const around = sliceAround(lower, idx, 260);
  const neg = hasNegationNear(lower, idx, 140);
  const mentionsPlazo   = /\b(plazo|m[ií]nimo|mes(?:es)?|a[nñ]o(?:s)?)\b/.test(around);
  const mentionsImporte = /\b(\$\s?\d+(?:[\.\,]\d+)?|\d+\s*%|porcentaje|tarifa|cargo|coste|costo)\b/.test(around);

  const { months, percent } = extractPenaltyNear(lower, idx);

  const confidence = score(
    [serviceCtxGlobal, (mentionsPlazo || mentionsImporte || !!months || !!percent), !neg],
    [1.3,             1.0,                                               0.8]
  );
  if (confidence < 0.65) return [];

  let severity: "low" | "medium" | "high" = "medium";
  if ((months ?? 0) >= 2 || (percent ?? 0) >= 50) severity = "high";

  return [
    makeFinding({
      id: "permanencia",
      title: "Posible cláusula de permanencia o penalización",
      severity,
      description:
        "Se detectan términos de permanencia/penalización. Revisá importes fijos, porcentajes y plazos mínimos, y si hay baja sin costo ante cambios del proveedor.",
      text: raw,
      index: idx,
      window: 260,
      meta: {
        type: "heuristic",
        confidence,
        country: "AR",
        regime: ctxLegal.regime,
        months: months ?? null,
        percent: percent ?? null,
        bullets: [
          "Confirmá si existe un plazo mínimo de permanencia.",
          "Chequeá penalidades por baja anticipada (monto/porcentaje).",
          "Revisá condiciones para terminar sin costo (cambios del servicio/incumplimiento del proveedor).",
        ],
        keywords: ["permanencia", "penalización", "multa", "resarcimiento", "baja", "plan"],
      },
    }),
  ];
};

/** ---------- Cesión de datos / consentimiento amplio (AR) ---------- */
const DATA_TRIGGER =
  /\b(datos\s+personales?|tratamiento\s+de\s+datos|protecci[oó]n\s+de\s+datos|base\s+de\s+datos|ley\s+25\.?326)\b/;

export const ruleDatosCesion: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  const t = DATA_TRIGGER.exec(lower);
  if (!t) return [];

  const around = sliceAround(lower, t.index!, 300);

  const ced = /\b(ceder|cesi[oó]n|transferir|compartir|comunicar)\b.*\b(terceros|proveedores|grupo\s+empresarial|filiales)\b/.test(around);
  const comercial = /\b(fines?\s+comerciales?|marketing|publicidad|promoci[oó]n|perfilado|profiling)\b/.test(around);
  const internacional = /\b(transferencias?\s+internacional(?:es)?|fuera\s+del\s+pa[ií]s|extranjero)\b/.test(around);
  const baseLegal = /\b(consentimiento|autorizo|autorizaci[oó]n|leg[ií]timo\s+inter[eé]s)\b/.test(around);

  const limitaciones = /\b(finalidad|limitad[oa]s?|plazo\s+de\s+conservaci[oó]n|minimizaci[oó]n|pseudonimizaci[oó]n|anonimizaci[oó]n)\b/.test(around);
  const derechos = /\b(derechos?\s+(arco|acceso|rectificaci[oó]n|supresi[oó]n|oposici[oó]n|portabilidad))\b/.test(around);
  const canalDerechos = /\b(correo\s+electr[oó]nico|domicilio|formulario|canal)\b.*\b(solicitud|ejercer)\b/.test(around);

  const neg = hasNegationNear(lower, t.index!, 160);

  const confidence = score(
    [true, (ced || comercial || internacional), baseLegal, (limitaciones || derechos || canalDerechos), !neg],
    [1.0,  1.2,                                     0.8,       0.8,                                      0.7]
  );

  if (confidence < 0.6 && !(ced || comercial || internacional)) return [];

  const high = (ced || comercial || internacional) && !(limitaciones || derechos || canalDerechos);
  const severity: "low" | "medium" | "high" = high ? "high" : "medium";

  return [
    makeFinding({
      id: "proteccion-datos",
      title: high
        ? "Tratamiento/cesión de datos amplia (revisar base legal y límites)"
        : "Tratamiento o cesión de datos (verificar alcance)",
      severity,
      description: high
        ? "Se detectan señales de cesión/comercialización, perfilado o transferencias internacionales sin límites/derechos claros. Verificá base legal, finalidad, derechos y plazos."
        : "El contrato menciona tratamiento/cesión de datos. Confirmá base legal, finalidad, derechos ARCO y plazos de conservación.",
      text: raw,
      index: t.index!,
      window: 300,
      meta: {
        type: "legal",
        confidence,
        country: "AR",
        regime: ctxLegal.regime,
        legalBasis: legalBasisAR(),
        bullets: [
          "Identificá si se ceden datos a terceros y con qué finalidad.",
          "Verificá si la base legal es consentimiento o 'interés legítimo'.",
          "Chequeá plazos de conservación y mecanismos para ejercer tus derechos.",
          "Si hay transferencias internacionales, pedí garantías adecuadas.",
        ],
        keywords: ["cesión de datos", "perfilado", "interés legítimo", "marketing", "fines comerciales", "ARCO"],
      },
    }),
  ];
};

/** ---------- Jurisdicción / arbitraje ---------- */
export const ruleJurisdiccionArbitraje: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  const m = /\b(jurisdicci[oó]n|competencia|arbitraje|tribunal|fuero)\b/.exec(lower);
  if (!m) return [];

  const around = sliceAround(lower, m.index!, 260);
  const lejos = /\b(fuera\s+de\s+(?:su\s+)?domicilio|otra\s+ciudad|otra\s+provincia)\b/.test(around);
  const obligatorio = /\barbitraje\b.*\b(obligatorio|exclusivo|vinculante)\b/.test(around);
  const renunciaFuero = /\b(renuncia(?:r)?\s+(al\s+)?fuero|renuncia(?:r)?\s+a\s+reclamar\s+ante\s+tribunales)\b/.test(around);
  const neg = hasNegationNear(lower, m.index!, 150);

  const confidence = score([true, (lejos || obligatorio || renunciaFuero), !neg], [1.0, 1.0, 0.8]);
  if (confidence < 0.6) return [];

  let severity: "low" | "medium" | "high" = "low";
  if (lejos || obligatorio) severity = "medium";
  if (obligatorio && renunciaFuero) severity = "high";

  return [
    makeFinding({
      id: "jurisdiccion-arbitraje",
      title: "Jurisdicción / arbitraje",
      severity,
      description:
        severity === "high"
          ? "Se impone arbitraje obligatorio con renuncia a fuero. Puede limitar opciones procesales."
          : "Revisá si la cláusula impone tribunales lejanos o arbitraje obligatorio que pueda dificultar el acceso.",
      text: raw,
      index: m.index!,
      window: 260,
      meta: {
        type: "heuristic",
        confidence,
        country: "AR",
        regime: ctxLegal.regime,
        bullets: [
          "Chequeá si el contrato impone un tribunal fuera de tu localidad.",
          "Verificá si el arbitraje es obligatorio o voluntario.",
          "Revisá quién cubre los costos del arbitraje.",
          "Prestá atención a renuncias a fuero/tribunales.",
        ],
        keywords: ["jurisdicción", "competencia", "arbitraje", "tribunal", "fuero", "renuncia"],
      },
    }),
  ];
};

/** ---------- Renovación automática ---------- */
export const ruleRenovacionAutomatica: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  const m = /\b(renovaci[oó]n\s+autom[aá]tica|pr[oó]rroga\s+autom[aá]tica|reconducci[oó]n|t[aá]cita\s+reconducci[oó]n)\b/.exec(lower);
  if (!m) return [];

  const around = sliceAround(lower, m.index!, 280);
  const preaviso = /\b(preaviso|aviso\s+previo|con\s+\d+\s*d[ií]as)\b/.test(around);
  const diasPreaviso = extractDaysNear(lower, m.index!);
  const baja = /\b(baja|resoluci[oó]n|rescisi[oó]n|desistimiento)\b/.test(around);
  const silencio = /\b(silencio\s+del\s+usuario|si\s+el\s+usuario\s+no\s+manifiesta|en\s+caso\s+de\s+no\s+oposici[oó]n)\b/.test(around);
  const neg = hasNegationNear(lower, m.index!, 150);

  const confidence = score([true, (preaviso || baja || silencio), !neg], [1.0, 1.0, 0.8]);
  if (confidence < 0.6) return [];

  let severity: "low" | "medium" | "high" = "medium";
  if ((diasPreaviso !== null && diasPreaviso < 10) || (silencio && !preaviso)) severity = "high";

  return [
    makeFinding({
      id: "renovacion-automatica",
      title: "Renovación automática",
      severity,
      description:
        severity === "high"
          ? "Prevé renovación automática con preaviso muy corto o basado en silencio del usuario. Revisá plazos y canales para oponerse."
          : "Puede renovarse sin acción del usuario. Revisá plazos de preaviso, forma de baja y cambios de precio en la renovación.",
      text: raw,
      index: m.index!,
      window: 280,
      meta: {
        type: "heuristic",
        confidence,
        country: "AR",
        regime: ctxLegal.regime,
        preNoticeDays: diasPreaviso ?? null,
        bullets: [
          "Confirmá si se renueva automáticamente sin aviso.",
          "Chequeá el plazo y canal de preaviso para solicitar la baja.",
          "Verificá si el precio puede cambiar en la renovación.",
          "Revisá si la falta de respuesta (silencio) activa la renovación.",
        ],
        keywords: ["renovación automática", "prórroga", "reconducción", "preaviso", "baja", "silencio"],
      },
    }),
  ];
};
