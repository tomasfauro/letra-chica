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
    }),
  ];
};

// (opcionales) jurisdicción / renovación automática
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
    }),
  ];
};

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
    }),
  ];
};
