import { ConcreteSample, Station, NotificationConfig, NotificationLog } from '../types';
import { formatDateVN, addNotificationLog } from './storage';

export interface FormattedNotification { title: string; bodyText: string; zaloMarkdown: string; htmlContent: string; sampleSummary: string; urgentCount: number; }

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Generate complete formatted notification message for a list of samples
export function generateSampleNotification(samples: ConcreteSample[], stations: Station[], channelType: 'zalo_bot' | 'email' = 'zalo_bot'): FormattedNotification {
  const stationMap = new Map<string, Station>(); stations.forEach(s => stationMap.set(s.id, s));
  const count = samples.length;
  const title = `[TASAGO] THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG - ${count} MẪU ĐẾN HẠN/QUÁ HẠN`;
  const shapeMap: Record<string, string> = { cube_150: 'Mẫu vuông 150x150x150mm', cylinder_150_300: 'Mẫu trụ Ø150x300mm', waterproof_150: 'Mẫu trụ chống thấm', expansion: 'Mẫu bù co ngót', other: 'Mẫu quy cách đặc biệt' };
  const statusBadge = (status: string) => status === 'due_today' ? '🔴 [ĐẾN HẠN HÔM NAY]' : status === 'overdue' ? '⚠️ [QUÁ HẠN CHƯA NÉN]' : status === 'pending' ? '🔵 [SẮP ĐẾN HẠN]' : '📋 [LỊCH NÉN]';
  let text = `📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\n🔔 THÔNG BÁO LỊCH NÉN MẪU BÊ TÔNG TỰ ĐỘNG\n⏰ Thời gian phát thông báo: ${new Date().toLocaleTimeString('vi-VN')} ngày ${formatDateVN(new Date().toISOString().split('T')[0])}\n-------------------------------------------\n\n`;
  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId); const stationName = station ? station.name : 'Trạm Tasago'; const shape = shapeMap[sample.sampleShape] || sample.sampleShape;
    text += `${idx + 1}. ${statusBadge(sample.status)}: ${sample.projectName.toUpperCase()}\n   🏢 Trạm trộn: ${stationName}\n   🏗️ Hạng mục: ${sample.component} (Khối lượng: ${sample.volumeM3} m³)\n   🧪 Mác bê tông: ${sample.concreteGrade} (Độ sụt: ${sample.slumpCm} cm)\n   ⏱️ Tuổi nén: ${sample.ageType} (${sample.ageDays} ngày)\n   📐 Quy cách mẫu: ${shape} (${sample.groupCount} tổ - ${sample.pieceCount} viên)\n   📅 Ngày đúc: ${formatDateVN(sample.castDate)} ➡️ Ngày nén: ${formatDateVN(sample.scheduledTestDate)}\n   👤 Đơn vị thi công: ${sample.contractor}\n   📞 Người liên hệ công trình: ${sample.contactPerson} - SĐT: ${sample.contactPhone}\n   👨‍🔬 KTV lấy mẫu: ${sample.samplerName}\n${sample.notes ? `   📝 Ghi chú: ${sample.notes}\n` : ''}   👉 Mã mẫu hệ thống: ${sample.id} (${sample.sampleCode})\n\n`;
  });
  text += `-------------------------------------------\n⚡ Đề nghị Ban Chỉ Huy Trạm, Kỹ thuật viên & Phòng Thí nghiệm chuẩn bị máy nén, liên hệ công trình và cập nhật kết quả lên hệ thống Tasago.\n🌐 Cổng quản lý: Tasago Concrete Testing Portal`;

  let html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #10b981;border-radius:8px;overflow:hidden"><div style="background:#065f46;color:white;padding:18px 24px"><h2 style="margin:0;font-size:20px">CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO</h2><p style="margin:5px 0 0;font-size:14px">Hệ thống tự động nhắc lịch nén mẫu bê tông & trialmix</p></div><div style="padding:20px;background:#f8fafc"><div style="background:#ecfdf5;border-left:4px solid #10b981;padding:12px;margin-bottom:16px"><strong style="color:#065f46">🔔 Thông báo:</strong> Có <strong>${count} công trình/mẫu bê tông</strong> có lịch nén cần thực hiện.</div>`;
  samples.forEach((sample, idx) => {
    const station = stationMap.get(sample.stationId); const stationName = station ? station.name : 'Trạm Tasago'; const isUrgent = sample.status === 'due_today' || sample.status === 'overdue';
    html += `<div style="background:white;border:1px solid ${isUrgent ? '#f87171' : '#e2e8f0'};border-radius:6px;padding:16px;margin-bottom:14px"><div style="font-weight:bold;color:${isUrgent ? '#b91c1c' : '#047857'};font-size:16px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;margin-bottom:10px">#${idx + 1}. ${sample.projectName}</div><table style="width:100%;font-size:13px;color:#334155;line-height:1.6"><tr><td style="width:35%;font-weight:bold;color:#64748b">Trạm trộn:</td><td><strong>${stationName}</strong></td></tr><tr><td style="font-weight:bold;color:#64748b">Hạng mục & Khối lượng:</td><td>${sample.component} — <strong>${sample.volumeM3} m³</strong></td></tr><tr><td style="font-weight:bold;color:#64748b">Mác & Độ sụt:</td><td>${sample.concreteGrade} (${sample.slumpCm}cm)</td></tr><tr><td style="font-weight:bold;color:#64748b">Tuổi nén & Loại mẫu:</td><td><strong>${sample.ageType} (${sample.ageDays} ngày)</strong></td></tr><tr><td style="font-weight:bold;color:#64748b">Ngày đúc ➔ Ngày nén:</td><td>${formatDateVN(sample.castDate)} ➔ <strong>${formatDateVN(sample.scheduledTestDate)}</strong></td></tr><tr><td style="font-weight:bold;color:#64748b">Đơn vị thi công:</td><td>${sample.contractor}</td></tr><tr><td style="font-weight:bold;color:#64748b">Liên hệ:</td><td>${sample.contactPerson} — ${sample.contactPhone}</td></tr><tr><td style="font-weight:bold;color:#64748b">KTV lấy mẫu:</td><td>${sample.samplerName}</td></tr></table></div>`;
  });
  html += `<div style="text-align:center;margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Công Ty Cổ Phần Đầu Tư Tasago</div></div></div>`;
  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;
  return { title, bodyText: text, zaloMarkdown: text, htmlContent: html, sampleSummary: `${count} mẫu (${urgentCount} mẫu cần nén gấp)`, urgentCount };
}

