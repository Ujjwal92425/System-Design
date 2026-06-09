export default async function BlueprintDetail({ params }: { params: Promise<{ blueprintId: string }> }) {
  const { blueprintId } = await params;
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Blueprint details: {blueprintId}</h1>
    </div>
  );
}
