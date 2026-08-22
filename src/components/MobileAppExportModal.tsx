import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Apple, 
  Download, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  HelpCircle, 
  X, 
  Sparkles, 
  Phone, 
  FileText, 
  Code2, 
  FolderArchive,
  ArrowRight,
  Share2,
  Image as ImageIcon,
  Check
} from 'lucide-react';

interface MobileAppExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppExportModal: React.FC<MobileAppExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'android' | 'ios' | 'assets'>('android');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Catch PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      alert('Để cài đặt ứng dụng: \n- Trên Android: Bấm vào biểu tượng Menu 3 chấm (⋮) trong trình duyệt -> Chọn "Thêm vào màn hình chính" hoặc "Cài đặt ứng dụng".\n- Trên iPhone: Mở Safari -> Bấm nút Chia sẻ (hình vuông có mũi tên) -> Chọn "Thêm vào MH chính".');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate & Download PNG Icon (512x512) via Canvas
  const handleDownloadIcon = (size: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (Tasago Emerald)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#064e3b');
    gradient.addColorStop(0.5, '#047857');
    gradient.addColorStop(1, '#0f766e');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.22);
    ctx.fill();

    // Subtle Inner Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.roundRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88, size * 0.18);
    ctx.stroke();

    // Text: TSG
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${size * 0.32}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TSG', size / 2, size * 0.42);

    // Subtitle: TASAGO CONCRETE
    ctx.fillStyle = '#a7f3d0';
    ctx.font = `bold ${size * 0.085}px sans-serif`;
    ctx.fillText('TASAGO CONCRETE', size / 2, size * 0.68);

    // Badge 2026
    ctx.fillStyle = 'rgba(6, 78, 59, 0.8)';
    const badgeW = size * 0.35;
    const badgeH = size * 0.1;
    ctx.beginPath();
    ctx.roundRect((size - badgeW) / 2, size * 0.77, badgeW, badgeH, size * 0.05);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = `bold ${size * 0.06}px monospace`;
    ctx.fillText('ISO 9001:2026', size / 2, size * 0.82);

    // Trigger Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `tasago-icon-${size}x${size}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Download Config Bundle as JSON file
  const handleDownloadCapacitorConfig = () => {
    const configContent = JSON.stringify({
      appId: "com.tasago.concrete",
      appName: "Bê Tông Tasago",
      webDir: "dist",
      bundledWebRuntime: false,
      server: {
        androidScheme: "https",
        cleartext: true
      },
      plugins: {
        SplashScreen: {
          launchShowDuration: 2000,
          launchAutoHide: true,
          backgroundColor: "#064e3b"
        },
        StatusBar: {
          style: "DARK",
          backgroundColor: "#064e3b"
        }
      }
    }, null, 2);

    const blob = new Blob([configContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capacitor.config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download build scripts
  const handleDownloadBuildScript = (platform: 'android' | 'ios') => {
    const script = platform === 'android' 
      ? `#!/bin/bash
echo "=== ĐANG ĐÓNG GÓI ỨNG DỤNG ANDROID TASAGO (CH PLAY) ==="
npm run build
npx cap add android 2>/dev/null || true
npx cap sync android
echo ">>> Mở dự án bằng Android Studio..."
npx cap open android
`
      : `#!/bin/bash
echo "=== ĐANG ĐÓNG GÓI ỨNG DỤNG IOS TASAGO (APP STORE) ==="
npm run build
npx cap add ios 2>/dev/null || true
npx cap sync ios
echo ">>> Mở dự án bằng Xcode..."
npx cap open ios
`;

    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build-${platform}.sh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-800/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Đóng Gói Ứng Dụng Di Động
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded">
                  CH Play & App Store
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Xuất bản ứng dụng Bê Tông Tasago lên Google Play và Apple App Store
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex gap-2 overflow-x-auto shrink-0 py-2">
          
          <button
            onClick={() => setActiveTab('android')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Google Play (CH Play - Android)</span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ios'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>2. App Store (Apple iOS)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pwa'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>3. Cài Đặt Ngay (PWA 1 Chạm)</span>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'assets'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>4. Tải Bộ Cấu Hình & Icon</span>
          </button>

        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: GOOGLE PLAY STORE (CH PLAY) */}
          {activeTab === 'android' && (
            <div className="space-y-6">
              
              {/* Overview Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                  🤖
                </div>
                <div className="text-xs text-emerald-950 space-y-1">
                  <p className="font-bold text-sm text-emerald-900">
                    Quy trình đóng gói file Android App Bundle (.aab) lên CH Play
                  </p>
                  <p className="text-emerald-800">
                    Hệ thống sử dụng **Capacitor 8** kết nối trực tiếp với **Android Studio** để sinh file `.aab` chuẩn theo quy định mới nhất của Google Play.
                  </p>
                </div>
              </div>

              {/* Step 1: Command Line */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                    <span>Chạy các lệnh đóng gói dự án vào Android Studio</span>
                  </h3>
                  <button
                    onClick={() => copyToClipboard(
                      `npm run build\nnpx cap add android\nnpx cap sync android\nnpx cap open android`,
                      'cmd-android'
                    )}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer font-medium border border-slate-200"
                  >
                    {copiedKey === 'cmd-android' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép lệnh</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                  <p className="text-emerald-400"># 1. Build mã nguồn giao diện web</p>
                  <p className="text-white">npm run build</p>
                  <p className="text-emerald-400 mt-2"># 2. Thêm nền tảng Android (chạy lần đầu)</p>
                  <p className="text-white">npx cap add android</p>
                  <p className="text-emerald-400 mt-2"># 3. Đồng bộ dữ liệu & cấu hình vào Android Studio</p>
                  <p className="text-white">npx cap sync android</p>
                  <p className="text-emerald-400 mt-2"># 4. Tự động mở dự án trong Android Studio</p>
                  <p className="text-white">npx cap open android</p>
                </div>
              </div>

              {/* Step 2: Sign and Build AAB in Android Studio */}
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
                  <span>Tạo file Ký Số Phát Hành (Generate Signed Bundle .aab)</span>
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                  <p>1. Trong phần mềm **Android Studio**, trên thanh menu chọn: <code className="bg-slate-200 text-slate-900 px-1 py-0.5 rounded font-mono font-bold">Build</code> &rarr; <code className="bg-slate-200 text-slate-900 px-1 py-0.5 rounded font-mono font-bold">Generate Signed Bundle / APK...</code></p>
                  <p>2. Chọn **Android App Bundle (.aab)** &rarr; Bấm **Next**.</p>
                  <p>3. Chọn **Create new...** để tạo tệp khóa ký chứng chỉ <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">tasago-release.jks</code> (Lưu giữ mật khẩu khóa cẩn thận).</p>
                  <p>4. Chọn chế độ **release** &rarr; Bấm **Finish**. File `.aab` sẽ được xuất ra tại: <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono font-bold">android/app/release/app-release.aab</code>.</p>
                </div>
              </div>

              {/* Step 3: Google Play Console Submission Info */}
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                  <span>Thông tin đăng ký trên Google Play Console</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Tên Ứng Dụng</span>
                    <p className="font-bold text-xs text-slate-900">Bê Tông Tasago</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Mã Gói (Package ID)</span>
                    <p className="font-bold text-xs text-emerald-700 font-mono">com.tasago.concrete</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Danh Mục</span>
                    <p className="font-bold text-xs text-slate-900">Năng suất / Doanh nghiệp (Productivity)</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Hotline Hỗ Trợ Kỹ Thuật</span>
                    <p className="font-bold text-xs text-emerald-700 font-mono">0942320923 (0942.320.923)</p>
                  </div>
                </div>
              </div>

              {/* Step 4: Direct Link to Google Play Console */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                <a
                  href="https://play.google.com/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 shadow-sm transition-all"
                >
                  <span>Truy Cập Google Play Console</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => handleDownloadBuildScript('android')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-2.5 rounded-xl inline-flex items-center space-x-2 border border-slate-300 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Tải Script Đóng Gói (build-android.sh)</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: APPLE APP STORE (iOS) */}
          {activeTab === 'ios' && (
            <div className="space-y-6">
              
              {/* Overview Box */}
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex items-start space-x-3 border border-slate-800">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 font-bold">
                  🍎
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-sm text-white">
                    Quy trình đóng gói ứng dụng iOS lên Apple App Store & TestFlight
                  </p>
                  <p className="text-slate-300">
                    Sử dụng Xcode trên máy Mac để biên dịch và đưa ứng dụng lên **App Store Connect** cho Ban Giám Đốc và các kỹ sư Tasago cài đặt.
                  </p>
                </div>
              </div>

              {/* Step 1: Terminal commands for Mac */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
                    <span>Đồng bộ mã nguồn vào Xcode</span>
                  </h3>
                  <button
                    onClick={() => copyToClipboard(
                      `npm run build\nnpx cap add ios\nnpx cap sync ios\nnpx cap open ios`,
                      'cmd-ios'
                    )}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer font-medium border border-slate-200"
                  >
                    {copiedKey === 'cmd-ios' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép lệnh</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                  <p className="text-emerald-400"># 1. Build bản dựng web</p>
                  <p className="text-white">npm run build</p>
                  <p className="text-emerald-400 mt-2"># 2. Khởi tạo nền tảng iOS</p>
                  <p className="text-white">npx cap add ios</p>
                  <p className="text-emerald-400 mt-2"># 3. Đồng bộ mã nguồn & assets vào iOS</p>
                  <p className="text-white">npx cap sync ios</p>
                  <p className="text-emerald-400 mt-2"># 4. Mở trực tiếp trong Xcode trên macOS</p>
                  <p className="text-white">npx cap open ios</p>
                </div>
              </div>

              {/* Step 2: Xcode Configuration */}
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">2</span>
                  <span>Cấu hình Signing & Capabilities trong Xcode</span>
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                  <p>1. Trong Xcode, chọn project **App** &rarr; Chọn tab **Signing & Capabilities**.</p>
                  <p>2. Chọn **Team**: Chọn tài khoản Apple Developer của Tasago (<span className="font-bold text-slate-900">Công Ty Cổ Phần Đầu Tư Tasago</span>).</p>
                  <p>3. Bundle Identifier: <code className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold">com.tasago.concrete</code>.</p>
                  <p>4. Bổ sung quyền Camera và Lưu trữ trong file <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">Info.plist</code> để KTV chụp ảnh nén mẫu.</p>
                </div>
              </div>

              {/* Step 3: Archive & Distribute */}
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">3</span>
                  <span>Tạo bản Archive và Tải lên App Store Connect / TestFlight</span>
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5">
                  <p>1. Trên thanh công cụ Xcode: Chọn thiết bị đích là **Any iOS Device (arm64)**.</p>
                  <p>2. Menu: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">Product</code> &rarr; <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">Archive</code>.</p>
                  <p>3. Khi cửa sổ Archives hiện lên &rarr; Chọn **Distribute App** &rarr; **App Store Connect** &rarr; **Upload**.</p>
                  <p>4. Mở [App Store Connect](https://appstoreconnect.apple.com) &rarr; Tạo ứng dụng mới &rarr; Chọn bản build vừa tải lên &rarr; Bấm **Gửi để kiểm duyệt (Submit for Review)**.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                <a
                  href="https://appstoreconnect.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 shadow-sm transition-all"
                >
                  <span>Truy Cập Apple App Store Connect</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => handleDownloadBuildScript('ios')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-2.5 rounded-xl inline-flex items-center space-x-2 border border-slate-300 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Tải Script Đóng Gói (build-ios.sh)</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: PWA 1-CLICK DIRECT INSTALL */}
          {activeTab === 'pwa' && (
            <div className="space-y-6">
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-xs text-emerald-950 space-y-1">
                  <p className="font-bold text-sm text-emerald-900">
                    Cài đặt ứng dụng trực tiếp lên điện thoại chỉ với 1 chạm (PWA)
                  </p>
                  <p className="text-emerald-800">
                    Không cần chờ Google/Apple xét duyệt, kỹ sư và KTV có thể thêm ngay ứng dụng Tasago lên màn hình chính điện thoại, mở toàn màn hình độc lập và hoạt động siêu tốc ngay cả khi mạng yếu!
                  </p>
                </div>
              </div>

              {/* Install Button if supported */}
              <div className="text-center py-4 bg-slate-900 text-white rounded-2xl p-6 space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-700 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-emerald-500/20">
                  TSG
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Bê Tông Tasago Mobile
                  </h3>
                  <p className="text-xs text-emerald-300">
                    Phiên bản 2.0.26 • Bản quyền Công Ty CP Đầu Tư Tasago
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handlePwaInstall}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm px-6 py-3 rounded-xl inline-flex items-center space-x-2 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Cài Đặt Lên Màn Hình Điện Thoại Ngay</span>
                  </button>
                </div>
              </div>

              {/* Instructions per OS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Android Steps */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <Smartphone className="w-4 h-4" />
                    <span>Dành cho điện thoại Android (Samsung, Xiaomi, Oppo...)</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                    <li>Mở trang web bằng trình duyệt **Google Chrome** hoặc **Cốc Cốc**.</li>
                    <li>Bấm vào biểu tượng menu **3 chấm (⋮)** ở góc trên bên phải.</li>
                    <li>Chọn **"Cài đặt ứng dụng"** hoặc **"Thêm vào màn hình chính"**.</li>
                    <li>Bấm **Cài đặt / Thêm**. Biểu tượng Tasago sẽ xuất hiện trên màn hình điện thoại.</li>
                  </ol>
                </div>

                {/* iOS Steps */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                    <Apple className="w-4 h-4" />
                    <span>Dành cho điện thoại iPhone & iPad</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                    <li>Mở trang web bằng trình duyệt **Safari** trên iPhone.</li>
                    <li>Bấm vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên chỉ lên ở thanh dưới cùng).</li>
                    <li>Cuộn xuống và chọn **"Thêm vào MH chính" (Add to Home Screen)**.</li>
                    <li>Bấm **Thêm (Add)** ở góc phải trên cùng để hoàn tất.</li>
                  </ol>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: ASSETS & CONFIG DOWNLOAD */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              
              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>Bộ Biểu Tượng Ứng Dụng (App Icons chuẩn Store)</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Biểu tượng nhận diện thương hiệu Tasago chuẩn định dạng PNG 32-bit độ phân giải cao cho CH Play và App Store:
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleDownloadIcon(512)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Icon 512x512 PNG (Cho Google Play)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadIcon(192)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Icon 192x192 PNG (Cho PWA / iOS)</span>
                  </button>
                </div>
              </div>

              {/* Config Files */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-teal-600" />
                  <span>Tải File Cấu Hình Capacitor & Script Đóng Gói</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">capacitor.config.json</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">JSON</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      File cấu hình Package ID com.tasago.concrete, tên app, splash screen và status bar.
                    </p>
                    <button
                      onClick={handleDownloadCapacitorConfig}
                      className="w-full bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tải capacitor.config.json</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Tài Liệu Hướng Dẫn Chi Tiết</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Markdown</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Toàn văn tài liệu hướng dẫn xuất bản CH Play & App Store bằng tiếng Việt có sẵn trong thư mục gốc.
                    </p>
                    <button
                      onClick={() => {
                        const content = `# HƯỚNG DẪN ĐÓNG GÓI TASAGO MOBILE\nVui lòng xem file HD_XUAT_BAN_CHPLAY_APPSTORE.md trong thư mục gốc của dự án.`;
                        const blob = new Blob([content], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'HD_XUAT_BAN_CHPLAY_APPSTORE.md';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tải HD_XUAT_BAN_CHPLAY_APPSTORE.md</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Support info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cần hỗ trợ kỹ thuật đóng gói hoặc nộp hồ sơ Store:</span>
                </div>
                <a href="tel:0942320923" className="font-bold text-emerald-700 hover:underline font-mono">
                  0942.320.923
                </a>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-medium">
            Mã định danh: <strong className="font-mono text-emerald-700">com.tasago.concrete</strong>
          </span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>
  );
};
