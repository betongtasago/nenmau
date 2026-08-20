import nodemailer from 'nodemailer';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

type EmailRequest = { recipients?: string[]; subject?: string; html?: string; plainText?: string; smtpConfig?: { smtpHost?: string; smtpPort?: number | string; smtpUser?: string; smtpPass?: string; smtpSecure?: boolean; smtpFrom?: string } };
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success: false, message: 'Method Not Allowed' }); }
  try {
    const body = (req.body || {}) as EmailRequest;
    const recipients = Array.isArray(body.recipients) ? body.recipients.map(value => String(value).trim()).filter(isEmail) : [];
    if (recipients.length === 0) return res.status(400).json({ success: false, message: 'Không có địa chỉ email hợp lệ.' });
    const subject = body.subject || '[TASAGO] Thông báo lịch nén mẫu bê tông';
    const text = body.plainText || '';
    const html = body.html || '<p>' + text.replace(/\\n/g, '<br>') + '</p>';
    const supplied = body.smtpConfig || {};
    const host = process.env.SMTP_HOST || supplied.smtpHost;
    const port = Number(process.env.SMTP_PORT || supplied.smtpPort || 587);
    const secure = String(process.env.SMTP_SECURE ?? supplied.smtpSecure ?? (port === 465)).toLowerCase() === 'true';
    const user = process.env.SMTP_USER || supplied.smtpUser;
    const pass = process.env.SMTP_PASS || supplied.smtpPass;
    const from = process.env.SMTP_FROM || supplied.smtpFrom || user;
    if (process.env.RESEND_API_KEY) {
      const resend = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY }, body: JSON.stringify({ from, to: recipients, subject, html, text }) });
      const result = await resend.json().catch(() => ({}));
      if (!resend.ok) return res.status(502).json({ success: false, message: 'Resend từ chối gửi email (HTTP ' + resend.status + ').', detail: result });
      return res.status(200).json({ success: true, channel: 'resend_api', id: result.id, recipients });
    }
    if (!host || !user || !pass) return res.status(503).json({ success: false, message: 'Chưa cấu hình SMTP_HOST, SMTP_USER và SMTP_PASS trên máy chủ.' });
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.verify();
    const info = await transporter.sendMail({ from, to: recipients, subject, text, html });
    return res.status(200).json({ success: true, channel: 'smtp_transport', messageId: info.messageId, recipients });
  } catch (error: any) {
    console.error('Email delivery failed:', error);
    return res.status(502).json({ success: false, message: 'Máy chủ email từ chối gửi: ' + (error?.message || 'Unknown SMTP error') });
  }
}
