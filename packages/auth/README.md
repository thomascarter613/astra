# @astra/auth

Mission-Critical Authentication & Authorization Framework

This package provides production-grade authentication and authorization with cryptographic guarantees.

## Features

✅ **Ed25519 Cryptographic Signing** - Non-forgeable authentication proofs  
✅ **JWT Token Management** - Secure token generation and validation  
✅ **Session Management** - Hourly token rotation with automatic cleanup  
✅ **Role-Based Access Control (RBAC)** - Fine-grained permissions  
✅ **Audit Logging** - Hash-chained immutable audit trail  
✅ **Zero-Trust** - Every access requires verification  
✅ **Formal Verification Ready** - Type-safe TypeScript implementation  

## Quick Start

```typescript
import {
  AuthManager,
  CryptoManager,
  JWTManager,
  SessionManager,
  RBACManager,
  AuditLogger,
} from '@astra/auth';

// Initialize components
const crypto = new CryptoManager();
const jwtManager = new JWTManager({
  issuer: 'astra',
  audience: ['astra-api'],
  accessTokenTTL: 900, // 15 minutes
  refreshTokenTTL: 604800, // 7 days
  privateKeyHex: process.env.JWT_PRIVATE_KEY!,
  publicKeyHex: process.env.JWT_PUBLIC_KEY!,
});
const sessionManager = new SessionManager();
const rbacManager = new RBACManager();
const auditLogger = new AuditLogger();

// Create auth manager
const authManager = new AuthManager(
  crypto,
  jwtManager,
  sessionManager,
  rbacManager,
  auditLogger
);

// Register user
const user = await authManager.register('user@example.com', 'password123');

// Authenticate
const context = await authManager.authenticate(
  {
    identifier: 'user@example.com',
    password: 'password123',
  },
  '192.168.1.1',
  'Mozilla/5.0',
  'device-fingerprint'
);

// Authorize access
const allowed = await authManager.authorize({
  userId: context.userId,
  action: 'read',
  resource: 'data',
  resourceId: 'data-123',
  ipAddress: '192.168.1.1',
  timestamp: new Date(),
});
```

## Architecture

### Components

1. **CryptoManager** - Cryptographic operations (signing, encryption, hashing)
2. **JWTManager** - JWT token generation and verification
3. **SessionManager** - Session lifecycle management with rotation
4. **RBACManager** - Role-based access control policies
5. **AuditLogger** - Immutable audit trail with hash chaining

### Authentication Flow

```
User Credentials
      ↓
  ┌─────────────────────┐
  │ Password Validation  │
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ Session Creation    │
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ JWT Generation      │
  └──────────┬──────────┘
             ↓
  ┌─────────────────────┐
  │ Cryptographic Proof │
  └──────────┬──────────┘
             ↓
        AuthContext
```

### Authorization Flow

```
Access Request
      ↓
  ┌──────────────────┐
  │ Check User Roles │
  └────────┬─────────┘
           ↓
  ┌──────────────────┐
  │ Match Policies   │
  └────────┬─────────┘
           ↓
  ┌──────────────────┐
  │ Verify Time/IP   │
  └────────┬─────────┘
           ↓
  ┌──────────────────┐
  │ Audit & Return   │
  └────────┬─────────┘
           ↓
    AccessDecision
```

## Security Guarantees

### Cryptographic
- **Ed25519 Signing**: Non-forgeable digital signatures (EdDSA, RFC 8037)
- **AES-256-GCM**: Authenticated encryption for sensitive data
- **SHA-256/SHA-512**: Collision-resistant hashing
- **bcrypt**: Computationally expensive password hashing (resistant to brute force)

### Authentication
- **Constant-Time Comparisons**: Prevent timing attacks
- **Secure Random Generation**: CSPRNG for all random values
- **Session Rotation**: Hourly automatic token rotation
- **Concurrent Limits**: Configurable session limits per user

### Authorization
- **Principle of Least Privilege**: Users only get required permissions
- **Time-Based Access**: Restrict access to specific time windows
- **IP-Based Restrictions**: Limit access by IP/CIDR blocks
- **Policy Expiration**: Automatic policy invalidation

### Audit Trail
- **Hash Chaining**: Detect any tampering or corruption
- **Immutable Log**: Events cannot be modified or deleted
- **Event Streaming**: Real-time event notifications
- **Full Context**: Complete audit information for compliance

## Testing

```bash
bun test
```

## References

- RFC 7519: JSON Web Token (JWT)
- RFC 8037: CFRG Elliptic Curve Diffie-Hellman (ECDH) and Signatures (EdDSA)
- NIST SP 800-132: Password-Based Key Derivation
- OWASP: Authentication Cheat Sheet