export function playAlertChime() { try { const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext; if (!AudioContextClass) return; const ctx = new AudioContextClass(); const now = ctx.currentTime; const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain(); osc1.type = 'sine'; osc1.frequency.setValueAtTime(659.25, now); gain1.gain.setValueAtTime(0.15, now); gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35); osc1.connect(gain1); gain1.connect(ctx.destination); osc1.start(now); osc1.stop(now + 0.35); } catch {} }
export async function requestBrowserNotificationPermission(): Promise<boolean> { if (!('Notification' in window)) return false; if (Notification.permission === 'granted') return true; if (Notification.permission !== 'denied') return (await Notification.requestPermission()) === 'granted'; return false; }
export function showSystemPushNotification(title: string, body: string, tag = 'tasago-sample-alert') { if (!('Notification' in window) || Notification.permission !== 'granted') return; try { new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/3050/3050525.png', tag, requireInteraction: true }); } catch {} }

export async function checkAndTriggerAutoNotifications(samples: ConcreteSample[], stations: Station[], config: NotificationConfig, forceRun = false): Promise<{ triggered: boolean; urgentCount: number; message: string }> {
  const urgentSamples = samples.filter(s => s.status === 'due_today' || s.status === 'overdue'); if (!urgentSamples.length) return { triggered: false, urgentCount: 0, message: 'Không có mẫu nào đến hạn hoặc quá hạn hôm nay.' };
  const vnTimeStr = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }); const currentVnHour = Number(vnTimeStr.split(':')[0]); const targetHour = config.autoSendHour ?? 7; const todayStr = new Date().toISOString().split('T')[0]; const lastAutoRunKey = `tasago_last_auto_notif_${todayStr}`; const alreadyRanToday = localStorage.getItem(lastAutoRunKey);
  if (!forceRun && (currentVnHour < targetHour || alreadyRanToday)) return { triggered: false, urgentCount: urgentSamples.length, message: currentVnHour < targetHour ? `Chưa đến giờ gửi thông báo tự động (Cài đặt: ${targetHour}:00).` : 'Thông báo tự động hôm nay đã được thực hiện.' };
  let dispatchResult = { success: true, message: '' }; if (config.autoZaloEnabled || config.autoEmailEnabled || forceRun) { const channel = config.autoZaloEnabled && config.autoEmailEnabled ? 'both' : config.autoZaloEnabled ? 'zalo_bot' : 'email'; dispatchResult = await dispatchNotification(urgentSamples, stations, config, channel); }
  localStorage.setItem(lastAutoRunKey, new Date().toISOString()); return { triggered: true, urgentCount: urgentSamples.length, message: dispatchResult.message || `Đã tự động gửi thông báo 07:00 sáng cho ${urgentSamples.length} mẫu bê tông đến hạn nén!` };
}

