import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

// Fianza / Depósito / Garantía
export const ruleAlquilerFianza: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m = /\b(fianza|dep[oó]sito|garant[ií]a)\b/.exec(lower);
  if (!m) return [];
  return [
    makeFinding({
      id: "alquiler-fianza",
      title: "Cláusula de fianza/depósito",
      severity: "medium",
      description:
        "Se menciona fianza/depósito. Revisá monto, devolución y si piden garantías adicionales.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Verificá el monto frente al límite legal permitido.",
          "Chequeá plazos y condiciones de devolución.",
          "Revisá si piden garantías adicionales fuera de la fianza."
        ],
        keywords: ["fianza", "depósito", "garantía"]
      }
    }),
  ];
};

// Duración / Prórroga
export const ruleAlquilerDuracion: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m = /\b(duraci[oó]n|vigencia|pr[oó]rroga|reconducci[oó]n)\b/.exec(lower);
  if (!m) return [];
  return [
    makeFinding({
      id: "alquiler-duracion",
      title: "Duración y/o prórroga",
      severity: "low",
      description:
        "Revisá plazos mínimos, prórrogas tácitas y requisitos de preaviso.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Controlá que el plazo no sea menor al legal.",
          "Verificá si hay prórroga automática al vencimiento.",
          "Chequeá si exigen preaviso para terminar el contrato."
        ],
        keywords: ["duración", "vigencia", "prórroga", "reconducción"]
      }
    }),
  ];
};

// Desistimiento / Resolución / Penalidad
export const ruleAlquilerDesistimiento: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m =
    /\b(desistim|resoluci[oó]n|rescisi[oó]n|preaviso|penalizaci[oó]n|multa)\b/.exec(
      lower,
    );
  if (!m) return [];
  return [
    makeFinding({
      id: "alquiler-desistimiento",
      title: "Desistimiento / resolución / penalidad",
      severity: "medium",
      description:
        "Puede haber preavisos o penalidades. Revisá proporcionalidad e importes.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Verificá si hay obligación de preaviso y de cuántos días.",
          "Chequeá penalidades por romper antes del plazo.",
          "Compará los importes con lo permitido en la ley."
        ],
        keywords: ["desistimiento", "resolución", "penalidad", "multa", "preaviso"]
      }
    }),
  ];
};

// Gastos / Expensas / Suministros
export const ruleAlquilerGastos: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m =
    /\b(expensas?|extraordinari|suministros?|agua|luz|gas|comunidad|consorcio)\b/.exec(
      lower,
    );
  if (!m) return [];
  return [
    makeFinding({
      id: "alquiler-gastos",
      title: "Gastos, expensas y suministros",
      severity: "low",
      description:
        "Revisá qué paga cada parte y si hay 'gastos extraordinarios'.",
      text: raw,
      index: m.index,
      meta: {
        bullets: [
          "Chequeá si te cargan expensas extraordinarias (normalmente corresponden al dueño).",
          "Verificá qué servicios están incluidos (agua, luz, gas).",
          "Aclarar si comunidad o consorcio están a cargo del inquilino o propietario."
        ],
        keywords: ["expensas", "extraordinario", "suministros", "agua", "luz", "gas"]
      }
    }),
  ];
};
