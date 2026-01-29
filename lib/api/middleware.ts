import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/types/load-plan'

export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return session
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth()

  if (session instanceof NextResponse) {
    return session
  }

  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return session
}

export async function getCompanyId(session: any): Promise<string> {
  if (!session.user.companyId) {
    throw new Error('User has no company assigned')
  }
  return session.user.companyId
}

