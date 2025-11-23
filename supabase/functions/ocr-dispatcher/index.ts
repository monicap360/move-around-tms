// Supabase Edge Function: ocr-dispatcher
// Purpose: Single endpoint to accept OCR ingestion requests and route them to the
// appropriate handler: aggregate ticket OCR (ocr-scan) or HR doc OCR (hr-ocr).
// Usage:
//  POST body examples
//  - { kind: 'ticket', imageUrl: 'https://...' , driverId?: string }
//  - { kind: 'hr', file_url: 'https://...' , full_name_hint?: string, driverId?: string }
// If kind is omitted, we do a best-effort inference based on fields.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const incomingAuth = req.headers.get('authorization')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const baseUrl = Deno.env.get('SUPABASE_URL')
    if (!baseUrl) return json({ error: 'SUPABASE_URL not configured' }, 500)

    const body = await req.json()
    const kind: 'ticket' | 'hr' | undefined = body.kind

    let targetPath: string
    let payload: any

    if (kind === 'ticket' || (!kind && (body.imageUrl || body.imageBase64))) {
      targetPath = '/functions/v1/ocr-scan'
      payload = {
        imageUrl: body.imageUrl,
        imageBase64: body.imageBase64,
        driverId: body.driverId,
        fleetId: body.fleetId,
      }
    } else if (kind === 'hr' || (!kind && (body.file_url || body.imageUrl))) {
      // hr-ocr expects file_url
      targetPath = '/functions/v1/hr-ocr'
      payload = {
        file_url: body.file_url || body.imageUrl,
        full_name_hint: body.full_name_hint,
        driverId: body.driverId,
      }
    } else {
      return json({ error: 'Unable to infer OCR kind. Provide kind = "ticket" or "hr".' }, 400)
    }

    const url = `${baseUrl}${targetPath}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: incomingAuth || (anonKey ? `Bearer ${anonKey}` : ''),
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (err: any) {
    console.error('ocr-dispatcher error:', err)
    return json({ error: err.message }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
