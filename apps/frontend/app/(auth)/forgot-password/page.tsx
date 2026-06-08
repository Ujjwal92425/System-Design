export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reset Password</h2>
      <p className="text-xs text-zinc-400">Enter your email and we\'ll send you a password reset link.</p>
      <input type="email" placeholder="Email" className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-lg text-sm text-white focus:outline-none" />
      <button className="w-full py-3 bg-indigo-600 rounded-lg text-sm font-semibold">Send Reset Link</button>
    </div>
  );
}
