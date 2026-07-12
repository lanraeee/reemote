import express from 'express';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import healthHandler       from '../api/health';
import loginHandler        from '../api/v1/auth/login';
import registerHandler     from '../api/v1/auth/register';
import emailValidate       from '../api/v1/email/validate';
import emailSend           from '../api/v1/email/send';
import vmsHandler          from '../api/v1/vms';
import vmDetailHandler     from '../api/v1/vms/[vmId]';
import containersHandler   from '../api/v1/admin/containers';

const app = express();
const PORT = parseInt(process.env.PORT || '8443', 10);
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '../../frontend/dist');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

type VHandler = (req: VercelRequest, res: VercelResponse) => any;

function adapt(handler: VHandler) {
  return (req: express.Request, res: express.Response) =>
    handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
}

function adaptParam(handler: VHandler, paramMap: Record<string, string>) {
  return (req: express.Request, res: express.Response) => {
    for (const [paramKey, queryKey] of Object.entries(paramMap)) {
      (req.query as Record<string, string>)[queryKey] = req.params[paramKey];
    }
    return handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
  };
}

// ── Health ────────────────────────────────────────────────────────────────────
app.all('/api/health', adapt(healthHandler));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.all('/api/v1/auth/login',    adapt(loginHandler));
app.all('/api/v1/auth/register', adapt(registerHandler));

// ── Email ─────────────────────────────────────────────────────────────────────
app.all('/api/v1/email/validate', adapt(emailValidate));
app.all('/api/v1/email/send',     adapt(emailSend));

// ── VMs ───────────────────────────────────────────────────────────────────────
app.all('/api/v1/vms', adapt(vmsHandler));
app.all('/api/v1/vms/:vmId', adaptParam(vmDetailHandler, { vmId: 'vmId' }));

// ── Admin — containers ────────────────────────────────────────────────────────
app.all('/api/v1/admin/containers', adapt(containersHandler));
app.post('/api/v1/admin/containers/:containerId/:action', (req, res) => {
  (req.query as any).containerId = req.params.containerId;
  (req.query as any).action      = req.params.action;
  return containersHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});
app.delete('/api/v1/admin/containers/:containerId', (req, res) => {
  (req.query as any).containerId = req.params.containerId;
  return containersHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});

// ── Frontend (SPA) ────────────────────────────────────────────────────────────
app.use(express.static(FRONTEND_DIR));
app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Reemote Connect running on port ${PORT}`);
});
