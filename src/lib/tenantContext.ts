// ============================================================================
// PCIS Multi-Tenant Data Isolation
// ============================================================================
// Every API call and data query MUST go through this layer to ensure
// tenants only see their own data. This is the server-side enforcement.
// ============================================================================

import { auth, currentUser } from '@clerk/nextjs/server'

export interface TenantContext {
  userId: string
  orgId: string
  orgName: string
  role: 'admin' | 'advisor' | 'viewer'
  maxSeats: number
}

// Get the current tenant context from Clerk — use in API routes
export async function getTenantContext(): Promise<TenantContext | null> {
  const { userId, orgId, orgRole } = await auth()

  if (!userId) return null

  const user = await currentUser()
  if (!user) return null

  // Map Clerk org role to PCIS role
  let role: 'admin' | 'advisor' | 'viewer' = 'viewer'
  if (orgRole === 'org:admin') role = 'admin'
  else if (orgRole === 'org:member') role = 'advisor'

  // Get org metadata for seat limits
  const resolvedOrgId = orgId || `personal_${userId}`

  return {
    userId,
    orgId: resolvedOrgId,
    orgName: user.firstName ? `${user.firstName}'s Workspace` : 'PCIS',
    role,
    maxSeats: 5, // Override from org metadata in production
  }
}

// Scoped data filter — attach to all database queries
export function tenantFilter(ctx: TenantContext) {
  return {
    organizationId: ctx.orgId,
  }
}

// Check if user has permission for an action
export function hasPermission(ctx: TenantContext, action: 'read' | 'write' | 'admin'): boolean {
  switch (action) {
    case 'read':
      return true // All roles can read
    case 'write':
      return ctx.role === 'admin' || ctx.role === 'advisor'
    case 'admin':
      return ctx.role === 'admin'
    default:
      return false
  }
}

// Ensure a resource belongs to the current tenant
export function assertTenantOwnership(ctx: TenantContext, resourceOrgId: string): void {
  if (resourceOrgId !== ctx.orgId) {
    throw new Error('Access denied: resource belongs to a different organization')
  }
}
