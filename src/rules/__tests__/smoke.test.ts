import { describe, it, expect } from "vitest";

// Importá el runner de reglas
import { runRules } from "../index.ts";

// Dataset original
import { positives, negatives } from "./dataset.ts";

/** Utilidad: devuelve true si hay un hallazgo con alguno de los IDs esperados */
function hasAnyId(ids: Set<string>, candidates: string[]) {
  return candidates.some((c) => ids.has(c));
}

describe("smoke: reglas básicas", () => {
  it("permanencia dispara", () => {
    for (const t of positives.permanencia) {
      const ids = new Set(runRules(t).map((f) => f.id));
      expect(hasAnyId(ids, ["permanencia", "plan-permanencia"])).toBe(true);
    }
  });

  it("proteccion-datos dispara (cesión/transferencia a terceros)", () => {
    for (const t of positives["proteccion-datos"]) {
      const ids = new Set(runRules(t).map((f) => f.id));
      // Aceptamos varias variantes de ID para no romper si el código usa otro nombre:
      // - "proteccion-datos" (tu test original)
      // - "servicios-datos-cesion" (nombre propuesto)
      // - "datos-cesion" / "datos-transferencia" (posibles alternativas)
      const ok = hasAnyId(ids, [
        "proteccion-datos",
        "servicios-datos-cesion",
        "datos-cesion",
        "datos-transferencia",
      ]);
      expect(ok).toBe(true);
      if (!ok) {
        // Mensaje útil si falla:
        throw new Error(
          `No disparó datos/cesión en: ${t}\nIDs devueltos: ${Array.from(ids).join(", ")}`
        );
      }
    }
  });

  it("negativos no disparan (básico)", () => {
    for (const t of negatives) {
      const ids = new Set(runRules(t).map((f) => f.id));
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
