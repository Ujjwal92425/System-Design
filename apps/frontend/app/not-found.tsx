import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
      <h1 className="text-8xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">404</h1>
      <h2 className="text-2xl font-semibold mt-4">System Node Not Found</h2>
      <p className="text-gray-500 mt-2 max-w-md">The route you are trying to request does not resolve to any active server. Check the link or go back home.</p>
      <Link href="/" className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
        Return to Gateway
      </Link>
    </div>
  );
}
