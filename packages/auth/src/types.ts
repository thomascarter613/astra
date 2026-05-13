/**
 * Core authentication & authorization types
 */

export interface AuthContext {
  /** Unique user identifier */
  userId: string;
  /** Unique service/application identifier */
  serviceId: string;
  /** Organization/tenant ID for multi-tenant systems */
  organizationId: string;
  /** Session token (rotates hourly) */
  sessionToken: string;
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token (longer TTL) */
  refreshToken: string;
  /** Cryptographic proof of authenticity */
  cryptographicProof: CryptoProof;
  /** Timestamp when authentication occurred */
  authenticatedAt: Date;
  /** Timestamp when session expires */
  expiresAt: Date;
  /** IP address of authenticated entity */
  ipAddress: string;
  /** User agent/device info */
  userAgent: string;
  /** MFA verified? */
  mfaVerified: boolean;
  /** Risk level (low/medium/high/critical) */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuthCredentials {
  /** Email or username */
  identifier: string;
  /** Password (will be hashed) */
  password: string;
  /** TOTP code for MFA */
  totpCode?: string;
  /** Hardware security key attestation */
  securityKeyAttestation?: AttestationObject;
}

export interface CryptoProof {
  /** Ed25519 signature of auth context */
  signature: string;
  /** Public key that created the signature */
  publicKey: string;
  /** Timestamp when proof was created */
  timestamp: Date;
  /** Hash of the auth context */
  contextHash: string;
}

export interface AttestationObject {
  /** CBOR-encoded attestation object */
  attestationObject: string;
  /** Client data JSON */
  clientDataJSON: string;
  /** Challenge that was signed */
  challenge: string;
}

export interface TokenPayload {
  /** Subject (user ID) */
  sub: string;
  /** Issued at */
  iat: number;
  /** Expiration time */
  exp: number;
  /** Issuer */
  iss: string;
  /** Audience */
  aud: string[];
  /** Permissions */
  permissions: string[];
  /** Roles */
  roles: string[];
  /** Session ID */
  sid: string;
}
