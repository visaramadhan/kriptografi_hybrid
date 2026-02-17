import "./globals.css"
import Link from "next/link"

export const metadata = {
  title: "Hybrid Crypto",
  description: "Dashboard dan analisis kriptografi hybrid",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="text-sm font-semibold tracking-tight text-slate-900">
                Hybrid Crypto
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <Link href="/" className="transition-colors hover:text-blue-600">
                  Dashboard
                </Link>
                <Link
                  href="/campus-sim"
                  className="transition-colors hover:text-blue-600"
                >
                  Simulasi Kampus
                </Link>
                <Link
                  href="/attacker"
                  className="transition-colors hover:text-blue-600"
                >
                  Attacker
                </Link>
                <Link
                  href="/attacker-history"
                  className="transition-colors hover:text-blue-600"
                >
                  Riwayat Attacker
                </Link>
                <Link href="/analysis" className="transition-colors hover:text-blue-600">
                  Analisis
                </Link>
                <Link href="/logs" className="transition-colors hover:text-blue-600">
                  Logs
                </Link>
                <Link
                  href="/documentation"
                  className="transition-colors hover:text-blue-600"
                >
                  Dokumentasi
                </Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white text-xs text-slate-500">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <span>Hybrid Cipher (Affine + Double Caesar)</span>
              <span>Dashboard Penelitian Kriptografi</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
