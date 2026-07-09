import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, sendUnauthorized } from '../lib/auth';
import { executeQuery, executeQuerySingle } from '../lib/db';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const claims = requireAuth(req);
  if (!claims) {
    return sendUnauthorized(res);
  }

  try {
    if (req.method === 'GET') {
      // List VMs
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const vms = await executeQuery(
        `SELECT id, name, hostname, power_state, cpu_cores, memory_gb, disk_gb,
                created_at, updated_at, metadata
         FROM virtual_machines
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return res.status(200).json({
        vms,
        limit,
        offset,
      });
    } else if (req.method === 'POST') {
      // Create VM (admin only)
      if (!claims.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { name, hostname, cpu_cores, memory_gb, disk_gb, metadata } =
        req.body;

      if (!name || !hostname) {
        return res.status(400).json({ error: 'Name and hostname required' });
      }

      const vm = await executeQuerySingle(
        `INSERT INTO virtual_machines
         (name, hostname, cpu_cores, memory_gb, disk_gb, metadata, power_state, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          name,
          hostname,
          cpu_cores || 2,
          memory_gb || 4,
          disk_gb || 20,
          JSON.stringify(metadata || {}),
          'stopped',
        ]
      );

      return res.status(201).json(vm);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('VM endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
