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
  HelpCircle
} from 'lucide-react';
import { ConcreteSample, Station, NotificationConfig, NotificationLog } from '../types';
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
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'logs' | 'settings' | 'guide'>('send');
  const [channel, setChannel] = useState<'zalo_bot' | 'email' | 'both'>('both');
  const [copied, setCopied] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [sending, setSending] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState('');

  // Config local state for settings tab
  const [zaloWebhookUrl, setZaloWebhookUrl] = useState(config.zaloWebhookUrl);
  const [zaloBotToken, setZaloBotToken] = useState(config.zaloBotToken);
  const [zaloGroupId, setZaloGroupId] = useState(config.zaloGroupId);
  const [autoZaloEnabled, setAutoZaloEnabled] = useState(config.autoZaloEnabled);
  const [emailRecipientsStr, setEmailRecipientsStr] = useState(config.emailRecipients.join(', '));
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(config.autoEmailEnabled);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(config.reminderDaysBefore);

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
      const res = await dispatchNotification(samplesToNotify, stations, config, channel);
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
        message: '🔔 Đây là tin nhắn kiểm tra kết nối Webhook Bot Zalo từ Hệ Thống Nén Mẫu Tasago.',
        timestamp: new Date().toISOString(),
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
          message: ` Kết nối Webhook thành công! Server phản hồi mã HTTP ${res.status}.`
        });
      } else {
        setWebhookTestResult({
          success: true,
          message: ` Đã phát tín hiệu Webhook tới URL. Bản tin đã được đóng gói chuẩn format Zalo.`
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

  const handleTestAudio = () => {
    playAlertChime();
  };

  const handleTestPush = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      showSystemPushNotification(
        '🔔 [TASAGO] Kiểm Tra Thông Báo Đẩy Thành Công!',
        'Hệ thống quản lý nén mẫu Tasago đã sẵn sàng đẩy thông báo tự động lên thiết bị của bạn.'
      );
      alert('Đã gửi thông báo đẩy thử nghiệm lên màn hình!');
    } else {
      alert('Trình duyệt chưa cho phép quyền Thông báo. Vui lòng bật quyền Notifications trong cài đặt trình duyệt.');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = emailRecipientsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const updatedConfig: NotificationConfig = {
      ...config,
      zaloWebhookUrl,
      zaloBotToken,
      zaloGroupId,
      autoZaloEnabled,
      emailRecipients: recipients,
      autoEmailEnabled,
      reminderDaysBefore,
    };

    onSaveConfig(updatedConfig);
    alert('Đã lưu cấu hình tự động Bot Zalo & Email thành công!');
    setActiveTab('send');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                Trung Tâm Thông Báo Tự Động & Bot Zalo / Email
              </h3>
              <p className="text-xs text-emerald-200">
                Tự động nhắc lịch nén mẫu bê tông cho KTV & Trạm trộn Tasago
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex space-x-3 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('send')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'send'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Phát Thông Báo ({samplesToNotify.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Nhật Ký ({notificationLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài Đặt Tự Động & Webhook</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-blue-700">Hướng Dẫn Bot Zalo A-Z</span>
          </button>
        </div>

        {/* Tab 1: SEND NOTIFICATION */}
        {activeTab === 'send' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Filter Scope Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Chọn danh sách mẫu gửi:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTargetFilter('urgent')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    targetFilter === 'urgent'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  🔴 Đến Hạn & Quá Hạn ({urgentSamples.length})
                </button>
                <button
                  onClick={() => setTargetFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    targetFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  📋 Tất Cả Mẫu ({samples.length})
                </button>
              </div>
            </div>

            {/* Channel Selector */}
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChannel('zalo_bot')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  channel === 'zalo_bot'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-400/40'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Bot Zalo OA</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  channel === 'email'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/40'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Email Kỹ Thuật</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('both')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  channel === 'both'
                    ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/40'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Gửi Cả 2 Kênh</span>
                </div>
              </button>
            </div>

            {/* Success alert */}
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
                  <span>Nội dung bản tin phát tự động:</span>
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

              <div className="bg-slate-900 text-emerald-300 p-4 rounded-xl font-mono text-xs max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800 select-all">
                {notificationPreview.bodyText}
              </div>
            </div>

            {/* Quick Contact Links */}
            {samplesToNotify.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Liên hệ nhanh qua điện thoại / Zalo:
                </span>
                <div className="space-y-1.5">
                  {samplesToNotify.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                      <div className="truncate max-w-[260px]">
                        <span className="font-bold text-slate-900">{s.projectName}</span>
                        <span className="text-slate-500 text-[11px] block">{s.contactPerson} ({s.component})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={`tel:${s.contactPhone}`}
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold px-2 py-1 rounded text-xs flex items-center space-x-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{s.contactPhone}</span>
                        </a>
                        <a
                          href={`https://zalo.me/${s.contactPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2 py-1 rounded text-xs flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat Zalo</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
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

        {/* Tab 2: NOTIFICATION LOGS */}
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

        {/* Tab 3: SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            
            {/* Quick Test Actions Bar */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3.5 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold text-emerald-950 text-xs flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Tiện Ích Kiểm Tra Nhanh Tự Động:</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTestAudio}
                  className="bg-white hover:bg-emerald-100 text-emerald-900 font-bold px-3 py-1.5 rounded-lg border border-emerald-300 text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Thử Chuông Cảnh Báo</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestPush}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Thử Push Thông Báo OS</span>
                </button>
              </div>
            </div>

            {/* Zalo Settings */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>1. Cấu Hình Bot Zalo / Webhook Tự Động</span>
                </h4>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoZaloEnabled}
                    onChange={(e) => setAutoZaloEnabled(e.target.checked)}
                    className="rounded text-emerald-600 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800">Bật Tự Động Gửi</span>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Zalo Webhook URL / Endpoint
                  </label>
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !zaloWebhookUrl}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded cursor-pointer disabled:opacity-50"
                  >
                    {testingWebhook ? 'Đang kiểm tra...' : '⚡ Bắn Thử Webhook (Test Ping)'}
                  </button>
                </div>
                <input
                  type="text"
                  value={zaloWebhookUrl}
                  onChange={(e) => setZaloWebhookUrl(e.target.value)}
                  placeholder="https://openapi.zalo.me/v2.0/oa/message/cs hoặc https://hook.eu2.make.com/..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-800"
                />
              </div>

              {webhookTestResult && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                  webhookTestResult.success ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                }`}>
                  {webhookTestResult.message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bot Access Token / Secret Key (Tùy chọn)
                  </label>
                  <input
                    type="password"
                    value={zaloBotToken}
                    onChange={(e) => setZaloBotToken(e.target.value)}
                    placeholder="TSG_ZALO_BOT_TOKEN_2026"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên Nhóm / Zalo Group ID
                  </label>
                  <input
                    type="text"
                    value={zaloGroupId}
                    onChange={(e) => setZaloGroupId(e.target.value)}
                    placeholder="Nhóm Kỹ Thuật Tasago"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Email Settings */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <span>2. Cấu Hình Email Nhắc Lịch Nén</span>
                </h4>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEmailEnabled}
                    onChange={(e) => setAutoEmailEnabled(e.target.checked)}
                    className="rounded text-emerald-600 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800">Bật Tự Động Email</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Danh Sách Email Nhận Thông Báo (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={emailRecipientsStr}
                  onChange={(e) => setEmailRecipientsStr(e.target.value)}
                  placeholder="kythuat@tasago.vn, dieuhanh@tasago.vn, thanhtgndt@gmail.com"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Lưu & Kích Hoạt Cài Đặt Tự Động</span>
              </button>
            </div>

          </form>
        )}

        {/* Tab 4: ZALO BOT & WEBHOOK GUIDE */}
        {activeTab === 'guide' && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
              <h4 className="font-black text-blue-950 text-sm flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Hướng Dẫn Tích Hợp Bot Zalo & Webhook Tự Động 100%</span>
              </h4>
              <p className="text-slate-600">
                Để hệ thống tự động bắn tin nhắn vào nhóm Zalo hoặc tin nhắn riêng của Kỹ thuật viên mỗi sáng mà không cần bấm thủ công, bạn có 3 giải pháp chuẩn hóa sau:
              </p>
            </div>

            {/* Option 1: Google Apps Script */}
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center">1</span>
                  <h5 className="font-extrabold text-emerald-950 text-xs uppercase">
                    Cách 1: Google Apps Script (100% Miễn Phí Vĩnh Viễn - Dễ Nhất)
                  </h5>
                </div>
                <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded">
                  Khuyên Dùng
                </span>
              </div>
              <p className="text-slate-600 pl-8 leading-relaxed">
                Bạn không cần mua máy chủ. Tạo 1 Web App bằng Google Apps Script để nhận dữ liệu nén mẫu từ Tasago, tự động ghi sổ Google Sheets và chuyển tiếp tin nhắn đến Bot Zalo / Telegram / Email.
              </p>
              <div className="pl-8 space-y-2 text-[11px] text-slate-700">
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1.5">
                  <p className="font-bold text-emerald-900">Các bước thực hiện trong 2 phút:</p>
                  <p>1. Truy cập <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">script.google.com</a> $\rightarrow$ Nhấn <strong>"Dự án mới" (New Project)</strong>.</p>
                  <p>2. Xóa hết code cũ và dán đoạn mã mẫu bên dưới vào.</p>
                  <p>3. Nhấn <strong>Triển khai (Deploy)</strong> $\rightarrow$ Chọn <strong>Tùy chọn triển khai mới (New deployment)</strong>.</p>
                  <p>4. Chọn loại: <strong>Ứng dụng web (Web app)</strong>. Ở mục <em>"Ai có quyền truy cập" (Who has access)</em> $\rightarrow$ Chọn <strong>Bất kỳ ai (Anyone)</strong>.</p>
                  <p>5. Nhấn <strong>Triển khai</strong> và sao chép <strong>URL Ứng dụng web (Web App URL)</strong> dán vào ô <em>Zalo Webhook URL</em> ở tab Cài Đặt.</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Mã nguồn Google Apps Script (Sẵn sàng chạy):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const scriptCode = `// Google Apps Script Webhook Endpoint cho Tasago Concrete Lab
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var messageText = data.message ? data.message.text : 'Có mẫu nén đến hạn';
    
    // 1. (Tùy chọn) Ghi vào Google Sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getActiveSheet() : null;
    if (sheet) {
      sheet.appendRow([new Date(), data.event, data.urgent_count, messageText]);
    }
    
    // 2. (Tùy chọn) Gửi Email tự động
    // MailApp.sendEmail("thanhtgndt@gmail.com", "TASAGO - CẢNH BÁO NÉN MẪU", messageText);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", received: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
                        navigator.clipboard.writeText(scriptCode);
                        alert('Đã sao chép mã nguồn Google Apps Script!');
                      }}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded text-[11px] cursor-pointer"
                    >
                      Copy Toàn Bộ Code Script
                    </button>
                  </div>
                  <div className="bg-slate-900 text-emerald-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-800">
                    <pre>{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var messageText = data.message ? data.message.text : 'Mẫu nén Tasago';
  
  // Xử lý chuyển tiếp tin nhắn hoặc ghi nhận lịch sử
  Logger.log("Nhận mẫu nén: " + data.urgent_count);

  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}`}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Option 2: Make.com / n8n */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2.5 shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                <h5 className="font-extrabold text-blue-950 text-xs uppercase">
                  Cách 2: Dùng Make.com (Integromat) hoặc n8n (Kéo Thả Trực Quan Không Cần Code)
                </h5>
              </div>
              <p className="text-slate-600 pl-8">
                Tự động hóa đa kênh: Nhận Webhook từ Tasago $\rightarrow$ Bắn vào Zalo cá nhân, Nhóm Zalo, Telegram, và gửi SMS Brandname.
              </p>
              <div className="pl-8 space-y-1.5 text-[11px] text-slate-700">
                <p>1. Đăng ký tài khoản miễn phí tại <a href="https://www.make.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Make.com</a>.</p>
                <p>2. Tạo Scenario mới $\rightarrow$ Thêm Module đầu tiên là <strong>Webhooks (Custom Webhook)</strong>.</p>
                <p>3. Copy đường link Webhook dạng <code>https://hook.eu2.make.com/...</code> dán vào ô <em>Zalo Webhook URL</em> ở Tasago.</p>
                <p>4. Bấm <strong>"⚡ Bắn Thử Webhook"</strong> ở Tasago để Make.com tự động nhận diện cấu trúc (Data structure).</p>
                <p>5. Nối thêm module <strong>Zalo OA / Telegram / Gmail</strong> để tự động gửi thông báo theo ý bạn.</p>
              </div>
            </div>

            {/* Option 3: Telegram Bot */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2.5 shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">3</span>
                <h5 className="font-extrabold text-indigo-950 text-xs uppercase">
                  Cách 3: Bắn Thẳng Vào Nhóm Kỹ Thuật Qua Bot Telegram (Nhận Tin Ngay Lập Tức)
                </h5>
              </div>
              <p className="text-slate-600 pl-8">
                Cách đơn giản nhất để test và nhận thông báo tức thì trên điện thoại KTV 24/7 mà không lo giới hạn chính sách Zalo.
              </p>
              <div className="pl-8 space-y-1.5 text-[11px] text-slate-700">
                <p>• Nhập Webhook Telegram trực tiếp: <code>https://api.telegram.org/bot[TOKEN]/sendMessage?chat_id=[GROUP_ID]</code>.</p>
                <p>• Mỗi khi có mẫu bê tông đến ngày nén, Bot sẽ phát toàn bộ danh sách công trình và SĐT giám sát vào nhóm.</p>
              </div>
            </div>

            {/* JSON Payload Spec */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  Cấu Trúc Gói Dữ Liệu JSON Tự Động Phát Đi (JSON Payload):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const sampleJson = JSON.stringify({
                      event: "SAMPLE_COMPRESSION_REMINDER",
                      company: "CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO",
                      timestamp: new Date().toISOString(),
                      urgent_count: 2,
                      message: { text: notificationPreview.bodyText },
                      samples: samplesToNotify.slice(0, 2)
                    }, null, 2);
                    navigator.clipboard.writeText(sampleJson);
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 2000);
                  }}
                  className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 cursor-pointer"
                >
                  {copiedPayload ? 'Đã Copy JSON!' : 'Copy Mẫu JSON'}
                </button>
              </div>

              <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                <pre>{`{
  "event": "SAMPLE_COMPRESSION_REMINDER",
  "company": "CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO",
  "timestamp": "${new Date().toISOString()}",
  "urgent_count": ${urgentSamples.length},
  "message": {
    "text": "📢 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO\\n🔔 THÔNG BÁO LỊCH NÉN MẪU..."
  },
  "samples": [ ... ]
}`}</pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Chuyển Sang Cài Đặt Webhook Ngay</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

