export default function BlueprintDetail({ params }: { params: { blueprintId: string } }) {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Blueprint details: {params.blueprintId}</h1>
    </div>
  );
}
