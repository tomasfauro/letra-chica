import { describe, it, expect } from "vitest";
import { runRulesForType } from "../../src/rules";

function ids(text: string, type: "alquiler" | "servicios") {
  return new Set(runRulesForType(text, type).map((f) => f.id));
}

// Accept both v2 labels and raw rule IDs for depósito/fianza
const DEPOSIT_IDS = [
  "alquiler-deposito",                 // v2 umbrella label
  "alquiler-deposito-un-mes",          // raw rule id
  "alquiler-deposito-multiples-meses", // raw rule id
  "alquiler-fianza",                   // heuristic deposit/fianza
  "deposito-max-1",                    // legacy/internal id
];
const hasAny = (s: Set<string>, targets: string[]) => targets.some((t) => s.has(t));

describe("alquiler: textos reales (AR)", () => {
  it("Depósito: monto y cuotas", () => {
    const txt = "El LOCATARIO entregará al LOCADOR en concepto de depósito en garantía, la cantidad de PESOS SETENTA Y CINCO MIL ($ 75.000,00) pagada en dos cuotas…";
  const s = ids(txt, "alquiler");
  const ok = hasAny(s, DEPOSIT_IDS);
    expect(ok).toBe(true);
  });

  it("Cláusula penal / ocupación ilegítima (doble del alquiler)", () => {
    const txt = "el LOCATARIO deberá abonar… en concepto de indemnización por ocupación ilegítima, una suma igual a dos veces el alquiler pactado, prorrateado en modo diario…";
    const s = ids(txt, "alquiler");
    const ok = s.has("alquiler-clausula-penal") || s.has("clausula-penal-desproporcionada");
    expect(ok).toBe(true);
  });

  it("Indexación: ‘se actualizará’ + IPC y RIPTE + BCRA / Art. 27.551", () => {
    const txt = "para los restantes seis meses, el canon mensual se actualizará conforme el Art. 14 de la Ley 27.551, tomando el 50% del resultado… IPC y RIPTE… elaborado por el BCRA.";
    const s = ids(txt, "alquiler");
    expect(s.has("alquiler-indexacion")).toBe(true);
  });

  it("Plazo un (1) año", () => {
    const txt = "con duración de un (1) año calendario; es decir, hasta el día 10 de Abril del año 2024…";
    const s = ids(txt, "alquiler");
    const ok = s.has("alquiler-duracion") || s.has("plazo-minimo");
    expect(ok).toBe(true);
  });

  it("Negativos: depósito bancario plazo fijo, no dispara", () => {
    const txt = "Se constituye un depósito bancario a plazo fijo en garantía de la operación bursátil.";
  const s = ids(txt, "alquiler");
  const bad = hasAny(s, DEPOSIT_IDS);
    expect(bad).toBe(false);
  });
});

describe("servicios: jurisdicción/arbitraje (texto real)", () => {
  it("Jurisdicción local y renuncia a otro fuero", () => {
    const txt = "las partes se someten a la jurisdicción de los Tribunales de Monte Caseros (Corrientes) y renuncian a otro fuero…";
    const s = ids(txt, "servicios");
    expect(s.has("servicios-jurisdiccion-arbitraje")).toBe(true);
  });
});

describe("negativos generales", () => {
  it("No dispara cláusula penal si está negada", () => {
    const txt = "no se aplicará cláusula penal en caso de resolución por causas ajenas al locatario";
    const s = ids(txt, "alquiler");
    const bad = s.has("alquiler-clausula-penal") || s.has("clausula-penal-desproporcionada");
    expect(bad).toBe(false);
  });

  it("No dispara indexación si está negada", () => {
    const txt = "no habrá actualización del canon durante el primer año";
    const s = ids(txt, "alquiler");
    expect(s.has("alquiler-indexacion")).toBe(false);
  });
});
