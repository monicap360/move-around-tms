// app/api/advisor/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const dateFilter = searchParams.get('date') || '7';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

  // Fetch both tables in parallel
  const [agentRes, publicRes] = await Promise.all([
    supabase.from('agent_leads').select('*'),
    supabase.from('public_leads').select('*'),
  ]);

  if (agentRes.error) return NextResponse.json({ error: agentRes.error.message }, { status: 500 });
  if (publicRes.error) return NextResponse.json({ error: publicRes.error.message }, { status: 500 });

  // Add source field
  let allLeads = [
    ...(agentRes.data || []).map((l: any) => ({ ...l, source: 'Agent' })),
    ...(publicRes.data || []).map((l: any) => ({ ...l, source: 'Public' })),
  ];

  // Filter
  allLeads = allLeads.filter((lead) => {
    const matchesSearch =
      !search ||
      (lead.name && lead.name.toLowerCase().includes(search.toLowerCase())) ||
      (lead.email && lead.email.toLowerCase().includes(search.toLowerCase())) ||
      (lead.phone && lead.phone.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !status || (lead.status && lead.status === status);
    let matchesDate = true;
    if (dateFilter === '7') {
      const createdAt = lead.created_at ? new Date(lead.created_at) : null;
      matchesDate = !!createdAt && ((new Date().getTime() - (createdAt ? createdAt.getTime() : 0)) / (1000 * 60 * 60 * 24) <= 7);
    } else if (dateFilter === '30') {
      const createdAt = lead.created_at ? new Date(lead.created_at) : null;
      matchesDate = !!createdAt && ((new Date().getTime() - (createdAt ? createdAt.getTime() : 0)) / (1000 * 60 * 60 * 24) <= 30);
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Sort (newest first)
  allLeads.sort((a, b) => (b.created_at && a.created_at ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : 0));

  // Pagination
  const total = allLeads.length;
  const totalPages = Math.ceil(total / pageSize);
  const pagedLeads = allLeads.slice((page - 1) * pageSize, page * pageSize);

  // Summary
  const summary = {
    total,
    hot: allLeads.filter((l) => l.status === 'hot').length,
    warm: allLeads.filter((l) => l.status === 'warm').length,
    cold: allLeads.filter((l) => l.status === 'cold').length,
    thisWeek: allLeads.filter((l) => {
      if (!l.created_at) return false;
      const created = new Date(l.created_at);
      return (new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    }).length,
  };

  return NextResponse.json({ leads: pagedLeads, total, totalPages, page, summary });
}
