import { describe, it, expect } from "vitest";
import { runRules, runRulesForType } from "../index";

function idsOf(text: string, type?: "alquiler" | "servicios" | "bancario" | "laboral") {
  const found = type ? runRulesForType(text, type) : runRules(text);
  return new Set(found.map((f) => f.id));
}

describe("regresiones: hallazgos claves vuelven a disparar", () => {
  it("depósito/fianza (1 mes) dispara y 'depósito bancario' no", () => {
    const pos = "El LOCATARIO entregará en concepto de depósito de garantía el equivalente a un (1) mes de alquiler, a restituirse al finalizar el contrato.";
    const neg = "Se efectuará un depósito bancario para abrir la cuenta sueldo del empleado.";
    const idsPos = idsOf(pos, "alquiler");
    const idsNeg = idsOf(neg, "alquiler");
    expect(idsPos.has("alquiler-deposito-un-mes") || idsPos.has("deposito-max-1")).toBe(true);
    expect(idsNeg.has("alquiler-deposito-un-mes") || idsNeg.has("deposito-max-1")).toBe(false);
  });

  it("renovación automática dispara", () => {
    const txt = "El contrato tendrá renovación automática salvo preaviso con 7 días. La falta de oposición implicará su prórroga.";
    const ids = idsOf(txt, "servicios");
    expect(ids.has("renovacion-automatica") || ids.has("servicios-renovacion-automatica")).toBe(true);
  });

  it("intereses punitorios dispara", () => {
    const casosPos = [
      "Los pagos fuera de término devengarán intereses punitorios del 3% mensual, acumulables, sin tope.",
      "Se aplicará interés punitorio del 2% por mes sobre saldos impagos.",
      "Los importes adeudados generarán intereses por mora (TNA) hasta su efectivo pago.",
      "La entidad podrá cobrar intereses moratorios (TEM) por cada período de mora.",
    ];
    for (const txt of casosPos) {
      const ids = idsOf(txt, "bancario");
      const ok = ids.has("bancario-intereses-punitorios") || ids.has("intereses-punitorios");
      if (!ok) throw new Error(`No disparó punitorios en: ${txt}. IDs: ${Array.from(ids).join(", ")}`);
      expect(ok).toBe(true);
    }

    const casosNeg = [
      "No se aplicarán intereses punitorios si el atraso no supera 48 horas.",
      "No se generarán intereses por mora sobre saldos a favor.",
    ];
    for (const txt of casosNeg) {
      const ids = idsOf(txt, "bancario");
      const bad = ids.has("bancario-intereses-punitorios") || ids.has("intereses-punitorios");
      if (bad) throw new Error(`Falso positivo de punitorios en: ${txt}. IDs: ${Array.from(ids).join(", ")}`);
      expect(bad).toBe(false);
    }
  });
});
