// src/rules/ajustes.ts
import type { Rule } from "./types";
import {
  makeFinding,
  sliceAround,
  hasPriceTermsNear,
  hasNegationNear,
  score,
} from "./utils";
import { getLegalContext } from "../lib/legal";

/** Disparadores comunes en cláusulas de actualización del canon/renta */
const TRIGGER =
  /\b(ajuste|reajuste|actualizaci[oó]n|actualizar|indexaci[oó]n|readecuaci[oó]n|revisi[oó]n|incremento|incrementar|aument(?:o|ar))\b/i;

/** Detecta periodicidad y devuelve { months, index } anclando en el trigger. */
function detectPeriodicityMonths(lower: string): { months: number; index: number } | null {
  const anchor = TRIGGER.exec(lower);
  if (!anchor) return null;

  const idx = anchor.index;
  const around = sliceAround(lower, idx, 480);

  // 1) "cada 6 meses" / "cada seis (6) meses"
  let m = /cada\s+(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10), index: idx };
  m = /cada\s+[a-záéíóú]+\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10), index: idx };

  // 2) "a los 6 meses" / "a los seis (6) meses"
  m = /\ba\s+los?\s+(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10), index: idx };
  m = /\ba\s+los?\s+[a-záéíóú]+\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10), index: idx };

  // 2.b) “a partir de / transcurridos / cumplidos … X meses”
  m = /\b(a\s+partir\s+de|transcurrid(?:o|os)|cumplid(?:o|os))\s+(?:los?\s+)?(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[2], 10), index: idx };
  m = /\b(a\s+partir\s+de|transcurrid(?:o|os)|cumplid(?:o|os))\s+(?:los?\s+)?[a-záéíóú]+\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10), index: idx };

  // 2.c) “para los restantes/siguientes/próximos X meses”
  m = /\b(para\s+los\s+restantes|durante\s+los\s+siguientes|durante\s+los\s+pr[oó]ximos|por\s+los\s+pr[oó]ximos)\s+(\d{1,2})\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[2], 10), index: idx };
  m = /\b(para\s+los\s+restantes|durante\s+los\s+siguientes|durante\s+los\s+pr[óó]ximos)\s+[a-záéíóú]+\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(around);
  if (m) return { months: parseInt(m[1], 10), index: idx };

  // 3) "ajuste semestral/anual/mensual/bimestral/trimestral"
  if (/\bsemestral\b/.test(around)) return { months: 6, index: idx };
  if (/\banual\b/.test(around)) return { months: 12, index: idx };
  if (/\bmensual\b/.test(around)) return { months: 1, index: idx };
  if (/\btrimestral\b/.test(around)) return { months: 3, index: idx };
  if (/\bbimestral\b/.test(around)) return { months: 2, index: idx };

  // 3.b) “primer/segundo semestre”, “1er/2do semestre”, “1º/2º semestre”
  if (/\b(primer|segundo|1(?:er)?|2(?:do)?)\s+semestre\b/.test(around)) return { months: 6, index: idx };

  // 4) "cada semestre" → 6
  if (/\bcada\s+semestre\b/.test(around)) return { months: 6, index: idx };

  return null;
}

/** Fallback: detecta periodicidad sin depender del trigger (por si la mención está antes) */
function detectPeriodicityFallback(lower: string): { months: number; index: number } | null {
  let m: RegExpExecArray | null;

  m = /\bpara\s+los\s+restantes\s+(\d{1,2})\s*mes(?:es)?\b/.exec(lower);
  if (m) return { months: parseInt(m[1], 10), index: m.index };

  m = /\bpara\s+los\s+restantes\s+[a-záéíóú]+\s*\((\d{1,2})\)\s*mes(?:es)?\b/.exec(lower);
  if (m) return { months: parseInt(m[1], 10), index: m.index };

  m = /\bdurante\s+los\s+siguientes\s+(\d{1,2})\s*mes(?:es)?\b/.exec(lower);
  if (m) return { months: parseInt(m[1], 10), index: m.index };

  m = /\b(durante|por)\s+los\s+pr[oó]ximos\s+(\d{1,2})\s*mes(?:es)?\b/.exec(lower);
  if (m) return { months: parseInt(m[2], 10), index: m.index };

  m = /\ba\s+los?\s+(\d{1,2})\s*mes(?:es)?\b/.exec(lower);
  if (m) return { months: parseInt(m[1], 10), index: m.index };

  m = /\bcada\s+(\d{1,2})\s*mes(?:es)?\b/.exec(lower);
  if (m) return { months: parseInt(m[1], 10), index: m.index };

  if (/\bsemestral\b/.test(lower)) return { months: 6, index: lower.indexOf("semestral") };
  if (/\banual\b/.test(lower)) return { months: 12, index: lower.indexOf("anual") };

  const semIdx = lower.search(/\b(primer|segundo|1(?:er)?|2(?:do)?|1º|2º)\s+semestre\b/);
  if (semIdx !== -1) return { months: 6, index: semIdx };

  return null;
}

