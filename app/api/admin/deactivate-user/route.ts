import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// DELETE /api/admin/deactivate-user
// Deactivate a user (delete from auth and remove roles)
// Requires admin token for authorization

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
}

export async function DELETE(req: NextRequest) {
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
  let body: { userId: string }

  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const { userId } = body

  if (!userId) {
    return NextResponse.json(
      { ok: false, message: 'Missing required field: userId' },
      { status: 400 }
    )
  }

  // Delete user from auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (authError) {
    console.error('Failed to delete user from auth', authError)
    return NextResponse.json(
      { ok: false, message: authError.message || 'Failed to deactivate user' },
      { status: 500 }
    )
  }

  // Remove roles (cascade should handle this, but explicit is safer)
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)

  if (roleError) {
    console.warn('Failed to delete user roles (may have already been cascaded)', roleError)
  }

  return NextResponse.json({ ok: true, deactivated: userId })
}
