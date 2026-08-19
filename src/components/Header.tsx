import React, { useState } from 'react';
import { 
  Building2, 
  FlaskConical, 
  Calendar, 
  BarChart3, 
  FileSpreadsheet, 
  Bell, 
  Users, 
  Layers, 
  PlusCircle, 
  LogOut, 
  ShieldCheck, 
  Download,
  AlertTriangle,
  Send,
  Menu,
  X,
  Settings
} from 'lucide-react';
import { User, Station } from '../types';

interface HeaderProps {
  currentUser: User | null;
  stations: Station[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  activeTab: 'samples' | 'calendar' | 'analytics' | 'reports';
  onChangeTab: (tab: 'samples' | 'calendar' | 'analytics' | 'reports') => void;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenNotificationModal: () => void;
  onOpenUserManagement: () => void;
  onOpenExportBackup: () => void;
  urgentCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  stations,
  selectedStationId,
  onSelectStation,
  activeTab,
  onChangeTab,
  onLogout,
  onOpenAddModal,
  onOpenNotificationModal,
  onOpenUserManagement,
  onOpenExportBackup,
  urgentCount,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'samples', label: 'Bảng Quản Lý Mẫu', icon: FlaskConical },
    { id: 'calendar', label: 'Lịch Nén Tháng', icon: Calendar },
    { id: 'analytics', label: 'Báo Cáo Thống Kê', icon: BarChart3 },
    { id: 'reports', label: 'Xuất File Báo Cáo', icon: FileSpreadsheet },
  ] as const;

  return (
    <div className="w-full font-sans sticky top-0 z-40">
      {/* Primary Top Nav - Professional Polish Emerald Bar */}
      <nav className="bg-emerald-800 text-white px-4 sm:px-6 py-3 flex justify-between items-center shadow-md">
        
        {/* Brand & Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => onChangeTab('samples')}
        >
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-emerald-800 font-black text-xl tracking-tight">TSG</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight text-white">TASAGO</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-200 opacity-90 font-medium mt-0.5">
              Hệ Thống Quản Lý Nén Mẫu
            </p>
          </div>
        </div>

        {/* Desktop Main Navigation Tabs */}
        <div className="hidden md:flex gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`transition-all pb-1 flex items-center gap-1.5 cursor-pointer ${
                  isActive 
                    ? 'border-b-2 border-white text-white font-bold' 
                    : 'text-emerald-100 opacity-75 hover:opacity-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          
          {/* Notification Button */}
          <button
            onClick={onOpenNotificationModal}
            className={`relative p-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              urgentCount > 0 
                ? 'bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 shadow-sm animate-pulse' 
                : 'bg-emerald-700/80 hover:bg-emerald-700 text-emerald-100'
            }`}
            title="Nhắc nhở Zalo / Email nén mẫu"
          >
            <Bell className="w-4 h-4" />
            {urgentCount > 0 && (
              <span className="text-xs hidden sm:inline">
                {urgentCount} cần nén
              </span>
            )}
          </button>

          {/* Admin Management Trigger (if admin) */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={onOpenUserManagement}
              className="bg-emerald-700 hover:bg-emerald-600 text-emerald-100 p-2 rounded-lg text-xs font-semibold hidden lg:flex items-center gap-1 cursor-pointer"
              title="Quản trị thành viên & trạm trộn"
            >
              <Users className="w-4 h-4" />
              <span>Quản Trị</span>
            </button>
          )}

          {/* User Profile Pill */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 cursor-pointer text-left"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="font-semibold italic text-emerald-100 text-xs">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded font-medium">
                    {currentUser.role === 'admin' ? 'Toàn quyền' : 'KTV Trạm'}
                  </span>
                </div>
                <div className="w-8 h-8 bg-emerald-600 rounded-full border border-emerald-400 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                  {currentUser.fullName.charAt(0)}
                </div>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 text-slate-800 z-50 border border-slate-200 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-sm text-slate-900">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-500">@{currentUser.username}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      {currentUser.role === 'admin' ? 'Quản Trị Viên (Admin)' : 'Thành Viên Kỹ Thuật'}
                    </span>
                  </div>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={onOpenUserManagement}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Quản Lý Thành Viên & Trạm</span>
                    </button>
                  )}

                  <button
                    onClick={onOpenExportBackup}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Sao Lưu Dữ Liệu & GitHub</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 mt-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng Xuất Tài Khoản</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg bg-emerald-700 text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Sub-header / Quick Action & Filter Ribbon */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="subnav-add-sample-btn"
            onClick={onOpenAddModal}
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-md border border-emerald-200 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Nhập Dữ Liệu Mới</span>
          </button>

          <button
            id="subnav-export-report-btn"
            onClick={() => onChangeTab('reports')}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-md border border-slate-200 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <span>Xuất File Báo Cáo</span>
          </button>

          <button
            onClick={onOpenNotificationModal}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 rounded-md border border-slate-200 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Zalo Bot & Email</span>
          </button>
        </div>

        {/* Station Filter Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
            Lọc theo trạm:
          </label>
          <select
            id="station-selector-dropdown"
            value={selectedStationId}
            onChange={(e) => onSelectStation(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">🏢 Tất cả các trạm ({stations.length} trạm)</option>
            {stations.map(station => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-emerald-900 text-white p-4 space-y-2 border-b border-emerald-950 animate-in slide-in-from-top duration-150">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChangeTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  activeTab === item.id ? 'bg-white text-emerald-900' : 'bg-emerald-800 text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-emerald-800 flex items-center justify-between text-xs">
            <span>Đang đăng nhập: <strong>{currentUser?.fullName}</strong></span>
            <button onClick={onLogout} className="text-red-300 font-bold flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
