// POST: Update load status, ETA, etc.
export async function POST(req: Request) {
  // ...status update logic here
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
