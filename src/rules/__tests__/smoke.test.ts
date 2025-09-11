// src/rules/__tests__/smoke.test.ts
import { describe, it, expect } from "vitest";

// Runner de reglas (exporta runRules y runRulesForType)
import { runRules, runRulesForType } from "../index";

// Dataset mini
import { positives, negatives } from "./dataset";

/** Utilidad: ¿algún ID de la lista está presente en el set? */
function hasAnyId(ids: Set<string>, candidates: string[]) {
  return candidates.some((c) => ids.has(c));
}

describe("smoke: reglas básicas (servicios/consumo)", () => {
  it("permanencia dispara", () => {
    for (const t of positives.permanencia) {
      // Gateamos explícitamente por tipo para reducir ruido
      const ids = new Set(runRulesForType(t, "servicios").map((f) => f.id));
      expect(hasAnyId(ids, ["permanencia", "plan-permanencia"])).toBe(true);

      // De yapa: sin gateo también debería disparar (más laxo)
      const idsAll = new Set(runRules(t).map((f) => f.id));
      expect(hasAnyId(idsAll, ["permanencia", "plan-permanencia"])).toBe(true);
    }
  });

  it("protección de datos: cesión/transferencia a terceros dispara", () => {
    for (const t of positives["proteccion-datos"]) {
      const ids = new Set(runRulesForType(t, "servicios").map((f) => f.id));
      const ok = hasAnyId(ids, [
        "proteccion-datos",
        "servicios-datos-cesion",
        "datos-cesion",
        "datos-transferencia",
      ]);
      expect(ok).toBe(true);
      if (!ok) {
        throw new Error(
          `No disparó datos/cesión en: ${t}\nIDs devueltos: ${Array.from(ids).join(", ")}`
        );
      }
    }
  });

  it("negativos no disparan (básico)", () => {
    for (const t of negatives) {
      const ids = new Set(runRulesForType(t, "servicios").map((f) => f.id));
      const none =
        !hasAnyId(ids, ["permanencia", "plan-permanencia"]) &&
        !hasAnyId(ids, [
          "proteccion-datos",
          "servicios-datos-cesion",
          "datos-cesion",
          "datos-transferencia",
        ]);
      expect(none).toBe(true);
      if (!none) {
        throw new Error(
          `Falso positivo en: ${t} -> ${Array.from(ids).join(", ")}`
        );
      }
    }
  });
});
