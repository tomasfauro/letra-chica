"use client";

import { useState } from "react";
import { runRules, type Finding } from "@/rules";
import { FindingsList } from "@/components/FindingsList";

/**
 * Página de análisis express de una cláusula. Permite al usuario pegar
 * un párrafo de su contrato y analizarlo localmente utilizando las
 * mismas reglas que el backend. Esto evita latencia y llamadas innecesarias.
 */
export default function Express() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Finding[] | null>(null);

  const analyze = () => {
    const out = runRules(text);
    setResults(out);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-2xl w-full text-center">
        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis Express</h2>
        <p className="text-sm text-gray-600 mb-6">
          Pegá aquí una cláusula de tu contrato y la traduciremos a un lenguaje claro.
        </p>

        {/* Textarea */}
        <textarea
          className="w-full h-32 border rounded-lg p-3 text-gray-800 mb-4"
          placeholder="Ej: El contrato se renovará automáticamente al vencimiento..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Botón mostrar solo si hay texto */}
        {text && (
          <button
            onClick={analyze}
            className="mt-2 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Analizar cláusula
          </button>
        )}

        {/* Resultados */}
        {results && (
          <div className="mt-6 text-left">
            <FindingsList items={results} />
          </div>
        )}
      </div>
    </main>
  );
}