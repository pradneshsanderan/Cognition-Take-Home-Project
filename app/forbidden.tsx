import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold tracking-tight">403 — Forbidden</h1>
      <p className="mt-2 text-sm text-slate-500">
        The current user does not have a role that may view this page.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-sky-700 hover:underline">
        ← Back to internal tools
      </Link>
    </div>
  );
}
