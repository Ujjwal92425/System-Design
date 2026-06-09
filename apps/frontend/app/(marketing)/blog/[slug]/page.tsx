export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <article className="max-w-3xl mx-auto px-6 py-24 space-y-6">
      <h1 className="text-4xl font-extrabold">Scaling Cache Eviction</h1>
      <p className="text-zinc-500">Published June 2026</p>
      <div className="prose prose-invert leading-relaxed text-zinc-300">
        <p>This is where MDX content renders for: {slug}</p>
      </div>
    </article>
  );
}
