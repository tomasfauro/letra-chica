import test from "node:test";
import assert from "node:assert/strict";

// 👇 Importá al archivo concreto y con .ts
import { runRules } from "../index.ts";
import { positives, negatives } from "./dataset.ts";

test("permanencia dispara", () => {
  for (const t of positives.permanencia) {
    const ids = new Set(runRules(t).map((f) => f.id));
    assert.ok(ids.has("permanencia"), `No disparó permanencia en: ${t}`);
  }
});

test("proteccion-datos dispara", () => {
  for (const t of positives["proteccion-datos"]) {
    const ids = new Set(runRules(t).map((f) => f.id));
    assert.ok(ids.has("proteccion-datos"), `No disparó datos/cesión en: ${t}`);
  }
});

test("negativos no disparan (básico)", () => {
  for (const t of negatives) {
    const ids = new Set(runRules(t).map((f) => f.id));
    const none = !ids.has("permanencia") && !ids.has("proteccion-datos");
    assert.ok(none, `Falso positivo en: ${t} -> ${Array.from(ids).join(",")}`);
  }
});
