import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PDFDocument, StandardFonts } from 'pdf-lib'

function unauthorized() { return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) }
function check(req: NextRequest) { const t = req.headers.get('authorization')||''; const e = process.env.ADMIN_TOKEN; return e && t===`Bearer ${e}` }

function quarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3
  const start = new Date(Date.UTC(year, startMonth, 1))
  const end = new Date(Date.UTC(year, startMonth + 3, 0))
  const fmt = (d: Date) => d.toISOString().slice(0,10)
  return { from: fmt(start), to: fmt(end) }
}

export async function GET(req: NextRequest) {
  if (!check(req)) return unauthorized()
  const url = new URL(req.url)
  const year = Number(url.searchParams.get('year') || new Date().getUTCFullYear())
  const quarter = Number(url.searchParams.get('quarter') || 1)
  const jurisdictionFilter = url.searchParams.get('jurisdiction') || '' // optional

  // Pull computed summary via DB, mirroring summary endpoint logic but local to this route
  const { from, to } = quarterRange(year, quarter)
  const { data: trips } = await supabaseAdmin.from('eld_trips').select('id').gte('start_time', from).lte('end_time', to)
  const tripIds = (trips||[]).map(t=>t.id)
  let milesByJuris: Record<string, number> = {}
  if (tripIds.length>0) {
    const { data: segs } = await supabaseAdmin.from('eld_trip_segments').select('jurisdiction_code, miles').in('trip_id', tripIds)
    for (const s of (segs||[])) { const c = s.jurisdiction_code || 'UNK'; milesByJuris[c]=(milesByJuris[c]||0)+Number(s.miles||0) }
  }
  const { data: fuel } = await supabaseAdmin.from('fuel_purchases').select('jurisdiction_code, gallons').gte('purchase_date', from).lte('purchase_date', to)
  const gallonsByJuris: Record<string, number> = {}
  let totalGallons = 0
  for (const f of (fuel||[])) { const c=f.jurisdiction_code||'UNK'; const g=Number(f.gallons||0); gallonsByJuris[c]=(gallonsByJuris[c]||0)+g; totalGallons+=g }
  const totalMiles = Object.values(milesByJuris).reduce((a,b)=>a+b,0)
  const fleetMPG = totalGallons>0 ? totalMiles/totalGallons : 0
  const { data: rates } = await supabaseAdmin.from('ifta_rates').select('jurisdiction_code, rate_per_gallon').eq('year', year).eq('quarter', quarter)
  const rateMap = new Map((rates||[]).map(r=>[r.jurisdiction_code, Number(r.rate_per_gallon||0)]))

  const codes = Array.from(new Set([...Object.keys(milesByJuris), ...Object.keys(gallonsByJuris)])).filter(c => jurisdictionFilter ? c===jurisdictionFilter : true)
  const rows = codes.map(code => {
    const miles = Number(milesByJuris[code]||0)
    const gallonsPurchased = Number(gallonsByJuris[code]||0)
    const taxableGallons = fleetMPG>0 ? miles/fleetMPG : 0
    const rate = rateMap.get(code) || 0
    const taxDue = taxableGallons * rate
    const taxPaid = gallonsPurchased * rate
    const netTax = taxDue - taxPaid
    return { code, miles, gallonsPurchased, taxableGallons, rate, taxDue, taxPaid, netTax }
  })

  // Build a concise PDF suitable for Texas IFTA filing summary
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792]) // Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const draw = (y: number, text: string, size = 12) => { page.drawText(text, { x: 40, y, size, font }) }

  let y = 740
  draw(y, `IFTA Quarterly Summary (TX Filing) — Q${quarter} ${year}`, 16); y -= 24
  draw(y, `Period: ${from} to ${to}`); y -= 16
  draw(y, `Fleet MPG: ${fleetMPG.toFixed(3)}  |  Total Miles: ${totalMiles.toFixed(1)}  |  Total Gallons: ${totalGallons.toFixed(3)}`); y -= 22
  draw(y, 'Jurisdiction  Miles     Gal Purch  Taxable Gal  Rate     Tax Due   Tax Paid   Net Tax'); y -= 14
  draw(y, '-----------  ---------  ----------  -----------  -------  --------  ---------  --------'); y -= 12

  const fmt = (n: number, d=2) => n.toFixed(d)
  let totals = { miles:0, gp:0, tg:0, due:0, paid:0, net:0 }
  for (const r of rows) {
    const line = `${(r.code||'UNK').padEnd(11)}  ${fmt(r.miles,1).padStart(9)}  ${fmt(r.gallonsPurchased,3).padStart(10)}  ${fmt(r.taxableGallons,3).padStart(11)}  ${fmt(r.rate,4).padStart(7)}  ${fmt(r.taxDue).padStart(8)}  ${fmt(r.taxPaid).padStart(9)}  ${fmt(r.netTax).padStart(8)}`
    draw(y, line, 10); y -= 12
    totals.miles += r.miles; totals.gp += r.gallonsPurchased; totals.tg += r.taxableGallons; totals.due += r.taxDue; totals.paid += r.taxPaid; totals.net += r.netTax
    if (y < 80) { y = 740; pdf.addPage([612,792]) }
  }
  y -= 10
  draw(y, '----------------------------------------------------------------------------------------'); y -= 14
  draw(y, `TOTALS        ${fmt(totals.miles,1).padStart(9)}  ${fmt(totals.gp,3).padStart(10)}  ${fmt(totals.tg,3).padStart(11)}           ${fmt(totals.due).padStart(8)}  ${fmt(totals.paid).padStart(9)}  ${fmt(totals.net).padStart(8)}`, 10)

  const bytes = await pdf.save()
  return new NextResponse(Buffer.from(bytes), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="ifta-q${quarter}-${year}.pdf"` } })
}
