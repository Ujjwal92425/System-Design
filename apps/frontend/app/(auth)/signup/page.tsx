import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Create Account</h2>
        <p className="text-sm text-zinc-400 mt-2">Start practicing system design today</p>
      </div>
      <form className="space-y-4">
        <input type="text" placeholder="Full Name" className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-lg focus:outline-none focus:border-indigo-500 text-sm text-white" />
        <input type="email" placeholder="Email Address" required className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-lg focus:outline-none focus:border-indigo-500 text-sm text-white" />
        <input type="password" placeholder="Password" required className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-lg focus:outline-none focus:border-indigo-500 text-sm text-white" />
        <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold rounded-lg transition">Create Account</button>
      </form>
      <div className="text-center text-xs text-zinc-500">
        Already have an account? <Link href="/login" className="text-indigo-400 hover:underline">Log In</Link>
      </div>
    </div>
  );
}
