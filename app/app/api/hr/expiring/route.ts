import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side admin client
function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('driver_documents_expiring')
    .select('*')
    .order('expiration_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}
