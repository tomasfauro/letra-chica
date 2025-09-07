import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Letra Chica",
  description: "Analiza tus contratos fácilmente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full bg-gray-50">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased bg-gray-50 text-gray-900 min-h-screen`}
      >
        {/* HEADER global */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-bold text-gray-900">
              LetraChica.com.ar
            </Link>
            <nav className="text-sm flex gap-4">
              <Link href="/express" className="text-gray-600 hover:text-blue-600">
                Express
              </Link>
              <Link href="/upload" className="text-gray-600 hover:text-blue-600">
                Subir PDF
              </Link>
            </nav>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="min-h-[calc(100vh-120px)]">
          {children}
        </main>

        {/* FOOTER global */}
        <footer className="border-t bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} LetraChica.com.ar · Análisis informativo (no asesoría legal)
          </div>
        </footer>
      </body>
    </html>
  );
}
