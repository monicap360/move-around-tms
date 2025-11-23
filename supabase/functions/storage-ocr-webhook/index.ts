// Supabase Edge Function: storage-ocr-webhook
// Triggers on storage object.created for tickets/* in ronyx-files bucket
// Invokes OCR function and updates ticket row, broadcasts realtime event

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const event = await req.json()
    // Validate event
    if (!event || !event.record || !event.record.name) {
      return json({ error: 'Missing event.record.name' }, 400)
    }

    const bucket = event.record.bucket || event.bucket || 'ronyx-files'
    const objectPath = event.record.name
    // Only process tickets/*
    if (!objectPath.startsWith('tickets/')) {
      return json({ skip: true, reason: 'Not a ticket upload' })
    }

    // Extract ticket_id from path: tickets/<ticket_id>/<filename>
    const match = objectPath.match(/^tickets\/(\w+)[\/]/)
    if (!match) {
      return json({ error: 'Could not extract ticket_id from path', objectPath }, 400)
    }
    const ticket_id = match[1]

    // Get ticket row
    const { data: ticket, error: ticketError } = await supabase
      .from('aggregate_tickets')
      .select('*')
      .eq('id', ticket_id)
      .single()
    if (ticketError || !ticket) {
      return json({ error: 'Ticket not found', ticket_id }, 404)
    }

    // Build public file URL
    const file_url = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${objectPath}`

    // Call OCR function (unified)
    const ocrRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ocr-scan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url,
        ticket_id,
        organization_id: ticket.organization_id,
        driverId: ticket.driver_id,
        kind: 'ticket',
      })
    })
    const ocrData = await ocrRes.json()

    // Update ticket row with OCR results
    await supabase
      .from('aggregate_tickets')
      .update({
        ocr_json: ocrData,
        ocr_processed_at: new Date().toISOString(),
        status: ocrData.success ? 'ocr_completed' : ticket.status,
      })
      .eq('id', ticket_id)

    // Broadcast realtime event to dispatcher/driver
    await supabase.realtime.broadcast(
      `ticket:${ticket_id}:ocr`,
      'ocr_completed',
      { fields: ocrData.extracted_data || {}, ticket_id }
    )

    return json({ success: true, ticket_id, ocr: ocrData })
  } catch (error: any) {
    console.error('storage-ocr-webhook error:', error)
    return json({ error: error.message }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
