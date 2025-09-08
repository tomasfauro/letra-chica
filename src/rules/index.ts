// src/rules/index.ts
import type { Finding, Rule } from "./types.ts";

import {
  ruleAlquilerFianza,
  ruleAlquilerDuracion,
  ruleAlquilerDesistimiento,
  ruleAlquilerGastos,
} from "./alquiler.ts";

import {
  rulePlanPermanencia,
  ruleDatosCesion,
  ruleJurisdiccionArbitraje,
  ruleRenovacionAutomatica,
} from "./servicios.ts";

// NUEVAS (duras, objetivas)
import { rulePlazoMinimo } from "./plazoMinimo.ts";
import { ruleDepositoUnMes } from "./deposito.ts";
import { ruleAjustePeriodicidad } from "./ajustes.ts";

// NUEVAS (tu set actual)
import { ruleAlquilerIndexacion } from "./indexacion.ts";
import { ruleInteresesPunitorios } from "./intereses.ts";
import { ruleMonedaExtranjera } from "./moneda.ts";
import { ruleRenunciaDerechos } from "./renuncia.ts";
import { ruleNotificacionesAbusivas } from "./notificaciones.ts";
import { ruleInspeccionesIntrusivas } from "./inspecciones.ts";

const rules: Rule[] = [
  // 1) Reglas duras por ley (aplican severidad y cita objetiva)
  rulePlazoMinimo,
  ruleDepositoUnMes,
  ruleAjustePeriodicidad,

  // 2) Reglas de alquiler existentes / heurísticas
  ruleAlquilerFianza,
  ruleAlquilerDuracion,
  ruleAlquilerDesistimiento,
  ruleAlquilerGastos,
  ruleAlquilerIndexacion,
  ruleInteresesPunitorios,
  ruleMonedaExtranjera,
  ruleRenunciaDerechos,
  ruleInspeccionesIntrusivas,

  // 3) Servicios / consumo
  rulePlanPermanencia,
  ruleDatosCesion,
  ruleJurisdiccionArbitraje,
  ruleRenovacionAutomatica,
  ruleNotificacionesAbusivas,
];

// ————————————————————————————————
// Filtro + orden: menos falsos positivos y mejor UX
// ————————————————————————————————
export const CONFIDENCE_THRESHOLD = 0.6; // ajustá 0.5–0.7 según tu tolerancia

const sevWeight: Record<Finding["severity"], number> = { low: 1, medium: 2, high: 3 };
const typeWeight = (t?: unknown) => (t === "legal" ? 1 : 0);

export function runRules(raw: string): Finding[] {
  const text = raw ?? "";

  const found = rules.flatMap((r) => {
    try {
      return r(text) || [];
    } catch {
      // Aislamos errores de una regla para no romper el resto
      return [];
    }
  });

  // 1) Filtro por confianza (si la regla define meta.confidence)
  const filtered = found.filter((f) => {
    const c = (f.meta as any)?.confidence as number | undefined;
    return c == null ? true : c >= CONFIDENCE_THRESHOLD;
  });

  // 2) Orden: severidad (Alto→Bajo) y, a igual severidad, primero “legal”
  filtered.sort((a, b) => {
    const bySev = sevWeight[b.severity] - sevWeight[a.severity];
    if (bySev !== 0) return bySev;
    return typeWeight((b.meta as any)?.type) - typeWeight((a.meta as any)?.type);
  });

  return filtered;
}

export type { Finding };
