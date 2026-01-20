import supabaseAdmin from "../../lib/supabaseAdmin";
import Image from "next/image";

export const dynamic = "force-dynamic";

const directImageLoader = ({ src }: { src: string }) => src;

export default async function HRDashboardPage() {
  const { data, error } = await supabaseAdmin
    .from("driver_documents")
    .select(
      "id, doc_type, image_url, status, expiration_date, ocr_confidence, drivers ( id, name )",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-4">HR Document Compliance</h1>
        <p className="text-red-600">Failed to load: {error.message}</p>
      </main>
    );
  }

  const docs = data ?? [];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">HR Document Compliance</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b">Driver</th>
              <th className="text-left p-2 border-b">Doc Type</th>
              <th className="text-left p-2 border-b">Expires</th>
              <th className="text-left p-2 border-b">Confidence</th>
              <th className="text-left p-2 border-b">Status</th>
              <th className="text-left p-2 border-b">Preview</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d: any) => {
              const url: string | null = d.image_url;
              const isPdf = url ? url.toLowerCase().endsWith(".pdf") : false;
              const isImage = url
                ? /(jpg|jpeg|png|gif|webp)$/i.test(url)
                : false;
              return (
                <tr key={d.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b">
                    {d.drivers?.name ?? "Unassigned"}
                  </td>
                  <td className="p-2 border-b">{d.doc_type}</td>
                  <td className="p-2 border-b">{d.expiration_date ?? "-"}</td>
                  <td className="p-2 border-b">
                    {typeof d.ocr_confidence === "number"
                      ? `${d.ocr_confidence}%`
                      : "-"}
                  </td>
                  <td className="p-2 border-b">
                    <span
                      className={`px-2 py-1 rounded text-xs ${d.status === "Approved" ? "bg-green-100 text-green-700" : d.status === "Denied" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="p-2 border-b">
                    {url ? (
                      <div className="flex items-center gap-2">
                        {isImage && (
                          <Image
                            src={url}
                            alt="preview"
                            width={48}
                            height={48}
                            className="h-12 w-12 object-contain border rounded"
                            loader={directImageLoader}
                            unoptimized
                          />
                        )}
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {isPdf ? "View PDF" : "Open"}
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
