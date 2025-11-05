import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() { return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) }
function check(req: NextRequest) { const t = req.headers.get('authorization')||''; const e = process.env.ADMIN_TOKEN; return e && t===`Bearer ${e}` }

// Compute quarter date range
function quarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3; // 0,3,6,9
  const start = new Date(Date.UTC(year, startMonth, 1))
  const end = new Date(Date.UTC(year, startMonth + 3, 0)) // last day previous month
  const fmt = (d: Date) => d.toISOString().slice(0,10)
  return { from: fmt(start), to: fmt(end) }
}

export async function GET(req: NextRequest) {
  if (!check(req)) return unauthorized()
  const url = new URL(req.url)
  const year = Number(url.searchParams.get('year') || new Date().getUTCFullYear())
  const quarter = Number(url.searchParams.get('quarter') || 1)
  if (!(quarter>=1 && quarter<=4)) return NextResponse.json({ ok:false, error:'invalid_quarter' }, { status: 400 })
  const { from, to } = quarterRange(year, quarter)

  // Load per-jurisdiction miles from ELD segments via trips filtered by date
  const { data: trips, error: tripsErr } = await supabaseAdmin
    .from('eld_trips')
    .select('id, start_time')
    .gte('start_time', from)
    .lte('end_time', to)

  if (tripsErr) return NextResponse.json({ ok:false, error: tripsErr.message }, { status: 500 })
  const tripIds = (trips||[]).map(t=>t.id)

  let milesByJuris: Record<string, number> = {}
  if (tripIds.length>0) {
    const { data: segs, error: segErr } = await supabaseAdmin
      .from('eld_trip_segments')
      .select('jurisdiction_code, miles')
      .in('trip_id', tripIds)
    if (segErr) return NextResponse.json({ ok:false, error: segErr.message }, { status: 500 })
    for (const s of (segs||[])) {
      const code = s.jurisdiction_code || 'UNK'
      milesByJuris[code] = (milesByJuris[code]||0) + Number(s.miles||0)
    }
  }

  // Fuel purchases in quarter
  const { data: fuel, error: fuelErr } = await supabaseAdmin
    .from('fuel_purchases')
    .select('jurisdiction_code, gallons')
    .gte('purchase_date', from)
    .lte('purchase_date', to)
  if (fuelErr) return NextResponse.json({ ok:false, error: fuelErr.message }, { status: 500 })

  let gallonsByJuris: Record<string, number> = {}
  let totalGallons = 0
  for (const f of (fuel||[])) {
    const code = f.jurisdiction_code || 'UNK'
    const g = Number(f.gallons||0)
    gallonsByJuris[code] = (gallonsByJuris[code]||0) + g
    totalGallons += g
  }

  const totalMiles = Object.values(milesByJuris).reduce((a,b)=>a+b,0)
  const fleetMPG = totalGallons>0 ? totalMiles / totalGallons : 0

  // Load rates for quarter
  const { data: rates, error: rateErr } = await supabaseAdmin
    .from('ifta_rates')
    .select('jurisdiction_code, rate_per_gallon')
    .eq('year', year)
    .eq('quarter', quarter)
  if (rateErr) return NextResponse.json({ ok:false, error: rateErr.message }, { status: 500 })
  const rateMap = new Map((rates||[]).map(r => [r.jurisdiction_code, Number(r.rate_per_gallon || 0)]))

  // Build rows per jurisdiction
  type Row = { jurisdiction_code: string; miles: number; gallons_purchased: number; taxable_gallons: number; rate: number; tax_due: number; tax_paid: number; net_tax: number }
  const jurisCodes = Array.from(new Set([ ...Object.keys(milesByJuris), ...Object.keys(gallonsByJuris) ]))
  const rows: Row[] = []
  let totals = { miles: 0, gallons_purchased: 0, taxable_gallons: 0, tax_due: 0, tax_paid: 0, net_tax: 0 }
  for (const code of jurisCodes) {
    const miles = Number(milesByJuris[code]||0)
    const gallonsPurchased = Number(gallonsByJuris[code]||0)
    const taxableGallons = fleetMPG>0 ? (miles / fleetMPG) : 0
    const rate = rateMap.get(code) || 0
    const taxDue = taxableGallons * rate
    const taxPaid = gallonsPurchased * rate
    const netTax = taxDue - taxPaid
    rows.push({ jurisdiction_code: code, miles, gallons_purchased: gallonsPurchased, taxable_gallons: taxableGallons, rate, tax_due: taxDue, tax_paid: taxPaid, net_tax: netTax })
    totals.miles += miles; totals.gallons_purchased += gallonsPurchased; totals.taxable_gallons += taxableGallons; totals.tax_due += taxDue; totals.tax_paid += taxPaid; totals.net_tax += netTax
  }

  return NextResponse.json({ ok:true, period: { year, quarter, from, to }, fleet: { total_miles: totalMiles, total_gallons: totalGallons, mpg: fleetMPG }, rows, totals })
}
