export default async function TrackOverview({ params }: { params: Promise<{ trackSlug: string }> }) {
  const { trackSlug } = await params;
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-black capitalize">Track: {trackSlug.replace('-', ' ')}</h1>
      <p className="text-zinc-400">Complete all modules inside this track to master its architectural primitives.</p>
    </div>
  );
}
