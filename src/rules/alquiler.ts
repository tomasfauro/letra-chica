// src/rules/alquiler.ts
import type { Rule } from "./types.ts";
import {
  makeFinding,
  sliceAround,
  hasPriceTermsNear,
  hasNegationNear,
  score,
} from "./utils.ts";
import { getLegalContext } from "../lib/legal";

/** Helper genérico de contexto de contrato/locación cerca de un índice */
function hasLeaseContextNear(lower: string, index: number, win = 220): boolean {
  // Reutilizamos "términos de precio" + otras señales de contrato
  const ctx = sliceAround(lower, index, win);
  return (
    hasPriceTermsNear(lower, index, win) ||
    /\b(contrato|locaci[oó]n|arrendamiento|inquilin[oa]|locador(?:a)?|locatari[oa])\b/.test(
      ctx
    )
  );
}

/* ============================
 * Fianza / Depósito / Garantía
 * ============================ */
export const ruleAlquilerFianza: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  // Solo tiene sentido en AR; para ES ya tratás depósitos aparte si añadís set ES
  if (ctxLegal.country !== "AR") return [];

  const m = /\b(fianza|dep[oó]sito|garant[ií]a)\b/.exec(lower);
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 240);

  // Evitar falsos positivos típicos (depósito bancario, etc.)
  const banky = /\bbancari[oa]|cuenta\s+bancaria|plazo\s+fijo|caja\s+de\s+ahorro\b/.test(
    around
  );
  if (banky) return [];

  // Señales
  const lease = hasLeaseContextNear(lower, idx, 200);
  const neg = hasNegationNear(lower, idx, 150); // "no se exigirá depósito", "sin fianza"
  const mentionsAmount =
    /\b(\d{1,2})\s*mes(?:es)?\b/.test(around) ||
    /\b([a-záéíóú]+)\s*\(\d{1,2}\)\s*mes(?:es)?\b/.test(around) ||
    /\bequivalente\s+al\s+primer\s+mes\b/.test(around);

  const confidence = score([lease, mentionsAmount, !neg], [1.2, 1.0, 0.8]);
  if (confidence < 0.6) return [];

  // Ojo: la regla “dura” de tope (deposito.ts) ya marcará HIGH si > 1 mes.
  // Aquí mantenemos informativa/medium.
  const severity: "low" | "medium" = mentionsAmount ? "medium" : "low";

  return [
    makeFinding({
      id: "alquiler-fianza",
      title: "Cláusula de fianza/depósito",
      severity,
      description:
        "Se menciona fianza/depósito. Verificá que el total de garantías no supere un (1) mes y cómo se devuelve.",
      text: raw,
      index: idx,
      window: 260,
      meta: {
        type: "legal",
        confidence,
        country: ctxLegal.country,
        regime: ctxLegal.regime,
        bullets: [
          "Verificá el monto frente al límite legal permitido.",
          "Chequeá plazos y condiciones de devolución.",
          "Revisá si piden garantías adicionales fuera de la fianza.",
        ],
        keywords: ["fianza", "depósito", "garantía", "mes", "devolución"],
      },
    }),
  ];
};

/* =====================
 * Duración / Prórroga
 * ===================== */
export const ruleAlquilerDuracion: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  // Aplica principalmente en AR
  if (ctxLegal.country !== "AR") return [];

  const m = /\b(duraci[oó]n|vigencia|pr[oó]rroga|reconducci[oó]n)\b/.exec(lower);
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 260);

  const hasNumber =
    /\b(\d{1,3})\s*(mes(?:es)?|a[nñ]o(?:s)?)\b/.test(around) ||
    /\b([a-záéíóú]+)\s*\((\d{1,3})\)\s*(mes(?:es)?|a[nñ]o(?:s)?)\b/.test(around);
  const lease = hasLeaseContextNear(lower, idx, 220);
  const neg = hasNegationNear(lower, idx, 140);

  const confidence = score([lease, hasNumber, !neg], [1.2, 1.0, 0.8]);
  if (confidence < 0.6) return [];

  // La regla “dura” de Plazo Mínimo marcará HIGH si <36 meses y corresponde.
  // Aquí dejamos una guía informativa:
  return [
    makeFinding({
      id: "alquiler-duracion",
      title: "Duración y/o prórroga",
      severity: "low",
      description:
        "Revisá que el plazo cumpla mínimos legales y cómo operan prórrogas (tácita/expresa) y preavisos.",
      text: raw,
      index: idx,
      window: 260,
      meta: {
        type: "legal",
        confidence,
        country: ctxLegal.country,
        regime: ctxLegal.regime,
        bullets: [
          "Controlá que el plazo no sea menor al legal (si aplica).",
          "Verificá si hay prórroga automática al vencimiento.",
          "Chequeá si exigen preaviso para terminar el contrato.",
        ],
        keywords: ["duración", "vigencia", "prórroga", "reconducción", "preaviso"],
      },
    }),
  ];
};

