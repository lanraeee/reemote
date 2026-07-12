import { createRequire } from 'module';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const from = options.from || process.env.EMAIL_FROM || 'Reemote <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
      }),
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      return { success: false, error: data.message || `Resend error ${response.status}` };
    }
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function welcomeEmailHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 20px;background:#050914;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:540px;margin:0 auto;background:#0f1629;border-radius:16px;padding:40px;border:1px solid #1e293b;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;font-weight:700;">R</div>
      <span style="font-size:18px;font-weight:700;color:#f8fafc;">Reemote</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 12px;">Welcome aboard</h1>
    <p style="color:#94a3b8;margin:0 0 8px;line-height:1.6;font-size:14px;">Your account is ready. Access your entire VM fleet securely from any browser — no client, no VPN, no setup required.</p>
    <p style="color:#94a3b8;margin:0 0 28px;line-height:1.6;font-size:14px;">Sign in to start managing your machines:</p>
    <a href="https://reemote.vercel.app/login" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Sign in to Reemote →</a>
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1e293b;">
      <p style="color:#475569;font-size:12px;margin:0;">Sent to ${email}. If you did not create a Reemote account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;
}

export function passwordResetEmailHtml(email: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 20px;background:#050914;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:540px;margin:0 auto;background:#0f1629;border-radius:16px;padding:40px;border:1px solid #1e293b;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;font-weight:700;">R</div>
      <span style="font-size:18px;font-weight:700;color:#f8fafc;">Reemote</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;color:#f8fafc;margin:0 0 12px;">Reset your password</h1>
    <p style="color:#94a3b8;margin:0 0 28px;line-height:1.6;font-size:14px;">We received a request to reset the password for <strong style="color:#e2e8f0;">${email}</strong>. Click the button below to choose a new password. This link expires in 1 hour.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Reset password →</a>
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1e293b;">
      <p style="color:#475569;font-size:12px;margin:0;">If you did not request a password reset, no action is needed. Your password will not change.</p>
    </div>
  </div>
</body>
</html>`;
}
