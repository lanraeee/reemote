import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, sendUnauthorized, sendForbidden } from '../../lib/auth';
import { sendEmail } from '../../lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const claims = requireAuth(req);
  if (!claims) return sendUnauthorized(res);
  if (!claims.isAdmin) return sendForbidden(res);

  const { to, subject, body, html, replyTo } = req.body;

  if (!to || !subject || (!body && !html)) {
    return res.status(400).json({ error: 'to, subject, and body (or html) are required' });
  }

  const recipients: string[] = Array.isArray(to)
    ? to.map((e: string) => e.trim().toLowerCase())
    : [String(to).trim().toLowerCase()];

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'At least one recipient is required' });
  }

  if (recipients.length > MAX_RECIPIENTS) {
    return res.status(400).json({ error: `Maximum ${MAX_RECIPIENTS} recipients per request` });
  }

  const invalid = recipients.filter(e => !EMAIL_REGEX.test(e));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid recipient(s): ${invalid.join(', ')}` });
  }

  const emailHtml =
    html ||
    `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;padding:24px;color:#0f172a;line-height:1.6;">${String(body).replace(/\n/g, '<br>')}</body></html>`;

  const result = await sendEmail({
    to: recipients,
    subject: String(subject),
    html: emailHtml,
    replyTo: replyTo ? String(replyTo) : undefined,
  });

  if (!result.success) {
    return res.status(502).json({ error: result.error || 'Failed to send email' });
  }

  return res.json({
    success: true,
    message_id: result.id,
    recipients: recipients.length,
    sent_to: recipients,
  });
}
