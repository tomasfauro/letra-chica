// src/rules/inspecciones.ts
import type { Rule } from "./types.ts";
import { makeFinding } from "./utils.ts";

/** Ingresos/inspecciones intrusivas (libre, sin aviso, permanentes). */
export const ruleInspeccionesIntrusivas: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const m = /\b(inspecci[oó]n|ingreso|acceso)\b.{0,40}\b(libre|sin aviso|permanente)\b/.exec(
    lower
  );
  if (!m) return [];

  return [
    makeFinding({
      id: "inspecciones-intrusivas",
      title: "Ingresos/inspecciones intrusivas",
      severity: "high",
      description:
        "Se autorizan ingresos o inspecciones sin condiciones claras. Revisá preavisos, horarios y motivos.",
      text: raw,
      index: m.index!,
      bullets: [
        "Exigí preaviso en días y horario acotado.",
        "Limitá motivos y personas autorizadas.",
      ],
      keywords: ["inspección", "ingreso", "acceso", "libre", "sin aviso", "permanente"],
    }),
  ];
};
