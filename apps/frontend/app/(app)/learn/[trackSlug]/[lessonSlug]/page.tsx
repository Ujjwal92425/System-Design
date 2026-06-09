export default async function LessonPage({ params }: { params: Promise<{ trackSlug: string; lessonSlug: string }> }) {
  const { lessonSlug } = await params;
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <h1 className="text-3xl font-black capitalize">{lessonSlug.replace('-', ' ')}</h1>
      <p className="text-zinc-400">Read the architectural analysis below, complete the inline widgets, and take the check-point quiz.</p>
    </div>
  );
}
