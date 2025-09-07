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

const rules: Rule[] = [
  ruleAlquilerFianza,
  ruleAlquilerDuracion,
  ruleAlquilerDesistimiento,
  ruleAlquilerGastos,
  rulePlanPermanencia,
  ruleDatosCesion,
  ruleJurisdiccionArbitraje,
  ruleRenovacionAutomatica,
];

export function runRules(raw: string): Finding[] {
  const text = raw ?? "";
  return rules.flatMap((r) => r(text));
}

export type { Finding };
