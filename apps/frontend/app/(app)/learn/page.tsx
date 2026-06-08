import Link from 'next/link';

export default function LearnCurriculum() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Curriculum</h1>
        <p className="text-zinc-400 text-sm mt-1">Five Levels, starting from DNS resolution to horizontal database partitioning.</p>
      </div>

      <div className="space-y-4">
        <div className="border border-zinc-900 bg-zinc-900/20 p-6 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Level 1</span>
            <h3 className="text-lg font-bold text-white mt-1">Networking & Web Servers</h3>
            <p className="text-zinc-400 text-sm mt-1">Master DNS lookup, HTTP payloads, load balancing strategies, and routing loops.</p>
          </div>
          <Link href="/learn/level-1" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg transition">Explore Modules</Link>
        </div>
      </div>
    </div>
  );
}
