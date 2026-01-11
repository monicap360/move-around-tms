import supabaseAdmin from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function ExpiringDocsPage() {
  const { data, error } = await supabaseAdmin
    .from("driver_documents_expiring")
    .select("*")
    .order("expiration_date", { ascending: true });

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Expiring HR Documents</h1>
        <p className="text-red-600">Failed to load: {error.message}</p>
      </main>
    );
  }

  const items = data ?? [];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Expiring HR Documents</h1>
      <p className="text-sm text-gray-600 mb-6">
        Approved documents expiring within 60 days.
      </p>

      {items.length === 0 ? (
        <div className="text-gray-600">No documents expiring soon.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">Doc ID</th>
                <th className="text-left p-2 border-b">Driver ID</th>
                <th className="text-left p-2 border-b">Type</th>
                <th className="text-left p-2 border-b">Expiration</th>
                <th className="text-left p-2 border-b">Days Left</th>
                <th className="text-left p-2 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d: any) => (
                <tr key={d.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b">{d.id}</td>
                  <td className="p-2 border-b">{d.driver_id ?? "-"}</td>
                  <td className="p-2 border-b">{d.doc_type ?? "-"}</td>
                  <td className="p-2 border-b">{d.expiration_date ?? "-"}</td>
                  <td className="p-2 border-b">{d.days_until_expiration}</td>
                  <td className="p-2 border-b">{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