/** Porcentaje explícito/placeholder tipo "....%" o "…%" cerca del trigger */
function hasExplicitPercentNear(lower: string, index: number): boolean {
  const around = sliceAround(lower, index, 420);
  return (
    /\b\d{1,2}\s*%\b/.test(around) ||
    /\bpor\s+ciento\b/.test(around) ||
    /\bporc\.\b/.test(around) ||
    /[%]/.test(around) ||
    /[_\.·•]{2,}\s*%/.test(around)
  );
}

export const ruleAjustePeriodicidad: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);

  // Solo Argentina
  if ((ctx as any).country && (ctx as any).country !== "AR") return [];

  // Régimen liberalizado (DNU) → no marcar
  if (ctx.regime === "DNU_70_2023") return [];

  // Primero intentamos con trigger; si no, fallback global
  let periodicidad = detectPeriodicityMonths(lower);
  if (!periodicidad) periodicidad = detectPeriodicityFallback(lower);
  if (!periodicidad) return [];

  // Señales de contexto
  const talksLease = hasPriceTermsNear(lower, periodicidad.index, 300);
  const neg = hasNegationNear(lower, periodicidad.index, 180);
  const hasPct = hasExplicitPercentNear(lower, periodicidad.index);

  // Incumplimiento según régimen
  const incumpleLey27551 = ctx.regime === "LEY_27551" && periodicidad.months < 12;
  const incumpleLey27737 = ctx.regime === "LEY_27737" && periodicidad.months !== 6;
  if (!(incumpleLey27551 || incumpleLey27737)) return [];

  // Confianza conservadora (evitar falsos positivos)
  const confidence = score([talksLease, true, hasPct, !neg], [1.3, 1.0, 1.0, 0.8]);
  if (confidence < 0.6) return [];

  // Severidad
  const corta = periodicidad.months < (ctx.regime === "LEY_27737" ? 6 : 12);
  const severity: "low" | "medium" | "high" = (corta || hasPct) ? "high" : "medium";

  const cita =
    ctx.regime === "LEY_27551"
      ? "Ley 27.551 – ajuste anual (ICL)."
      : "Ley 27.737 – ajuste semestral (Coeficiente Casa Propia).";

  return [
    makeFinding({
      id: "alquiler-ajuste-periodicidad", // ⬅️ alinea con el registro/whitelist
      title: "Periodicidad de ajuste no permitida",
      severity,
      description:
        ctx.regime === "LEY_27551"
          ? "Se detecta un ajuste con periodicidad inferior a 12 meses. Bajo la Ley 27.551, el canon solo puede ajustarse una vez por año (ICL)."
          : "Se detecta una periodicidad distinta a 6 meses. Bajo la Ley 27.737, el ajuste es semestral (Coeficiente Casa Propia).",
      text: raw,
      index: periodicidad.index,
      window: 320,
      meta: {
        type: "legal",
        confidence,
        country: (ctx as any).country ?? "AR",
        regime: ctx.regime,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        legalBasis: [
          ctx.regime === "LEY_27551"
            ? { law: "Ley 27.551 (AR)", note: "Ajuste anual (ICL).", jurisdiction: "AR" }
            : { law: "Ley 27.737 (AR)", note: "Ajuste semestral (Coeficiente Casa Propia).", jurisdiction: "AR" },
        ],
        bullets: [
          ctx.regime === "LEY_27551" ? "La periodicidad debe ser anual." : "La periodicidad debe ser semestral.",
          "Si hay porcentaje explícito o placeholder de %, revisá validez y tope.",
          "Indicá índice/fórmula y su fuente (BCRA/INDEC, etc.).",
        ],
        keywords: [
          "ajuste","reajuste","actualización","indexación","readecuación","revisión","incremento",
          "periodicidad","mensual","bimestral","trimestral","semestral","anual",
          "porcentaje","canon","renta",
          "restantes","siguientes","próximos","primer semestre","segundo semestre","1er semestre","2do semestre"
        ],
        cite: cita,
      },
    }),
  ];
};
