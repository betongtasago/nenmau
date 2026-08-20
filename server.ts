import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (req, res) => {
    const vnTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    res.json({ status: 'ok', service: 'Tasago Concrete Testing Portal Backend', vietnamTime: vnTime, nodeVersion: process.version });
  });

  app.post('/api/notifications/send-email', async (req, res) => {
    try {
      const { recipients, subject, html, plainText } = req.body;
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách địa chỉ email người nhận không được để trống.' });
      }

      const validRecipients = recipients.map((r: string) => String(r).trim()).filter((r: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
      if (validRecipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có địa chỉ email hợp lệ nào trong danh sách.' });
      }

      const emailSubject = subject || `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông - ${new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const secure = process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE === undefined && port === 465);
      const senderName = process.env.SMTP_FROM || (user ? `Hệ Thống Bê Tông Tasago <${user}>` : 'Hệ Thống Bê Tông Tasago');

      if (!host || !user || !pass) {
        return res.status(503).json({ success: false, message: 'Backend chưa được cấu hình SMTP. Vui lòng cấu hình SMTP_HOST, SMTP_PORT, SMTP_USER và SMTP_PASS trên máy chủ.' });
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      await transporter.verify();
      const info = await transporter.sendMail({
        from: senderName,
        to: validRecipients.join(', '),
        subject: emailSubject,
        text: plainText || '',
        html: html || '',
      });

      return res.status(200).json({ success: true, channel: 'smtp_transport', message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ.`, messageId: info.messageId, recipients: validRecipients });
    } catch (error: any) {
      console.error('SMTP error:', error);
      return res.status(502).json({ success: false, message: `Không thể kết nối máy chủ gửi email. ${error?.message || 'Vui lòng kiểm tra cấu hình SMTP.'}` });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server Tasago running on port ${PORT}`));
}

startServer();
