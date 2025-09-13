import { describe, it, expect } from "vitest";
import { runRulesForType, runRules } from "../../src/rules";

function idsOf(text: string) {
  return new Set(runRules(text).map((f) => f.id));
}

describe("regresión: depósito/fianza", () => {
  it("detecta 'El inquilino deposita en garantía el equivalente a dos meses'", () => {
    const txt = "El inquilino deposita en garantía el equivalente a dos meses.";

    // Gateado por tipo 'alquiler' (preferido)
    const idsLease = new Set(runRulesForType(txt, "alquiler").map((f) => f.id));
    const okLease =
      idsLease.has("alquiler-deposito-multiples-meses") ||
      idsLease.has("deposito-max-1") ||
      idsLease.has("alquiler-deposito-un-mes");

    // Sin gateo (fallback global)
    const idsAll = idsOf(txt);
    const okAll =
      idsAll.has("alquiler-deposito-multiples-meses") ||
      idsAll.has("deposito-max-1") ||
      idsAll.has("alquiler-deposito-un-mes");

    const ok = okLease || okAll;
    if (!ok) {
      throw new Error(
        `No disparó depósito/fianza. IDs lease=[${Array.from(idsLease).join(", ")}] all=[${Array.from(idsAll).join(", ")}].`
      );
    }
    expect(ok).toBe(true);
  });

  it("no dispara con 'depósito bancario a plazo fijo' (negativo)", () => {
    const txt = "Se pacta un depósito bancario a plazo fijo para constituir garantías de otra índole.";
    const idsLease = new Set(runRulesForType(txt, "alquiler").map((f) => f.id));
    const idsAll = idsOf(txt);
    const any =
      idsLease.has("alquiler-deposito-multiples-meses") ||
      idsLease.has("alquiler-deposito-un-mes") ||
      idsAll.has("alquiler-deposito-multiples-meses") ||
      idsAll.has("alquiler-deposito-un-mes");
    expect(any).toBe(false);
  });

  it("detecta con dígito: 'equivalente a 3 meses'", () => {
    const txt = "El locatario deberá constituir un depósito en garantía equivalente a 3 meses del canon.";
    const idsLease = new Set(runRulesForType(txt, "alquiler").map((f) => f.id));
    const okLease = idsLease.has("alquiler-deposito-multiples-meses") || idsLease.has("deposito-max-1");
    const idsAll = idsOf(txt);
    const okAll = idsAll.has("alquiler-deposito-multiples-meses") || idsAll.has("deposito-max-1");
    expect(okLease || okAll).toBe(true);
  });
});
