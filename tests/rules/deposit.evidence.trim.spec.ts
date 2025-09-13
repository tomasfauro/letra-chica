import { describe, it, expect } from "vitest";
import { runRulesForType } from "../../src/rules";
import { adjustDepositEvidence } from "../../src/lib/labels";

const sample = `
CLÁUSULA OCTAVA – Cláusula penal
En caso de mora el locatario abonará el doble del canon ...

CLÁUSULA NOVENA – Depósito en Garantía
El locatario entrega en concepto de depósito en garantía la suma equivalente a UN (1) mes de alquiler ...
Será devuelto al finalizar ...
`;

describe("depósito evidence trimming", () => {
  it("does not include text from OCTAVA when anchoring NOVENA", () => {
    const found = runRulesForType(sample, "alquiler");
    const dep = found.find((f) => f.id.includes("deposito") || f.id.includes("fianza"));
    expect(dep).toBeTruthy();
    const adj = adjustDepositEvidence(sample, dep!);
    expect(adj.evidence || "").not.toMatch(/Cláusula penal/i);
    expect(adj.evidence || "").toMatch(/Dep[oó]sito en Garant[ií]a/i);
  });
});
