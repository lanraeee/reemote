import { VercelRequest, VercelResponse } from '@vercel/node';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'temp-mail.org', 'throwaway.email',
  'trashmail.com', 'yopmail.com', '10minutemail.com', 'fakeinbox.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'spam4.me', 'dispostable.com', 'mailnull.com', 'spamgourmet.com',
  'trashmail.at', 'trashmail.me', 'trashmail.io', 'discard.email',
  'maildrop.cc', 'getnada.com', 'tempmail.com', 'emailondeck.com',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 320) {
    return res.json({
      valid: false,
      email: trimmed,
      checks: { format: false, mx: false, disposable: false },
      reason: 'Email address too long',
    });
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return res.json({
      valid: false,
      email: trimmed,
      checks: { format: false, mx: false, disposable: false },
      reason: 'Invalid email format',
    });
  }

  const [localPart, domain] = trimmed.split('@');

  if (localPart.length > 64) {
    return res.json({
      valid: false,
      email: trimmed,
      checks: { format: false, mx: false, disposable: false },
      reason: 'Local part exceeds 64 characters',
    });
  }

  const isDisposable = DISPOSABLE_DOMAINS.has(domain);

  let hasMx = false;
  let mxRecords: { exchange: string; priority: number }[] = [];
  try {
    const records = await resolveMx(domain);
    hasMx = records && records.length > 0;
    if (hasMx) {
      mxRecords = records
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3)
        .map(r => ({ exchange: r.exchange, priority: r.priority }));
    }
  } catch {
    hasMx = false;
  }

  const valid = hasMx && !isDisposable;

  return res.json({
    valid,
    email: trimmed,
    domain,
    checks: {
      format: true,
      mx: hasMx,
      disposable: !isDisposable,
    },
    mx_records: mxRecords,
    reason: !hasMx
      ? 'Domain has no mail server (MX records not found)'
      : isDisposable
      ? 'Disposable/temporary email address'
      : null,
  });
}
