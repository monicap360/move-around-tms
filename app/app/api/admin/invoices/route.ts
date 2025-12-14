import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
function authorize(req: NextRequest) { return req.headers.get('authorization') === `Bearer ${ADMIN_TOKEN}` }

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  let query = supabaseAdmin.from('invoices').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data })
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // compute totals
  const items = Array.isArray(body.line_items) ? body.line_items : []
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.quantity * it.unit_price) || 0), 0)
  const tax_rate = Number(body.tax_rate || 0)
  const tax_amount = Math.round((subtotal * tax_rate) * 100) / 100
  const total = Math.round((subtotal + tax_amount) * 100) / 100

  // get invoice number
  const { data: numRow, error: numErr } = await supabaseAdmin.rpc('generate_invoice_number', { prefix: body.invoice_type === 'Quote' ? 'QUO' : 'INV' })
  if (numErr) return NextResponse.json({ error: numErr.message }, { status: 500 })

  const payload = {
    invoice_number: numRow as string,
    invoice_type: body.invoice_type || 'Invoice',
    quote_id: body.quote_id || null,
    company: body.company,
    contact_name: body.contact_name || null,
    contact_email: body.contact_email || null,
    billing_address: body.billing_address || null,
    line_items: items,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    notes: body.notes || null,
    terms: body.terms || null,
    due_date: body.due_date || null,
    status: body.status || 'Draft',
    customer_id: body.customer_id || null,
    ar_status: body.ar_status || 'Open',
    factoring_company_id: body.factoring_company_id || null,
    movement_type: body.movement_type || null,
    primary_state: body.primary_state || null,
  }

  const { data, error } = await supabaseAdmin.from('invoices').insert(payload).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}

export async function PATCH(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const id = body?.id
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('invoices').update(body).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoice: data })
}
