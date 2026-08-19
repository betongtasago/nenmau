import React from 'react';
import { 
  Building2, 
  FlaskConical, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Send, 
  FileSpreadsheet, 
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { ConcreteSample, Station } from '../types';

interface DashboardStatsProps {
  samples: ConcreteSample[];
  stations: Station[];
  selectedStationId: string;
  onFilterStatus?: (status: string) => void;
  onOpenNotificationCenter?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  samples,
  stations,
  selectedStationId,
  onFilterStatus,
  onOpenNotificationCenter,
}) => {
  // Filter samples according to selected station
  const filteredSamples = selectedStationId === 'all'
    ? samples
    : samples.filter(s => s.stationId === selectedStationId);

  const selectedStationObj = stations.find(s => s.id === selectedStationId);

  // Key metrics matching the Professional Polish archetype
  const totalCount = filteredSamples.length;
  const dueTodayCount = filteredSamples.filter(s => s.status === 'due_today').length;
  const overdueCount = filteredSamples.filter(s => s.status === 'overdue').length;
  const r7Count = filteredSamples.filter(s => s.ageType === 'R7' && s.status !== 'tested_passed').length;
  const r28Count = filteredSamples.filter(s => s.ageType === 'R28' && s.status !== 'tested_passed').length;
  const testedCount = filteredSamples.filter(s => s.status === 'tested_passed' || s.status === 'tested_failed').length;
  const totalVolumeM3 = filteredSamples.reduce((acc, curr) => acc + (curr.volumeM3 || 0), 0);

  return (
    <div className="space-y-4">
      {/* 4 Professional Polish KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Tổng mẫu hôm nay */}
        <div 
          onClick={() => onFilterStatus && onFilterStatus('all')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Tổng Mẫu Đang Theo Dõi
            </p>
            <FlaskConical className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">
            {totalCount}{' '}
            <span className="text-sm font-normal text-emerald-600 ml-1">
              Tổ mẫu ({totalVolumeM3.toLocaleString('vi-VN')} m³)
            </span>
          </h3>
        </div>

        {/* Card 2: Đến hạn R7 */}
        <div 
          onClick={() => onFilterStatus && onFilterStatus('r7')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Đang Chờ Nén R7
            </p>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-orange-600 mt-1">
            {String(r7Count).padStart(2, '0')}{' '}
            <span className="text-sm font-normal text-slate-400 ml-1">
              Công trình
            </span>
          </h3>
        </div>

        {/* Card 3: Đến hạn R28 */}
        <div 
          onClick={() => onFilterStatus && onFilterStatus('r28')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Đang Chờ Nén R28
            </p>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-2xl font-bold text-blue-600 mt-1">
            {String(r28Count).padStart(2, '0')}{' '}
            <span className="text-sm font-normal text-slate-400 ml-1">
              Công trình
            </span>
          </h3>
        </div>

        {/* Card 4: Thông báo Zalo / Email */}
        <div 
          onClick={onOpenNotificationCenter}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Thông Báo Zalo / Bot
            </p>
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">
            {dueTodayCount + overdueCount > 0 ? (
              <span className="text-red-600">{dueTodayCount + overdueCount} Cần gửi</span>
            ) : (
              <span>Đã gửi <span className="text-sm font-normal text-slate-400 ml-1">100%</span></span>
            )}
          </h3>
        </div>

      </div>

      {/* Urgent Warning Alert Strip (if due today or overdue) */}
      {(dueTodayCount > 0 || overdueCount > 0) && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>
              Cảnh báo lịch nén: Có <strong>{dueTodayCount} mẫu đến hạn hôm nay</strong> và <strong>{overdueCount} mẫu đã quá hạn</strong> chưa nén!
            </span>
          </div>
          {onOpenNotificationCenter && (
            <button
              onClick={onOpenNotificationCenter}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Nhắc Zalo Ngay</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
