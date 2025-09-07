"use client";
import { useState } from "react";
import { runRules, type Finding } from "@/rules";
import { FindingsList } from "@/components/FindingsList";

export default function Playground() {
  const [text, setText] = useState<string>(`El locatario deja un depósito en concepto de fianza.
La duración del contrato será de 24 meses con prórroga automática.
En caso de desistimiento anticipado, se aplicará una penalización equivalente a un mes.
Las expensas extraordinarias correrán por cuenta del propietario.
El usuario acepta una permanencia mínima de 12 meses.
El proveedor podrá realizar cesión de datos a terceros con fines comerciales.`);

  const findings: Finding[] = text ? runRules(text) : [];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Playground de reglas</h1>
      <p className="text-sm text-neutral-600">Pegá cláusulas y probá cómo detectan las reglas.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-52 border rounded p-3 text-sm"
        placeholder="Pegá cláusulas de alquiler o servicios…"
      />
      <div>
        <h2 className="font-semibold mb-2">Hallazgos ({findings.length})</h2>
        <FindingsList items={findings} />
      </div>
    </main>
  );
}
