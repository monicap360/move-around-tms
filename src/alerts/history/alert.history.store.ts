// src/alerts/history/alert.history.store.ts
import { AlertHistoryRecord } from './alert.history.types'
import supabase from '../../../lib/supabase/server'

// Record alert in Supabase
export async function recordAlert(
  organizationId: string,
  alert: AlertHistoryRecord['details']
): Promise<AlertHistoryRecord> {
  const now = new Date().toISOString()
  const id = `${organizationId}:${alert.id}:${now}`
  const record: AlertHistoryRecord = {
    id,
    organizationId,
    alertId: alert.id,
    triggeredAt: now,
    acknowledged: false,
    details: alert,
  }
  const { error } = await supabase
    .from('alert_history')
    .insert([record])
  if (error) throw error
  return record
}

// Fetch alert history from Supabase
export async function getAlertHistory(
  organizationId: string,
  limit = 50
): Promise<AlertHistoryRecord[]> {
  const { data, error } = await supabase
    .from('alert_history')
    .select('*')
    .eq('organizationId', organizationId)
    .order('triggeredAt', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as AlertHistoryRecord[]
}

// Acknowledge alert in Supabase
export async function acknowledgeAlert(
  recordId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('alert_history')
    .update({ acknowledged: true, acknowledgedAt: new Date().toISOString() })
    .eq('id', recordId)
  if (error) throw error
  return true
}
