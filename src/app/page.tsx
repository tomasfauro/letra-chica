import Link from "next/link";

/**
 * Home page of the application.
 *
 * This component renders a simple landing page with two primary actions:
 *  - Ingresar una cláusula para análisis exprés.
 *  - Subir un contrato completo en formato PDF para un análisis profundo.
 *
 * Utilizamos el componente `Link` de Next.js en lugar de etiquetas `<a>`
 * tradicionales. Esto permite que el enrutamiento interno aproveche
 * funcionalidades como el prefetching y la navegación sin recargar la página.
 */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="w-full py-4 shadow bg-white">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6">
          <h1 className="text-xl font-bold text-gray-900">LetraChica.com.ar</h1>
          <nav className="space-x-4">
            {/* Utilizamos Link para navegación interna */}
            <Link href="/express" className="text-gray-600 hover:text-blue-600">
              Express
            </Link>
            <Link href="/upload" className="text-gray-600 hover:text-blue-600">
              Subir PDF
            </Link>
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-col items-center justify-center text-center flex-1 px-6 py-12">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
          Antes de firmar, entendé tu contrato en 3 minutos
        </h2>
        <p className="text-gray-700 max-w-xl mb-8">
          Subí tu contrato o pegá una cláusula y nuestra herramienta te la
          traducirá a un lenguaje simple, con alertas de cláusulas dudosas.
        </p>
        <div className="flex gap-4">
          {/* Botón secundario */}
          <Link
            href="/express"
            className="px-5 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
          >
            Análisis express (gratis)
          </Link>
          {/* Botón primario */}
          <Link
            href="/upload"
            className="px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Subir contrato (PDF)
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          * Análisis informativo, no constituye asesoría legal.
        </p>
      </main>

      {/* FOOTER */}
      <footer className="bg-white py-4 shadow-inner">
        <div className="max-w-5xl mx-auto text-center text-sm text-gray-500">
          © {new Date().getFullYear()} LetraChica.com.ar
        </div>
      </footer>
    </div>
  );
}