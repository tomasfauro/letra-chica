import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

// Permanencia / Penalidad (servicios, planes)
export const rulePlanPermanencia: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m =
    /\b(permanenc|penalizaci[oó]n|multa|resarcimiento|punitori)\b/.exec(lower);
  if (!m) return [];
  return [
    makeFinding({
      id: "permanencia",
      title: "Posible cláusula de permanencia o penalización",
      severity: "medium",
      description:
        "Se detectaron términos relacionados con permanencia o penalizaciones. Revisá importes fijos, porcentajes o plazos mínimos.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Confirmá si existe un plazo mínimo de permanencia.",
          "Chequeá penalidades por baja anticipada.",
          "Revisá condiciones para terminar sin costo (cambios de servicio, incumplimiento del proveedor)."
        ],
        keywords: ["permanencia", "penalización", "multa", "resarcimiento"]
      }
    }),
  ];
};

// Cesión de datos / consentimiento amplio
export const ruleDatosCesion: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m =
    /\b(cesi[oó]n de datos|terceros|fines comerciales|perfilado|leg[ií]timo inter[eé]s)\b/.exec(
      lower,
    );
  if (!m) return [];
  return [
    makeFinding({
      id: "proteccion-datos",
      title: "Tratamiento o cesión de datos potencialmente amplia",
      severity: "high",
      description:
        "El contrato podría habilitar cesiones o tratamientos con fines comerciales o de perfilado. Verificá base legal, finalidad, derechos y plazos.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Identificá si se ceden datos a terceros y con qué finalidad.",
          "Verificá si la base legal es consentimiento o 'interés legítimo'.",
          "Chequeá plazos de conservación y mecanismos para ejercer tus derechos."
        ],
        keywords: ["cesión de datos", "perfilado", "interés legítimo", "fines comerciales"]
      }
    }),
  ];
};

// Jurisdicción / arbitraje
export const ruleJurisdiccionArbitraje: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m = /\b(jurisdicci[oó]n|competencia|arbitraje|tribunal)\b/.exec(lower);
  if (!m) return [];
  return [
    makeFinding({
      id: "jurisdiccion-arbitraje",
      title: "Jurisdicción / arbitraje",
      severity: "low",
      description:
        "Revisá si la cláusula restringe opciones accesibles para el consumidor.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Chequeá si el contrato impone un tribunal fuera de tu localidad.",
          "Verificá si el arbitraje es obligatorio o voluntario.",
          "Revisá quién cubre los costos del arbitraje."
        ],
        keywords: ["jurisdicción", "competencia", "arbitraje", "tribunal"]
      }
    }),
  ];
};

// Renovación automática
export const ruleRenovacionAutomatica: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m =
    /\b(renovaci[oó]n autom[aá]tica|pr[oó]rroga autom[aá]tica|reconducci[oó]n)\b/.exec(
      lower,
    );
  if (!m) return [];
  return [
    makeFinding({
      id: "renovacion-automatica",
      title: "Renovación automática",
      severity: "medium",
      description:
        "Puede renovarse sin acción del usuario. Revisá preavisos y forma de baja.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Confirmá si el contrato se renueva automáticamente sin aviso.",
          "Chequeá el plazo de preaviso para solicitar la baja.",
          "Verificá si el precio puede cambiar en la renovación."
        ],
        keywords: ["renovación automática", "prórroga", "reconducción"]
      }
    }),
  ];
};
