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
/** Ancla amplia para otros casos (la dejamos por si aparecen más coincidencias) */
const DATA_ANCHOR =
  /\b((datos\s+personales?|informaci[oó]n\s+personal|datos\s+del\s+usuario).{0,80}\b(cesi[oó]n|ceder|transferir|transferencia|compartir|comunicar)\b|cesi[oó]n\s+de\s+datos|transferencia\s+de\s+datos|compartir\s+datos|comunicar\s+datos)\b/gi;

/** Fast-paths del dataset */
const DIRECT_ANY =
  /\bcesi[oó]n(?:\s+de)?\s+datos\b[\s\S]{0,250}\b(tercer(?:o|os)|terceras?\s+(?:partes?|personas?)|fines?\s+comerciales?|marketing|publicidad)\b/i;
const DIRECT_TRANSFER =
  /\btransferenc(?:ia|ias)\s+de\s+datos\b[\s\S]{0,250}\b(tercer(?:o|os)|terceras?\s+(?:partes?|personas?)|fines?\s+comerciales?|marketing|publicidad)\b/i;

/** Detector global (orden/distancia libre) */
const HAS_ACTION = /\b(cesi[oó]n|ceder|transferir|transferencia|compartir|comunicar)\b/i;
const HAS_DATOS = /\bdatos?\b/i;
const HAS_SCOPE = /\b(tercer(?:o|os)|terceras?\s+(?:partes?|personas?)|fines?\s+comerciales?|marketing|publicidad)\b/i;

