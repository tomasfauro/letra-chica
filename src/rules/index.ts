// src/rules/index.ts
import type { Finding, Rule } from "./types";

import {
  // ruleAlquilerFianza, // ← si la mantenés exportada en alquiler.ts no pasa nada, pero no la usamos aquí
  ruleAlquilerDuracion,
  ruleAlquilerDesistimiento,
  ruleAlquilerGastos,
} from "./alquiler";

import {
  rulePlanPermanencia,
  ruleDatosCesion,
  ruleJurisdiccionArbitraje,
  ruleRenovacionAutomatica,
} from "./servicios";

// NUEVAS (duras, objetivas)
import { rulePlazoMinimo } from "./plazoMinimo";
import { ruleDepositoUnMes } from "./deposito";
import { ruleAjustePeriodicidad } from "./ajustes";

// NUEVAS (tu set actual)
import { ruleAlquilerIndexacion } from "./indexacion";
import { ruleInteresesPunitorios } from "./intereses";
import { ruleMonedaExtranjera } from "./moneda";
import { ruleRenunciaDerechos } from "./renuncia";
import { ruleNotificacionesAbusivas } from "./notificaciones";
import { ruleInspeccionesIntrusivas } from "./inspecciones";

const rules: Rule[] = [
  // 1) Reglas duras por ley
  rulePlazoMinimo,
  ruleDepositoUnMes,
  ruleAjustePeriodicidad,

  // 2) Reglas de alquiler existentes / heurísticas
  // ruleAlquilerFianza, // ← QUITADA para no duplicar con ruleDepositoUnMes
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
export const CONFIDENCE_THRESHOLD = 0.6; // ajustá 0.5–0.7 según tolerancia

const sevWeight: Record<Finding["severity"], number> = { low: 1, medium: 2, high: 3 };
const typeWeight = (t?: unknown) => (t === "legal" ? 1 : 0);

// Toma confidence de f.confidence o meta.confidence, con fallback neutro
function getConfidence(f: Finding): number {
  const top = (f as any)?.confidence;
  const meta = (f as any)?.meta?.confidence;
  if (typeof top === "number") return top;
  if (typeof meta === "number") return meta;
  return CONFIDENCE_THRESHOLD; // neutral
}

export function runRules(raw: string, threshold = CONFIDENCE_THRESHOLD): Finding[] {
  const text = raw ?? "";

  // Ejecuta todas las reglas, aislando errores individuales
  const found: Finding[] = [];
  for (const r of rules) {
    try {
      const res = r(text);
      if (Array.isArray(res) && res.length) found.push(...res);
    } catch {
      // No propagamos errores de una regla para no romper el resto
    }
  }

  // 1) Filtro por confianza
  const filtered = found.filter((f) => getConfidence(f) >= threshold);

  // 2) Orden: severidad (Alto→Bajo) > confidence (desc) > tipo legal primero
  filtered.sort((a, b) => {
    const bySev = sevWeight[b.severity] - sevWeight[a.severity];
    if (bySev !== 0) return bySev;

    const byConf = getConfidence(b) - getConfidence(a);
    if (byConf !== 0) return byConf;

    return typeWeight((b as any)?.meta?.type) - typeWeight((a as any)?.meta?.type);
  });

  // 3) De-dupe por id (si dos reglas emiten el mismo id, guarda la más severa / confiable)
  const seen = new Map<string, Finding>();
  for (const f of filtered) {
    const id = f.id;
    const prev = seen.get(id);
    const conf = getConfidence(f);
    const rank = sevWeight[f.severity];

    if (!prev) {
      seen.set(id, f);
      continue;
    }

    const prevConf = getConfidence(prev);
    const prevRank = sevWeight[prev.severity];
    const better = rank > prevRank || (rank === prevRank && conf > prevConf);
    if (better) seen.set(id, f);
  }

  return Array.from(seen.values());
}

export type { Finding, Rule };
