import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/admin/add-user
// Create a new user in Supabase Auth and assign a role in user_roles
// Requires admin token for authorization

type Role = 'owner' | 'admin' | 'manager' | 'hr' | 'office' | 'driver'

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
}

export async function POST(req: NextRequest) {
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
    email: string
    password: string
    role: Role
    company?: string
  }

  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password, role, company = 'Ronyx Logistics LLC' } = body

  if (!email || !password || !role) {
    return NextResponse.json(
      { ok: false, message: 'Missing required fields: email, password, role' },
      { status: 400 }
    )
  }

  // Validate role
  const validRoles: Role[] = ['owner', 'admin', 'manager', 'hr', 'office', 'driver']
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { ok: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
      { status: 400 }
    )
  }

  // Create user in Supabase Auth using admin client
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email (set false if you want them to verify)
  })

  if (authError || !authData.user) {
    console.error('Failed to create user in auth', authError)
    return NextResponse.json(
      { ok: false, message: authError?.message || 'Failed to create user' },
      { status: 500 }
    )
  }

  const userId = authData.user.id

  // Insert role assignment in user_roles
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({ user_id: userId, role, company })

  if (roleError) {
    console.error('Failed to assign role', roleError)
    // User was created but role assignment failed; you might want to delete the user or handle this
    return NextResponse.json(
      {
        ok: false,
        message: 'User created but role assignment failed',
        details: roleError.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    user: { id: userId, email },
    role: { role, company },
    confirmationRequired: false, // We auto-confirmed above
  })
}