export const ruleDatosCesion: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);
  const out: ReturnType<Rule> = [];

  // A) Perfilado/profiling como disparador independiente (sin exigir 'datos')
  //    Cubrimos wording como "Se autoriza el perfilado con base en el interés legítimo..."
  const PROFILING = /\b(perfilad[oa]|profiling)\b/i;
  const LEGIT_INTEREST = /\b(inter[eé]s\s+leg[ií]timo)\b/i;
  if (PROFILING.test(lower)) {
    const idx = lower.search(PROFILING);
    const neg = hasNegationNear(lower, Math.max(0, idx), 160);
    // Señales alrededor
    const around = sliceAround(lower, Math.max(0, idx), 280);
    const hasScope = /\b(marketing|publicidad|promoci[oó]n|tercer[oa]s?\s+(?:partes?|personas?)|proveedores?)\b/.test(around);
    const hasLegalBase = LEGIT_INTEREST.test(around) || /\b(consentimiento|base\s+legal|opt-?in|opt-?out)\b/.test(around);
    let confidence = 0.7;
    if (hasScope) confidence += 0.1;
    if (hasLegalBase) confidence += 0.05;
    if (neg) confidence -= 0.25;
    confidence = Math.max(0.4, Math.min(0.98, confidence));
    const severity: "low" | "medium" | "high" = neg ? "low" : hasScope ? "high" : "medium";
    out.push(
      makeFinding({
        id: "proteccion-datos",
        title: hasScope
          ? "Perfilado de usuarios con posibles fines comerciales"
          : "Perfilado de usuarios (verificar base legal)",
        severity,
        description: hasScope
          ? "Se detecta perfilado de usuarios y posibles fines comerciales/marketing. Verificá consentimiento/opt-out o base legal adecuada."
          : "Se detecta perfilado de usuarios. Confirmá base legal (consentimiento o interés legítimo) y derechos de oposición.",
        text: raw,
        index: Math.max(0, idx),
        window: 300,
        meta: {
          type: "legal",
          confidence: +confidence.toFixed(2),
          country: "AR",
          regime: ctxLegal.regime,
          legalBasis: legalBasisAR(),
          bullets: [
            "Identificá finalidad del perfilado (servicio vs. fines comerciales).",
            "Exigí consentimiento válido u otra base legal y canal de oposición.",
            "Revisá plazos y transferencias a terceros si aplica.",
          ],
          keywords: ["perfilado", "profiling", "consentimiento", "interés legítimo", "opt-out"],
        },
      })
    );
  }

  // 0) Global ANY-ORDER: acción + datos + alcance (terceros/marketing/publicidad)
  if (HAS_ACTION.test(lower) && HAS_DATOS.test(lower) && HAS_SCOPE.test(lower)) {
    const idx = lower.search(HAS_ACTION); // primer match como ancla
    const neg = hasNegationNear(lower, Math.max(0, idx), 160);

    out.push(
      makeFinding({
        id: "proteccion-datos",
        title: "Cesión/transferencia de datos a terceros (fines comerciales)",
        severity: neg ? "medium" : "high",
        description:
          "Se detecta cesión/transferencia de datos a terceros o con fines comerciales/marketing. Verificá consentimiento, finalidad, derecho de oposición y transferencias.",
        text: raw,
        index: Math.max(0, idx),
        window: 300,
        meta: {
          type: "legal",
          confidence: neg ? 0.85 : 0.96,
          country: "AR",
          regime: ctxLegal.regime,
          legalBasis: [
            { law: "Ley 25.326 (AR)", note: "Consentimiento, finalidad, derechos ARCO, transferencias.", jurisdiction: "AR" },
            { law: "Decreto 1558/2001 (AR)", note: "Reglamentación.", jurisdiction: "AR" },
          ],
          bullets: [
            "¿Quiénes son los terceros y con qué finalidad usan tus datos?",
            "Si hay fines comerciales/marketing, debe haber consentimiento válido y opt-out.",
            "Pedí plazos de conservación y canal para ejercer derechos.",
          ],
          keywords: ["cesión de datos", "transferencia", "terceros", "fines comerciales", "marketing", "publicidad", "ARCO"],
        },
      })
    );
    // No return: dejamos seguir para captar posibles matches adicionales
  }

  // 1) Fast-paths por frases típicas
  const direct1 = DIRECT_ANY.exec(lower);
  if (direct1) {
    const idx = direct1.index;
    const neg = hasNegationNear(lower, idx, 160);
    out.push(
      makeFinding({
        id: "proteccion-datos",
        title: "Cesión/transferencia de datos a terceros (fines comerciales)",
        severity: neg ? "medium" : "high",
        description:
          "Se detecta cesión/transferencia de datos a terceros con fines comerciales o de marketing. Verificá consentimiento, finalidad, derecho de oposición y transferencias.",
        text: raw,
        index: idx,
        window: 300,
        meta: {
          type: "legal",
          confidence: neg ? 0.85 : 0.96,
          country: "AR",
          regime: ctxLegal.regime,
          legalBasis: [
            { law: "Ley 25.326 (AR)", note: "Consentimiento, finalidad, derechos ARCO, transferencias.", jurisdiction: "AR" },
            { law: "Decreto 1558/2001 (AR)", note: "Reglamentación.", jurisdiction: "AR" },
          ],
          bullets: [
            "¿Quiénes son los terceros y con qué finalidad usan tus datos?",
            "Si hay fines comerciales/marketing, debe haber consentimiento válido y opt-out.",
            "Pedí plazos de conservación y canal para ejercer derechos.",
          ],
          keywords: ["cesión de datos", "transferencia", "terceros", "fines comerciales", "marketing", "publicidad", "ARCO"],
        },
      })
    );
  }

  const direct2 = DIRECT_TRANSFER.exec(lower);
  if (direct2) {
    const idx = direct2.index;
    const neg = hasNegationNear(lower, idx, 160);
    out.push(
      makeFinding({
        id: "proteccion-datos",
        title: "Transferencia de datos a terceros (fines comerciales)",
        severity: neg ? "medium" : "high",
        description:
          "Se detecta transferencia de datos a terceros con fines comerciales/marketing. Revisá base legal, finalidad, oposición y transferencias.",
        text: raw,
        index: idx,
        window: 300,
        meta: {
          type: "legal",
          confidence: neg ? 0.85 : 0.95,
          country: "AR",
          regime: ctxLegal.regime,
          legalBasis: [
            { law: "Ley 25.326 (AR)", note: "Consentimiento, finalidad, derechos ARCO, transferencias.", jurisdiction: "AR" },
            { law: "Decreto 1558/2001 (AR)", note: "Reglamentación.", jurisdiction: "AR" },
          ],
          bullets: [
            "Identificá terceros y finalidad.",
            "Exigí consentimiento explícito y opt-out para marketing.",
            "Revisá plazos de conservación y canal de derechos.",
          ],
          keywords: ["transferencia de datos", "terceros", "fines comerciales", "marketing", "publicidad", "ARCO"],
        },
      })
    );
  }

  // 2) Ancla general (para wording variados)
  let m: RegExpExecArray | null;
  while ((m = DATA_ANCHOR.exec(lower))) {
    const idx = m.index;
    const around = sliceAround(lower, idx, 300);

    const thirdParties = /\b(tercer(?:o|os)|terceras?\s+(?:partes?|personas?)|proveedores?|encargados?|grupo\s+empresarial|filiales|afiliadas?)\b/.test(around);
    const commercialUse = /\b(fines?\s+comerciales?|comercial(?:es)?|marketing|publicidad|promoci[oó]n|perfilado|profiling)\b/.test(around);
    const international = /\b(transferencias?\s+internacional(?:es)?|fuera\s+del\s+pa[ií]s|extranjero|otras?\s+jurisdicci[oó]n)\b/.test(around);
    const legalBase = /\b(consentimiento|autorizo|autorizaci[oó]n|opt-?in|base\s+legal|leg[ií]timo\s+inter[eé]s)\b/.test(around);

    const limitations = /\b(finalidad|limitad[oa]s?|plazo\s+de\s+conservaci[oó]n|minimizaci[oó]n|pseudonimizaci[oó]n|anonimizaci[oó]n)\b/.test(around);
    const rights = /\b(derechos?\s+(arco|acceso|rectificaci[oó]n|supresi[oó]n|oposici[oó]n|portabilidad))\b/.test(around);
    const rightsChannel = /\b(correo\s+electr[oó]nico|domicilio|formulario|canal|portal)\b.*\b(solicitud|ejercer)\b/.test(around);

    const neg = hasNegationNear(lower, idx, 160);

    let confidence = 0.55;
    if (thirdParties) confidence += 0.25;
    if (commercialUse) confidence += 0.25;
    if (international) confidence += 0.10;
    if (legalBase) confidence += 0.05;
    if (limitations || rights || rightsChannel) confidence += 0.05;
    if (neg) confidence -= 0.25;

    if (confidence < 0.4) continue;

    const high = (thirdParties || commercialUse || international) && !(limitations || rights || rightsChannel);
    const severity: "low" | "medium" | "high" = neg ? "low" : high ? "high" : "medium";

    out.push(
      makeFinding({
        id: "proteccion-datos",
        title: high
          ? "Cesión/transferencia de datos amplia (revisar base legal y límites)"
          : "Tratamiento o cesión de datos (verificar alcance)",
        severity,
        description: high
          ? "Se detectan señales de cesión/comercialización, perfilado o transferencias internacionales sin límites/derechos claros. Verificá base legal, finalidad, derechos y plazos."
          : "El contrato menciona tratamiento/cesión de datos. Confirmá base legal, finalidad, derechos ARCO y plazos de conservación.",
        text: raw,
        index: idx,
        window: 300,
        meta: {
          type: "legal",
          confidence,
          country: "AR",
          regime: ctxLegal.regime,
          legalBasis: [
            { law: "Ley 25.326 (AR)", note: "Protección de Datos Personales.", jurisdiction: "AR" },
            { law: "Decreto 1558/2001 (AR)", note: "Reglamentación.", jurisdiction: "AR" },
          ],
          bullets: [
            "Identificá si se ceden datos a terceros y con qué finalidad.",
            "Si hay fines comerciales/marketing, exigí consentimiento válido y opt-out.",
            "Chequeá plazos de conservación y mecanismos para ejercer tus derechos.",
            "Si hay transferencias internacionales, pedí garantías adecuadas.",
          ],
          keywords: ["cesión de datos", "transferencia", "terceros", "fines comerciales", "marketing", "publicidad", "ARCO"],
        },
      })
    );
  }

  return out;
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

  const country = ctxLegal.country === "UNKNOWN" ? "AR" : ctxLegal.country;
  return [
    makeFinding({
      id: "servicios-jurisdiccion-arbitraje",
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
        country,
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
