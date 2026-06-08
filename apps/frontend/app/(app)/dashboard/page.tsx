import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Welcome, Architect</h1>
        <p className="text-zinc-400 text-sm mt-1">Track your progress, work on designs, and evaluate system failures.</p>
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-4 gap-6">
        <div className="border border-zinc-900 bg-zinc-900/20 p-6 rounded-xl space-y-1">
          <span className="text-zinc-500 text-xs font-semibold uppercase">Daily Streak</span>
          <p className="text-2xl font-bold text-white">5 Days</p>
        </div>
        <div className="border border-zinc-900 bg-zinc-900/20 p-6 rounded-xl space-y-1">
          <span className="text-zinc-500 text-xs font-semibold uppercase">Completed Lessons</span>
          <p className="text-2xl font-bold text-white">12 / 45</p>
        </div>
        <div className="border border-zinc-900 bg-zinc-900/20 p-6 rounded-xl space-y-1">
          <span className="text-zinc-500 text-xs font-semibold uppercase">Sandbox Designs</span>
          <p className="text-2xl font-bold text-white">4</p>
        </div>
        <div className="border border-zinc-900 bg-zinc-900/20 p-6 rounded-xl space-y-1">
          <span className="text-zinc-500 text-xs font-semibold uppercase">Interview Score</span>
          <p className="text-2xl font-bold text-white">82% avg</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Next Lesson CTA */}
        <div className="border border-zinc-900 bg-gradient-to-br from-indigo-950/30 to-purple-950/20 p-8 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">NEXT LESSON</span>
            <h3 className="text-xl font-bold text-white">Load Balancing Algorithms</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Round Robin vs Least Connections: how to divide incoming packets fairly across web server farms.</p>
          </div>
          <Link href="/learn/load-balancing" className="mt-6 inline-block w-fit px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-semibold transition">
            Continue Learning
          </Link>
        </div>

        {/* Recent Workspaces */}
        <div className="border border-zinc-900 bg-zinc-900/20 p-8 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-white">Recent Workspaces</h3>
          <ul className="space-y-3">
            <li className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <p className="text-sm font-semibold text-white">URL Shortener (API Gateway + Cache)</p>
                <span className="text-[10px] text-zinc-500">Last updated 2 hours ago</span>
              </div>
              <Link href="/build/1" className="text-xs text-indigo-400 hover:underline">Open</Link>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Messaging App (WebSockets + DB partition)</p>
                <span className="text-[10px] text-zinc-500">Last updated 1 day ago</span>
              </div>
              <Link href="/build/2" className="text-xs text-indigo-400 hover:underline">Open</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
