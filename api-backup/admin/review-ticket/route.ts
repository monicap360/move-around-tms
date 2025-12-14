import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// PATCH /api/admin/review-ticket
// Manager approval, denial, edit, or reassignment of aggregate tickets
// Requires admin token for authorization

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
}

export async function PATCH(req: NextRequest) {
  // Verify admin token
  const authHeader = req.headers.get('authorization') || ''
  const expectedToken = process.env.ADMIN_TOKEN

  if (!expectedToken) {
    console.warn('ADMIN_TOKEN not set')
    return unauthorized()
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return unauthorized()
  }

  // Parse request body
  let body: {
    ticketId: string
    action: 'approve' | 'deny' | 'edit' | 'reassign' | 'void' | 'delete'
    driverId?: string
    edits?: {
      ticket_number?: string
      material?: string
      quantity?: number
      pay_rate?: number
      bill_rate?: number
      ticket_date?: string
    }
    notes?: string
  }

  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const { ticketId, action, driverId, edits, notes } = body

  if (!ticketId || !action) {
    return NextResponse.json(
      { ok: false, message: 'Missing required fields: ticketId, action' },
      { status: 400 }
    )
  }

  try {
    let updateData: any = {}

    switch (action) {
      case 'approve':
        updateData = { status: 'Approved' }
        break

      case 'deny':
        updateData = { status: 'Denied', notes: notes || 'Denied by manager' }
        break

      case 'reassign':
        if (!driverId) {
          return NextResponse.json(
            { ok: false, message: 'driverId required for reassignment' },
            { status: 400 }
          )
        }
        updateData = { driver_id: driverId, auto_matched: false }
        break

      case 'edit':
        if (!edits) {
          return NextResponse.json(
            { ok: false, message: 'edits object required for edit action' },
            { status: 400 }
          )
        }
        updateData = { ...edits }
        // Recalculate totals if quantity or rates changed
        if (edits.quantity || edits.pay_rate || edits.bill_rate) {
          const { data: ticket } = await supabaseAdmin
            .from('aggregate_tickets')
            .select('quantity, pay_rate, bill_rate')
            .eq('id', ticketId)
            .single()

          const quantity = edits.quantity ?? ticket?.quantity ?? 0
          const payRate = edits.pay_rate ?? ticket?.pay_rate ?? 0
          const billRate = edits.bill_rate ?? ticket?.bill_rate ?? 0

          updateData.total_pay = quantity * payRate
          updateData.total_bill = quantity * billRate
          updateData.total_profit = quantity * (billRate - payRate)
        }
        break

      case 'void':
        // Soft-delete for payroll: mark ticket as voided and set status
        updateData = { voided: true, voided_at: new Date().toISOString(), status: 'Voided' }
        break

      case 'delete':
        // Hard delete the ticket
        {
          const { error: delError } = await supabaseAdmin
            .from('aggregate_tickets')
            .delete()
            .eq('id', ticketId)

          if (delError) {
            console.error('Failed to delete ticket', delError)
            return NextResponse.json(
              { ok: false, message: delError.message || 'Failed to delete ticket' },
              { status: 500 }
            )
          }
          return NextResponse.json({ ok: true, action: 'delete', ticketId })
        }

      default:
        return NextResponse.json(
          { ok: false, message: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update the ticket
    const { data, error } = await supabaseAdmin
      .from('aggregate_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update ticket', error)
      return NextResponse.json(
        { ok: false, message: error.message || 'Failed to update ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, action, ticket: data })
  } catch (error: any) {
    console.error('Unexpected error reviewing ticket', error)
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
