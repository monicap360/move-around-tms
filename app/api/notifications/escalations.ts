// app/api/notifications/escalations.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEscalationRules, setEscalationRules } from '@/src/notifications/escalation/escalation.store'

function getOrganizationId(req: NextRequest): string {
  const org = req.headers.get('x-organization-id')
  if (!org) throw new Error('Missing organization context')
  return org
}

export async function GET(req: NextRequest) {
  try {
    const organizationId = getOrganizationId(req)
    const rules = getEscalationRules(organizationId)
    return NextResponse.json(rules, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to load escalation rules' }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const organizationId = getOrganizationId(req)
    const updates = await req.json()
    setEscalationRules(organizationId, updates)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to update escalation rules' }, { status: 400 })
  }
}
