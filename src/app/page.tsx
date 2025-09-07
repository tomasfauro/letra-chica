import ReportButton from "../components/ReportButton";
import Link from "next/link";  
import { FileText, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-120px)] bg-gray-50 flex items-center">
      <section className="max-w-5xl mx-auto px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Antes de firmar, entendé tu contrato en 3 minutos
        </h1>
        <p className="mt-3 text-gray-700 max-w-2xl mx-auto">
          Subí tu contrato o pegá una cláusula y nuestra herramienta la traduce a
          lenguaje simple, con alertas de cláusulas dudosas.
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <FileText size={18} />
            Subir contrato (PDF)
          </Link>
          <Link
            href="/express"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
          >
            <Zap size={18} />
            Análisis express (gratis)
          </Link>
        </div>

        {/* Beneficios */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-left md:text-center">
          <div>
            <Zap className="mx-auto text-blue-600" size={24} />
            <h3 className="mt-2 font-semibold">Ahorra tiempo</h3>
            <p className="text-sm text-neutral-600">
              En segundos obtenés un resumen claro de tus cláusulas.
            </p>
          </div>
          <div>
            <FileText className="mx-auto text-blue-600" size={24} />
            <h3 className="mt-2 font-semibold">Detecta riesgos</h3>
            <p className="text-sm text-neutral-600">
              Señalamos permanencias, penalizaciones y cesiones de datos.
            </p>
          </div>
          <div>
            <Shield className="mx-auto text-blue-600" size={24} />
            <h3 className="mt-2 font-semibold">Más transparencia</h3>
            <p className="text-sm text-neutral-600">
              Entendé la letra chica con lenguaje simple y neutral.
            </p>
          </div>
        </div>


      </section>
    </main>
  );
}
