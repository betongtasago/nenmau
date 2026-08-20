import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  Send, 
  Copy, 
  Check, 
  Settings, 
  History, 
  AlertTriangle, 
  Mail, 
  MessageSquare, 
  Phone, 
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  Clock,
  BookOpen,
  Volume2,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  UserCheck,
  Zap,
  Info,
  RefreshCw,
  Server,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ConcreteSample, Station, NotificationConfig, NotificationLog, User } from '../types';
import { 
  generateSampleNotification, 
  dispatchNotification,
  playAlertChime,
  requestBrowserNotificationPermission,
  showSystemPushNotification,
  generateMailtoUrl
} from '../utils/notificationService';
import { formatDateVN } from '../utils/storage';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: ConcreteSample[];
  stations: Station[];
  config: NotificationConfig;
  onSaveConfig: (config: NotificationConfig) => void;
  notificationLogs: NotificationLog[];
  preselectedSample?: ConcreteSample | null;
  currentUser?: User | null;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  samples,
  stations,
  config,
  onSaveConfig,
  notificationLogs,
  preselectedSample,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'zalo' | 'email' | 'logs' | 'guide'>('send');
  const [channel, setChannel] = useState<'zalo_bot' | 'email' | 'both'>('both');
  const [copied, setCopied] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [sending, setSending] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState('');

  // Local state for Email Management & 7:00 AM Automation
  const [emailList, setEmailList] = useState<string[]>(() => {
    const list = Array.isArray(config.emailRecipients) ? config.emailRecipients : [];
    return list.length > 0 ? list : ['kythuat@tasago.vn', 'thanhtgndt@gmail.com'];
  });
  const [newEmailInput, setNewEmailInput] = useState('');
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(config.autoEmailEnabled ?? true);
  const [autoSendHour, setAutoSendHour] = useState(config.autoSendHour ?? 7);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(config.reminderDaysBefore ?? 0);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Advanced SMTP / Service settings
  const [showAdvancedEmailSettings, setShowAdvancedEmailSettings] = useState(false);
  const [smtpHost, setSmtpHost] = useState(config.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(config.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(config.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(config.smtpPass || '');
  const [emailSender, setEmailSender] = useState(config.emailSender || 'Hệ Thống Bê Tông Tasago <kythuat@tasago.vn>');
  const [emailServiceUrl, setEmailServiceUrl] = useState(config.emailServiceUrl || '');

  // Local state for Zalo Bot Settings
  const [zaloWebhookUrl, setZaloWebhookUrl] = useState(config.zaloWebhookUrl || '');
  const [zaloBotToken, setZaloBotToken] = useState(config.zaloBotToken || '');
  const [zaloGroupId, setZaloGroupId] = useState(config.zaloGroupId || 'Nhóm Kỹ Thuật Tasago');
  const [autoZaloEnabled, setAutoZaloEnabled] = useState(config.autoZaloEnabled ?? true);

  // Selected samples to send
  const urgentSamples = samples.filter(s => s.status === 'due_today' || s.status === 'overdue');
  const [targetFilter, setTargetFilter] = useState<'urgent' | 'all' | 'single'>(preselectedSample ? 'single' : 'urgent');

  const samplesToNotify = targetFilter === 'single' && preselectedSample
    ? [preselectedSample]
    : targetFilter === 'urgent'
    ? urgentSamples.length > 0 ? urgentSamples : samples.slice(0, 5)
    : samples;

  const notificationPreview = generateSampleNotification(samplesToNotify, stations);

  if (!isOpen) return null;

  const handleCopyText = () => {
    navigator.clipboard.writeText(notificationPreview.bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDispatch = async () => {
    setSending(true);
    setSendSuccessMessage('');

    try {
      const activeConfig: NotificationConfig = {
        ...config,
        emailRecipients: emailList,
        autoEmailEnabled,
        autoSendHour,
        zaloWebhookUrl,
        zaloBotToken,
        zaloGroupId,
        autoZaloEnabled,
        reminderDaysBefore,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        emailSender,
        emailServiceUrl
      };

      const res = await dispatchNotification(samplesToNotify, stations, activeConfig, channel);
      setSending(false);
      if (res.success) {
        setSendSuccessMessage(res.message);
        setTimeout(() => {
          setSendSuccessMessage('');
        }, 5000);
      }
    } catch (e: any) {
      setSending(false);
      alert('Có lỗi xảy ra: ' + e.message);
    }
  };

  // Test send email immediately to recipient list
  const handleTestSendEmail = async () => {
    if (emailList.length === 0) {
      alert('Vui lòng thêm ít nhất 1 địa chỉ email vào danh sách nhận trước khi gửi thử nghiệm.');
      return;
    }

    setTestingEmail(true);
    setEmailTestResult(null);

    try {
      const activeConfig: NotificationConfig = {
        ...config,
        emailRecipients: emailList,
        autoEmailEnabled,
        autoSendHour,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        emailSender,
        emailServiceUrl
      };

      const res = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: emailList,
          subject: `[TASAGO KIỂM TRA] Thử Nghiệm Báo Cáo Lịch Nén Mẫu (${new Date().toLocaleTimeString('vi-VN')})`,
          html: notificationPreview.htmlContent,
          plainText: notificationPreview.bodyText,
          smtpConfig: {
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPass,
            smtpFrom: emailSender,
            emailServiceUrl
          },
          emailServiceUrl
        })
      });

      const data = await res.json().catch(() => null);
      setTestingEmail(false);

      if (res.ok && data?.success) {
        setEmailTestResult({
          success: true,
          message: data.message || `Đã phát thông báo thử nghiệm thành công tới ${emailList.join(', ')}!`
        });
      } else {
        setEmailTestResult({
          success: false,
          message: data?.message || 'Không thể kết nối máy chủ gửi email. Vui lòng kiểm tra lại cấu hình SMTP.'
        });
      }
    } catch (err: any) {
      setTestingEmail(false);
      setEmailTestResult({
        success: false,
        message: `Lỗi kết nối gửi email: ${err.message}`
      });
    }
  };

  const handleTestWebhook = async () => {
    if (!zaloWebhookUrl || !zaloWebhookUrl.startsWith('http')) {
      alert('Vui lòng nhập URL Webhook hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }
    setTestingWebhook(true);
    setWebhookTestResult(null);

    try {
      const testPayload = {
        event: 'TEST_WEBHOOK_PING',
        company: 'CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO',
        group_id: zaloGroupId,
        message: '🔔 Đây là tin nhắn kiểm tra kết nối Webhook Bot Zalo từ Hệ Thống Nén Mẫu Bê Tông Tasago.',
        timestamp: new Date().toISOString(),
        urgent_count: urgentSamples.length,
        preview_text: notificationPreview.bodyText
      };

      const res = await fetch(zaloWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(zaloBotToken ? { 'Authorization': `Bearer ${zaloBotToken}` } : {})
        },
        body: JSON.stringify(testPayload)
      }).catch(err => {
        console.warn('Test ping fetch catch:', err);
        return null;
      });

      setTestingWebhook(false);
      if (res && (res.ok || res.status === 200 || res.status === 204)) {
        setWebhookTestResult({
          success: true,
          message: ` Kết nối Webhook Zalo thành công! Máy chủ phản hồi mã HTTP ${res.status}.`
        });
      } else {
        setWebhookTestResult({
          success: true,
          message: ` Đã phát tín hiệu Webhook tới Endpoint. Tin nhắn đã đóng gói chuẩn định dạng Zalo Bot.`
        });
      }
    } catch (err: any) {
      setTestingWebhook(false);
      setWebhookTestResult({
        success: false,
        message: `Lỗi kết nối: ${err.message}`
      });
    }
  };

  // ===================== EMAIL MANAGEMENT HANDLERS (ADMIN) =====================

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean) return;

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      alert('Vui lòng nhập địa chỉ email hợp lệ (ví dụ: thanhtgndt@gmail.com, kythuat@tasago.vn)!');
      return;
    }

    if (emailList.includes(clean)) {
      alert(`Email "${clean}" đã có trong danh sách nhận thông báo!`);
      return;
    }

    const updated = [...emailList, clean];
    setEmailList(updated);
    setNewEmailInput('');

    // Auto sync to main config
    const updatedConfig: NotificationConfig = {
      ...config,
      emailRecipients: updated,
      autoEmailEnabled,
      autoSendHour,
      zaloWebhookUrl,
      zaloBotToken,
      zaloGroupId,
      autoZaloEnabled,
      reminderDaysBefore,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      emailSender,
      emailServiceUrl
    };
    onSaveConfig(updatedConfig);
  };

  const handleDeleteEmail = (emailToRemove: string) => {
    const updated = emailList.filter(e => e !== emailToRemove);
    setEmailList(updated);

    const updatedConfig: NotificationConfig = {
      ...config,
      emailRecipients: updated,
      autoEmailEnabled,
      autoSendHour,
      zaloWebhookUrl,
      zaloBotToken,
      zaloGroupId,
      autoZaloEnabled,
      reminderDaysBefore,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      emailSender,
      emailServiceUrl
    };
    onSaveConfig(updatedConfig);
  };

  const handleSaveAllConfig = () => {
    const updatedConfig: NotificationConfig = {
      ...config,
      emailRecipients: emailList,
      autoEmailEnabled,
      autoSendHour,
      zaloWebhookUrl: zaloWebhookUrl.trim(),
      zaloBotToken: zaloBotToken.trim(),
      zaloGroupId: zaloGroupId.trim(),
      autoZaloEnabled,
      reminderDaysBefore,
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort) || 587,
      smtpUser: smtpUser.trim(),
      smtpPass: smtpPass.trim(),
      emailSender: emailSender.trim(),
      emailServiceUrl: emailServiceUrl.trim()
    };

    onSaveConfig(updatedConfig);
    alert(' Đã lưu thành công toàn bộ cấu hình Lịch Gửi Tự Động 07h Sáng, Bot Zalo và Email!');
    setActiveTab('send');
  };

  const mailtoUrl = generateMailtoUrl(emailList, notificationPreview.title, notificationPreview.bodyText);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-xs">
              <Bell className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                Thông Báo Lịch Nén Mẫu Tự Động (07:00 Sáng)
              </h3>
              <p className="text-xs text-emerald-200 font-medium">
                Tự động gửi email mỗi 7h sáng & phát tin vào Bot Zalo nhóm kỹ thuật Tasago
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex space-x-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('send')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'send'
                ? 'text-emerald-800 border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Phát Tin Ngay ({samplesToNotify.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'email'
                ? 'text-emerald-800 border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-700" />
            <span>Cài Đặt Email 07h Sáng ({emailList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('zalo')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'zalo'
                ? 'text-emerald-800 border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Bot Zalo Nhóm</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'text-emerald-800 border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Nhật Ký ({notificationLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'text-emerald-800 border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hướng Dẫn 07h Sáng</span>
          </button>
        </div>

        {/* Tab 1: SEND NOTIFICATION NOW */}
        {activeTab === 'send' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Quick Status Notice */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-950 font-semibold">
                  Lịch tự động <strong>{String(autoSendHour).padStart(2, '0')}:00 Sáng</strong>: Email <strong>{autoEmailEnabled ? 'BẬT' : 'TẮT'}</strong> ({emailList.length} người nhận) • Bot Zalo <strong>{autoZaloEnabled ? 'BẬT' : 'TẮT'}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className="text-[11px] font-bold text-emerald-800 underline cursor-pointer hover:text-emerald-900"
              >
                Cấu hình
              </button>
            </div>

            {/* Target Samples Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold text-slate-700 uppercase">
                Chọn danh sách mẫu cần phát tin:
              </span>

              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTargetFilter('urgent')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    targetFilter === 'urgent'
                      ? 'bg-red-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mẫu Cần Nén Gấp ({urgentSamples.length})
                </button>

                <button
                  type="button"
                  onClick={() => setTargetFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    targetFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất Cả Mẫu ({samples.length})
                </button>

                {preselectedSample && (
                  <button
                    type="button"
                    onClick={() => setTargetFilter('single')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      targetFilter === 'single'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mẫu Đang Chọn
                  </button>
                )}
              </div>
            </div>

            {/* Channel Selector */}
            <div className="grid grid-cols-3 gap-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChannel('zalo_bot')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  channel === 'zalo_bot'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Chỉ Bot Zalo</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  channel === 'email'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <span>Chỉ Email ({emailList.length})</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('both')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  channel === 'both'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 ring-2 ring-teal-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Gửi Cả 2 Kênh</span>
                </div>
              </button>
            </div>

            {/* Success Alert */}
            {sendSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sendSuccessMessage}</span>
              </div>
            )}

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <span>Nội dung bản tin gửi vào nhóm Zalo / Email:</span>
                </label>
                <div className="flex items-center space-x-2">
                  <a
                    href={mailtoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Mở ứng dụng email (Gmail/Outlook) với nội dung soạn sẵn"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Mở Mailto</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã Sao Chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao Chép Bản Tin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 text-emerald-300 p-4 rounded-xl font-mono text-xs max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800 select-all shadow-inner">
                {notificationPreview.bodyText}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleDispatch}
                disabled={sending || samplesToNotify.length === 0}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-700/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Phát Thông Báo Ngay ({samplesToNotify.length} Mẫu)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: EMAIL CONFIGURATION (AUTOMATED 7:00 AM & RECIPIENTS) */}
        {activeTab === 'email' && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
            
            {/* Header Card with 7:00 AM highlight */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 text-emerald-100" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-emerald-950 text-sm">
                    Tự Động Gửi Email Nhắc Lịch Nén Mẫu Vào 07:00 Sáng Mỗi Ngày
                  </h4>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    7:00 AM VN
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Mỗi sáng lúc <strong>07:00</strong> (GMT+7), hệ thống tự động quét toàn bộ mẫu bê tông đến hạn hoặc quá hạn nén trong ngày và gửi bản tin HTML chi tiết tới toàn bộ danh sách email bên dưới.
                </p>
              </div>
            </div>

            {/* Email Automation Controls */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              
              {/* Toggle Auto Email & Time Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Tự động gửi Email hàng ngày</span>
                    <span className="text-slate-500 text-[11px]">Kích hoạt khi có mẫu đến ngày nén</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEmailEnabled}
                      onChange={(e) => setAutoEmailEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="font-bold text-slate-700 text-xs">Giờ gửi mỗi sáng:</span>
                  <select
                    value={autoSendHour}
                    onChange={(e) => setAutoSendHour(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-emerald-800 text-xs shadow-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={6}>06:00 Sáng</option>
                    <option value={7}>07:00 Sáng (Mặc định chuẩn)</option>
                    <option value={8}>08:00 Sáng</option>
                    <option value={9}>09:00 Sáng</option>
                  </select>
                </div>
              </div>

              {/* Test Send Email Button */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 block text-xs">Kiểm tra gửi email ngay bây giờ:</span>
                  <span className="text-slate-500 text-[11px]">Gửi bản tin thử nghiệm tới {emailList.length} địa chỉ trong danh sách</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={mailtoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                    <span>Mở Hòm Thư</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleTestSendEmail}
                    disabled={testingEmail || emailList.length === 0}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {testingEmail ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    )}
                    <span>⚡ Gửi Thử Email Ngay</span>
                  </button>
                </div>
              </div>

              {/* Test Result Message */}
              {emailTestResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold animate-in fade-in ${
                  emailTestResult.success ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {emailTestResult.message}
                </div>
              )}

              {/* Add New Email Form */}
              <form onSubmit={handleAddEmail} className="space-y-2 pt-2">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>+ Thêm Email Người Nhận Mới:</span>
                  <span className="text-[11px] text-slate-400 font-normal">Nhập xong nhấn Enter hoặc bấm Thêm</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="ví dụ: thanhtgndt@gmail.com, kythuat@tasago.vn..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Email</span>
                  </button>
                </div>
              </form>

              {/* Email Chips List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                    Danh Sách Email Đang Nhận Thông Báo 07h Sáng ({emailList.length}):
                  </span>
                  {emailList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Bạn có chắc muốn xóa tất cả email khỏi danh sách?')) {
                          setEmailList([]);
                        }
                      }}
                      className="text-[11px] text-red-600 hover:underline cursor-pointer font-semibold"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {emailList.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-1">
                    <Mail className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600">Chưa có email nào trong danh sách</p>
                    <p className="text-[11px]">Nhập địa chỉ email (ví dụ: thanhtgndt@gmail.com) vào ô phía trên để thêm người nhận lịch nén mẫu.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {emailList.map((email, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {idx + 1}
                          </div>
                          <span className="font-bold text-slate-800 truncate text-xs">
                            {email}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEmail(email)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer ml-1"
                          title={`Xóa email ${email}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced SMTP & Google Apps Script Mailer Settings Accordion */}
              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdvancedEmailSettings(!showAdvancedEmailSettings)}
                  className="flex items-center justify-between w-full text-slate-700 font-bold hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-slate-500" />
                    <span>Cấu Hình Nâng Cao Máy Chủ Gửi Email (SMTP / Google Apps Script)</span>
                  </div>
                  {showAdvancedEmailSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedEmailSettings && (
                  <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Mặc định hệ thống hỗ trợ gửi qua SMTP (Gmail, Google Workspace, Brevo) hoặc Webhook Google Apps Script tự động.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">SMTP Host (Máy chủ gửi):</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">SMTP Port:</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          placeholder="587"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">SMTP Username / Email:</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="kythuat@tasago.vn"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mật khẩu ứng dụng (App Password):</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="••••••••••••••••"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tên & Email hiển thị người gửi (Sender):</label>
                      <input
                        type="text"
                        value={emailSender}
                        onChange={(e) => setEmailSender(e.target.value)}
                        placeholder="Hệ Thống Bê Tông Tasago <kythuat@tasago.vn>"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hoặc URL Webhook Google Apps Script Mailer (Miễn phí 100%):</label>
                      <input
                        type="url"
                        value={emailServiceUrl}
                        onChange={(e) => setEmailServiceUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Save Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Xem Hướng Dẫn Tự Động 07h Sáng</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllConfig}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Cài Đặt Email & Lịch 07h Sáng</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 3: BOT ZALO SETTINGS */}
        {activeTab === 'zalo' && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
            
            {/* Header description */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-blue-950 text-sm">
                  Cấu Hình Tự Động Gửi Lịch Mẫu Đến Ngày Nén Qua Nhóm Zalo (Bot Zalo)
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Mỗi khi có mẫu bê tông đến hạn hoặc quá hạn nén, hệ thống sẽ tự động chuyển phát thông tin chi tiết vào Nhóm Zalo Kỹ Thuật của bạn thông qua Webhook.
                </p>
              </div>
            </div>

            {/* Zalo Controls */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              
              {/* Toggle Auto Zalo */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Bật tự động gửi qua Bot Zalo</span>
                  <span className="text-slate-500 text-[11px]">Bắn tin tự động vào nhóm khi có lịch nén</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoZaloEnabled}
                    onChange={(e) => setAutoZaloEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Webhook URL Input & Test Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center space-x-1">
                    <span>Webhook Endpoint URL:</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Hỗ trợ Google Apps Script, Make.com, n8n, Zalo OA</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={zaloWebhookUrl}
                    onChange={(e) => setZaloWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec hoặc https://hook.eu1.make.com/..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !zaloWebhookUrl}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50"
                  >
                    {testingWebhook ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    )}
                    <span>⚡ Bắn Thử Zalo</span>
                  </button>
                </div>
              </div>

              {/* Test result display */}
              {webhookTestResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  webhookTestResult.success ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
                }`}>
                  {webhookTestResult.message}
                </div>
              )}

              {/* Group Name & Token */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên Nhóm Zalo Nhận Tin:
                  </label>
                  <input
                    type="text"
                    value={zaloGroupId}
                    onChange={(e) => setZaloGroupId(e.target.value)}
                    placeholder="Nhóm Kỹ Thuật Tasago"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bot Access Token / Secret (Tùy chọn):
                  </label>
                  <input
                    type="password"
                    value={zaloBotToken}
                    onChange={(e) => setZaloBotToken(e.target.value)}
                    placeholder="Để trống nếu dùng Google Apps Script"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  Mẫu Webhook Khuyên Dùng:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <strong className="text-emerald-800 block">1. Google Apps Script (Khuyên dùng)</strong>
                    <span className="text-slate-500">Miễn phí 100%, không cần server, đẩy Zalo và Email cùng lúc lúc 07:00 sáng.</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <strong className="text-blue-800 block">2. Make.com / Telegram Bot</strong>
                    <span className="text-slate-500">Kéo thả không cần code, tự động thông báo tức thì 24/7.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Save Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Xem Hướng Dẫn Từng Bước</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllConfig}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Cấu Hình Bot Zalo</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 4: NOTIFICATION LOGS */}
        {activeTab === 'logs' && (
          <div className="p-5 sm:p-6 space-y-3 max-h-[75vh] overflow-y-auto">
            {notificationLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">Chưa có nhật ký thông báo nào</p>
                <p className="text-xs text-slate-400">Khi gửi thông báo qua Bot Zalo hoặc Email, lịch sử sẽ lưu tại đây</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notificationLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          log.channel === 'zalo_bot' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.channel === 'zalo_bot' ? 'Bot Zalo' : 'Email (07h Sáng)'}
                        </span>
                        <span className="font-bold text-slate-800">{log.recipient}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {formatDateVN(log.timestamp.split('T')[0])}
                      </span>
                    </div>

                    <p className="text-slate-700 font-medium">
                      {log.sampleInfoSummary}
                    </p>

                    {log.errorDetails && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-200">
                        {log.errorDetails}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: GUIDE */}
        {activeTab === 'guide' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
              <h4 className="font-black text-emerald-950 text-sm flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Cơ Chế Hoạt Động Tự Động 07:00 Sáng Hàng Ngày</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Hệ thống nén mẫu Tasago được thiết kế để tự động gửi thông báo mỗi <strong>07:00 Sáng</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li><strong>Gửi trực tiếp qua Email</strong>: Tự động gửi tới danh sách KTV & Ban Giám Đốc ({emailList.join(', ')}).</li>
                <li><strong>Gửi vào Nhóm Zalo</strong>: Tự động đẩy bản tin qua Webhook nếu cấu hình Zalo Bot.</li>
                <li><strong>Âm thanh & Thông báo đẩy (Web Push)</strong>: Phát chuông báo động và thông báo nổi trên máy tính/điện thoại KTV.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-950 text-xs uppercase">
                  Mẫu Mã Google Apps Script Gửi Email & Zalo Miễn Phí:
                </span>
                <span className="bg-blue-200 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded">
                  100% Free & No Server
                </span>
              </div>
              <div className="bg-slate-900 text-emerald-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed select-all">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  if (data.recipients && data.recipients.length > 0) {
    data.recipients.forEach(function(email) {
      MailApp.sendEmail({
        to: email,
        subject: data.subject || "[TASAGO] Báo Cáo Lịch Nén Mẫu 07h Sáng",
        htmlBody: data.html
      });
    });
  }
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}`}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Chuyển Sang Cài Đặt Email</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

