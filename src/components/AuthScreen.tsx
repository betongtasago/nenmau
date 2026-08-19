import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight,
  FlaskConical,
  ShieldCheck
} from 'lucide-react';
import { User } from '../types';

interface AuthScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ users, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      const trimmedUser = username.trim().toLowerCase();
      const found = users.find(
        (u) => u.username.toLowerCase() === trimmedUser && u.password === password
      );

      if (found) {
        if (!found.active) {
          setErrorMsg('Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Quản trị viên Tasago.');
          setLoading(false);
          return;
        }
        onLoginSuccess(found);
      } else {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-emerald-600/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-600/20 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 shadow-xl ring-4 ring-emerald-500/20 mb-3">
            <span className="font-black text-2xl text-white tracking-widest">TSG</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            CÔNG TY CP ĐẦU TƯ TASAGO
          </h1>
          <p className="text-sm text-emerald-400 font-medium mt-1">
            HỆ THỐNG THEO DÕI TIẾN ĐỘ NÉN MẪU BÊ TÔNG & TRIALMIX
          </p>
          <div className="inline-flex items-center space-x-1.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs px-3 py-1 rounded-full mt-2">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Kiểm Định Chất Lượng • Tự Động Nhắc Zalo/Email</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Đăng Nhập Hệ Thống</span>
            </h2>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
              v2.0 2026
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Dành cho Quản trị viên & Kỹ thuật viên các trạm trộn Tasago
          </p>

          {errorMsg && (
            <div className="mb-4 bg-red-950/80 border border-red-500/60 text-red-200 text-xs p-3 rounded-lg flex items-start space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tài khoản đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="login-username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản"
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Công Ty Cổ Phần Đầu Tư Tasago</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Hỗ trợ kỹ thuật: 028.3780.9999 • Hotline QC: 0908.888.999
          </p>
        </div>
      </div>
    </div>
  );
};
