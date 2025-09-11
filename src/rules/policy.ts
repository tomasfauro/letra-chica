// src/rules/policy.ts
export const ACTIVE_RULE_IDS: Record<
  "alquiler" | "servicios" | "laboral" | "bancario" | "global",
  string[]
> = {
  alquiler: [
    "alquiler-plazo-minimo",
    "alquiler-deposito-un-mes",
    "alquiler-ajuste-periodicidad",
    "alquiler-indexacion",
    "alquiler-duracion",
    "alquiler-desistimiento",
    "alquiler-gastos",
    "debug-canary-alquiler", // ← NUEVO
  ],
  servicios: [
    "servicios-plan-permanencia",
    "servicios-datos-cesion",
    "servicios-jurisdiccion-arbitraje",
    "servicios-renovacion-automatica",
    "servicios-notificaciones",
  ],
  laboral: ["laboral-periodo-prueba"],
  bancario: ["bancario-intereses-punitorios", "bancario-moneda-extranjera"],
  global: [],
};
