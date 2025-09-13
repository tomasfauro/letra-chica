// src/rules/index.ts
import { ACTIVE_RULE_IDS } from "./policy";
import type { Finding, Rule, RuleEntry, RuleGroup } from "./types";

// Alquiler
import {
  ruleAlquilerFianza,
  ruleAlquilerDuracion,
  ruleAlquilerDesistimiento,
  ruleAlquilerGastos,
} from "./alquiler";
import { ruleAlquilerIndexacion } from "./indexacion";
import { ruleAlquilerClausulaPenal } from "./alquiler/clausula_penal";
import { ruleAlquilerGaranteSolidario } from "./alquiler/garante_solidario";
import { ruleAlquilerJurisdiccion } from "./alquiler/jurisdiccion";
import { ruleAlquilerInconsistenciaTemporaria } from "./alquiler/inconsistencia_temporaria";

// Servicios / Consumo
import {
  rulePlanPermanencia,
  ruleDatosCesion,
  ruleJurisdiccionArbitraje,
  ruleRenovacionAutomatica,
} from "./servicios";
import { ruleNotificacionesAbusivas } from "./notificaciones";

// Bancario / general financieras
import { ruleInteresesPunitorios } from "./bancario/intereses_punitorios";
import { ruleMonedaExtranjera } from "./moneda";

// “Duras” por ley (alquiler AR)
import { rulePlazoMinimo } from "./plazoMinimo";
import { ruleDepositoUnMes, ruleDepositoMultiplesMeses } from "./deposito";
import { ruleAjustePeriodicidad } from "./ajustes";

// Laboral
import { ruleLaboralPeriodoPrueba } from "./laboral/periodoPrueba";

// DEBUG
import { ruleDebugCanaryAlquiler } from "./debug/canary";

// ==============================
// REGISTRO CON GRUPOS (GATEO)
// ==============================

export const ALL_RULES: RuleEntry[] = [
  // --------- ALQUILER (AR) ---------
  { id: "alquiler-plazo-minimo", group: "alquiler", run: rulePlazoMinimo },
  { id: "alquiler-deposito-un-mes", group: "alquiler", run: ruleDepositoUnMes },
  { id: "alquiler-deposito-multiples-meses", group: "alquiler", run: ruleDepositoMultiplesMeses },
  { id: "alquiler-ajuste-periodicidad", group: "alquiler", run: ruleAjustePeriodicidad },
  { id: "alquiler-fianza", group: "alquiler", run: ruleAlquilerFianza },
  { id: "alquiler-duracion", group: "alquiler", run: ruleAlquilerDuracion },
  { id: "alquiler-desistimiento", group: "alquiler", run: ruleAlquilerDesistimiento },
  { id: "alquiler-gastos", group: "alquiler", run: ruleAlquilerGastos },
  { id: "alquiler-indexacion", group: "alquiler", run: ruleAlquilerIndexacion },
  { id: "alquiler-clausula-penal", group: "alquiler", run: ruleAlquilerClausulaPenal },
  { id: "alquiler-garante-solidario", group: "alquiler", run: ruleAlquilerGaranteSolidario },
  { id: "alquiler-jurisdiccion", group: "alquiler", run: ruleAlquilerJurisdiccion },
  { id: "alquiler-inconsistencia-temporaria", group: "alquiler", run: ruleAlquilerInconsistenciaTemporaria },
  { id: "debug-canary-alquiler", group: "alquiler", run: ruleDebugCanaryAlquiler }, // ← NUEVA

  // --------- SERVICIOS / CONSUMO ---------
  { id: "servicios-plan-permanencia", group: "servicios", run: rulePlanPermanencia },
  { id: "servicios-datos-cesion", group: "servicios", run: ruleDatosCesion },
  { id: "servicios-jurisdiccion-arbitraje", group: "servicios", run: ruleJurisdiccionArbitraje },
  { id: "servicios-renovacion-automatica", group: "servicios", run: ruleRenovacionAutomatica },
  { id: "servicios-notificaciones", group: "servicios", run: ruleNotificacionesAbusivas },

  // --------- BANCARIO / FINANCIERO (general) ---------
  { id: "bancario-intereses-punitorios", group: "bancario", run: ruleInteresesPunitorios },
  { id: "bancario-moneda-extranjera", group: "bancario", run: ruleMonedaExtranjera },

  // --------- LABORAL ---------
  { id: "laboral-periodo-prueba", group: "laboral", run: ruleLaboralPeriodoPrueba },
];

