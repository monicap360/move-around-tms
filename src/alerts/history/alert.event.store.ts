// src/alerts/history/alert.event.store.ts
import { AlertEvent } from './alert.event.types'
import supabase from '../../../lib/supabase/server'

// Append alert event to Supabase
export async function appendAlertEvent(event: AlertEvent): Promise<void> {
  const { error } = await supabase
    .from('alert_events')
    .insert([event])
  if (error) throw error
}

// Fetch alert events from Supabase
export async function getAlertEvents(organizationId: string, limit = 50): Promise<AlertEvent[]> {
  const { data, error } = await supabase
    .from('alert_events')
    .select('*')
    .eq('organizationId', organizationId)
    .order('triggeredAt', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as AlertEvent[]
}

// Acknowledge alert event in Supabase
export async function acknowledgeAlertEvent(id: string, user: string): Promise<boolean> {
  const { error } = await supabase
    .from('alert_events')
    .update({ acknowledgedAt: new Date().toISOString(), acknowledgedBy: user })
    .eq('id', id)
  if (error) throw error
  return true
}
