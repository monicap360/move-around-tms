import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() { return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) }
function check(req: NextRequest) { const t = req.headers.get('authorization')||''; const e = process.env.ADMIN_TOKEN; return e && t===`Bearer ${e}` }

type GroupKey = 'none' | 'partner' | 'material' | 'day'

export async function GET(req: NextRequest) {
  if (!check(req)) return unauthorized()

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const partnerId = url.searchParams.get('partner_id')
  const driverId = url.searchParams.get('driver_id')
  const material = url.searchParams.get('material')
  const includeVoided = url.searchParams.get('include_voided') === 'true'
  const groupBy = (url.searchParams.get('group_by') || 'none') as GroupKey

  let q = supabaseAdmin
    .from('aggregate_tickets')
    .select('id, ticket_date, partner_id, driver_id, material, unit_type, quantity, pay_rate, bill_rate, total_pay, total_bill, total_profit, voided, status, aggregate_partners(name)')
    .order('ticket_date', { ascending: true })

  if (from) q = q.gte('ticket_date', from)
  if (to) q = q.lte('ticket_date', to)
  if (partnerId) q = q.eq('partner_id', partnerId)
  if (driverId) q = q.eq('driver_id', driverId)
  if (material) q = q.ilike('material', `%${material}%`)
  if (!includeVoided) q = q.or('voided.eq.false,voided.is.null')

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const items = (data || []).map((t: any) => ({
    id: t.id,
    date: t.ticket_date,
    partner_name: t.aggregate_partners?.name || null,
    partner_id: t.partner_id,
    driver_id: t.driver_id,
    material: t.material,
    unit_type: t.unit_type,
    quantity: Number(t.quantity || 0),
    pay_rate: Number(t.pay_rate || 0),
    bill_rate: Number(t.bill_rate || 0),
    total_pay: Number(t.total_pay || 0),
    total_bill: Number(t.total_bill || 0),
    total_profit: Number(t.total_profit || 0),
    margin_pct: (Number(t.total_bill || 0) > 0) ? (Number(t.total_profit || 0) / Number(t.total_bill || 0)) * 100 : 0,
    voided: !!t.voided,
    status: t.status,
  }))

  // Totals
  const totals = items.reduce((acc, it) => {
    acc.bill += it.total_bill
    acc.pay += it.total_pay
    acc.profit += it.total_profit
    return acc
  }, { bill: 0, pay: 0, profit: 0 })
  const margin_pct = totals.bill > 0 ? (totals.profit / totals.bill) * 100 : 0

  // Grouping
  type GroupRow = { key: string; count: number; bill: number; pay: number; profit: number; margin_pct: number }
  let groups: GroupRow[] | undefined
  if (groupBy !== 'none') {
    const m = new Map<string, GroupRow>()
    for (const it of items) {
      const key = groupBy === 'partner' ? (it.partner_name || 'Unknown')
        : groupBy === 'material' ? (it.material || 'Unknown')
        : /* day */ (it.date || 'Unknown')
      const g = m.get(key) || { key, count: 0, bill: 0, pay: 0, profit: 0, margin_pct: 0 }
      g.count += 1
      g.bill += it.total_bill
      g.pay += it.total_pay
      g.profit += it.total_profit
      m.set(key, g)
    }
    groups = Array.from(m.values()).map(g => ({ ...g, margin_pct: g.bill > 0 ? (g.profit / g.bill) * 100 : 0 }))
    // Sort by highest profit desc
    groups.sort((a, b) => b.profit - a.profit)
  }

  return NextResponse.json({ ok: true, items, summary: { totals: { ...totals, margin_pct }, groups } })
}
