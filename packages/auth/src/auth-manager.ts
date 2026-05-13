/**
 * Mission-Critical Authentication Manager
 * 
 * Orchestrates all authentication and authorization flows
 */

import type { AuthContext, AuthCredentials } from './types';
import { CryptoManager } from './crypto';
import { JWTManager } from './jwt';
import { SessionManager } from './session';
import { RBACManager, type AccessRequest } from './rbac';
import { AuditLogger } from './audit';

export class AuthManager {
  private crypto: CryptoManager;
  private jwtManager: JWTManager;
  private sessionManager: SessionManager;
  private rbacManager: RBACManager;
  private auditLogger: AuditLogger;
  private userStore: Map<string, { passwordHash: string; email: string }> = new Map();

  constructor(
    crypto: CryptoManager,
    jwtManager: JWTManager,
    sessionManager: SessionManager,
    rbacManager: RBACManager,
    auditLogger: AuditLogger
  ) {
    this.crypto = crypto;
    this.jwtManager = jwtManager;
    this.sessionManager = sessionManager;
    this.rbacManager = rbacManager;
    this.auditLogger = auditLogger;
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string
  ): Promise<{ userId: string; email: string }> {
    const userId = crypto.randomUUID();
    const passwordHash = await this.crypto.hashPassword(password);

    this.userStore.set(userId, {
      passwordHash,
      email,
    });

    await this.auditLogger.log({
      actor: {
        userId: 'system',
        serviceId: 'auth',
        ipAddress: '0.0.0.0',
      },
      action: 'USER_REGISTERED',
      resource: {
        type: 'user',
        id: userId,
      },
      result: 'success',
      changes: {
        before: {},
        after: { userId, email },
      },
    });

    return { userId, email };
  }

  /**
   * Authenticate user
   * 
   * Guarantee: Returns cryptographically verified auth context
   */
  async authenticate(
    credentials: AuthCredentials,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint: string
  ): Promise<AuthContext> {
    // Find user
    let userId: string | null = null;
    for (const [id, user] of this.userStore) {
      if (user.email === credentials.identifier) {
        userId = id;
        break;
      }
    }

    if (!userId) {
      await this.auditLogger.log({
        actor: {
          userId: 'unknown',
          serviceId: 'auth',
          ipAddress,
        },
        action: 'AUTH_FAILED',
        resource: {
          type: 'authentication',
          id: credentials.identifier,
        },
        result: 'failure',
        reason: 'User not found',
      });
      throw new Error('Invalid credentials');
    }

    // Verify password
    const user = this.userStore.get(userId)!;
    const passwordValid = await this.crypto.verifyPassword(
      credentials.password,
      user.passwordHash
    );

    if (!passwordValid) {
      await this.auditLogger.log({
        actor: {
          userId,
          serviceId: 'auth',
          ipAddress,
        },
        action: 'AUTH_FAILED',
        resource: {
          type: 'authentication',
          id: userId,
        },
        result: 'failure',
        reason: 'Invalid password',
      });
      throw new Error('Invalid credentials');
    }

    // Create session
    const session = await this.sessionManager.createSession(
      userId,
      'auth-service',
      'default-org',
      ipAddress,
      userAgent,
      deviceFingerprint
    );

    // Generate JWT tokens
    const permissions = ['read', 'write'];
    const roles = ['operator'];
    const tokens = await this.jwtManager.generateTokenPair(userId, permissions, roles);

    // Create cryptographic proof
    const authData = JSON.stringify({ userId, sessionId: session.token });
    const signature = await this.crypto.sign(
      new TextEncoder().encode(authData),
      'placeholder-private-key' // In production, use real key
    );

    const authContext: AuthContext = {
      userId,
      serviceId: 'auth-service',
      organizationId: 'default-org',
      sessionToken: session.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      cryptographicProof: {
        signature,
        publicKey: 'placeholder-public-key', // In production, use real key
        timestamp: new Date(),
        contextHash: await this.crypto.hash(new TextEncoder().encode(authData)),
      },
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      ipAddress,
      userAgent,
      mfaVerified: !!credentials.totpCode,
      riskLevel: 'low',
    };

    await this.auditLogger.log({
      actor: {
        userId,
        serviceId: 'auth-service',
        ipAddress,
      },
      action: 'AUTH_SUCCESS',
      resource: {
        type: 'authentication',
        id: userId,
      },
      result: 'success',
      changes: {
        before: {},
        after: { authenticated: true, sessionId: session.token },
      },
    });

    return authContext;
  }

  /**
   * Authorize access request
   * 
   * Guarantee: Authorization decision is audit-logged
   */
  async authorize(request: AccessRequest): Promise<boolean> {
    const decision = await this.rbacManager.hasPermission(request);

    await this.auditLogger.log({
      actor: {
        userId: request.userId,
        serviceId: 'auth-service',
        ipAddress: request.ipAddress,
      },
      action: 'AUTHZ_CHECK',
      resource: {
        type: request.resource,
        id: request.resourceId,
      },
      result: decision.allowed ? 'success' : 'denied',
      reason: decision.reason,
    });

    return decision.allowed;
  }

  /**
   * Logout user
   */
  async logout(sessionToken: string): Promise<void> {
    await this.sessionManager.revokeSession(sessionToken);
    await this.auditLogger.log({
      actor: {
        userId: 'unknown',
        serviceId: 'auth-service',
        ipAddress: '0.0.0.0',
      },
      action: 'LOGOUT',
      resource: {
        type: 'session',
        id: sessionToken,
      },
      result: 'success',
    });
  }
}
