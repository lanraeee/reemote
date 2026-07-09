import { VercelRequest, VercelResponse } from '@vercel/node';
import * as bcrypt from 'bcryptjs';
import { executeQuerySingle } from '../../lib/db';
import { generateToken } from '../../lib/auth';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, totp_code } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await executeQuerySingle(
      'SELECT id, email, password_hash, is_admin, totp_enabled FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check TOTP if enabled
    if (user.totp_enabled && !totp_code) {
      return res.status(401).json({
        error: 'TOTP code required',
        requires_totp: true,
      });
    }

    // Update last login
    await executeQuerySingle(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const accessToken = generateToken(user.id, user.email, user.is_admin);
    const refreshToken = generateToken(
      user.id,
      user.email,
      user.is_admin,
      '7d'
    );

    return res.status(200).json({
      user_id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
