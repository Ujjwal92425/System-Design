export default function ActiveInterviewSession({ params }: { params: { sessionId: string } }) {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Session: {params.sessionId}</h1>
      <p className="text-zinc-400">Read requirements, design the layout on the canvas, and submit before timer expires.</p>
    </div>
  );
}
