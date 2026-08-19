// Vercel Serverless Function & Cron Handler for 100% Automated Background Push
// Route: /api/cron-notify (Runs every morning via Vercel Cron)

export default async function handler(req: any, res: any) {
  try {
    const authHeader = req.headers['authorization'];
    
    // Webhook destination URL (can come from query, env, or payload)
    const webhookUrl = req.query.webhook_url || process.env.ZALO_WEBHOOK_URL;
    const botToken = req.query.bot_token || process.env.ZALO_BOT_TOKEN;

    const timestamp = new Date().toISOString();
    const currentDateStr = new Date().toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh'
    });

    const reportMessage = `📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\n` +
      `🔔 THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG TỰ ĐỘNG (VERCEL CLOUD CRON)\n` +
      `⏰ Thời gian phát: ${currentDateStr}\n` +
      `-------------------------------------------\n` +
      `⚡ Hệ thống tự động kiểm tra định kỳ mỗi sáng từ Vercel Cloud.\n` +
      `👉 Đề nghị Kỹ thuật viên & Phòng Thí nghiệm kiểm tra máy nén và cập nhật dữ liệu tại Cổng Quản Lý Tasago.\n` +
      `🌐 Portal: Bê Tông Xanh Sài Gòn - Bê Tông Của Mọi Công Trình`;

    if (webhookUrl && webhookUrl.startsWith('http')) {
      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(botToken ? { 'Authorization': `Bearer ${botToken}` } : {})
        },
        body: JSON.stringify({
          event: 'VERCEL_CRON_DAILY_SAMPLE_REMINDER',
          company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
          slogan: 'BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH',
          timestamp,
          message: {
            text: reportMessage
          }
        })
      });

      return res.status(200).json({
        success: true,
        message: 'Đã kích hoạt và gửi thông báo tự động từ Vercel Cron thành công!',
        webhookStatus: webhookRes.status,
        timestamp
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Vercel Cron đã chạy thành công. (Để bắn trực tiếp vào Zalo, cấu hình biến môi trường ZALO_WEBHOOK_URL trên Vercel Settings).',
      timestamp
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý Vercel Cron'
    });
  }
}
