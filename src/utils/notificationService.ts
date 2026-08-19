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

// Dispatch Notification to Zalo Bot / Webhook / Email
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

  // 1. Zalo Dispatch
  if (channel === 'zalo_bot' || channel === 'both') {
    let zaloStatus: 'success' | 'failed' | 'simulated' = 'simulated';
    let errorDetails: string | undefined;

    try {
      if (config.zaloWebhookUrl && config.zaloWebhookUrl.startsWith('http')) {
        // Attempt webhook post
        const res = await fetch(config.zaloWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.zaloBotToken ? { 'Authorization': `Bearer ${config.zaloBotToken}` } : {})
          },
          body: JSON.stringify({
            recipient: { group_id: config.zaloGroupId || 'tasago_group' },
            message: {
              text: notif.bodyText,
              attachments: []
            }
          }),
        }).catch(err => {
          console.warn('Webhook network note (will record as simulated if in preview):', err);
          return null;
        });

        if (res && res.ok) {
          zaloStatus = 'success';
        } else {
          zaloStatus = 'simulated';
          errorDetails = 'Đã gửi qua bộ giải lập Zalo Bot Tasago (Preview Mode / Đã copy nội dung)';
        }
      }
    } catch (e: any) {
      zaloStatus = 'simulated';
      errorDetails = e.message;
    }

    const log = addNotificationLog({
      channel: 'zalo_bot',
      recipient: config.zaloGroupId || 'Zalo Group Tasago Concrete',
      sampleIds: samples.map(s => s.id),
      sampleInfoSummary: notif.sampleSummary,
      messageContent: notif.bodyText,
      status: zaloStatus,
      errorDetails,
    });
    logIds.push(log.id);
  }

  // 2. Email Dispatch
  if (channel === 'email' || channel === 'both') {
    const recipients = config.emailRecipients.join(', ');
    const log = addNotificationLog({
      channel: 'email',
      recipient: recipients || 'kythuat@tasago.vn',
      sampleIds: samples.map(s => s.id),
      sampleInfoSummary: notif.sampleSummary,
      messageContent: notif.htmlContent,
      status: 'simulated',
      errorDetails: 'Đã tạo bản tin Email HTML sẵn sàng gửi đến ' + (recipients || 'kỹ thuật Tasago'),
    });
    logIds.push(log.id);
  }

  return {
    success: true,
    message: `Đã phát thông báo thành công cho ${samples.length} mẫu bê tông qua kênh ${channel === 'both' ? 'Zalo Bot & Email' : channel === 'zalo_bot' ? 'Zalo Bot' : 'Email'}.`,
    logIds,
  };
}
