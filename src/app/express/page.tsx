"use client";
import { useState } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Express() {
  const [text, setText] = useState<string>("");

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        {/* Ícono */}
        <DocumentTextIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />

        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis Express</h2>
        <p className="text-gray-600 mb-6">
          Pegá aquí una cláusula de tu contrato y te la traduciremos a un lenguaje claro.
        </p>

        {/* Textarea */}
        <textarea
          className="w-full h-32 border rounded-lg p-3 text-gray-800"
          placeholder="Ej: El contrato se renovará automáticamente al vencimiento..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Mostrar botón solo si hay texto */}
        {text && (
          <button className="mt-6 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
            Analizar cláusula
          </button>
        )}

        {/* Volver al inicio */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-blue-600 transition"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
