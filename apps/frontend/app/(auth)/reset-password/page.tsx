export default function ResetPasswordPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">New Password</h2>
      <p className="text-xs text-zinc-400">Specify your new account password credentials.</p>
      <input type="password" placeholder="New Password" className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-lg text-sm text-white focus:outline-none" />
      <button className="w-full py-3 bg-indigo-600 rounded-lg text-sm font-semibold">Apply Changes</button>
    </div>
  );
}
