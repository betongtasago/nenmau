import React, { useState } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Building2, 
  Key, 
  Check, 
  Trash2, 
  Mail, 
  Phone, 
  Lock 
} from 'lucide-react';
import { User, Station } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  stations: Station[];
  onSaveUsers: (users: User[]) => void;
  onSaveStations: (stations: Station[]) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  stations,
  onSaveUsers,
  onSaveStations,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'stations'>('users');
  
  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [newStationId, setNewStationId] = useState<string>(stations[0]?.id || '');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // New station form state
  const [showAddStation, setShowAddStation] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [newStationCode, setNewStationCode] = useState('');
  const [newStationAddress, setNewStationAddress] = useState('');
  const [newStationCapacity, setNewStationCapacity] = useState('120 m³/h');
  const [newStationManager, setNewStationManager] = useState('');
  const [newStationPhone, setNewStationPhone] = useState('');

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      alert('Vui lòng điền đầy đủ thông tin tài khoản!');
      return;
    }

    if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
      alert('Tên đăng nhập đã tồn tại trong hệ thống!');
      return;
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: newUsername.trim(),
      password: newPassword.trim(),
      fullName: newFullName.trim(),
      role: newRole,
      stationIds: newRole === 'admin' ? ['all'] : [newStationId],
      stationId: newRole === 'admin' ? undefined : newStationId,
      phone: newPhone.trim(),
      email: newEmail.trim(),
      active: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    onSaveUsers([...users, newUser]);
    setShowAddUser(false);
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewPhone('');
    setNewEmail('');
    alert(`Đã tạo tài khoản thành viên "${newUser.fullName}" thành công!`);
  };

  const handleToggleUserActive = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        if (u.role === 'admin' && users.filter(x => x.role === 'admin' && x.isActive).length <= 1 && u.isActive) {
          alert('Không thể khóa tài khoản Admin duy nhất!');
          return u;
        }
        return { ...u, isActive: !u.isActive };
      }
      return u;
    });
    onSaveUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target?.role === 'admin') {
      alert('Không thể xóa tài khoản Quản Trị Viên (Admin)!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên "${target?.fullName}"?`)) {
      onSaveUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleCreateStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStationName.trim() || !newStationCode.trim()) {
      alert('Vui lòng nhập tên trạm và mã trạm!');
      return;
    }

    const newStation: Station = {
      id: `station_${Date.now()}`,
      name: newStationName.trim(),
      code: newStationCode.trim().toUpperCase(),
      address: newStationAddress.trim(),
      capacity: newStationCapacity.trim(),
      managerName: newStationManager.trim(),
      managerPhone: newStationPhone.trim(),
    };

    onSaveStations([...stations, newStation]);
    setShowAddStation(false);
    setNewStationName('');
    setNewStationCode('');
    setNewStationAddress('');
    setNewStationManager('');
    setNewStationPhone('');
    alert(`Đã thêm trạm bê tông "${newStation.name}" thành công!`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                Quản Trị Thành Viên & Các Trạm Bê Tông Tasago
              </h3>
              <p className="text-xs text-emerald-200">
                Phân quyền Admin/Kỹ thuật viên, tài khoản đăng nhập và danh mục trạm trộn
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

        {/* Tab Headers */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex space-x-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all relative ${
              activeTab === 'users'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tài Khoản Thành Viên ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stations')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-all relative ${
              activeTab === 'stations'
                ? 'text-emerald-800 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Danh Mục Trạm Trộn ({stations.length})</span>
          </button>
        </div>

        {/* Tab 1: USERS */}
        {activeTab === 'users' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Danh sách cán bộ kỹ thuật và quản trị viên Tasago:
              </span>
              <button
                type="button"
                onClick={() => setShowAddUser(!showAddUser)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddUser ? 'Đóng Form' : '+ Thêm Thành Viên'}</span>
              </button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-xl border border-emerald-200 space-y-3 animate-in fade-in text-xs">
                <h4 className="font-extrabold text-emerald-900 uppercase">Tạo Tài Khoản Thành Viên Mới</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tên Đăng Nhập *</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="vd: ktv_hiepphuoc"
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mật Khẩu *</label>
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="vd: Tasago@2026"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Họ Và Tên *</label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="vd: Nguyễn Văn A"
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phân Quyền</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold"
                    >
                      <option value="member">Thành Viên (KTV / Trạm)</option>
                      <option value="admin">Quản Trị Viên (Admin Tasago)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phụ Trách Trạm</label>
                    <select
                      value={newStationId}
                      onChange={(e) => setNewStationId(e.target.value)}
                      disabled={newRole === 'admin'}
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    >
                      {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="09xx..."
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Tạo Tài Khoản
                  </button>
                </div>
              </form>
            )}

            {/* Users List */}
            <div className="space-y-2">
              {users.map(u => {
                const userStation = stations.find(s => s.id === u.stationId);

                return (
                  <div 
                    key={u.id}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{u.fullName}</span>
                        <span className="font-mono text-slate-500">(@{u.username})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {u.role === 'admin' ? 'Quản Trị Viên' : 'Thành Viên'}
                        </span>
                        {!u.isActive && (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Đã Khóa
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-3">
                        <span>Trạm: <strong>{u.role === 'admin' ? 'Toàn bộ hệ thống' : userStation?.name || 'Chưa gán'}</strong></span>
                        {u.phone && <span>SĐT: <strong>{u.phone}</strong></span>}
                        {u.email && <span>Email: {u.email}</span>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleToggleUserActive(u.id)}
                        className={`px-2.5 py-1 rounded text-xs font-bold ${
                          u.isActive ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {u.isActive ? 'Khóa' : 'Kích Hoạt'}
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: STATIONS */}
        {activeTab === 'stations' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Danh mục mạng lưới trạm trộn bê tông thương phẩm Tasago:
              </span>
              <button
                type="button"
                onClick={() => setShowAddStation(!showAddStation)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-sm"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{showAddStation ? 'Đóng Form' : '+ Thêm Trạm Trộn'}</span>
              </button>
            </div>

            {/* Add Station Form */}
            {showAddStation && (
              <form onSubmit={handleCreateStation} className="bg-slate-50 p-4 rounded-xl border border-emerald-200 space-y-3 text-xs">
                <h4 className="font-extrabold text-emerald-900 uppercase">Thêm Trạm Bê Tông Mới</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tên Trạm Trộn *</label>
                    <input
                      type="text"
                      required
                      value={newStationName}
                      onChange={(e) => setNewStationName(e.target.value)}
                      placeholder="vd: Trạm Tasago Nhơn Trạch"
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mã Trạm (Code) *</label>
                    <input
                      type="text"
                      required
                      value={newStationCode}
                      onChange={(e) => setNewStationCode(e.target.value)}
                      placeholder="vd: TSG-NT"
                      className="w-full bg-white border border-slate-300 rounded p-1.5 uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Công Suất Trạm</label>
                    <input
                      type="text"
                      value={newStationCapacity}
                      onChange={(e) => setNewStationCapacity(e.target.value)}
                      placeholder="120 m³/h"
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Địa Chỉ Trạm</label>
                    <input
                      type="text"
                      value={newStationAddress}
                      onChange={(e) => setNewStationAddress(e.target.value)}
                      placeholder="KCN Nhơn Trạch, Đồng Nai"
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trưởng Trạm / Hotline</label>
                    <input
                      type="text"
                      value={newStationManager}
                      onChange={(e) => setNewStationManager(e.target.value)}
                      placeholder="Nguyễn Văn B - 0988..."
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStation(false)}
                    className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Lưu Trạm Trộn
                  </button>
                </div>
              </form>
            )}

            {/* Stations List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stations.map(s => (
                <div key={s.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-sm">{s.name}</h4>
                    <span className="font-mono bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded text-[11px]">
                      {s.code}
                    </span>
                  </div>
                  <p className="text-slate-600">{s.address}</p>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                    <span>Công suất: <strong>{s.capacity}</strong></span>
                    <span>{s.managerName} ({s.managerPhone})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
