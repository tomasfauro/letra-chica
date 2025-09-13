// src/rules/policy.ts
export const ACTIVE_RULE_IDS: Record<
  "alquiler" | "servicios" | "laboral" | "bancario" | "global",
  string[]
> = {
  alquiler: [
    "alquiler-plazo-minimo",
    "alquiler-deposito-un-mes",
  "alquiler-deposito-multiples-meses",
    "alquiler-ajuste-periodicidad",
    "alquiler-indexacion",
  "alquiler-clausula-penal",
  "alquiler-fianza",
    "alquiler-duracion",
    "alquiler-desistimiento",
    "alquiler-gastos",
  "alquiler-garante-solidario",
  "alquiler-jurisdiccion",
  "alquiler-inconsistencia-temporaria",
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