/* =========================================
 * Desistimiento / Resolución / Penalidad
 * ========================================= */
export const ruleAlquilerDesistimiento: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  if (ctxLegal.country !== "AR") return [];

  const m =
    /\b(desistim|resoluci[oó]n|rescisi[oó]n|preaviso|penalizaci[oó]n|multa|indemnizaci[oó]n)\b/.exec(
      lower
    );
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 280);

  // Evitar FP con “multa” fuera de contexto contractual
  const lease = hasLeaseContextNear(lower, idx, 220);
  const neg = hasNegationNear(lower, idx, 150); // “sin penalidad”, “no habrá multa”
  const mentionsTerms =
    /\b(terminaci[oó]n|finalizaci[oó]n|baja|preaviso\s+de\s+\d+|d[ií]as)\b/.test(around);
  const mentionsAmounts =
    /\b(\$\s?\d+|\d+\s*%|porcentaje|mes(?:es)?\s+de\s+alquiler)\b/.test(around);

  const confidence = score([lease, mentionsTerms || mentionsAmounts, !neg], [1.2, 1.0, 0.8]);
  if (confidence < 0.6) return [];

  return [
    makeFinding({
      id: "alquiler-desistimiento",
      title: "Desistimiento / resolución / penalidad",
      severity: "medium",
      description:
        "Puede haber preavisos o penalidades por terminar antes. Revisá proporcionalidad, importes y si están permitidos.",
      text: raw,
      index: idx,
      window: 280,
      meta: {
        type: "legal",
        confidence,
        country: ctxLegal.country,
        regime: ctxLegal.regime,
        bullets: [
          "Verificá si hay obligación de preaviso y de cuántos días.",
          "Chequeá penalidades por romper antes del plazo.",
          "Compará los importes con lo permitido en la ley.",
        ],
        keywords: ["desistimiento", "resolución", "penalidad", "multa", "preaviso"],
      },
    }),
  ];
};

/* ==============================
 * Gastos / Expensas / Suministros
 * ============================== */
export const ruleAlquilerGastos: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  if (ctxLegal.country !== "AR") return [];

  const m =
    /\b(expensas?|extraordinari|suministros?|agua|luz|gas|comunidad|consorcio|impuesto(?:s)?|abl|municipal(?:es)?)\b/.exec(
      lower
    );
  if (!m) return [];

  const idx = m.index!;
  const around = sliceAround(lower, idx, 300);

  const lease = hasLeaseContextNear(lower, idx, 220);
  const neg = hasNegationNear(lower, idx, 150);

  // Detección de asignación de gastos a cada parte
  const toTenant =
    /\b(a\s*cargo\s+del?\s+inquilin[oa]|pagar[áa]\s+el?\s+locatari[oa]|ser[áa]\s+responsable\s+el?\s+locatari[oa])\b/.test(
      around
    );
  const toLandlord =
    /\b(a\s*cargo\s+del?\s+propietari[oa]|pagar[áa]\s+el?\s+locador(?:a)?|ser[áa]\s+responsable\s+el?\s+locador(?:a)?)\b/.test(
      around
    );

  // Señales de “expensas extraordinarias”/impuestos (sensibles si se cargan al inquilino)
  const extraordinary = /\b(extraordinari[ao]s?)\b/.test(around);
  const ownerTaxes = /\b(abl|impuesto(?:s)?\s+(?:municipales?|inmobiliarios?))\b/.test(around);

  const confidence = score(
    [lease, (toTenant || toLandlord), !neg],
    [1.2, 1.0, 0.8]
  );
  if (confidence < 0.6) return [];

  // Severidad:
  // - MEDIUM si detectamos que al inquilino le cargan extraordinarias o impuestos típicamente del propietario.
  // - LOW en el resto (informativo).
  let severity: "low" | "medium" = "low";
  if (toTenant && (extraordinary || ownerTaxes)) severity = "medium";

  return [
    makeFinding({
      id: "alquiler-gastos",
      title: "Gastos, expensas y suministros",
      severity,
      description:
        severity === "medium"
          ? "Se asignan al inquilino gastos que suelen corresponder al propietario (expensas extraordinarias o impuestos). Revisá si la distribución es válida."
          : "Revisá qué paga cada parte (expensas, servicios, comunidad/consorcio) y que quede claro en el contrato.",
      text: raw,
      index: idx,
      window: 300,
      meta: {
        type: "legal",
        confidence,
        country: ctxLegal.country,
        regime: ctxLegal.regime,
        bullets: [
          "Chequeá si te cargan expensas extraordinarias (normalmente corresponden al dueño).",
          "Verificá qué servicios están incluidos (agua, luz, gas).",
          "Aclarar si comunidad o consorcio están a cargo del inquilino o propietario.",
        ],
        keywords: [
          "expensas",
          "extraordinario",
          "suministros",
          "agua",
          "luz",
          "gas",
          "impuestos",
          "ABL",
          "comunidad",
          "consorcio",
        ],
      },
    }),
  ];
};

