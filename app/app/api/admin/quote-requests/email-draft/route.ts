import { NextRequest, NextResponse } from 'next/server'

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
function authorize(req: NextRequest) { return req.headers.get('authorization') === `Bearer ${ADMIN_TOKEN}` }

export async function POST(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const name: string = body?.name || 'there'
  const company: string | undefined = body?.company

  const subject = `Your Aggregate Hauling Quote Request`
  const greeting = name && name.toLowerCase() !== 'there' ? `Hi ${name},` : `Hello,`
  const companyLine = company ? `${company} — ` : ''
  const text = [
    `${greeting}`,
    '',
    `Thanks for reaching out about aggregate hauling. ${companyLine}we'd love to help. To provide accurate pricing, please confirm:`,
    '',
    `• Material type and source`,
    `• Pickup and delivery locations`,
    `• Estimated tonnage or loads`,
    `• Desired timeline and any special requirements`,
    '',
    `Once we have those details, we’ll send a formal quote the same day.`,
    '',
    `Best regards,`,
    `Ronyx Logistics LLC`,
    `quotes@ronyxlogistics.com`,
  ].join('\n')

  const html = `
  <p>${greeting}</p>
  <p>Thanks for reaching out about aggregate hauling. ${companyLine}we'd love to help. To provide accurate pricing, please confirm:</p>
  <ul>
    <li>Material type and source</li>
    <li>Pickup and delivery locations</li>
    <li>Estimated tonnage or loads</li>
    <li>Desired timeline and any special requirements</li>
  </ul>
  <p>Once we have those details, we’ll send a formal quote the same day.</p>
  <p>Best regards,<br/>Ronyx Logistics LLC<br/>quotes@ronyxlogistics.com</p>
  `

  return NextResponse.json({ subject, text, html })
}
