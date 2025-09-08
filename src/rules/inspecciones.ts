// src/rules/inspecciones.ts
import type { Rule } from "./types.ts";
import {
  makeFinding,
  sliceAround,
  hasNegationNear,
  score,
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/** Ingresos / inspecciones intrusivas (libre, sin aviso, permanentes). */
export const ruleInspeccionesIntrusivas: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);

  // Si querés acotarlo a AR, descomentá:
  // if (ctx.country !== "AR") return [];

  // Disparador base
  const m = /\b(inspecci[oó]n|visita|ingreso|acceso)\b/.exec(lower);
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 320);

  // Señales de intrusión
  const anyTime =
    /\b(en\s+cualquier\s+momento|libre\s+acceso|sin\s+preaviso|sin\s+aviso|permanente)\b/.test(
      around
    );
  const shortNotice = /\b(24|48)\s*h(?:oras)?\b/.test(around);
  const accompanied = /\b(acompa[ñn]ad[oa]\s+por|con\s+personal|t[eé]cnico)\b/.test(around);

  // Negación cercana (baja confianza)
  const neg = hasNegationNear(lower, idx, 160);

  // Confianza: intrusión clara (anyTime) o preaviso muy corto
  const confidence = score(
    [true, (anyTime || shortNotice), !neg],
    [1.0, 1.0, 0.8]
  );
  if (confidence < 0.6) return [];

  // Severidad: HIGH si “cualquier momento / sin preaviso”; MEDIUM si solo preaviso muy corto
  const severity: "low" | "medium" | "high" = anyTime ? "high" : "medium";

  return [
    makeFinding({
      id: "inspecciones-intrusivas",
      title: anyTime
        ? "Ingresos/inspecciones sin preaviso o en cualquier momento"
        : "Ingresos/inspecciones con preaviso exiguo",
      severity,
      description:
        severity === "high"
          ? "Se prevé acceso ‘en cualquier momento’ o sin preaviso. Revisá límites, horarios y motivos."
          : "Se prevé acceso con preavisos muy cortos. Ajustá plazos razonables y condiciones.",
      text: raw,
      index: idx,
      window: 320,
      meta: {
        type: "heuristic",
        confidence,
        country: ctx.country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        bullets: [
          "Exigí preaviso en días y horarios acotados.",
          "Limitá motivos (reparaciones, venta) y personas autorizadas.",
          "Preferí visitas en presencia del inquilino o autorizado.",
        ],
        keywords: ["inspección", "visita", "ingreso", "acceso", "sin preaviso", "permanente", "24h", "48h"],
      },
    }),
  ];
};
