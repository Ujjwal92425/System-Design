'use client';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
      <h1 className="text-6xl font-bold text-red-500">500</h1>
      <h2 className="text-2xl font-semibold mt-4">System Instability Detected</h2>
      <p className="text-zinc-400 mt-2 max-w-md">{error.message || 'An unexpected runtime error crashed the client viewport.'}</p>
      <button onClick={reset} className="mt-8 px-6 py-3 bg-zinc-800 rounded-lg font-medium hover:bg-zinc-700 transition">
        Reboot Session
      </button>
    </div>
  );
}
