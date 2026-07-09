import { VercelRequest, VercelResponse } from '@vercel/node';
import { executeQuery } from './lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Check database connectivity
    await executeQuery('SELECT 1');

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
}
