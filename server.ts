import express from 'express';
import nodemailer from 'nodemailer';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (_req, res) => {
    const vnTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    res.json({
      status: 'ok',
      service: 'Tasago Concrete Testing Portal Backend',
      vietnamTime: vnTime,
      nodeVersion: process.version,
    });
  });

  app.post('/api/notifications/send-email', async (req, res) => {
    try {
      const { recipients, subject, html, plainText } = req.body;
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách địa chỉ email người nhận không được để trống.' });
      }

      const validRecipients = recipients
        .map((r: unknown) => String(r).trim())
        .filter((r: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

      if (validRecipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có địa chỉ email hợp lệ nào trong danh sách.' });
      }

      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 587);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const secure = process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE === undefined && port === 465);
      const sender = process.env.SMTP_FROM || (user ? `Hệ Thống Bê Tông Tasago <${user}>` : 'Hệ Thống Bê Tông Tasago');

      if (!host || !user || !pass) {
        return res.status(503).json({ success: false, message: 'Backend chưa được cấu hình SMTP. Hãy kiểm tra SMTP_HOST, SMTP_USER và SMTP_PASS trên Render.' });
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });

      await transporter.verify();
      const info = await transporter.sendMail({
        from: sender,
        to: validRecipients.join(', '),
        subject: subject || '[TASAGO] Thông báo lịch nén mẫu bê tông',
        text: plainText || '',
        html: html || '',
      });

      return res.status(200).json({
        success: true,
        channel: 'smtp_transport',
        message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ.`,
        messageId: info.messageId,
      });
    } catch (error: any) {
      console.error('SMTP error:', error);
      const detail = error?.code ? `${error.code}: ${error.message || ''}`.trim() : error?.message;
      return res.status(502).json({
        success: false,
        message: `Không thể kết nối máy chủ gửi email. ${detail || 'Vui lòng kiểm tra cấu hình SMTP trên Render.'}`,
      });
    }
  });

  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Tasago email backend running on port ${PORT}`));
}

startServer().catch((error) => {
  console.error('Fatal server error:', error);
  process.exit(1);
});
