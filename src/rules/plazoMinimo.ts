// src/rules/plazoMinimo.ts
import type { Rule } from "./types";
import {
  makeFinding,
  sliceAround,
  hasPriceTermsNear,
  hasNegationNear,
  score,
} from "./utils";
import { getLegalContext } from "../lib/legal";

/** Extrae duración (en meses) y el índice del match principal. */
function extractDuration(lower: string): { months: number; index: number } | null {
  // 1) "36 meses"
  let m = /\b(\d{1,3})\s*mes(?:es)?\b/.exec(lower);
  if (m) return { months: parseInt(m[1], 10), index: m.index };

  // 2) "3 años"
  m = /\b(\d{1,2})\s*año(?:s)?\b/.exec(lower);
  if (m) return { months: parseInt(m[1], 10) * 12, index: m.index };

  // 3) "dos (2) años" / "tres (3) años"
  m = /\b([a-záéíóú]+)\s*\((\d{1,2})\)\s*año(?:s)?\b/.exec(lower);
  if (m) return { months: parseInt(m[2], 10) * 12, index: m.index };

  return null;
}

/** Disparador semántico: mención de plazo/duración/vigencia. */
function triggerPlazo(lower: string): RegExpExecArray | null {
  return /\b(plazo|duraci[oó]n|vigencia)\b/.exec(lower);
}

export const rulePlazoMinimo: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);

  // 0) Solo aplica a Argentina (evita FP en ES/otras)
  if (ctx.country !== "AR") return [];

  // 1) No aplica a locación temporaria ni comercial
  if (ctx.contractType === "temporaria" || ctx.contractType === "comercial") return [];

  // 2) Disparador (evita falsos positivos en otras secciones)
  const t = triggerPlazo(lower);
  if (!t) return [];

  // 3) Duración e índice del match numérico (para evidencias fiables)
  const dur = extractDuration(lower);
  if (!dur) return [];

  // 4) Proximidad con el disparador (plazo/duración cerca del número)
  const nearTrigger = Math.abs(dur.index - t.index) <= 300;

  // 5) Aplica incumplimiento solo en regímenes con mínimo 36 meses
  const regimeAllowsMin36 =
    ctx.regime === "LEY_27551" || ctx.regime === "LEY_27737";
  const incumple = regimeAllowsMin36 && dur.months < 36;

  if (!incumple) return [];

  // 6) Señales para confianza (proximidad semántica + negación + cercanía al trigger)
  const talksLease = hasPriceTermsNear(lower, dur.index, 200); // “alquiler/canon/precio…” cerca
  const neg = hasNegationNear(lower, dur.index, 140);          // “no/queda prohibido…” cerca
  const mentionsPlazo = !!t;

  // Ponderación: precio/alquiler pesa más; cercanía al trigger suma
  const confidence = score(
    [mentionsPlazo, talksLease, !neg, nearTrigger],
    [1.0, 1.2, 0.8, 1.0]
  );

  // 7) Evidencia centrada en el match de la duración
  const idx = dur.index;
  const window = 240; // recorte generoso de contexto

  return [
    makeFinding({
      id: "plazo-minimo",
      title: "Duración inferior al mínimo legal",
      severity: "high",
      description:
        "La duración indicada es inferior a 36 meses. Revisá la adecuación al marco legal vigente para locaciones de vivienda.",
      text: raw,
      index: idx,
      window,
      meta: {
        type: "legal",
        confidence,
        country: ctx.country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        legalBasis: [
          {
            law: "Ley 27.551 / CCyC (AR)",
            note: "Plazos y reglas aplicables a locación de inmuebles destinados a vivienda (mínimo 36 meses).",
            jurisdiction: "AR",
          },
          ...(ctx.regime === "LEY_27737"
            ? [{
                law: "Ley 27.737 (AR)",
                note: "Modificaciones transitorias: validar redacción contra régimen aplicable por fecha.",
                jurisdiction: "AR",
              }]
            : []),
        ],
        bullets: [
          "La duración mínima exigida para vivienda es de 36 meses.",
          "Confirmá que la cláusula de vigencia no contradiga el régimen aplicable.",
          "Si hay prórrogas/preavisos, que queden expresos y claros.",
        ],
        keywords: ["plazo", "duración", "vigencia", "meses", "años", "alquiler", "canon"],
      },
    }),
  ];
};
