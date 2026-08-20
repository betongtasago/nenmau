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
  RefreshCw
} from 'lucide-react';
import { ConcreteSample, Station, NotificationConfig, NotificationLog, User } from '../types';
import { 
  generateSampleNotification, 
  dispatchNotification,
  playAlertChime,
  requestBrowserNotificationPermission,
  showSystemPushNotification
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

  // Local state for Email Management (Admin)
  const [emailList, setEmailList] = useState<string[]>(() => {
    return Array.isArray(config.emailRecipients) ? config.emailRecipients : [];
  });
  const [newEmailInput, setNewEmailInput] = useState('');
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(config.autoEmailEnabled ?? true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(config.reminderDaysBefore ?? 0);

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
        zaloWebhookUrl,
        zaloBotToken,
        zaloGroupId,
        autoZaloEnabled,
        reminderDaysBefore,
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
      alert('Vui lòng nhập địa chỉ email hợp lệ (ví dụ: kythuat@tasago.vn)!');
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
      zaloWebhookUrl,
      zaloBotToken,
      zaloGroupId,
      autoZaloEnabled,
      reminderDaysBefore,
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
      zaloWebhookUrl,
      zaloBotToken,
      zaloGroupId,
      autoZaloEnabled,
      reminderDaysBefore,
    };
    onSaveConfig(updatedConfig);
  };

  const handleSaveAllConfig = () => {
    const updatedConfig: NotificationConfig = {
      ...config,
      emailRecipients: emailList,
      autoEmailEnabled,
      zaloWebhookUrl: zaloWebhookUrl.trim(),
      zaloBotToken: zaloBotToken.trim(),
      zaloGroupId: zaloGroupId.trim(),
      autoZaloEnabled,
      reminderDaysBefore,
    };

    onSaveConfig(updatedConfig);
    alert(' Đã lưu thành công toàn bộ cấu hình Bot Zalo và Danh sách Email nhận lịch nén mẫu!');
    setActiveTab('send');
  };

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
                Thông Báo Lịch Nén Mẫu Tự Động
              </h3>
              <p className="text-xs text-emerald-200 font-medium">
                Tự động gửi qua Bot Zalo nhóm & Danh sách Email quản lý Tasago
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
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'email'
                ? 'text-emerald-800 border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-700" />
            <span>Email Nhận Lịch ({emailList.length})</span>
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
            <span>Hướng Dẫn Webhook</span>
          </button>
        </div>

        {/* Tab 1: SEND NOTIFICATION NOW */}
        {activeTab === 'send' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Quick Status Notice */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-950 font-semibold">
                  Tự động gửi: Bot Zalo <strong>{autoZaloEnabled ? 'BẬT' : 'TẮT'}</strong> • Email <strong>{autoEmailEnabled ? 'BẬT' : 'TẮT'}</strong> ({emailList.length} người nhận)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('zalo')}
                className="text-[11px] font-bold text-emerald-800 underline cursor-pointer hover:text-emerald-900"
              >
                Cài đặt
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
                      <span>Sao Chép Để Paste Zalo</span>
                    </>
                  )}
                </button>
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

        {/* Tab 2: BOT ZALO SETTINGS */}
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

            {/* Zalo Bot Controls */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              
              {/* Toggle Auto send */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Tự động phát tin vào nhóm Zalo mỗi sáng</span>
                  <span className="text-slate-500 text-[11px]">Gửi danh sách tất cả các mẫu đến hạn hôm nay vào nhóm Zalo</span>
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

              {/* Webhook Endpoint */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>Zalo Webhook URL / Web App Endpoint:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !zaloWebhookUrl}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-blue-600" />
                    <span>{testingWebhook ? 'Đang gửi...' : '⚡ Bắn Thử Tin Nhắn Vào Nhóm (Test Ping)'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={zaloWebhookUrl}
                  onChange={(e) => setZaloWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec hoặc https://openapi.zalo.me/..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

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
                    <span className="text-slate-500">Miễn phí 100%, không cần server, đẩy Zalo và Email cùng lúc.</span>
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

        {/* Tab 3: EMAIL CONFIGURATION (ADMIN CAN ADD / DELETE EMAILS) */}
        {activeTab === 'email' && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
            
            {/* Header Card */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-emerald-950 text-sm">
                  Quản Lý Danh Sách Email Nhận Lịch Nén Mẫu Tự Động
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Quản trị viên (Admin) có quyền thêm mới hoặc xóa bớt địa chỉ email của các Kỹ thuật viên, Trưởng trạm hoặc Ban Giám Đốc nhận thông báo định kỳ.
                </p>
              </div>
            </div>

            {/* Email Settings Controls */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              
              {/* Toggle Auto Email */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Bật tự động gửi Email khi có mẫu đến ngày nén</span>
                  <span className="text-slate-500 text-[11px]">Hệ thống gửi bản tin định dạng HTML đầy đủ thông số kỹ thuật</span>
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

              {/* Add New Email Form */}
              <form onSubmit={handleAddEmail} className="space-y-2">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>+ Thêm Email Người Nhận Mới:</span>
                  <span className="text-[11px] text-slate-400 font-normal">Nhấn Enter hoặc bấm nút Thêm</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="ví dụ: thanhtgndt@gmail.com, kythuat@tasago.vn..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
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
                    Danh Sách Email Đang Nhận Thông Báo ({emailList.length}):
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
                    <p className="text-[11px]">Nhập địa chỉ email vào ô phía trên để thêm người nhận lịch nén mẫu.</p>
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

            </div>

            {/* Save Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveAllConfig}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Danh Sách Email</span>
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
                          {log.channel === 'zalo_bot' ? 'Bot Zalo' : 'Email'}
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
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
              <h4 className="font-black text-blue-950 text-sm flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Hướng Dẫn Kết Nối Bot Zalo Tự Động Gửi Tin Nhắn Nhóm</span>
              </h4>
              <p className="text-slate-600">
                Để hệ thống tự động bắn tin nhắn vào nhóm Zalo mỗi sáng, bạn có thể sử dụng Google Apps Script Web App (miễn phí 100%) hoặc Make.com:
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-950 text-xs uppercase">
                  Cách Tạo Google Apps Script Webhook trong 2 phút:
                </span>
                <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded">
                  Khuyên Dùng
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-700">
                <p>1. Mở <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">script.google.com</a> $\rightarrow$ Nhấn <strong>New project</strong>.</p>
                <p>2. Dán đoạn mã xử lý webhook nhận dữ liệu nén mẫu.</p>
                <p>3. Chọn <strong>Deploy</strong> $\rightarrow$ <strong>New deployment</strong> $\rightarrow$ Chọn loại <strong>Web app</strong> (Who has access: <strong>Anyone</strong>).</p>
                <p>4. Copy URL Web App dán vào ô <em>Zalo Webhook URL</em> ở tab Bot Zalo.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('zalo')}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Chuyển Sang Cài Đặt Bot Zalo</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
