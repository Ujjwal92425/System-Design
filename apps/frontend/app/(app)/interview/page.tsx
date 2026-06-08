import Link from 'next/link';
export default function InterviewSelector() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-black">Practice Interviews</h1>
      <p className="text-zinc-400">Simulate staff system design interview sessions under timed environments.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-zinc-900 bg-zinc-900/30 p-6 rounded-xl space-y-4">
          <h3 className="text-lg font-bold">Design a URL Shortener</h3>
          <p className="text-xs text-zinc-400">P0 Core Scenario: API Gateway, DNS routing, caching, and SQL replicas.</p>
          <Link href="/interview/session-url-shortener" className="inline-block px-4 py-2 bg-indigo-600 rounded-lg text-xs font-semibold">Start timed attempt (45m)</Link>
        </div>
      </div>
    </div>
  );
}
