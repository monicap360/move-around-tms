import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ronyx-logistics-jwt-secret-change-in-production'
);

export async function createJWT(payload: {
  sub: string;
  email: string;
  role: string;
  name?: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .setIssuer('ronyx-logistics-tms')
    .setAudience('ronyx-logistics-users')
    .sign(secret);
}

export async function verifyJWT(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'ronyx-logistics-tms',
      audience: 'ronyx-logistics-users',
    });
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function refreshJWT(token: string): Promise<string | null> {
  try {
    const payload = await verifyJWT(token);
    
    // Create new token with extended expiry
    return createJWT({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    });
  } catch (error) {
    return null;
  }
}