export async function dispatchNotification(samples: ConcreteSample[], stations: Station[], config: NotificationConfig, channel: 'zalo_bot' | 'email' | 'both'): Promise<{ success: boolean; message: string; logIds: string[] }> {
  if (!samples.length) return { success: false, message: 'Không có mẫu bê tông nào để gửi thông báo.', logIds: [] };
  const notif = generateSampleNotification(samples, stations); const logIds: string[] = []; const results: string[] = [];
  if (channel === 'zalo_bot' || channel === 'both') {
    let zaloStatus: 'success' | 'failed' | 'simulated' = 'simulated'; let errorDetails: string | undefined;
    try { if (config.zaloWebhookUrl?.startsWith('http')) { const res = await fetch(config.zaloWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(config.zaloBotToken ? { Authorization: `Bearer ${config.zaloBotToken}` } : {}) }, body: JSON.stringify({ event: 'SAMPLE_COMPRESSION_REMINDER', company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO', timestamp: new Date().toISOString(), recipient: { group_id: config.zaloGroupId || 'tasago_group' }, message: { text: notif.bodyText, attachments: [] }, urgent_count: notif.urgentCount, samples }) }).catch(() => null); if (res?.ok) { zaloStatus = 'success'; errorDetails = 'Đã bắn tin thành công vào Nhóm Zalo Kỹ Thuật!'; results.push('Zalo Bot: Thành công'); } else { errorDetails = 'Webhook không phản hồi thành công.'; results.push('Zalo Bot: Đã lưu bản tin'); } } else { errorDetails = 'Chưa cấu hình Zalo Webhook URL'; results.push('Zalo Bot: Sẵn sàng'); } } catch (e: any) { errorDetails = e.message; }
    const log = addNotificationLog({ channel: 'zalo_bot', recipient: config.zaloGroupId || 'Nhóm Zalo Kỹ Thuật Tasago', sampleIds: samples.map(s => s.id), sampleInfoSummary: notif.sampleSummary, messageContent: notif.bodyText, status: zaloStatus, errorDetails }); logIds.push(log.id);
  }
  if (channel === 'email' || channel === 'both') {
    const recipients = (config.emailRecipients || []).filter(r => r.trim()); const recipientsStr = recipients.join(', ') || 'kythuat@tasago.vn, thanhtgndt@gmail.com'; let emailStatus: 'success' | 'failed' | 'simulated' = 'failed'; let emailError: string | undefined;
    try {
      const response = await fetch(apiUrl('/api/notifications/send-email'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipients: recipients.length ? recipients : ['kythuat@tasago.vn', 'thanhtgndt@gmail.com'], subject: notif.title, html: notif.htmlContent, plainText: notif.bodyText }) });
      const data = await response.json().catch(() => null); if (response.ok && data?.success) { emailStatus = 'success'; emailError = data.message; results.push(`Email: Đã gửi tới ${recipients.length || 2} địa chỉ`); } else { emailError = data?.message || `Máy chủ email trả về HTTP ${response.status}`; results.push(`Email: ${emailError}`); }
    } catch (e: any) { emailError = e?.message || 'Không thể kết nối máy chủ gửi email'; results.push(`Email: ${emailError}`); }
    const log = addNotificationLog({ channel: 'email', recipient: recipientsStr, sampleIds: samples.map(s => s.id), sampleInfoSummary: notif.sampleSummary, messageContent: notif.htmlContent, status: emailStatus, errorDetails: emailError }); logIds.push(log.id);
  }
  return { success: true, message: `Đã kích hoạt gửi thông báo (${results.join(' | ')}) cho ${samples.length} mẫu nén.`, logIds };
}
export function generateMailtoUrl(recipients: string[], subject: string, bodyText: string): string { const to = recipients.filter(r => r.includes('@')).join(','); return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`; }
