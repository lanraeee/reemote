import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, sendUnauthorized, sendForbidden } from '../../lib/auth';
import { executeQuerySingle } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const claims = requireAuth(req);
  if (!claims) return sendUnauthorized(res);

  const { vmId } = req.query;
  if (!vmId || typeof vmId !== 'string') {
    return res.status(400).json({ error: 'VM ID required' });
  }

  try {
    if (req.method === 'GET') {
      const vm = await executeQuerySingle(
        `SELECT id, name, hostname, power_state, vcpu, memory_mb, disk_gb,
                os_type, vnc_port, spice_port, metadata, created_at, updated_at
         FROM virtual_machines
         WHERE id = $1 AND deleted_at IS NULL`,
        [vmId]
      );

      if (!vm) return res.status(404).json({ error: 'VM not found' });
      return res.json(vm);

    } else if (req.method === 'PATCH') {
      if (!claims.isAdmin) return sendForbidden(res);

      const { name, hostname, power_state, vcpu, memory_mb, memory_gb, disk_gb, os_type, vnc_port, metadata } = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (name !== undefined)         { fields.push(`name = $${i++}`);         values.push(name); }
      if (hostname !== undefined)     { fields.push(`hostname = $${i++}`);     values.push(hostname); }
      if (power_state !== undefined)  { fields.push(`power_state = $${i++}`);  values.push(power_state); }
      if (os_type !== undefined)      { fields.push(`os_type = $${i++}`);      values.push(os_type); }
      if (vnc_port !== undefined)     { fields.push(`vnc_port = $${i++}`);     values.push(vnc_port ? parseInt(vnc_port) : null); }
      if (vcpu !== undefined)         { fields.push(`vcpu = $${i++}`);         values.push(parseInt(vcpu)); }
      if (disk_gb !== undefined)      { fields.push(`disk_gb = $${i++}`);      values.push(parseInt(disk_gb)); }
      if (metadata !== undefined)     { fields.push(`metadata = $${i++}`);     values.push(JSON.stringify(metadata)); }

      const resolvedMem = memory_mb !== undefined ? parseInt(memory_mb)
        : memory_gb !== undefined ? Math.round(parseFloat(memory_gb) * 1024) : undefined;
      if (resolvedMem !== undefined)  { fields.push(`memory_mb = $${i++}`);    values.push(resolvedMem); }

      if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

      fields.push(`updated_at = NOW()`);
      values.push(vmId);

      const vm = await executeQuerySingle(
        `UPDATE virtual_machines SET ${fields.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
        values
      );

      if (!vm) return res.status(404).json({ error: 'VM not found' });
      return res.json(vm);

    } else if (req.method === 'DELETE') {
      if (!claims.isAdmin) return sendForbidden(res);

      await executeQuerySingle(
        'UPDATE virtual_machines SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
        [vmId]
      );
      return res.json({ success: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('VM detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
