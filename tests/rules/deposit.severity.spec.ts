import { describe, it, expect } from "vitest";
import { runRulesForType } from "../../src/rules";
import { mergeFindings, mapRuleIdToV2, bumpDepositSeverityWithGuarantor } from "../../src/lib/labels";

describe("depósito severity calibration", () => {
  it("1 mes → low", () => {
    const text = `CLÁUSULA NOVENA – Depósito en Garantía\nEl locatario entrega en concepto de depósito en garantía la suma equivalente a (1) mes de alquiler.`;
    const raw = runRulesForType(text, "alquiler");
    const v2 = raw.map((f) => ({ ...f, id: mapRuleIdToV2(f.id) }));
    const merged = mergeFindings(v2 as any, []);
    const dep = merged.find((f) => f.id === "alquiler-deposito");
    expect(dep).toBeTruthy();
    expect(dep!.severity).toBe("low");
  });

  it("2+ meses → high", () => {
    const text = `CLÁUSULA NOVENA – Depósito en Garantía\nEl locatario entrega un depósito equivalente a tres (3) meses de alquiler.`;
    const raw = runRulesForType(text, "alquiler");
    const v2 = raw.map((f) => ({ ...f, id: mapRuleIdToV2(f.id), meta: { ...f.meta, originalId: f.id } }));
    const merged = mergeFindings(v2 as any, []);
    const dep = merged.find((f) => f.id === "alquiler-deposito");
    expect(dep).toBeTruthy();
    expect(dep!.severity).toBe("high");
  });

  it("depósito + renuncias fuertes del garante → high", () => {
    const text = `CLÁUSULA 10 – Garante solidario\nJuan Pérez actúa como garante solidario y renuncia a los beneficios de excusión y división.\n\nCLÁUSULA 9 – Depósito en garantía\nEl depósito en garantía será equivalente a (1) mes de alquiler.`;
    const raw = runRulesForType(text, "alquiler");
    const v2 = raw.map((f) => ({ ...f, id: mapRuleIdToV2(f.id), meta: { ...f.meta, originalId: f.id } }));
  const merged = mergeFindings(v2 as any, []);
  const bumped = bumpDepositSeverityWithGuarantor(merged as any);
  const dep = bumped.find((f) => f.id === "alquiler-deposito");
    expect(dep).toBeTruthy();
    expect(dep!.severity).toBe("high");
  });
});
