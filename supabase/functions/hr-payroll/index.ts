// Supabase Edge Function: hr-payroll
// HR + Payroll utilities: create payroll entries (with optional paystub), period summary, per-employee history, and contract PDF generation.
// Endpoints:
//  - POST /            -> create payroll entry (expects employee_id, pay period, hours/revenue/deductions)
//  - GET  /summary     -> call SQL RPC get_period_summary(p_period)
//  - GET  /driver      -> list payroll history for one employee (employee_id)
//  - POST /contract    -> generate a basic contract PDF and upload to storage

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function json(body: any, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(headers || {}) },
  })
}

// ────────────────────────────────────────────────
// Utility: gross / net calc (aligns with pay_type values used in app: 'hourly' | 'percentage' | 'salary')
function calcPay(entry: any, emp: any) {
  const d = Number(entry.deductions || 0)
  let g = 0

  if (emp.pay_type === 'hourly') g = Number(entry.total_hours || 0) * Number(emp.hourly_rate || 0)
  else if (emp.pay_type === 'percentage') g = Number(entry.load_revenue || 0) * (Number(emp.percentage_rate || 0) / 100)
  else if (emp.pay_type === 'salary') g = Number(emp.salary_amount || 0)

  const n = g - d
  return { gross: g, net: n }
}

// ────────────────────────────────────────────────
// Utility: make a simple PDF pay-stub
async function createPayStubPDF(emp: any, pay: any) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const draw = (y: number, text: string) => page.drawText(text, { x: 50, y, size: 12, font, color: rgb(0, 0, 0) })

  let y = 740
  draw(y, 'MoveAround TMS – Pay Stub'); y -= 25
  draw(y, `Employee: ${emp.full_name}`); y -= 18
  draw(y, `Role: ${emp.role_type ?? '-'}`); y -= 18
  draw(y, `Period: ${pay.pay_period_start} → ${pay.pay_period_end}`); y -= 18
  draw(y, `Pay Type: ${emp.pay_type}`); y -= 18
  draw(y, `Gross Pay: $${Number(pay.gross_pay ?? 0).toFixed(2)}`); y -= 18
  draw(y, `Deductions: $${Number(pay.deductions ?? 0).toFixed(2)}`); y -= 18
  draw(y, `Net Pay: $${Number(pay.net_pay ?? 0).toFixed(2)}`); y -= 18
  draw(y - 30, 'Thank you for keeping America moving!')

  return await pdf.save()
}

// ────────────────────────────────────────────────
// Utility: generic contract PDF
async function createContractPDF(emp: any, terms: string) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const draw = (y: number, t: string) => page.drawText(t, { x: 50, y, size: 12, font })
  let y = 740

  draw(y, 'Independent Contract / Employment Agreement'); y -= 30
  draw(y, `Employee: ${emp.full_name}`); y -= 20
  draw(y, `Role: ${emp.role_type ?? '-'}`); y -= 30
  const wrapped = terms.match(/.{1,80}/g) ?? []
  wrapped.forEach((line) => { draw(y, line); y -= 16 })

  return await pdf.save()
}

// ────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    // ─── POST  →  insert payroll entry ─────────────
    if (method === 'POST' && (path.endsWith('/hr-payroll') || path.endsWith('/hr-payroll/'))) {
      try {
        const body = await req.json()
        const { employee_id, pay_period_start, pay_period_end, total_hours, load_revenue, deductions } = body

        const { data: emp, error: empErr } = await supabase.from('employees').select('*').eq('id', employee_id).single()
        if (empErr || !emp) throw new Error('Employee not found')

        const { gross, net } = calcPay({ total_hours, load_revenue, deductions }, emp)

        const { data, error } = await supabase.from('payroll_entries').insert([
          {
            employee_id, pay_period_start, pay_period_end,
            total_hours, load_revenue, deductions,
            hourly_rate: emp.hourly_rate,
            percentage_rate: emp.percentage_rate,
            pay_type: emp.pay_type,
            gross_pay: gross, net_pay: net,
          },
        ]).select().single()
        if (error) throw error

        // Generate pay-stub PDF (best-effort)
        try {
          const stub = await createPayStubPDF(emp, data)
          await supabase.storage.from('paystubs').upload(
            `stubs/${employee_id}-${data.id}.pdf`,
            new Blob([stub], { type: 'application/pdf' }),
            { upsert: true }
          )
        } catch (e) {
          console.warn('Paystub upload failed (non-fatal):', e)
        }

        return json({ success: true, id: data.id, gross, net })
      } catch (err: any) {
        return json({ success: false, error: err.message }, 400)
      }
    }

    // ─── GET /summary  → totals by period ──────────
    if (method === 'GET' && path.endsWith('/hr-payroll/summary')) {
      const period = url.searchParams.get('period')
      const { data, error } = await supabase.rpc('get_period_summary', { p_period: period })
      if (error) return json({ error }, 400)
      return json(data)
    }

    // ─── GET /driver  →  history for one employee ─
    if (method === 'GET' && path.endsWith('/hr-payroll/driver')) {
      const id = url.searchParams.get('id')
      const { data, error } = await supabase
        .from('payroll_entries')
        .select('*')
        .eq('employee_id', id)
        .order('pay_period_end', { ascending: false })
      if (error) return json({ error }, 400)
      return json(data)
    }

    // ─── POST /contract  →  create contract PDF ────
    if (method === 'POST' && path.endsWith('/hr-payroll/contract')) {
      const { employee_id, terms } = await req.json()
      const { data: emp, error: empErr } = await supabase.from('employees').select('*').eq('id', employee_id).single()
      if (empErr || !emp) return json({ error: 'Employee not found' }, 404)
      try {
        const pdfBytes = await createContractPDF(emp, terms || '')
        await supabase.storage.from('contracts').upload(
          `contracts/${employee_id}-${Date.now()}.pdf`,
          new Blob([pdfBytes], { type: 'application/pdf' }),
          { upsert: true }
        )
        return json({ success: true })
      } catch (e: any) {
        return json({ success: false, error: e.message }, 400)
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })
  } catch (err: any) {
    console.error('hr-payroll error:', err)
    return json({ error: err.message }, 500)
  }
})
