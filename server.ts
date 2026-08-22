import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server in-memory state for automated 7:00 AM Cron
interface ServerState {
  samples: any[];
  stations: any[];
  users: any[];
  config: {
    autoEmailEnabled?: boolean;
    autoZaloEnabled?: boolean;
    emailRecipients?: string[];
    emailSender?: string;
    autoSendHour?: number;
    autoSendMinute?: number;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    emailServiceUrl?: string;
    zaloWebhookUrl?: string;
    zaloBotToken?: string;
    zaloGroupId?: string;
    zaloPersonalPhone?: string;
    zaloPersonalPhones?: string[];
    zaloRecipientType?: 'personal' | 'group' | 'both';
  };
  lastCronDate: string;
  lastCronLog: string;
}

const stateFilePath = path.join(__dirname, 'data', 'server-state.json');

function loadPersistedState(): ServerState {
  try {
    if (fs.existsSync(stateFilePath)) {
      const raw = fs.readFileSync(stateFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.users)) parsed.users = [];
      return parsed;
    }
  } catch (e) {
    console.warn('Could not load server-state.json, using defaults:', e);
  }
  return {
    samples: [],
    stations: [],
    users: [],
    config: {
      autoEmailEnabled: true,
      autoZaloEnabled: true,
      emailRecipients: ['thanhtgndt@gmail.com', 'kythuat@tasago.vn'],
      emailSender: 'Bê Tông Tasago <tasagotnt@gmail.com>',
      autoSendHour: 7,
      autoSendMinute: 0,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'tasagotnt@gmail.com',
      smtpPass: '',
      emailServiceUrl: ''
    },
    lastCronDate: '',
    lastCronLog: 'Hệ thống vừa khởi động, sẵn sàng cho lịch phát 07:00 Sáng.'
  };
}

function savePersistedState(state: ServerState) {
  try {
    const dir = path.dirname(stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not save server-state.json:', e);
  }
}

let serverState: ServerState = loadPersistedState();

// Helper: Format Vietnamese Date
function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Helper: Create Nodemailer Transporter with STARTTLS
function createSmtpTransporter(smtpConfig?: any) {
  const host = smtpConfig?.smtpHost || serverState.config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(smtpConfig?.smtpPort || serverState.config.smtpPort || process.env.SMTP_PORT || 587);
  const user = (smtpConfig?.smtpUser || serverState.config.smtpUser || process.env.SMTP_USER || 'tasagotnt@gmail.com').trim();
  const rawPass = (smtpConfig?.smtpPass || serverState.config.smtpPass || process.env.SMTP_PASS || '');
  // Clean password: strip all spaces that are commonly added when copying Gmail App Passwords (e.g. "abcd efgh ijkl mnop")
  const pass = rawPass.replace(/\s+/g, '');
  const isSecure = smtpConfig?.smtpSecure !== undefined ? Boolean(smtpConfig.smtpSecure) : (port === 465);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure, // false for 587 (STARTTLS), true for 465 (SSL)
    requireTLS: !isSecure, // Enforce STARTTLS on port 587
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  });

  return { transporter, host, port, user, pass, isSecure };
}

