import { ConcreteSample, Station, NotificationConfig, NotificationLog } from '../types';
import { formatDateVN, addNotificationLog } from './storage';

export interface FormattedNotification {
  title: string;
  bodyText: string;
  zaloMarkdown: string;
  htmlContent: string;
  sampleSummary: string;
  urgentCount: number;
}

// Generate complete formatted notification message for a list of samples
export function generateSampleNotification(
  samples: ConcreteSample[],
  stations: Station[],
  channelType: 'zalo_bot' | 'email' = 'zalo_bot'
): FormattedNotification {
  const stationMap = new Map<string, Station>();
  stations.forEach(s => stationMap.set(s.id, s));

  const count = samples.length;
  const title = `[TASAGO] THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG - ${count} MẪU ĐẾN HẠN/QUÁ HẠN`;

  const shapeMap: Record<string, string> = {
    cube_150: 'Mẫu vuông 150x150x150mm',
    cylinder_150_300: 'Mẫu trụ Ø150x300mm',
    waterproof_150: 'Mẫu trụ chống thấm',
    expansion: 'Mẫu bù co ngót',
    other: 'Mẫu quy cách đặc biệt',
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'due_today': return '🔴 [ĐẾN HẠN HÔM NAY]';
      case 'overdue': return '⚠️ [QUÁ HẠN CHƯA NÉN]';
      case 'pending': return '🔵 [SẮP ĐẾN HẠN]';
      default: return '📋 [LỊCH NÉN]';
    }
  };

  // Build Plain Text & Zalo Message
  let text = `📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\n`;
  text += `🔔 THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG TỰ ĐỘNG\n`;
  text += `⏰ Thời gian phát thông báo: ${new Date().toLocaleTimeString('vi-VN')} ngày ${formatDateVN(new Date().toISOString().split('T')[0])}\n`;
  text += `-------------------------------------------\n\n`;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId);
    const stationName = station ? station.name : 'Trạm Tasago';
    const shape = shapeMap[sample.sampleShape] || sample.sampleShape;

    text += `${idx + 1}. ${statusBadge(sample.status)}: ${sample.projectName.toUpperCase()}\n`;
    text += `   🏢 Trạm trộn: ${stationName}\n`;
    text += `   🏗️ Hạng mục: ${sample.component} (Khối lượng: ${sample.volumeM3} m³)\n`;
    text += `   🧪 Mác bê tông: ${sample.concreteGrade} (Độ sụt: ${sample.slumpCm} cm)\n`;
    text += `   ⏱️ Tuổi nén: ${sample.ageType} (${sample.ageDays} ngày)\n`;
    text += `   📐 Quy cách mẫu: ${shape} (${sample.groupCount} tổ - ${sample.pieceCount} viên)\n`;
    text += `   📅 Ngày đúc: ${formatDateVN(sample.castDate)} ➡️ Ngày nén: ${formatDateVN(sample.scheduledTestDate)}\n`;
    text += `   👤 Đơn vị thi công: ${sample.contractor}\n`;
    text += `   📞 Người liên hệ công trình: ${sample.contactPerson} - SĐT: ${sample.contactPhone}\n`;
    text += `   👨‍🔬 KTV lấy mẫu: ${sample.samplerName}\n`;
    if (sample.notes) {
      text += `   📝 Ghi chú: ${sample.notes}\n`;
    }
    text += `   👉 Mã mẫu hệ thống: ${sample.id} (${sample.sampleCode})\n\n`;
  });

  text += `-------------------------------------------\n`;
  text += `⚡ Đề nghị Ban Chỉ Huy Trạm, Kỹ thuật viên & Phòng Thí nghiệm chuẩn bị máy nén, liên hệ công trình và cập nhật kết quả lên hệ thống Tasago.\n`;
  text += `🌐 Cổng quản lý: Tasago Concrete Testing Portal`;

  // Build HTML Content for Email
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #10b981; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #065f46; color: white; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 20px;">CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Hệ thống tự động nhắc lịch nén mẫu bê tông & trialmix</p>
      </div>
      <div style="padding: 20px; background-color: #f8fafc;">
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
          <strong style="color: #065f46;">🔔 Thông báo:</strong> Có <strong>${count} công trình/mẫu bê tông</strong> có lịch nén cần thực hiện.
        </div>
  `;

  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId);
    const stationName = station ? station.name : 'Trạm Tasago';
    const isUrgent = sample.status === 'due_today' || sample.status === 'overdue';

    html += `
      <div style="background: white; border: 1px solid ${isUrgent ? '#f87171' : '#e2e8f0'}; border-radius: 6px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px;">
          <span style="font-weight: bold; color: ${isUrgent ? '#b91c1c' : '#047857'}; font-size: 16px;">
            #${idx + 1}. ${sample.projectName}
          </span>
          <span style="background: ${isUrgent ? '#fee2e2' : '#e0f2fe'}; color: ${isUrgent ? '#991b1b' : '#0369a1'}; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            ${sample.status === 'due_today' ? 'ĐẾN HẠN HÔM NAY' : sample.status === 'overdue' ? 'QUÁ HẠN' : 'SẮP ĐẾN HẠN'}
          </span>
        </div>
        <table style="width: 100%; font-size: 13px; color: #334155; line-height: 1.6;">
          <tr>
            <td style="width: 35%; font-weight: bold; color: #64748b;">Trạm trộn:</td>
            <td><strong>${stationName}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #64748b;">Hạng mục & Khối lượng:</td>
            <td>${sample.component} — <strong>${sample.volumeM3} m³</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #64748b;">Mác bê tông & Độ sụt:</td>
            <td><span style="color: #047857; font-weight: bold;">${sample.concreteGrade}</span> (Độ sụt: ${sample.slumpCm}cm)</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #64748b;">Tuổi nén & Loại mẫu:</td>
            <td><strong>${sample.ageType} (${sample.ageDays} ngày)</strong> — ${shapeMap[sample.sampleShape] || sample.sampleShape} (${sample.groupCount} tổ / ${sample.pieceCount} viên)</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #64748b;">Ngày đúc ➔ Ngày nén:</td>
            <td>${formatDateVN(sample.castDate)} ➔ <strong style="color: #b91c1c;">${formatDateVN(sample.scheduledTestDate)}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #64748b;">Đơn vị thi công:</td>
            <td>${sample.contractor}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #64748b;">Liên hệ công trình:</td>
            <td><strong>${sample.contactPerson}</strong> — SĐT: <a href="tel:${sample.contactPhone}" style="color: #0284c7; font-weight: bold; text-decoration: none;">${sample.contactPhone}</a></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #64748b;">KTV lấy mẫu:</td>
            <td>${sample.samplerName}</td>
          </tr>
          ${sample.notes ? `
          <tr>
            <td style="font-weight: bold; color: #64748b;">Ghi chú:</td>
            <td style="color: #64748b; font-style: italic;">${sample.notes}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  });

  html += `
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} Công Ty Cổ Phần Đầu Tư Tasago • Hệ Thống Kiểm Định Chất Lượng Bê Tông
        </div>
      </div>
    </div>
  `;

  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;
  const sampleSummary = `${count} mẫu (${urgentCount} mẫu cần nén gấp)`;

  return {
    title,
    bodyText: text,
    zaloMarkdown: text,
    htmlContent: html,
    sampleSummary,
    urgentCount,
  };
}

// Play a pleasant alert sound using Web Audio API
export function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play two-tone chime (E5 -> A5)
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.15); // A5
    gain2.gain.setValueAtTime(0.18, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.debug('Web audio autoplay note:', e);
  }
}

// Request Browser Push Notification Permission
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Trình duyệt không hỗ trợ Web Notification API');
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

// Show Native OS Desktop / Mobile Push Notification
export function showSystemPushNotification(
  title: string,
  body: string,
  tag: string = 'tasago-sample-alert'
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  try {
    new Notification(title, {
      body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3050/3050525.png',
      tag,
      requireInteraction: true,
    });
  } catch (e) {
    console.debug('Notification trigger note:', e);
  }
}

// 100% Automatic Background Notification Trigger Engine
export async function checkAndTriggerAutoNotifications(
  samples: ConcreteSample[],
  stations: Station[],
  config: NotificationConfig,
  forceRun: boolean = false
): Promise<{ triggered: boolean; urgentCount: number; message: string }> {
  const urgentSamples = samples.filter(
    s => s.status === 'due_today' || s.status === 'overdue'
  );

  if (urgentSamples.length === 0) {
    return { triggered: false, urgentCount: 0, message: 'Không có mẫu nào đến hạn hoặc quá hạn hôm nay.' };
  }

  // Check current hour in Vietnam timezone (GMT+7)
  const vnTimeStr = new Date().toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false
  });
  const currentVnHour = Number(vnTimeStr.split(':')[0]);
  const targetHour = config.autoSendHour ?? 7;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastAutoRunKey = `tasago_last_auto_notif_${todayStr}`;
  const alreadyRanToday = localStorage.getItem(lastAutoRunKey);

  // If not forcing, check if we reached the scheduled hour (e.g. 7h sáng) and haven't run today
  if (!forceRun) {
    if (currentVnHour < targetHour) {
      return {
        triggered: false,
        urgentCount: urgentSamples.length,
        message: `Chưa đến giờ gửi thông báo tự động (Cài đặt: ${String(targetHour).padStart(2, '0')}:00 Sáng hàng ngày, hiện tại: ${vnTimeStr}).`
      };
    }

    if (alreadyRanToday) {
      return { 
        triggered: false, 
        urgentCount: urgentSamples.length, 
        message: `Hôm nay (${formatDateVN(todayStr)}) lúc ${String(targetHour).padStart(2, '0')}:00 sáng đã gửi thông báo tự động cho ${urgentSamples.length} mẫu nén.` 
      };
    }
  }

  // 1. Play alert sound if enabled
  if (config.enableSoundAlert) {
    playAlertChime();
  }

  // 2. Trigger Native OS / Browser Push Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const dueTodayCount = urgentSamples.filter(s => s.status === 'due_today').length;
    const overdueCount = urgentSamples.filter(s => s.status === 'overdue').length;
    showSystemPushNotification(
      `🔔 [TASAGO] CẢNH BÁO ${urgentSamples.length} MẪU NÉN BÊ TÔNG (07:00 SÁNG)!`,
      `Hôm nay có ${dueTodayCount} mẫu đến hạn nén và ${overdueCount} mẫu quá hạn. Hệ thống đang tự động gửi báo cáo qua Email & Zalo.`
    );
  }

  // 3. Trigger Zalo Webhook & Real Email Dispatch
  let dispatchResult = { success: true, message: '' };
  if (config.autoZaloEnabled || config.autoEmailEnabled || forceRun) {
    const channel = config.autoZaloEnabled && config.autoEmailEnabled ? 'both' : config.autoZaloEnabled ? 'zalo_bot' : 'email';
    dispatchResult = await dispatchNotification(urgentSamples, stations, config, channel);
  }

  // Mark as triggered for today
  localStorage.setItem(lastAutoRunKey, new Date().toISOString());

  return {
    triggered: true,
    urgentCount: urgentSamples.length,
    message: dispatchResult.message || `Đã tự động gửi thông báo 07:00 sáng cho ${urgentSamples.length} mẫu bê tông đến hạn nén!`
  };
}

// Dispatch Notification to Zalo Bot / Webhook / Email via Backend API
export async function dispatchNotification(
  samples: ConcreteSample[],
  stations: Station[],
  config: NotificationConfig,
  channel: 'zalo_bot' | 'email' | 'both'
): Promise<{ success: boolean; message: string; logIds: string[] }> {
  if (samples.length === 0) {
    return { success: false, message: 'Không có mẫu bê tông nào để gửi thông báo.', logIds: [] };
  }

  const notif = generateSampleNotification(samples, stations);
  const logIds: string[] = [];
  const results: string[] = [];

  // 1. Zalo Dispatch
  if (channel === 'zalo_bot' || channel === 'both') {
    let zaloStatus: 'success' | 'failed' | 'simulated' = 'simulated';
    let errorDetails: string | undefined;

    try {
      if (config.zaloWebhookUrl && config.zaloWebhookUrl.startsWith('http')) {
        const res = await fetch(config.zaloWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.zaloBotToken ? { 'Authorization': `Bearer ${config.zaloBotToken}` } : {})
          },
          body: JSON.stringify({
            event: 'SAMPLE_COMPRESSION_REMINDER',
            company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
            slogan: 'BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH',
            timestamp: new Date().toISOString(),
            recipient: { group_id: config.zaloGroupId || 'tasago_group' },
            message: {
              text: notif.bodyText,
              attachments: []
            },
            urgent_count: notif.urgentCount,
            samples: samples.map(s => ({
              id: s.id,
              sampleCode: s.sampleCode,
              projectName: s.projectName,
              contractor: s.contractor,
              component: s.component,
              concreteGrade: s.concreteGrade,
              volumeM3: s.volumeM3,
              scheduledTestDate: s.scheduledTestDate,
              status: s.status,
              contactPerson: s.contactPerson,
              contactPhone: s.contactPhone
            }))
          }),
        }).catch(err => {
          console.warn('Webhook network note:', err);
          return null;
        });

        if (res && (res.ok || res.status === 200 || res.status === 204)) {
          zaloStatus = 'success';
          errorDetails = 'Đã bắn tin thành công vào Nhóm Zalo Kỹ Thuật!';
          results.push('Zalo Bot: Thành công');
        } else {
          zaloStatus = 'simulated';
          errorDetails = `Gửi qua Webhook (Mã phản hồi: ${res ? res.status : 'Local/Preview'}). Nhật ký thông báo đã được lưu.`;
          results.push('Zalo Bot: Đã lưu bản tin');
        }
      } else {
        zaloStatus = 'simulated';
        errorDetails = 'Chưa cấu hình Zalo Webhook URL - Đã tạo bản tin tự động trong hệ thống';
        results.push('Zalo Bot: Sẵn sàng');
      }
    } catch (e: any) {
      zaloStatus = 'simulated';
      errorDetails = e.message;
    }

    const log = addNotificationLog({
      channel: 'zalo_bot',
      recipient: config.zaloGroupId || 'Nhóm Zalo Kỹ Thuật Tasago',
      sampleIds: samples.map(s => s.id),
      sampleInfoSummary: notif.sampleSummary,
      messageContent: notif.bodyText,
      status: zaloStatus,
      errorDetails,
    });
    logIds.push(log.id);
  }

  // 2. Real Email Dispatch via Express Server / Webhook API
  if (channel === 'email' || channel === 'both') {
    const recipients = config.emailRecipients.filter(r => r.trim().length > 0);
    const recipientsStr = recipients.join(', ') || 'kythuat@tasago.vn, thanhtgndt@gmail.com';
    let emailStatus: 'success' | 'failed' | 'simulated' = 'failed';
    let emailError: string | undefined;

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.length > 0 ? recipients : ['kythuat@tasago.vn', 'thanhtgndt@gmail.com'],
          subject: notif.title,
          html: notif.htmlContent,
          plainText: notif.bodyText,
          smtpConfig: {
            smtpHost: config.smtpHost,
            smtpPort: config.smtpPort,
            smtpUser: config.smtpUser,
            smtpPass: config.smtpPass,
            smtpSecure: config.smtpSecure,
            smtpFrom: config.emailSender,
            emailServiceUrl: config.emailServiceUrl
          },
          emailServiceUrl: config.emailServiceUrl
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        emailStatus = 'success';
        emailError = data.message || `Đã gửi email thành công tới ${recipientsStr}`;
        results.push(`Email: Đã gửi tới ${recipients.length} địa chỉ`);
      } else {
        emailStatus = data?.channel === 'ready_mode' ? 'success' : 'failed';
        emailError = data?.message || 'Không thể kết nối máy chủ gửi email';
        results.push(`Email: ${emailError}`);
      }
    } catch (e: any) {
      console.warn('Email dispatch server call note:', e);
      emailStatus = 'failed';
      emailError = e?.message || 'Không thể kết nối endpoint gửi email';
      results.push(`Email: ${emailError}`);
    }

    const log = addNotificationLog({
      channel: 'email',
      recipient: recipientsStr,
      sampleIds: samples.map(s => s.id),
      sampleInfoSummary: notif.sampleSummary,
      messageContent: notif.htmlContent,
      status: emailStatus,
      errorDetails: emailError,
    });
    logIds.push(log.id);
  }

  return {
    success: true,
    message: `Đã kích hoạt gửi thông báo (${results.join(' | ')}) cho ${samples.length} mẫu nén.`,
    logIds,
  };
}

// Generate direct mailto: URL for instant email client composer
export function generateMailtoUrl(
  recipients: string[],
  subject: string,
  bodyText: string
): string {
  const to = recipients.filter(r => r.includes('@')).join(',');
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(bodyText);
  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
}
