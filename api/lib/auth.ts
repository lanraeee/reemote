import jwt from 'jsonwebtoken';
import { VercelRequest, VercelResponse } from '@vercel/node';

export interface TokenClaims {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

export function generateToken(
  userId: string,
  email: string,
  isAdmin: boolean,
  expiresIn: string = '15m'
): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET not configured or too short');
  }

  return jwt.sign(
    {
      userId,
      email,
      isAdmin,
    },
    secret,
    { expiresIn } as { expiresIn: any }
  );
}

export function validateToken(token: string): TokenClaims | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    return jwt.verify(token, secret) as TokenClaims;
  } catch {
    return null;
  }
}

export function getAuthToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }
  return auth.substring(7);
}

export function requireAuth(req: VercelRequest): TokenClaims | null {
  const token = getAuthToken(req);
  if (!token) {
    return null;
  }
  return validateToken(token);
}

export function sendUnauthorized(res: VercelResponse): void {
  res.status(401).json({ error: 'Unauthorized' });
}

export function sendForbidden(res: VercelResponse): void {
  res.status(403).json({ error: 'Forbidden' });
}