// Helper: Generate Rich HTML Email Template
function buildDailyEmailHtml(samples: any[], stations: any[], targetDateStr: string): { html: string; text: string; urgentCount: number } {
  const stationMap = new Map<string, any>();
  stations.forEach(s => stationMap.set(s.id, s));

  const shapeMap: Record<string, string> = {
    cube_150: 'Mẫu vuông 150x150x150mm',
    cylinder_150_300: 'Mẫu trụ Ø150x300mm',
    waterproof_150: 'Mẫu trụ chống thấm',
    expansion: 'Mẫu bù co ngót',
    other: 'Mẫu quy cách đặc biệt',
  };

  const count = samples.length;
  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;

  let text = `📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\n`;
  text += `🔔 BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG 07:00 SÁNG (${formatDateVN(targetDateStr)})\n`;
  text += `⏰ Thời gian phát: ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} ngày ${formatDateVN(targetDateStr)}\n`;
  text += `-------------------------------------------\n\n`;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId);
    const stationName = station ? station.name : 'Trạm Tasago';
    const shape = shapeMap[sample.sampleShape] || sample.sampleShape;
    const badge = sample.status === 'due_today' ? '[ĐẾN HẠN HÔM NAY]' : sample.status === 'overdue' ? '[QUÁ HẠN CHƯA NÉN]' : '[SẮP ĐẾN HẠN]';

    text += `${idx + 1}. ${badge} - ${sample.projectName}\n`;
    text += `   🏢 Trạm: ${stationName}\n`;
    text += `   🏗️ Hạng mục: ${sample.component} (${sample.volumeM3} m³)\n`;
    text += `   🧪 Mác: ${sample.concreteGrade} (Độ sụt: ${sample.slumpCm}cm)\n`;
    text += `   ⏱️ Tuổi nén: ${sample.ageType} (${sample.ageDays} ngày) - ${shape}\n`;
    text += `   📅 Đúc: ${formatDateVN(sample.castDate)} ➔ Nén: ${formatDateVN(sample.scheduledTestDate)}\n`;
    text += `   👤 Đơn vị thi công: ${sample.contractor}\n`;
    text += `   📞 Liên hệ: ${sample.contactPerson} - ${sample.contactPhone}\n`;
    text += `   👨‍🔬 KTV lấy mẫu: ${sample.samplerName}\n\n`;
  });

  text += `-------------------------------------------\n⚡ Ban Chỉ Huy Trạm & Phòng Thí nghiệm chuẩn bị máy nén và cập nhật kết quả lên Cổng Tasago.`;

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo Cáo Lịch Nén Mẫu Tasago</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #cbd5e1;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: #ffffff; padding: 24px 28px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0; margin-bottom: 4px;">
            CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO
          </div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">
            BÁO CÁO LỊCH NÉN MẪU BÊ TÔNG (07:00 SÁNG)
          </h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e6fffa;">
            Ngày ${formatDateVN(targetDateStr)} • Tự động nhắc nhở lịch kiểm định chất lượng bê tông
          </p>
        </div>

        <!-- Alert Summary -->
        <div style="padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 14px 16px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 700; color: #065f46; font-size: 14px;">
                🔔 Tổng cộng: <strong>${count} mẫu bê tông</strong> có lịch nén cần thực hiện
              </div>
              <div style="font-size: 12px; color: #047857; margin-top: 2px;">
                Trong đó có <strong style="color: #dc2626;">${urgentCount} mẫu</strong> đến hạn hôm nay hoặc quá hạn cần nén khẩn cấp.
              </div>
            </div>
          </div>
        </div>

        <!-- Sample List -->
        <div style="padding: 20px 24px;">
  `;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId);
    const stationName = station ? station.name : 'Trạm Bê Tông Tasago';
    const shape = shapeMap[sample.sampleShape] || sample.sampleShape;
    const isUrgent = sample.status === 'due_today' || sample.status === 'overdue';
    const isOverdue = sample.status === 'overdue';

    html += `
      <div style="background: #ffffff; border: 1px solid ${isUrgent ? '#fca5a5' : '#e2e8f0'}; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 800; font-size: 15px; color: ${isUrgent ? '#991b1b' : '#0f766e'};">
            #${idx + 1}. ${sample.projectName}
          </span>
          <span style="background: ${isOverdue ? '#fee2e2' : isUrgent ? '#fef3c7' : '#e0f2fe'}; color: ${isOverdue ? '#991b1b' : isUrgent ? '#92400e' : '#0369a1'}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
            ${isOverdue ? '⚠️ QUÁ HẠN NÉN' : sample.status === 'due_today' ? '🔴 ĐẾN HẠN HÔM NAY' : '🔵 SẮP ĐẾN HẠN'}
          </span>
        </div>

        <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse; line-height: 1.6;">
          <tr>
            <td style="width: 38%; font-weight: 700; color: #64748b; padding: 3px 0;">Trạm sản xuất:</td>
            <td style="padding: 3px 0;"><strong style="color: #0f172a;">${stationName}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Hạng mục & Khối lượng:</td>
            <td style="padding: 3px 0;">${sample.component} — <strong style="color: #047857;">${sample.volumeM3} m³</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Mác bê tông & Độ sụt:</td>
            <td style="padding: 3px 0;"><strong style="color: #0f766e;">${sample.concreteGrade}</strong> (Độ sụt: ${sample.slumpCm} cm)</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Tuổi nén & Quy cách:</td>
            <td style="padding: 3px 0;"><strong style="color: #dc2626;">${sample.ageType} (${sample.ageDays} ngày)</strong> • ${shape} (${sample.groupCount} tổ/${sample.pieceCount} viên)</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Ngày đúc ➔ Ngày nén:</td>
            <td style="padding: 3px 0;">${formatDateVN(sample.castDate)} ➔ <strong style="color: #b91c1c; font-size: 14px;">${formatDateVN(sample.scheduledTestDate)}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Đơn vị thi công:</td>
            <td style="padding: 3px 0;">${sample.contractor}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Liên hệ công trình:</td>
            <td style="padding: 3px 0;"><strong>${sample.contactPerson}</strong> — SĐT: <a href="tel:${sample.contactPhone}" style="color: #0284c7; font-weight: 700; text-decoration: none;">${sample.contactPhone}</a></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">KTV lấy mẫu:</td>
            <td style="padding: 3px 0;">${sample.samplerName}</td>
          </tr>
          ${sample.notes ? `
          <tr>
            <td style="font-weight: 700; color: #64748b; padding: 3px 0;">Ghi chú:</td>
            <td style="padding: 3px 0; color: #64748b; font-style: italic;">${sample.notes}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  });

  html += `
        </div>

        <!-- Footer -->
        <div style="padding: 16px 24px; background: #0f172a; color: #94a3b8; font-size: 12px; text-align: center; border-top: 1px solid #1e293b;">
          <div style="font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
            CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO — HỆ THỐNG KIỂM ĐỊNH CHẤT LƯỢNG BÊ TÔNG
          </div>
          <div>BÊ TÔNG XANH SÀI GÒN • BÊ TÔNG CỦA MỌI CÔNG TRÌNH</div>
          <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
            Email này được gửi tự động mỗi 07:00 sáng từ máy chủ cổng Portal Tasago.
          </div>
        </div>

      </div>
    </body>
    </html>
  `;

  return { html, text, urgentCount };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON & URL-encoded parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS headers for local APIs
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const vnTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    res.json({ 
      status: 'ok', 
      service: 'Tasago Concrete Testing Portal Backend',
      vietnamTime: vnTime,
      nodeVersion: process.version,
      cronStatus: {
        lastCronDate: serverState.lastCronDate,
        lastCronLog: serverState.lastCronLog,
        sampleCount: serverState.samples.length,
        recipients: serverState.config.emailRecipients
      }
    });
  });

  // 1. Sync & Data Endpoints
  // Get all users
  app.get('/api/users', (req, res) => {
    return res.json({ success: true, users: (serverState as any).users || [] });
  });

  // Save/Update users
  app.post('/api/users', (req, res) => {
    try {
      const { users } = req.body;
      if (Array.isArray(users)) {
        (serverState as any).users = users;
        savePersistedState(serverState);
        return res.json({ success: true, count: users.length });
      }
      return res.status(400).json({ success: false, message: 'Invalid users array' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Get all samples
  app.get('/api/samples', (req, res) => {
    return res.json({ success: true, samples: serverState.samples || [] });
  });

  // Save/Update samples
  app.post('/api/samples', (req, res) => {
    try {
      const { samples } = req.body;
      if (Array.isArray(samples)) {
        serverState.samples = samples;
        savePersistedState(serverState);
        return res.json({ success: true, count: samples.length });
      }
      return res.status(400).json({ success: false, message: 'Invalid samples array' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Get all stations
  app.get('/api/stations', (req, res) => {
    return res.json({ success: true, stations: serverState.stations || [] });
  });

  // Save/Update stations
  app.post('/api/stations', (req, res) => {
    try {
      const { stations } = req.body;
      if (Array.isArray(stations)) {
        serverState.stations = stations;
        savePersistedState(serverState);
        return res.json({ success: true, count: stations.length });
      }
      return res.status(400).json({ success: false, message: 'Invalid stations array' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // State Fetch / Sync Endpoint
  app.get('/api/server-sync', (req, res) => {
    return res.json({
      success: true,
      users: (serverState as any).users || [],
      samples: serverState.samples || [],
      stations: serverState.stations || [],
      config: serverState.config
    });
  });

  // 1. Sync State from Frontend to Server (Samples, Stations, Notification Config, Users)
  app.post('/api/server-sync', (req, res) => {
    try {
      const { samples, stations, config, users } = req.body;
      if (Array.isArray(samples)) serverState.samples = samples;
      if (Array.isArray(stations)) serverState.stations = stations;
      if (Array.isArray(users)) (serverState as any).users = users;
      if (config && typeof config === 'object') {
        serverState.config = { ...serverState.config, ...config };
      }
      savePersistedState(serverState);

      return res.status(200).json({
        success: true,
        message: `Đồng bộ máy chủ thành công! (${serverState.samples.length} mẫu bê tông, ${serverState.stations.length} trạm trộn, ${((serverState as any).users || []).length} tài khoản).`,
        config: serverState.config,
        users: (serverState as any).users || [],
        samples: serverState.samples,
        stations: serverState.stations
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // 2. Test/Verify SMTP Connection (e.g. Gmail STARTTLS port 587)
  app.post('/api/notifications/verify-smtp', async (req, res) => {
    try {
      const { smtpConfig } = req.body;
      const { transporter, host, port, user, pass, isSecure } = createSmtpTransporter(smtpConfig);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập địa chỉ Email tài khoản gửi (ví dụ: tasagotnt@gmail.com).'
        });
      }

      if (!pass) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập Mật khẩu ứng dụng (Google App Password 16 ký tự).'
        });
      }

      // Verify connection and authentication
      await transporter.verify();

      return res.status(200).json({
        success: true,
        message: `Kết nối máy chủ SMTP ${host}:${port} (${isSecure ? 'SSL' : 'STARTTLS'}) thành công! Tài khoản "${user}" đã xác thực hợp lệ và sẵn sàng gửi email tự động.`,
        details: {
          host,
          port,
          user,
          protocol: isSecure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)',
          status: 'AUTHENTICATED'
        }
      });
    } catch (error: any) {
      console.error('Lỗi khi kiểm tra SMTP:', error);
      let note = '';
      if (error.message?.includes('535') || error.message?.includes('BadCredentials') || error.message?.includes('Username and Password not accepted')) {
        note = ' (Gợi ý cho Gmail: Bạn cần dùng Mật khẩu ứng dụng 16 ký tự tạo tại myaccount.google.com/apppasswords thay vì mật khẩu đăng nhập cá nhân).';
      }
      return res.status(500).json({
        success: false,
        message: `Không thể kết nối máy chủ SMTP: ${error.message}${note}`,
        error: error.message
      });
    }
  });

  // 3. API Route: Send Real Email Notification via SMTP, Resend, or Google Apps Script Webhook
  app.post('/api/notifications/send-email', async (req, res) => {
    try {
      const {
        recipients,
        subject,
        html,
        plainText,
        smtpConfig,
        emailServiceUrl
      } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách địa chỉ email người nhận không được để trống.'
        });
      }

      const validRecipients = recipients
        .map((r: string) => r.trim())
        .filter((r: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

      if (validRecipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có địa chỉ email hợp lệ nào trong danh sách.'
        });
      }

      const todayStr = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const emailSubject = subject || `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông 07:00 Sáng - ${todayStr}`;
      const senderName = smtpConfig?.smtpFrom || serverState.config.emailSender || process.env.SMTP_FROM || 'Bê Tông Tasago <tasagotnt@gmail.com>';

      // Method 1: Google Apps Script Web App Endpoint / Custom Webhook Mailer
      const targetServiceUrl = emailServiceUrl || smtpConfig?.emailServiceUrl || serverState.config.emailServiceUrl || process.env.EMAIL_SERVICE_URL;
      if (targetServiceUrl && targetServiceUrl.startsWith('http')) {
        try {
          const webhookRes = await fetch(targetServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'SEND_DAILY_SAMPLE_EMAIL',
              company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
              recipients: validRecipients,
              subject: emailSubject,
              html: html,
              text: plainText,
              timestamp: new Date().toISOString()
            })
          });

          if (webhookRes.ok) {
            return res.status(200).json({
              success: true,
              channel: 'google_apps_script_mailer',
              message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ qua Webhook Mail Service (${validRecipients.join(', ')}).`,
              recipients: validRecipients
            });
          }
        } catch (webhookErr: any) {
          console.warn('Webhook mailer error, falling back to SMTP:', webhookErr.message);
        }
      }

      // Method 2: Nodemailer SMTP Server (Gmail STARTTLS Port 587 / SSL Port 465)
      const { transporter, host, user, pass, isSecure } = createSmtpTransporter(smtpConfig);

      if (host && user && pass) {
        const info = await transporter.sendMail({
          from: senderName.includes('<') ? senderName : `Bê Tông Tasago <${user}>`,
          to: validRecipients.join(', '),
          subject: emailSubject,
          text: plainText,
          html: html
        });

        return res.status(200).json({
          success: true,
          channel: 'smtp_transport',
          message: `Đã gửi email thành công tới ${validRecipients.length} địa chỉ (${validRecipients.join(', ')}) qua máy chủ SMTP (${host}:${isSecure ? 465 : 587})!`,
          messageId: info.messageId,
          recipients: validRecipients
        });
      }

      // Method 3: Resend API if API Key is configured in environment
      if (process.env.RESEND_API_KEY) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: senderName.includes('<') ? senderName : `Tasago Portal <${senderName}>`,
              to: validRecipients,
              subject: emailSubject,
              html: html,
              text: plainText
            })
          });

          const resendData = await resendRes.json();
          if (resendRes.ok) {
            return res.status(200).json({
              success: true,
              channel: 'resend_api',
              message: `Đã gửi email thành công tới ${validRecipients.length} người nhận qua Resend API!`,
              id: resendData.id,
              recipients: validRecipients
            });
          }
        } catch (resendErr: any) {
          console.warn('Resend API attempt note:', resendErr.message);
        }
      }

      // Method 4: Ready Mode with complete instructions
      return res.status(200).json({
        success: true,
        channel: 'ready_mode',
        message: `Đã đóng gói bản tin HTML hoàn chỉnh cho ${validRecipients.length} email (${validRecipients.join(', ')}). Nhập mật khẩu ứng dụng Gmail vào mục Cài Đặt SMTP để gửi trực tiếp 24/7.`,
        recipients: validRecipients,
        previewSubject: emailSubject
      });

    } catch (error: any) {
      console.error('Lỗi khi gửi email:', error);
      return res.status(500).json({
        success: false,
        message: `Lỗi khi phát email: ${error.message}`
      });
    }
  });

  // 4. API Route: Test Zalo Bot Webhook (Personal & Group)
  app.post('/api/notifications/test-zalo', async (req, res) => {
    try {
      const { webhookUrl, botToken, personalPhone, groupId } = req.body;
      const targetWebhook = webhookUrl || serverState.config.zaloWebhookUrl || process.env.ZALO_WEBHOOK_URL;
      const targetPhone = personalPhone || serverState.config.zaloPersonalPhone || '0942320923';
      const targetGroup = groupId || serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago';
      const token = botToken || serverState.config.zaloBotToken || process.env.ZALO_BOT_TOKEN;

      if (!targetWebhook || !targetWebhook.startsWith('http')) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp URL Webhook hợp lệ (bắt đầu bằng http:// hoặc https://).'
        });
      }

      const vnNow = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const vnDate = formatDateVN(new Date().toISOString().split('T')[0]);
      const testMsg = `🔔 [TASAGO BOT ZALO TEST]\n⏰ Thời gian: ${vnNow} ngày ${vnDate}\n👤 Người nhận Zalo cá nhân: ${targetPhone}\n👥 Nhóm nhận: ${targetGroup}\n✅ Kết nối Webhook Bot Zalo thành công! Hệ thống kiểm định nén mẫu bê tông sẵn sàng phát thông báo tự động 07:00 Sáng.`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const webhookResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'TEST_ZALO_BOT_PING',
          app: 'Tasago Concrete Testing System',
          timestamp: new Date().toISOString(),
          vietnamTime: `${vnNow} ${vnDate}`,
          recipient_phone: targetPhone,
          group_id: targetGroup,
          message: testMsg,
          text: testMsg
        })
      });

      const responseText = await webhookResponse.text().catch(() => '');

      return res.status(200).json({
        success: webhookResponse.ok || webhookResponse.status < 400,
        status: webhookResponse.status,
        message: webhookResponse.ok 
          ? `Đã gửi gói tin thử nghiệm thành công tới Webhook Bot Zalo! (HTTP ${webhookResponse.status})`
          : `Máy chủ Webhook phản hồi HTTP ${webhookResponse.status}: ${responseText.slice(0, 150)}`,
        targetPhone,
        targetGroup
      });
    } catch (e: any) {
      console.error('Lỗi khi test Zalo Bot:', e);
      return res.status(500).json({
        success: false,
        message: `Không thể kết nối Webhook Bot Zalo: ${e.message}`
      });
    }
  });

  // 5. API Route: Send Real Zalo Bot Notification (Personal & Group)
  app.post('/api/notifications/send-zalo', async (req, res) => {
    try {
      const { 
        samples, 
        stations, 
        webhookUrl, 
        botToken, 
        personalPhone, 
        groupId, 
        recipientType,
        customMessage 
      } = req.body;

      const targetWebhook = webhookUrl || serverState.config.zaloWebhookUrl || process.env.ZALO_WEBHOOK_URL;
      const targetPhone = personalPhone || serverState.config.zaloPersonalPhone || '0942320923';
      const targetGroup = groupId || serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago';
      const token = botToken || serverState.config.zaloBotToken || process.env.ZALO_BOT_TOKEN;

      const targetSamples = Array.isArray(samples) && samples.length > 0 ? samples : serverState.samples;
      const targetStations = Array.isArray(stations) && stations.length > 0 ? stations : serverState.stations;
      const todayIso = new Date().toISOString().split('T')[0];

      const { text, urgentCount } = buildDailyEmailHtml(targetSamples, targetStations, todayIso);
      const messageContent = customMessage || text;

      if (!targetWebhook || !targetWebhook.startsWith('http')) {
        return res.status(200).json({
          success: true,
          channel: 'ready_mode_zalo',
          message: `Đã đóng gói bản tin Zalo cho ${targetSamples.length} mẫu nén. Bạn có thể mở zalo.me/${targetPhone} để gửi nhanh hoặc cài đặt Webhook Google Apps Script để bắn tự động.`,
          personalPhone: targetPhone,
          groupName: targetGroup,
          sampleCount: targetSamples.length,
          urgentCount
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const webhookResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'SAMPLE_COMPRESSION_DAILY_REMINDER',
          company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
          timestamp: new Date().toISOString(),
          recipient_type: recipientType || 'both',
          recipient_phone: targetPhone,
          group_id: targetGroup,
          urgent_count: urgentCount,
          sample_count: targetSamples.length,
          message: messageContent,
          text: messageContent,
          samples: targetSamples.map(s => ({
            id: s.id,
            sampleCode: s.sampleCode,
            projectName: s.projectName,
            component: s.component,
            volumeM3: s.volumeM3,
            grade: s.concreteGrade,
            ageType: s.ageType,
            castDate: s.castDate,
            scheduledDate: s.scheduledTestDate,
            contractor: s.contractor,
            contactPerson: s.contactPerson,
            contactPhone: s.contactPhone,
            samplerName: s.samplerName,
            status: s.status
          }))
        })
      });

      const responseText = await webhookResponse.text().catch(() => '');

      return res.status(200).json({
        success: webhookResponse.ok || webhookResponse.status < 400,
        status: webhookResponse.status,
        message: webhookResponse.ok
          ? `Đã bắn tin tự động thành công qua Webhook Bot Zalo (${recipientType === 'personal' ? 'Zalo Cá Nhân ' + targetPhone : recipientType === 'group' ? 'Nhóm Zalo ' + targetGroup : 'Cả Cá Nhân & Nhóm'})!`
          : `Gửi Webhook Zalo (HTTP ${webhookResponse.status}): ${responseText.slice(0, 150)}`,
        urgentCount,
        sampleCount: targetSamples.length
      });

    } catch (e: any) {
      console.error('Lỗi khi gửi Zalo Bot:', e);
      return res.status(500).json({
        success: false,
        message: `Lỗi kết nối Webhook Zalo Bot: ${e.message}`
      });
    }
  });

  // 6. Trigger 07:00 AM Cron Manually on Server (Email + Zalo Bot)
  app.post('/api/cron/trigger', async (req, res) => {
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const urgentSamples = serverState.samples.filter(
        s => s.status === 'due_today' || s.status === 'overdue'
      );

      const targetSamples = urgentSamples.length > 0 ? urgentSamples : serverState.samples.slice(0, 5);
      const emailRecipients = serverState.config.emailRecipients || ['thanhtgndt@gmail.com', 'kythuat@tasago.vn'];

      if (targetSamples.length === 0) {
        return res.json({
          success: true,
          message: 'Không có mẫu nén nào để kích hoạt gửi thông báo.'
        });
      }

      const { html, text } = buildDailyEmailHtml(targetSamples, serverState.stations, todayIso);
      const logParts: string[] = [];

      // 1. Email via SMTP
      if (serverState.config.autoEmailEnabled) {
        const { transporter, host, user, pass } = createSmtpTransporter(serverState.config);
        if (host && user && pass) {
          try {
            const info = await transporter.sendMail({
              from: serverState.config.emailSender || `Bê Tông Tasago <${user}>`,
              to: emailRecipients.join(', '),
              subject: `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông 07:00 Sáng - ${formatDateVN(todayIso)}`,
              text: text,
              html: html
            });
            logParts.push(`Email SMTP thành công (${info.messageId})`);
          } catch (mErr: any) {
            logParts.push(`Email SMTP lỗi: ${mErr.message}`);
          }
        }
      }

      // 2. Zalo Webhook Bot
      if (serverState.config.autoZaloEnabled && serverState.config.zaloWebhookUrl?.startsWith('http')) {
        try {
          const zRes = await fetch(serverState.config.zaloWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(serverState.config.zaloBotToken ? { 'Authorization': `Bearer ${serverState.config.zaloBotToken}` } : {})
            },
            body: JSON.stringify({
              event: 'CRON_07AM_TASAGO_SAMPLE_ALERT',
              company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
              timestamp: new Date().toISOString(),
              recipient_phone: serverState.config.zaloPersonalPhone || '0942320923',
              group_id: serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago',
              message: text,
              samples: targetSamples
            })
          });
          logParts.push(`Zalo Bot Webhook HTTP ${zRes.status}`);
        } catch (zErr: any) {
          logParts.push(`Zalo Bot lỗi: ${zErr.message}`);
        }
      }

      const resultSummary = logParts.length > 0 ? logParts.join(' | ') : 'Đã chuẩn bị bản tin hoàn tất';
      serverState.lastCronDate = todayIso;
      serverState.lastCronLog = `[Thủ công 07:00 AM] Phát thông báo lúc ${new Date().toLocaleTimeString('vi-VN')} cho ${targetSamples.length} mẫu nén. Kết quả: ${resultSummary}`;
      savePersistedState(serverState);

      return res.json({
        success: true,
        message: serverState.lastCronLog,
        sampleCount: targetSamples.length,
        recipients: emailRecipients
      });
    } catch (e: any) {
      console.error('Lỗi khi kích hoạt thủ công cron:', e);
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Background 7:00 AM Cron Interval (Vietnam GMT+7)
  setInterval(async () => {
    try {
      const now = new Date();
      const vnDate = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const vnTimeParts = now.toLocaleTimeString('vi-VN', { 
        timeZone: 'Asia/Ho_Chi_Minh', 
        hour12: false 
      }).split(':');
      
      const hour = Number(vnTimeParts[0]);
      const minute = Number(vnTimeParts[1]);

      const targetHour = serverState.config.autoSendHour ?? 7;
      const targetMinute = serverState.config.autoSendMinute ?? 0;

      // Trigger at configured time (default 07:00 AM VN Time) once per day
      if (hour === targetHour && minute === targetMinute && serverState.lastCronDate !== vnDate) {
        serverState.lastCronDate = vnDate;
        console.log(`[TASAGO CRON 07:00 AM] Kích hoạt kiểm tra lịch nén mẫu định kỳ ngày ${vnDate}...`);

        const urgentSamples = serverState.samples.filter(
          s => s.status === 'due_today' || s.status === 'overdue'
        );

        if (urgentSamples.length > 0) {
          const todayIso = now.toISOString().split('T')[0];
          const { html, text } = buildDailyEmailHtml(urgentSamples, serverState.stations, todayIso);
          const emailRecipients = serverState.config.emailRecipients || ['thanhtgndt@gmail.com', 'kythuat@tasago.vn'];
          const cronLogItems: string[] = [];

          // 1. Send via SMTP
          if (serverState.config.autoEmailEnabled) {
            const { transporter, host, user, pass } = createSmtpTransporter(serverState.config);
            if (host && user && pass) {
              try {
                await transporter.sendMail({
                  from: serverState.config.emailSender || `Bê Tông Tasago <${user}>`,
                  to: emailRecipients.join(', '),
                  subject: `[TASAGO] Báo Cáo Lịch Nén Mẫu Bê Tông 07:00 Sáng - ${formatDateVN(todayIso)}`,
                  text: text,
                  html: html
                });
                cronLogItems.push(`Email tới ${emailRecipients.length} địa chỉ`);
              } catch (mailErr: any) {
                cronLogItems.push(`Email lỗi: ${mailErr.message}`);
                console.error('[CRON EMAIL ERROR]', mailErr.message);
              }
            }
          }

          // 2. Send via Zalo Bot Webhook (Personal & Group)
          if (serverState.config.autoZaloEnabled && serverState.config.zaloWebhookUrl?.startsWith('http')) {
            try {
              const zRes = await fetch(serverState.config.zaloWebhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(serverState.config.zaloBotToken ? { 'Authorization': `Bearer ${serverState.config.zaloBotToken}` } : {})
                },
                body: JSON.stringify({
                  event: 'CRON_07AM_DAILY_ALERT',
                  company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
                  timestamp: new Date().toISOString(),
                  recipient_phone: serverState.config.zaloPersonalPhone || '0942320923',
                  group_id: serverState.config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago',
                  message: text,
                  samples: urgentSamples
                })
              });
              cronLogItems.push(`Bot Zalo Webhook HTTP ${zRes.status}`);
            } catch (zaloErr: any) {
              cronLogItems.push(`Bot Zalo lỗi: ${zaloErr.message}`);
              console.error('[CRON ZALO ERROR]', zaloErr.message);
            }
          }

          serverState.lastCronLog = `[TỰ ĐỘNG 07:00 AM] Đã xử lý ${urgentSamples.length} mẫu nén: ${cronLogItems.join(' | ')}`;
          console.log(serverState.lastCronLog);
        }
        savePersistedState(serverState);
      }
    } catch (cronErr) {
      console.debug('Cron interval check note:', cronErr);
    }
  }, 30000); // Check every 30s

  // Vite Middleware for Development vs Static for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Tasago running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
