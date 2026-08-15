import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        That app or record does not exist.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-sky-700 hover:underline">
        ← Back to all apps
      </Link>
    </div>
  );
}
