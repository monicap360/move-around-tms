import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const expectedToken = process.env.ADMIN_TOKEN
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) return unauthorized()

  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(parseInt(String(body.limit || '50'), 10), 200)
    const useLLM = Boolean(body.llm)

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id, message, created_at, driver_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const items = data || []

    if (useLLM && process.env.OPENAI_API_KEY) {
      const summary = await summarizeWithOpenAI(items)
      return NextResponse.json({ ok: true, summary, count: items.length })
    } else {
      const summary = summarizeHeuristically(items)
      return NextResponse.json({ ok: true, summary, count: items.length })
    }
  } catch (e: any) {
    console.error('notifications summarize error:', e)
    return NextResponse.json({ ok: false, message: 'Failed to summarize' }, { status: 500 })
  }
}

function summarizeHeuristically(list: { message: string; created_at: string }[]) {
  if (list.length === 0) return 'No notifications.'
  const docTypeCounts: Record<string, number> = {}
  let soonest: { date: string; msg: string } | null = null
  for (const n of list) {
    const m1 = n.message.match(/Document\s([^\s!]+)/i) || n.message.match(/Expiring document:\s([^\s]+)/i)
    const docType = m1?.[1]?.replace(/[:]/g, '') || 'Other'
    docTypeCounts[docType] = (docTypeCounts[docType] || 0) + 1
    const m2 = n.message.match(/on\s(\d{4}-\d{2}-\d{2})/) || n.message.match(/(\d{4}-\d{2}-\d{2})/)
    const d = m2?.[1]
    if (d) {
      if (!soonest || d < soonest.date) soonest = { date: d, msg: n.message }
    }
  }
  const total = list.length
  const parts = Object.entries(docTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${c} ${t}`)
  const head = `${total} expiring document${total === 1 ? '' : 's'}`
  const types = parts.length ? `: ${parts.join(', ')}` : ''
  const soon = soonest ? `. Soonest: ${soonest.date}` : ''
  return head + types + soon
}

async function summarizeWithOpenAI(list: { message: string; created_at: string }[]) {
  const apiKey = process.env.OPENAI_API_KEY!
  const content = list
    .slice()
    .reverse()
    .map((n) => `- ${n.created_at}: ${n.message}`)
    .join('\n')

  const prompt = `Summarize the following notifications for an HR/operations manager in one concise paragraph. Highlight counts by document type and the soonest expiration date if present.\n\n${content}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for HR compliance summaries.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 200,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI request failed: ${text}`)
  }
  const json = await res.json()
  return json.choices?.[0]?.message?.content || 'Summary unavailable.'
}
