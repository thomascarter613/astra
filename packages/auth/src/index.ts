/**
 * Mission-Critical Authentication & Authorization Framework
 * 
 * This module provides cryptographically-verified authentication and
 * fine-grained authorization for the Astra system.
 * 
 * @module @astra/auth
 */

export { AuthManager } from './auth-manager';
export { SessionManager } from './session';
export { JWTManager } from './jwt';
export { RBACManager } from './rbac';
export { CryptoManager } from './crypto';
export { AuditLogger } from './audit';

export type { AuthContext, AuthCredentials } from './types';
export type { SessionToken, SessionMetadata } from './session';
export type { JWTPayload, JWTToken } from './jwt';
export type { Role, Permission, AccessPolicy } from './rbac';
export type { AuditEvent, AuditLog } from './audit';
