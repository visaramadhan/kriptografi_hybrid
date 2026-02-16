import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-slate-100">
        404
      </h1>
      <p className="mt-3 text-sm text-slate-300">
        Halaman yang Anda cari tidak ditemukan atau sudah tidak tersedia.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-400"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  )
}

