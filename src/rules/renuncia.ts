// src/rules/renuncia.ts
import type { Rule } from "./types.ts";
import {
  makeFinding,
  sliceAround,
  hasNegationNear,
  score,
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/** ---------------------------
 *  Patrones y utilidades
 *  ---------------------------
 */

/** Disparadores amplios de renuncia/exoneración (evita términos genéricos sueltos). */
const TRIGGER =
  /\b(renuncia(?:r)?\s+a|exime(?:r)?\s+de\s+responsabilidad|exoneraci[oó]n\s+de\s+responsabilidad|indemnidad\s+amplia)\b/;

/** Contexto típico de garante/fiador */
const GUARANTOR_CTX_RE =
  /\b(garante|fiador|fianza|deudor\s+solidari[oa]|principal\s+pagador)\b/;

/** Renuncias típicas aceptadas en fianzas (no abusivas) */
const TYPICAL_GUARANTOR_WAIVERS_RE =
  /\b(excusi[oó]n|divisi[oó]n|orden|prelaci[oó]n)\b/;

/** Renuncias potencialmente abusivas del locatario (irrenunciables) */
const ABUSIVE_WAIVER_RE =
  /\b(renuncia(?:r)?\s+a\s+(?:iniciar|interponer|promover)\s+(?:acciones?|reclamos?)|renuncia(?:r)?\s+al?\s+derecho\s+de\s+defensa|renuncia(?:r)?\s+a\s+recurso(?:s)?|apelaci[oó]n|renuncia(?:r)?\s+a\s+cualquier\s+(?:reclamo|derecho|acci[oó]n)|indemnidad\s+amplia|exoneraci[oó]n\s+total\s+de\s+responsabilidad)\b/;

/** Busca el índice global de un patrón “cerca” de baseIndex para centrar mejor la evidencia. */
function findLocalIndex(
  re: RegExp,
  lower: string,
  baseIndex: number,
  win = 260
): number | null {
  const around = sliceAround(lower, baseIndex, win);
  const m = re.exec(around);
  if (!m) return null;
  const globalStart = Math.max(0, baseIndex - win);
  return globalStart + m.index!;
}

/** ---------------------------
 *  Regla
 *  ---------------------------
 */
export const ruleRenunciaDerechos: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctx = getLegalContext(raw);

  // Solo Argentina por ahora si viene seteado el país (si está vacío, no bloqueamos).
  if (ctx.country && ctx.country !== "AR") return [];

  // Disparador
  const m = TRIGGER.exec(lower);
  if (!m) return [];

  const baseIdx = m.index!;
  const neg = hasNegationNear(lower, baseIdx, 150); // "no se renuncia...", "sin renunciar..."

  // Señales de clasificación
  const guarantorCtx = GUARANTOR_CTX_RE.test(sliceAround(lower, baseIdx, 220));
  const typicalGuarantor = TYPICAL_GUARANTOR_WAIVERS_RE.test(
    sliceAround(lower, baseIdx, 260)
  );
  const abusive = ABUSIVE_WAIVER_RE.test(sliceAround(lower, baseIdx, 260));

  // Elegimos el mejor índice para evidenciar (si hay frase “abusiva”, centramos ahí)
  const abusiveIdx = findLocalIndex(ABUSIVE_WAIVER_RE, lower, baseIdx, 300);
  const typicalIdx = findLocalIndex(
    TYPICAL_GUARANTOR_WAIVERS_RE,
    lower,
    baseIdx,
    300
  );
  const evidenceIndex =
    (abusive && abusiveIdx !== null && abusiveIdx >= 0
      ? abusiveIdx
      : typicalGuarantor && typicalIdx !== null && typicalIdx >= 0
      ? typicalIdx
      : baseIdx);

  // Confianza: ponderamos más cuando detectamos “abusiva” o contexto de garantía claro; negación baja
  const confidence = score(
    [
      true, // trigger activo
      abusive ? 1 : 0, // señal fuerte
      guarantorCtx ? 1 : 0,
      !neg, // penaliza si hay negación cerca
    ],
    [1.0, 1.2, 1.0, 0.8]
  );

  // Severidad
  // - Abusiva => HIGH
  // - Típica de garante (excusión/división/orden) => LOW (informativa)
  // - Resto => MEDIUM
  let severity: "low" | "medium" | "high" = "medium";
  if (abusive) severity = "high";
  else if (guarantorCtx && typicalGuarantor) severity = "low";

  // Si la confianza es baja y no es “abusiva”, evitamos ruido
  if (confidence < 0.6 && !abusive) return [];

  const subtype = abusive
    ? "abusive"
    : guarantorCtx && typicalGuarantor
    ? "guarantor-typical"
    : "generic";

  return [
    makeFinding({
      id: "renuncia-derechos",
      title:
        subtype === "abusive"
          ? "Renuncia/limitación amplia de derechos (potencialmente abusiva)"
          : subtype === "guarantor-typical"
          ? "Renuncia de garante a beneficios (excusión/división/orden)"
          : "Renuncia/limitación de derechos (revisar alcance)",
      severity,
      description:
        subtype === "abusive"
          ? "Se observan renuncias que podrían afectar derechos irrenunciables (defensa, acciones, recursos o notificaciones). Revisá su compatibilidad con el marco legal."
          : subtype === "guarantor-typical"
          ? "Renuncia típica del garante (excusión/división/orden). Es práctica habitual en garantías personales; revisá su alcance y si corresponde a la fianza pactada."
          : "Se detecta una cláusula de renuncia/exoneración. Verificá alcance, excepciones y que no limite derechos irrenunciables.",
      text: raw,
      index: evidenceIndex,
      window: 320,
      meta: {
        type: "legal",
        confidence,
        country: ctx.country,
        regime: ctx.regime,
        contractType: ctx.contractType,
        contractDate: ctx.contractDate?.toISOString() ?? null,
        subtype,
        legalBasis: [
          {
            law: "CCyC (AR) – garantías personales",
            note:
              "Las renuncias del fiador a excusión/división/orden son frecuentes; evaluar alcance y contexto.",
            jurisdiction: "AR",
          },
          {
            law: "Protección de consumidores/usuarios",
            note:
              "Cláusulas que impiden acciones, defensa o recursos pueden ser abusivas o inválidas.",
            jurisdiction: "AR",
          },
        ],
        bullets:
          subtype === "abusive"
            ? [
                "Si limita iniciar acciones, defensa, notificación o recursos, tratá como potencialmente abusiva.",
                "Revisá si hay reciprocidad o cláusula espejo para el locador.",
                "Consultá validez frente a normativa de consumo aplicable.",
              ]
            : subtype === "guarantor-typical"
            ? [
                "Renuncia típica: excusión/división/orden; confirmar que aplica solo al garante.",
                "Verificá coherencia con 'deudor solidario' / 'principal pagador'.",
                "Aclarar alcance temporal y por obligaciones garantizadas.",
              ]
            : [
                "Identificá si la renuncia restringe reclamos o garantías básicas.",
                "Buscá cláusulas espejo de responsabilidad de la otra parte.",
                "Revisá compatibilidad con derechos irrenunciables.",
              ],
        keywords: [
          "renuncia",
          "responsabilidad",
          "exoneración",
          "indemnidad",
          "garante",
          "fiador",
          "excusión",
          "división",
          "orden",
          "defensa",
          "reclamos",
          "recursos",
        ],
      },
    }),
  ];
};
