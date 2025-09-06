export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="w-full py-4 shadow bg-white">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6">
          <h1 className="text-xl font-bold text-gray-900">LetraChica.com.ar</h1>
          <nav className="space-x-4">
            <a href="/express" className="text-gray-600 hover:text-blue-600">Express</a>
            <a href="/upload" className="text-gray-600 hover:text-blue-600">Subir PDF</a>
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
          Antes de firmar, entendé tu contrato en 3 minutos
        </h2>
        <p className="text-lg text-gray-600 max-w-xl mb-8">
          Subí tu contrato o pegá una cláusula y nuestra herramienta te la
          traduce a un lenguaje simple, con alertas de cláusulas dudosas.
        </p>

        <div className="flex gap-4">
          {/* Botón secundario */}
          <a
            href="/express"
            className="px-5 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
          >
            Análisis express (gratis)
          </a>

          {/* Botón primario */}
          <a
            href="/upload"
            className="px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Subir contrato (PDF)
          </a>
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
