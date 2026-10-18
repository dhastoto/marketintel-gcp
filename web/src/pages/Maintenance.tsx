import { Construction } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="rounded-2xl bg-white p-10 shadow-lg max-w-md w-full space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Construction className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Sedang Dalam Pemeliharaan</h1>
        <p className="text-slate-500 leading-relaxed">
          Sistem sedang dalam proses pemeliharaan untuk meningkatkan layanan kami.
          Silakan coba kembali beberapa saat lagi.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
