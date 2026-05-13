/**
 * Mission-Critical Session Management
 * 
 * Implements:
 * - Hourly session token rotation
 * - Secure session storage
 * - Session expiration and cleanup
 * - Concurrent session limits
 */

import { v4 as uuidv4 } from 'uuid';
import { cryptoManager } from '../crypto';

export interface SessionToken {
  /** Unique session token */
  token: string;
  /** User ID */
  userId: string;
  /** Service ID */
  serviceId: string;
  /** Organization ID */
  organizationId: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last rotated timestamp */
  lastRotatedAt: Date;
  /** Expires timestamp */
  expiresAt: Date;
  /** IP address when created */
  ipAddress: string;
  /** User agent */
  userAgent: string;
  /** Active? */
  active: boolean;
  /** Metadata */
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  /** Device fingerprint */
  deviceFingerprint: string;
  /** Geographic location */
  location?: {
    country: string;
    city: string;
  };
  /** MFA method used */
  mfaMethod?: 'totp' | 'webauthn' | 'sms';
  /** Risk score (0-100) */
  riskScore: number;
  /** Number of times rotated */
  rotationCount: number;
}

/**
 * Session Manager for secure session handling
 */
export class SessionManager {
  private sessions: Map<string, SessionToken> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // User ID -> Session tokens
  private rotationIntervalMs = 60 * 60 * 1000; // 1 hour
  private maxSessionDurationMs = 24 * 60 * 60 * 1000; // 24 hours
  private maxConcurrentSessions = 5;

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    serviceId: string,
    organizationId: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint: string
  ): Promise<SessionToken> {
    // Check concurrent session limit
    const userSessions = this.userSessions.get(userId) || new Set();
    if (userSessions.size >= this.maxConcurrentSessions) {
      // Revoke oldest session
      const oldestToken = Array.from(userSessions)[0];
      await this.revokeSession(oldestToken);
    }

    const token = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.maxSessionDurationMs);

    const session: SessionToken = {
      token,
      userId,
      serviceId,
      organizationId,
      createdAt: now,
      lastRotatedAt: now,
      expiresAt,
      ipAddress,
      userAgent,
      active: true,
      metadata: {
        deviceFingerprint,
        riskScore: 0,
        rotationCount: 0,
      },
    };

    this.sessions.set(token, session);
    if (!userSessions) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(token);

    return session;
  }

  /**
   * Get session by token
   */
  async getSession(token: string): Promise<SessionToken | null> {
    const session = this.sessions.get(token);
    if (!session) return null;

    // Check expiration
    if (session.expiresAt < new Date()) {
      await this.revokeSession(token);
      return null;
    }

    return session;
  }

  /**
   * Rotate session token (hourly)
   */
  async rotateSession(oldToken: string): Promise<string | null> {
    const session = await this.getSession(oldToken);
    if (!session) return null;

    // Check if enough time has passed
    const timeSinceRotation =
      new Date().getTime() - session.lastRotatedAt.getTime();
    if (timeSinceRotation < this.rotationIntervalMs) {
      return oldToken; // Not time to rotate yet
    }

    // Create new token
    const newToken = uuidv4();
    const now = new Date();

    session.token = newToken;
    session.lastRotatedAt = now;
    session.metadata.rotationCount += 1;

    this.sessions.delete(oldToken);
    this.sessions.set(newToken, session);

    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(oldToken);
      userSessions.add(newToken);
    }

    return newToken;
  }

  /**
   * Revoke session
   */
  async revokeSession(token: string): Promise<void> {
    const session = this.sessions.get(token);
    if (!session) return;

    session.active = false;
    this.sessions.delete(token);

    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(token);
    }
  }

  /**
   * Revoke all sessions for user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) return;

    for (const token of userSessions) {
      const session = this.sessions.get(token);
      if (session) {
        session.active = false;
        this.sessions.delete(token);
      }
    }

    this.userSessions.delete(userId);
  }

  /**
   * Update session risk score
   */
  async updateSessionRiskScore(token: string, riskScore: number): Promise<void> {
    const session = this.sessions.get(token);
    if (session) {
      session.metadata.riskScore = riskScore;
      // If risk is critical, revoke session
      if (riskScore > 80) {
        await this.revokeSession(token);
      }
    }
  }
}

export const sessionManager = new SessionManager();
