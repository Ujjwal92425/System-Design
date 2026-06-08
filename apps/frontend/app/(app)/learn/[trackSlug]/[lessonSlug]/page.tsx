export default function LessonPage({ params }: { params: { trackSlug: string; lessonSlug: string } }) {
  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <h1 className="text-3xl font-black capitalize">{params.lessonSlug.replace('-', ' ')}</h1>
      <p className="text-zinc-400">Read the architectural analysis below, complete the inline widgets, and take the check-point quiz.</p>
    </div>
  );
}