// ==============================
// CONFIG Y HELPERS DE RANKEO
// ==============================

export const CONFIDENCE_THRESHOLD = 0.6;

const sevWeight: Record<Finding["severity"], number> = { low: 1, medium: 2, high: 3 };
const typeWeight = (t?: unknown) => (t === "legal" ? 1 : 0);

function getConfidence(f: Finding): number {
  const top = (f as any)?.confidence;
  const meta = (f as any)?.meta?.confidence;
  if (typeof top === "number") return top;
  if (typeof meta === "number") return meta;
  return CONFIDENCE_THRESHOLD;
}

// ==============================
// SELECTORES Y EJECUCIÓN
// ==============================

const normalizeType = (t: string): RuleGroup | "otro" => {
  const v = (t ?? "").toLowerCase().trim();
  return (["alquiler", "servicios", "laboral", "bancario", "global"] as const).includes(v as any)
    ? (v as RuleGroup)
    : "otro";
};

export function selectRulesForType(type: RuleGroup | "otro"): RuleEntry[] {
  const pool =
    type === "otro"
      ? ALL_RULES.filter((r) => r.group === "global")
      : ALL_RULES.filter((r) => r.group === type || r.group === "global");

  const allow: Set<string> = new Set<string>(
    ACTIVE_RULE_IDS[type as keyof typeof ACTIVE_RULE_IDS] ?? []
  );

  if (allow.size === 0) {
    console.warn(`[rules] whitelist vacía para grupo "${type}". Ejecutando pool completo (${pool.length}).`);
    return pool;
  }

  return pool.filter((r) => r.group === "global" || allow.has(r.id));
}

export function runRulesWith(entries: RuleEntry[], text: string, threshold = CONFIDENCE_THRESHOLD): Finding[] {
  console.info("[rules] selected:", entries.map((e) => e.id));

  const found: Finding[] = [];
  for (const e of entries) {
    try {
      const res = e.run(text);
      if (Array.isArray(res) && res.length) {
        for (const f of res) {
          found.push({
            ...f,
            meta: { ...(f.meta ?? {}), ruleId: e.id, ruleGroup: e.group },
          });
        }
      }
    } catch (err) {
      console.warn(`[rules] error en regla "${e.id}"`, err);
    }
  }

  const filtered = found.filter((f) => getConfidence(f) >= threshold);

  filtered.sort((a, b) => {
    const bySev = sevWeight[b.severity] - sevWeight[a.severity];
    if (bySev !== 0) return bySev;
    const byConf = getConfidence(b) - getConfidence(a);
    if (byConf !== 0) return byConf;
    return typeWeight((b as any)?.meta?.type) - typeWeight((a as any)?.meta?.type);
  });

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

export function runRules(text: string, threshold = CONFIDENCE_THRESHOLD): Finding[] {
  return runRulesWith(ALL_RULES, text, threshold);
}

export function runRulesForType(
  text: string,
  type: RuleGroup | "otro",
  threshold = CONFIDENCE_THRESHOLD
): Finding[] {
  const normalized = normalizeType(String(type));
  const selected = selectRulesForType(normalized);
  return runRulesWith(selected, text, threshold);
}

/** Helper de diagnóstico para UI */
export function selectedRuleIdsForType(type: string): string[] {
  const normalized = normalizeType(type);
  return selectRulesForType(normalized).map(r => r.id);
}

export type { Finding, Rule };
