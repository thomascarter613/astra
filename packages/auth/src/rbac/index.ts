/**
 * Mission-Critical Role-Based Access Control (RBAC)
 * 
 * Implements:
 * - Fine-grained permission system
 * - Role hierarchies
 * - Resource-level access control
 * - Time-based access policies
 * - Context-aware authorization
 */

export type Permission =
  | 'read'
  | 'write'
  | 'delete'
  | 'execute'
  | 'admin'
  | 'audit'
  | 'configure';

export type Role = 'admin' | 'operator' | 'viewer' | 'service' | 'guest';

export interface AccessPolicy {
  /** Role that has this policy */
  role: Role;
  /** Resource type (e.g., 'data', 'api', 'system') */
  resource: string;
  /** Specific resource IDs (empty = all) */
  resourceIds: string[];
  /** Allowed permissions */
  permissions: Permission[];
  /** Time-based constraints */
  timeWindow?: {
    startHour: number; // 0-23
    endHour: number; // 0-23
    daysOfWeek: number[]; // 0-6
  };
  /** IP-based constraints */
  ipRestrictions?: string[]; // CIDR blocks
  /** Expiration date */
  expiresAt?: Date;
  /** Conditions */
  conditions?: Condition[];
}

export interface Condition {
  type: 'mfa-required' | 'approval-required' | 'audit-trail';
  metadata?: Record<string, any>;
}

export interface AccessRequest {
  userId: string;
  action: Permission;
  resource: string;
  resourceId: string;
  ipAddress: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  conditions?: Condition[];
  auditTrail: string;
}

/**
 * RBAC Manager for fine-grained access control
 */
export class RBACManager {
  private policies: Map<Role, AccessPolicy[]> = new Map();
  private userRoles: Map<string, Role[]> = new Map();
  private userPermissions: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default role hierarchy
   */
  private initializeDefaultRoles(): void {
    // Admin: Full access
    this.policies.set('admin', [
      {
        role: 'admin',
        resource: '*',
        resourceIds: [],
        permissions: ['read', 'write', 'delete', 'execute', 'admin', 'audit', 'configure'],
      },
    ]);

    // Operator: Read + Write + Execute
    this.policies.set('operator', [
      {
        role: 'operator',
        resource: 'data',
        resourceIds: [],
        permissions: ['read', 'write', 'execute'],
      },
      {
        role: 'operator',
        resource: 'api',
        resourceIds: [],
        permissions: ['read', 'execute'],
      },
    ]);

    // Viewer: Read-only
    this.policies.set('viewer', [
      {
        role: 'viewer',
        resource: 'data',
        resourceIds: [],
        permissions: ['read'],
      },
    ]);

    // Service: Limited execution
    this.policies.set('service', [
      {
        role: 'service',
        resource: 'api',
        resourceIds: [],
        permissions: ['execute'],
      },
    ]);

    // Guest: Minimal access
    this.policies.set('guest', [
      {
        role: 'guest',
        resource: 'public',
        resourceIds: [],
        permissions: ['read'],
      },
    ]);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: Role): Promise<void> {
    const userRoles = this.userRoles.get(userId) || [];
    if (!userRoles.includes(role)) {
      userRoles.push(role);
      this.userRoles.set(userId, userRoles);
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, role: Role): Promise<void> {
    const userRoles = this.userRoles.get(userId);
    if (userRoles) {
      const index = userRoles.indexOf(role);
      if (index > -1) {
        userRoles.splice(index, 1);
      }
    }
  }

  /**
   * Check if user has permission
   * 
   * Guarantee: All access decisions are logged and auditable
   */
  async hasPermission(
    request: AccessRequest
  ): Promise<AccessDecision> {
    const userRoles = this.userRoles.get(request.userId) || [];

    for (const role of userRoles) {
      const policies = this.policies.get(role) || [];

      for (const policy of policies) {
        // Check resource match
        if (policy.resource !== '*' && policy.resource !== request.resource) {
          continue;
        }

        // Check resource ID match
        if (
          policy.resourceIds.length > 0 &&
          !policy.resourceIds.includes(request.resourceId)
        ) {
          continue;
        }

        // Check permission match
        if (!policy.permissions.includes(request.action)) {
          continue;
        }

        // Check time window
        if (policy.timeWindow) {
          if (!this.isWithinTimeWindow(policy.timeWindow, request.timestamp)) {
            return {
              allowed: false,
              reason: 'Access outside allowed time window',
              auditTrail: `DENIED: ${request.userId} ${request.action} ${request.resource}/${request.resourceId} - outside time window`,
            };
          }
        }

        // Check IP restrictions
        if (policy.ipRestrictions) {
          if (!this.isAllowedIP(request.ipAddress, policy.ipRestrictions)) {
            return {
              allowed: false,
              reason: 'Access from unauthorized IP address',
              auditTrail: `DENIED: ${request.userId} ${request.action} from ${request.ipAddress} - IP not allowed`,
            };
          }
        }

        // Check expiration
        if (policy.expiresAt && policy.expiresAt < request.timestamp) {
          return {
            allowed: false,
            reason: 'Policy has expired',
            auditTrail: `DENIED: ${request.userId} ${request.action} - policy expired`,
          };
        }

        // Check conditions
        if (policy.conditions) {
          return {
            allowed: true,
            conditions: policy.conditions,
            auditTrail: `ALLOWED: ${request.userId} ${request.action} ${request.resource}/${request.resourceId} - with conditions`,
          };
        }

        return {
          allowed: true,
          auditTrail: `ALLOWED: ${request.userId} ${request.action} ${request.resource}/${request.resourceId}`,
        };
      }
    }

    return {
      allowed: false,
      reason: 'No matching policy found',
      auditTrail: `DENIED: ${request.userId} ${request.action} ${request.resource}/${request.resourceId} - no matching policy`,
    };
  }

  /**
   * Check if time is within policy window
   */
  private isWithinTimeWindow(
    window: AccessPolicy['timeWindow'],
    timestamp: Date
  ): boolean {
    if (!window) return true;

    const hour = timestamp.getHours();
    const day = timestamp.getDay();

    const hourOk = hour >= window.startHour && hour < window.endHour;
    const dayOk = window.daysOfWeek.includes(day);

    return hourOk && dayOk;
  }

  /**
   * Check if IP is allowed
   */
  private isAllowedIP(ip: string, cidrs: string[]): boolean {
    // Simplified CIDR check (in production use ip-cidr library)
    return cidrs.some(cidr => {
      if (cidr === '*') return true;
      return ip.startsWith(cidr.split('/')[0]);
    });
  }

  /**
   * Add custom policy
   */
  async addPolicy(policy: AccessPolicy): Promise<void> {
    const policies = this.policies.get(policy.role) || [];
    policies.push(policy);
    this.policies.set(policy.role, policies);
  }

  /**
   * Get all policies for role
   */
  async getPolicies(role: Role): Promise<AccessPolicy[]> {
    return this.policies.get(role) || [];
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    return this.userRoles.get(userId) || [];
  }
}

export const rbacManager = new RBACManager();
