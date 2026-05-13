/**
 * Type validation tests
 */

import { describe, it, expect } from 'vitest';
import type { AuthContext, AuthCredentials } from './types';

describe('Auth Types', () => {
  it('should compile AuthContext type', () => {
    const context: AuthContext = {
      userId: 'user-123',
      serviceId: 'auth-service',
      organizationId: 'org-123',
      sessionToken: 'session-token',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      cryptographicProof: {
        signature: 'sig',
        publicKey: 'pk',
        timestamp: new Date(),
        contextHash: 'hash',
      },
      authenticatedAt: new Date(),
      expiresAt: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla',
      mfaVerified: true,
      riskLevel: 'low',
    };
    expect(context.userId).toBe('user-123');
  });

  it('should compile AuthCredentials type', () => {
    const creds: AuthCredentials = {
      identifier: 'user@example.com',
      password: 'password123',
      totpCode: '123456',
    };
    expect(creds.identifier).toBe('user@example.com');
  });
});
