import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950">
      <div className="max-w-4xl mx-auto space-y-8">
        <span className="px-3 py-1 text-xs border border-indigo-500/30 rounded-full text-indigo-400 font-semibold bg-indigo-500/5">
          Level Up Your Architecture Skills
        </span>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
          The First Learning OS for <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            System Design
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Don't just read statically. Build architecture diagrams on our canvas, trigger high-throughput traffic simulations, analyze chaos events, and get evaluated by AI.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all">
            Launch Workspace
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto px-8 py-4 border border-zinc-700 hover:bg-zinc-800 rounded-lg font-medium transition">
            Compare Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
