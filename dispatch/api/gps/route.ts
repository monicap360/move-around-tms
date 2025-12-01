// POST: Receive GPS pings from drivers/trucks
export async function POST(req: Request) {
  // ...GPS ping logic here
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
