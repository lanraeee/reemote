import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, sendUnauthorized, sendForbidden } from '../../lib/auth';
import { executeQuerySingle } from '../../lib/db';
import {
  listManagedContainers,
  provisionContainer,
  startContainer,
  stopContainer,
  removeContainer,
  OS_IMAGES,
} from '../../lib/docker';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const claims = requireAuth(req);
  if (!claims) return sendUnauthorized(res);
  if (!claims.isAdmin) return sendForbidden(res);

  const { containerId, action } = req.query;

  try {
    // GET /api/v1/admin/containers — list all managed containers
    if (req.method === 'GET' && !containerId) {
      const containers = await listManagedContainers();
      return res.json({ containers, availableImages: OS_IMAGES });
    }

    // POST /api/v1/admin/containers — provision a new container for a VM
    if (req.method === 'POST' && !containerId) {
      const { vmId, vncPassword } = req.body || {};
      if (!vmId) return res.status(400).json({ error: 'vmId is required' });

      const vm = await executeQuerySingle(
        `SELECT id, os_type, name FROM virtual_machines WHERE id = $1 AND deleted_at IS NULL`,
        [vmId]
      );
      if (!vm) return res.status(404).json({ error: 'VM not found' });

      const { containerId: cId, hostPort } = await provisionContainer(
        vmId,
        vm.os_type,
        vncPassword || 'reemote'
      );

      await executeQuerySingle(
        `UPDATE virtual_machines SET vnc_port = $1, power_state = 'running', updated_at = NOW() WHERE id = $2`,
        [hostPort, vmId]
      );

      return res.status(201).json({ containerId: cId, hostPort, vmId, osType: vm.os_type });
    }

    // POST /api/v1/admin/containers?containerId=xxx&action=start
    if (req.method === 'POST' && containerId && action === 'start') {
      await startContainer(containerId as string);
      return res.json({ success: true, action: 'started', containerId });
    }

    // POST /api/v1/admin/containers?containerId=xxx&action=stop
    if (req.method === 'POST' && containerId && action === 'stop') {
      await stopContainer(containerId as string);
      // Update VM power state
      await executeQuerySingle(
        `UPDATE virtual_machines SET power_state = 'stopped', updated_at = NOW()
         WHERE metadata->>'containerId' = $1 OR name = (SELECT name FROM virtual_machines WHERE id IN (
           SELECT id FROM virtual_machines WHERE metadata::text LIKE $2 LIMIT 1
         ))`,
        [containerId as string, `%${containerId}%`]
      ).catch(() => {});
      return res.json({ success: true, action: 'stopped', containerId });
    }

    // DELETE /api/v1/admin/containers?containerId=xxx — remove container
    if (req.method === 'DELETE' && containerId) {
      await removeContainer(containerId as string);
      return res.json({ success: true, action: 'removed', containerId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Containers API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