/* ============================================================
 * Cláusula penal desproporcionada (p.ej., “doble del alquiler”)
 * ============================================================ */
export const ruleClausulaPenalDesproporcionada: Rule = (raw) => {
  const lower = raw.toLowerCase();
  const ctxLegal = getLegalContext(raw);

  if (ctxLegal.country !== "AR") return [];

  // Disparadores de contexto: restitución/ocupación ilegítima/no devolución
  const ctx = /\b(ocupaci[oó]n\s+ileg[ií]tima|no\s+restituci[oó]n|falta\s+de\s+devoluci[oó]n|retenci[oó]n\s+del\s+inmueble|no\s+entrega)\b/.exec(lower);
  if (!ctx) return [];

  const idx = ctx.index!;
  const around = sliceAround(lower, idx, 300);

  // Penalidad “doble del alquiler” / “dos veces el canon”
  const doble =
    /\b(dos\s+veces|el\s+doble|2x)\b.*\b(alquiler|canon|renta|precio)\b/.test(around) ||
    /\b(alquiler|canon|renta|precio)\b.*\b(dos\s+veces|el\s+doble|2x)\b/.test(around);

  if (!doble) return [];

  // Agravantes: “vía ejecutiva”, “intereses punitorios/moratorios”
  const agravantes =
    /\bv[ií]a\s+ejecutiva\b/.test(around) ||
    /\b(punitori[oa]s?|moratori[oa]s?)\b/.test(around);

  const confidence = score([true, doble, !hasNegationNear(lower, idx, 150)], [1.0, 1.0, 0.8]);
  if (confidence < 0.6) return [];

  const severity: "low" | "medium" | "high" = agravantes ? "high" : "medium";

  return [
    makeFinding({
      id: "clausula-penal-desproporcionada",
      title: agravantes
        ? "Cláusula penal elevada (doble del alquiler + agravantes)"
        : "Cláusula penal elevada (doble del alquiler)",
      severity,
      description:
        "Se prevé una penalidad equivalente al doble del alquiler ante falta de restitución/ocupación ilegítima. Revisá proporcionalidad, acumulación con intereses y vías procesales.",
      text: raw,
      index: idx,
      window: 300,
      meta: {
        type: "heuristic",
        confidence,
        country: ctxLegal.country,
        regime: ctxLegal.regime,
        bullets: [
          "Evaluá si la penalidad (2×) es proporcional al daño real.",
          "Verificá si se acumula con intereses moratorios/punitorios u otros cargos.",
          "Revisá si impone ejecución “vía ejecutiva” y qué defensas admite.",
        ],
        keywords: ["cláusula penal", "ocupación ilegítima", "doble del alquiler", "2x", "vía ejecutiva"],
      },
    }),
  ];
};
