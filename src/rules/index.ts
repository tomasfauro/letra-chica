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

// NUEVAS
import { ruleAlquilerIndexacion } from "./indexacion.ts";
import { ruleInteresesPunitorios } from "./intereses.ts";
import { ruleMonedaExtranjera } from "./moneda.ts";
import { ruleRenunciaDerechos } from "./renuncia.ts";
import { ruleNotificacionesAbusivas } from "./notificaciones.ts";
import { ruleInspeccionesIntrusivas } from "./inspecciones.ts";

const rules: Rule[] = [
  // Alquiler
  ruleAlquilerFianza,
  ruleAlquilerDuracion,
  ruleAlquilerDesistimiento,
  ruleAlquilerGastos,
  ruleAlquilerIndexacion,
  ruleInteresesPunitorios,
  ruleMonedaExtranjera,
  ruleRenunciaDerechos,
  ruleInspeccionesIntrusivas,

  // Servicios / consumo
  rulePlanPermanencia,
  ruleDatosCesion,
  ruleJurisdiccionArbitraje,
  ruleRenovacionAutomatica,
  ruleNotificacionesAbusivas,
];

export function runRules(raw: string): Finding[] {
  const text = raw ?? "";
  return rules.flatMap((r) => r(text));
}

export type { Finding };
