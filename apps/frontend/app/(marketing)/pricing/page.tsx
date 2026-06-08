import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    { name: 'Free', price: '$0', desc: 'Fundamentals and sandbox builds', features: ['3 workspaces', '10 AI credits/mo', 'Basic components', 'PNG Exports'] },
    { name: 'Pro', price: '$29', desc: 'Ideal for job seekers and active engineers', features: ['50 workspaces', '200 AI credits/mo', 'Advanced metrics & chaos simulator', 'Model answers & rubrics', 'PNG/SVG/PDF exports'] },
    { name: 'Team', price: '$79', desc: 'For bootcamps and engineering teams', features: ['500 workspaces', '1000 AI credits/mo', 'Collaborative canvas', 'Instructor dashboards', 'Dedicated training modules'] }
  ];

  return (
    <div className="py-24 px-6 max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold">Predictable Plans for Every Stage</h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">Choose a plan that fits your practice schedule. Cancel or upgrade anytime.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((p, idx) => (
          <div key={idx} className="border border-zinc-800 bg-zinc-900/40 rounded-2xl p-8 flex flex-col justify-between hover:border-zinc-700 transition">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="text-zinc-500 text-sm mt-1">{p.desc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="text-zinc-400 text-sm ml-2">/ month</span>
              </div>
              <ul className="space-y-3 border-t border-zinc-800 pt-6">
                {p.features.map((f, fIdx) => (
                  <li key={fIdx} className="text-sm text-zinc-300 flex items-center">
                    <span className="text-indigo-400 mr-2">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/signup" className="mt-8 block text-center w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold rounded-lg transition">
              Get Started
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
