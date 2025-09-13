import { describe, it, expect } from "vitest";
import { runRulesForType } from "../../src/rules";
import { adjustDepositEvidence } from "../../src/lib/labels";

const sample = `
CLÁUSULA OCTAVA – Cláusula penal
En caso de mora el locatario abonará el doble del canon ...

9ª – Depósito en Garantía
El locatario entrega en concepto de depósito en garantía la suma equivalente a UN (1) mes de alquiler ...
Será devuelto al finalizar ...

DÉCIMA – Garantías adicionales
Se podrán requerir otras garantías...`;

describe("depósito evidence trimming with numeric ordinal heading", () => {
  it("anchors at '9ª – Depósito' and cuts before 'DÉCIMA'", () => {
    const found = runRulesForType(sample, "alquiler");
    const dep = found.find((f) => f.id.includes("deposito") || f.id.includes("fianza"));
    expect(dep).toBeTruthy();
    const adj = adjustDepositEvidence(sample, dep!);
    const ev = String(adj.evidence || "");
    expect(ev).toMatch(/9ª\s*[–-]\s*Dep[oó]sito/i);
    expect(ev).not.toMatch(/Cláusula\s+penal/i);
    expect(ev).not.toMatch(/D[EÉ]CIMA/i);
  });
});
