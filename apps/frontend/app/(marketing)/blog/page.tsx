import Link from 'next/link';

export default function BlogIndex() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 space-y-12">
      <h1 className="text-4xl font-black">Architecture Log</h1>
      <div className="space-y-6">
        <div className="border border-gray-200 p-6 rounded-xl hover:border-indigo-500/50 transition">
          <Link href="/blog/scaling-cache-eviction" className="text-xl font-bold hover:text-indigo-600 transition">
            How Eviction Policies Evade Cascading Cache Failures
          </Link>
          <p className="text-gray-500 text-sm mt-2">A deep dive into LRU, LFU, and custom eviction simulations in System Design OS.</p>
        </div>
      </div>
    </div>
  );
}
