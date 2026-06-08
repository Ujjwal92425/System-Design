import Link from 'next/link';

export default function BuildList() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Workspaces</h1>
          <p className="text-zinc-400 text-sm mt-1">Create sandbox architectures and mock workloads.</p>
        </div>
        <Link href="/build/new" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-semibold transition">
          New Workspace
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="border border-zinc-900 bg-zinc-900/25 p-6 rounded-xl flex flex-col justify-between h-40">
          <div>
            <h3 className="text-base font-bold text-white">URL Shortener Sandbox</h3>
            <p className="text-zinc-500 text-xs mt-1">Basic DNS, API Gateway, Redis Cache, and PostgreSQL.</p>
          </div>
          <Link href="/build/url-shortener" className="text-xs text-indigo-400 hover:underline">Open Workspace →</Link>
        </div>
      </div>
    </div>
  );
}
