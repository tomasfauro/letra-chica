import { describe, it, expect } from "vitest";
import { runRulesForType } from "../../src/rules";
import { mergeFindings, mapRuleIdToV2, bumpDepositSeverityWithGuarantor } from "../../src/lib/labels";

describe("regression: 1 mes depósito must be low", () => {
  it("exactly 1 month deposit → low severity (no bump)", () => {
    const text = `CLÁUSULA NOVENA – Depósito en Garantía\nEl locatario entrega un depósito equivalente a un (1) mes de alquiler.`;
    const raw = runRulesForType(text, "alquiler");
    const v2 = raw.map((f) => ({ ...f, id: mapRuleIdToV2(f.id), meta: { ...f.meta, originalId: f.id } }));
    const merged = mergeFindings(v2 as any, []);
    const bumped = bumpDepositSeverityWithGuarantor(merged as any);
    const dep = bumped.find((f) => f.id === "alquiler-deposito");
    expect(dep).toBeTruthy();
    expect(dep!.severity).toBe("low");
  });

  it("guarantor without explicit renuncias should NOT bump severity", () => {
    const text = `CLÁUSULA 10 – Garante solidario\nJuan Pérez actúa como garante solidario.\n\nCLÁUSULA 9 – Depósito en garantía\nEl depósito en garantía será equivalente a (1) mes de alquiler.`;
    const raw = runRulesForType(text, "alquiler");
    const v2 = raw.map((f) => ({ ...f, id: mapRuleIdToV2(f.id), meta: { ...f.meta, originalId: f.id } }));
    const merged = mergeFindings(v2 as any, []);
    const bumped = bumpDepositSeverityWithGuarantor(merged as any);
    const dep = bumped.find((f) => f.id === "alquiler-deposito");
    expect(dep).toBeTruthy();
    expect(dep!.severity).toBe("low");
  });
});
