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
  Clock
} from 'lucide-react';
import { ConcreteSample, Station, NotificationConfig, NotificationLog } from '../types';
import { generateSampleNotification, dispatchNotification } from '../utils/notificationService';
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
  const [activeTab, setActiveTab] = useState<'send' | 'logs' | 'settings'>('send');
  const [channel, setChannel] = useState<'zalo_bot' | 'email' | 'both'>('both');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
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
    alert('Đã lưu cài đặt Bot Zalo & Email thành công!');
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
                Trung Tâm Thông Báo & Bot Nhắc Lịch Zalo / Email
              </h3>
              <p className="text-xs text-emerald-200">
                Tự động gửi thông báo chi tiết công trình, mác bê tông, hạng mục & SĐT liên hệ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex space-x-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('send')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all relative ${
              activeTab === 'send'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Phát Thông Báo ({samplesToNotify.length} mẫu)</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all relative ${
              activeTab === 'logs'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Nhật Ký Đã Gửi ({notificationLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all relative ${
              activeTab === 'settings'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cấu Hình Zalo Bot & Email</span>
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
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    targetFilter === 'urgent'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  🔴 Đến Hạn & Quá Hạn ({urgentSamples.length})
                </button>
                <button
                  onClick={() => setTargetFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
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
                className={`p-2.5 rounded-xl border text-center transition-all ${
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
                className={`p-2.5 rounded-xl border text-center transition-all ${
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
                className={`p-2.5 rounded-xl border text-center transition-all ${
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
                  <span>Nội dung bản tin sẽ gửi đi:</span>
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

              <div className="bg-slate-900 text-emerald-300 p-4 rounded-xl font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800 select-all">
                {notificationPreview.bodyText}
              </div>
            </div>

            {/* Quick Contact Links for Urgent Samples */}
            {samplesToNotify.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Liên hệ nhanh qua điện thoại / Zalo:
                </span>
                <div className="space-y-1.5">
                  {samplesToNotify.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                      <div className="truncate max-w-[280px]">
                        <span className="font-bold text-slate-900">{s.projectName}</span>
                        <span className="text-slate-500 text-[11px] block">{s.contactPerson}</span>
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
                          <span>Zalo Chat</span>
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
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
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
                    <span>Phát Thông Báo ({samplesToNotify.length} Mẫu)</span>
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
            
            {/* Zalo Settings */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>1. Cấu Hình Bot Zalo Webhook / Official Account</span>
                </h4>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoZaloEnabled}
                    onChange={(e) => setAutoZaloEnabled(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-bold text-slate-700">Tự động nhắc</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Zalo Webhook URL / Endpoint
                </label>
                <input
                  type="text"
                  value={zaloWebhookUrl}
                  onChange={(e) => setZaloWebhookUrl(e.target.value)}
                  placeholder="https://openapi.zalo.me/v2.0/oa/message/cs"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bot Access Token / Secret Key
                  </label>
                  <input
                    type="password"
                    value={zaloBotToken}
                    onChange={(e) => setZaloBotToken(e.target.value)}
                    placeholder="TSG_ZALO_BOT_TOKEN_2026"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Zalo Group ID / Nhóm Kỹ Thuật
                  </label>
                  <input
                    type="text"
                    value={zaloGroupId}
                    onChange={(e) => setZaloGroupId(e.target.value)}
                    placeholder="zalo_group_tasago_concrete_lab"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
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
                    className="rounded text-emerald-600"
                  />
                  <span className="font-bold text-slate-700">Tự động gửi email</span>
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Lưu Cài Đặt Thông Báo</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
