import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { requireAuth, sendUnauthorized } from '../lib/auth';
import { executeQuery, executeQuerySingle } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const claims = requireAuth(req);
  if (!claims) return sendUnauthorized(res);

  try {
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const vms = await executeQuery(
        `SELECT id, name, hostname, power_state, vcpu, memory_mb, disk_gb,
                os_type, vnc_port, spice_port, created_at, updated_at, metadata
         FROM virtual_machines
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return res.status(200).json({ vms, limit, offset });

    } else if (req.method === 'POST') {
      if (!claims.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { name, hostname, vcpu, cpu_cores, memory_mb, memory_gb, disk_gb, os_type, metadata } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Accept either vcpu or cpu_cores, memory_mb or memory_gb
      const resolvedVcpu = parseInt(vcpu ?? cpu_cores ?? 2);
      const resolvedMemoryMb = memory_mb
        ? parseInt(memory_mb)
        : memory_gb
        ? Math.round(parseFloat(memory_gb) * 1024)
        : 4096;
      const resolvedDiskGb = parseInt(disk_gb ?? 20);
      const resolvedOsType = os_type || 'linux';

      if (resolvedVcpu < 1 || resolvedVcpu > 256) {
        return res.status(400).json({ error: 'vcpu must be between 1 and 256' });
      }
      if (resolvedMemoryMb < 256) {
        return res.status(400).json({ error: 'memory must be at least 256 MB' });
      }
      if (resolvedDiskGb < 1) {
        return res.status(400).json({ error: 'disk must be at least 1 GB' });
      }

      const libvirtId = `vm-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${randomUUID().slice(0, 8)}`;

      const vm = await executeQuerySingle(
        `INSERT INTO virtual_machines
         (libvirt_id, name, hostname, vcpu, memory_mb, disk_gb, os_type, metadata, power_state, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'stopped', NOW(), NOW())
         RETURNING *`,
        [
          libvirtId,
          name,
          hostname || '',
          resolvedVcpu,
          resolvedMemoryMb,
          resolvedDiskGb,
          resolvedOsType,
          JSON.stringify(metadata || {}),
        ]
      );

      return res.status(201).json(vm);

    } else if (req.method === 'DELETE') {
      if (!claims.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'VM id required' });

      await executeQuerySingle(
        'UPDATE virtual_machines SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      return res.status(200).json({ success: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('VM endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
