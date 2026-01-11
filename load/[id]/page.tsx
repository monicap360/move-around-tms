import { useParams } from "next/navigation";

export default function LoadDetailPage() {
  const params = useParams();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Load Details</h1>
      <p>
        Viewing load with ID: <span className="font-mono">{params.id}</span>
      </p>
    </main>
  );
}
