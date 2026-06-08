export default function TrackOverview({ params }: { params: { trackSlug: string } }) {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-black capitalize">Track: {params.trackSlug.replace('-', ' ')}</h1>
      <p className="text-zinc-400">Complete all modules inside this track to master its architectural primitives.</p>
    </div>
  );
}
