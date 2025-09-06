"use client";
import { useState } from "react";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function Upload() {
  const [fileName, setFileName] = useState<string>("");

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        {/* Ícono */}
        <DocumentArrowUpIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />

        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subir Contrato</h2>
        <p className="text-gray-600 mb-6">
          Subí tu contrato en formato PDF para analizarlo automáticamente.
        </p>

        {/* Botón custom seleccionar archivo */}
        <label className="px-5 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition">
          Seleccionar archivo
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
        </label>

        {/* Mostrar nombre + botón analizar solo si hay archivo */}
        {fileName && (
          <>
            <p className="mt-3 text-sm text-green-600">
              Archivo cargado: {fileName}
            </p>
            <button className="mt-6 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
              Analizar contrato
            </button>
          </>
        )}

        {/* Botón volver atrás */}
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
