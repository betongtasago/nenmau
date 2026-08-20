import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  FlaskConical, 
  Phone, 
  Layers, 
  Send,
  Plus,
  Trash2,
  Check,
  Edit3,
  Clock,
  Building2,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Info,
  CalendarDays
} from 'lucide-react';
import { ConcreteSample, Station } from '../types';
import { formatDateVN } from '../utils/storage';

interface CalendarViewProps {
  samples: ConcreteSample[];
  stations: Station[];
  selectedStationId: string;
  onSelectSampleDetail: (sample: ConcreteSample) => void;
  onSelectSampleForTest: (sample: ConcreteSample) => void;
  onQuickMarkTested?: (sample: ConcreteSample) => void;
  onDeleteSample?: (sampleId: string) => void;
  onOpenNotification?: (sample: ConcreteSample) => void;
  onAddNewSampleForDate?: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  samples,
  stations,
  selectedStationId,
  onSelectSampleDetail,
  onSelectSampleForTest,
  onQuickMarkTested,
  onDeleteSample,
  onOpenNotification,
  onAddNewSampleForDate,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterStationLocal, setFilterStationLocal] = useState<string>(selectedStationId);

  // Sync station filter
  React.useEffect(() => {
    setFilterStationLocal(selectedStationId);
  }, [selectedStationId]);

  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach(s => map.set(s.id, s));
    return map;
  }, [stations]);

  const activeSamples = useMemo(() => {
    return filterStationLocal === 'all'
      ? samples
      : samples.filter(s => s.stationId === filterStationLocal);
  }, [samples, filterStationLocal]);

  // Group samples by scheduled test date (YYYY-MM-DD)
  const samplesByDate = useMemo(() => {
    const map: Record<string, ConcreteSample[]> = {};
    activeSamples.forEach(s => {
      if (s.scheduledTestDate) {
        if (!map[s.scheduledTestDate]) {
          map[s.scheduledTestDate] = [];
        }
        map[s.scheduledTestDate].push(s);
      }
    });
    return map;
  }, [activeSamples]);

  // Calendar matrix calculation
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0 - 11

  // Day of week calculation (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Adjust so Monday is first (0 = Monday, ..., 6 = Sunday)
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonthDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const handleMonthSelect = (m: number) => {
    setCurrentMonthDate(new Date(year, m, 1));
  };

  const handleYearSelect = (y: number) => {
    setCurrentMonthDate(new Date(y, month, 1));
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDaySamples = samplesByDate[selectedDateStr] || [];

  // Selected date formatting in Vietnamese
  const getFullFormattedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[d.getDay()];
    return `${dayName}, Ngày ${parts[2]} Tháng ${parts[1]} Năm ${parts[0]}`;
  };

  const testedCountInMonth = useMemo(() => {
    return activeSamples.filter(s => {
      if (!s.scheduledTestDate) return false;
      const [y, m] = s.scheduledTestDate.split('-');
      return Number(y) === year && Number(m) === month + 1 && 
        (s.status === 'tested_passed' || s.status === 'tested_failed');
    }).length;
  }, [activeSamples, year, month]);

  const totalInMonth = useMemo(() => {
    return activeSamples.filter(s => {
      if (!s.scheduledTestDate) return false;
      const [y, m] = s.scheduledTestDate.split('-');
      return Number(y) === year && Number(m) === month + 1;
    }).length;
  }, [activeSamples, year, month]);

  const urgentInMonth = useMemo(() => {
    return activeSamples.filter(s => {
      if (!s.scheduledTestDate) return false;
      const [y, m] = s.scheduledTestDate.split('-');
      return Number(y) === year && Number(m) === month + 1 && 
        (s.status === 'due_today' || s.status === 'overdue');
    }).length;
  }, [activeSamples, year, month]);

  const handleDeleteSchedule = (sample: ConcreteSample) => {
    if (confirm(`Bạn có chắc muốn XÓA LỊCH NÉN của mẫu "${sample.projectName}" (${sample.concreteGrade} - Tuổi ${sample.ageType})?`)) {
      if (onDeleteSample) {
        onDeleteSample(sample.id);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* 1. Top Control & Authentic Calendar Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Header Title & Monthly Stats */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
                <CalendarDays className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Lịch Nén Mẫu Bê Tông Theo Tháng</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Giao diện tờ lịch treo tường chuyên dụng cho Kỹ thuật viên & Phòng Thí nghiệm Tasago
                </p>
              </div>
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                Tổng lịch tháng {month + 1}: <strong>{totalInMonth} mẫu</strong>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                ✅ Đã nén xong: <strong>{testedCountInMonth}</strong>
              </span>
              {urgentInMonth > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 animate-pulse">
                  🔴 Cần nén/Quá hạn: <strong>{urgentInMonth}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Month & Year Selectors */}
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition-all cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                <select
                  value={month}
                  onChange={(e) => handleMonthSelect(Number(e.target.value))}
                  className="bg-white border border-slate-200 font-extrabold text-xs text-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>Tháng {i + 1}</option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => handleYearSelect(Number(e.target.value))}
                  className="bg-white border border-slate-200 font-extrabold text-xs text-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                >
                  {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition-all cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Jump to Today Button */}
            <button
              onClick={handleToday}
              className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-300" />
              <span>Hôm Nay</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. Main Calendar Layout: Grid + Selected Day Details Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Authentic Calendar Sheet (8 Cols on XL) */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Desk Calendar Top Binder / Header Bar */}
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs" />
              <span className="ml-2 font-black text-sm uppercase tracking-wider text-slate-100">
                THÁNG {month + 1} / {year}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Nhấp vào ô ngày để xem & thao tác nén mẫu
            </div>
          </div>

          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center font-black text-xs py-2.5">
            <div className="text-slate-700">T2 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Hai)</span></div>
            <div className="text-slate-700">T3 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Ba)</span></div>
            <div className="text-slate-700">T4 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Tư)</span></div>
            <div className="text-slate-700">T5 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Năm)</span></div>
            <div className="text-slate-700">T6 <span className="hidden sm:inline font-normal text-[10px] text-slate-400">(Sáu)</span></div>
            <div className="text-emerald-800">T7 <span className="hidden sm:inline font-normal text-[10px] text-emerald-600">(Bảy)</span></div>
            <div className="text-red-700">CN <span className="hidden sm:inline font-normal text-[10px] text-red-500">(Chủ Nhật)</span></div>
          </div>

          {/* Days Grid - Realistic Wall Calendar Box Matrix */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 p-px">
            
            {/* Previous Month Trailing Days */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => {
              const prevDayNum = daysInPrevMonth - adjustedFirstDay + i + 1;
              return (
                <div 
                  key={`prev-${i}`} 
                  className="min-h-[90px] sm:min-h-[105px] p-2 bg-slate-50/70 text-slate-300 flex flex-col justify-between select-none"
                >
                  <span className="text-xs font-semibold">{prevDayNum}</span>
                </div>
              );
            })}

            {/* Current Month Active Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const daySamples = samplesByDate[dateKey] || [];
              const isToday = dateKey === todayStr;
              const isSelected = dateKey === selectedDateStr;
              
              // Stats for this day
              const dueTodayOrOverdueCount = daySamples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;
              const testedCount = daySamples.filter(s => s.status === 'tested_passed' || s.status === 'tested_failed').length;
              const isAllTested = daySamples.length > 0 && testedCount === daySamples.length;

              // Check if weekend
              const dayOfWeek = (adjustedFirstDay + i) % 7;
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Saturday or Sunday

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDateStr(dateKey)}
                  className={`min-h-[90px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-emerald-900 text-white ring-2 ring-emerald-400 z-10 shadow-md'
                      : isToday
                      ? 'bg-emerald-50/90 hover:bg-emerald-100/80 text-emerald-950 font-bold'
                      : isWeekend
                      ? 'bg-[#fcfdfd] hover:bg-slate-50 text-slate-800'
                      : 'bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  {/* Top Bar of Day Tile */}
                  <div className="flex items-center justify-between">
                    <span 
                      className={`text-xs sm:text-sm font-black flex items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-emerald-800 text-white px-2 py-0.5'
                          : isToday
                          ? 'bg-emerald-700 text-white w-6 h-6 rounded-full shadow-xs'
                          : isWeekend
                          ? dayOfWeek === 6 ? 'text-red-600' : 'text-emerald-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Badge Count on day */}
                    {daySamples.length > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs ${
                        isSelected
                          ? 'bg-emerald-700 text-emerald-100'
                          : dueTodayOrOverdueCount > 0
                          ? 'bg-red-500 text-white animate-pulse'
                          : isAllTested
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isAllTested && <Check className="w-2.5 h-2.5" />}
                        {daySamples.length}
                      </span>
                    )}
                  </div>

                  {/* Sample Chips preview inside the box */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {daySamples.slice(0, 2).map((s) => {
                      const isTested = s.status === 'tested_passed' || s.status === 'tested_failed';
                      const isDue = s.status === 'due_today';
                      const isOver = s.status === 'overdue';

                      return (
                        <div
                          key={s.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold truncate leading-tight flex items-center justify-between gap-1 ${
                            isSelected
                              ? 'bg-emerald-800/90 text-emerald-100 border border-emerald-700'
                              : isTested
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isDue
                              ? 'bg-red-100 text-red-900 border border-red-200'
                              : isOver
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                          title={`${s.concreteGrade} - ${s.projectName} (${s.ageType})`}
                        >
                          <span className="truncate">{s.concreteGrade}</span>
                          <span className="shrink-0 opacity-80">{s.ageType}</span>
                        </div>
                      );
                    })}

                    {daySamples.length > 2 && (
                      <span className={`text-[9px] font-bold block text-center ${
                        isSelected ? 'text-emerald-300' : 'text-slate-500'
                      }`}>
                        +{daySamples.length - 2} mẫu khác
                      </span>
                    )}
                  </div>

                  {/* Bottom indicator for today or empty */}
                  {isToday && !isSelected && (
                    <div className="text-[9px] font-black text-emerald-700 uppercase tracking-widest text-center">
                      Hôm Nay
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend Bar */}
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700">Ghi chú màu:</span>
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Đến hạn nén
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Đã nén xong
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Chưa đến hạn
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-800" /> Ngày đang chọn
              </span>
            </div>

            <div className="text-[11px] text-slate-500">
              Tổng số mẫu toàn hệ thống: <strong>{samples.length} mẫu</strong>
            </div>
          </div>

        </div>

        {/* Right Side: Selected Day Detailed Schedule & Direct Actions (4 Cols on XL) */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
          
          {/* Selected Date Header */}
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                LỊCH NÉN NGÀY ĐANG CHỌN:
              </span>
              {selectedDateStr === todayStr && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  HÔM NAY
                </span>
              )}
            </div>

            <h3 className="text-base font-black text-slate-900 mt-1 leading-snug">
              {getFullFormattedDate(selectedDateStr)}
            </h3>

            <p className="text-xs text-slate-500 mt-0.5">
              Có <strong>{selectedDaySamples.length} mẫu bê tông</strong> có lịch nén trong ngày này
            </p>
          </div>

          {/* Quick Filter or Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            {onAddNewSampleForDate && (
              <button
                onClick={() => onAddNewSampleForDate(selectedDateStr)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>+ Thêm Mẫu Cho Ngày Này</span>
              </button>
            )}
          </div>

          {/* Empty State */}
          {selectedDaySamples.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
              <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">Không có lịch nén mẫu</p>
              <p className="text-xs text-slate-500">
                Ngày này không có mẫu bê tông nào đến hạn thí nghiệm nén.
              </p>
              <p className="text-[11px] text-slate-400">
                Nhấp vào các ngày có số chỉ thị màu trên lịch để xem danh sách.
              </p>
            </div>
          ) : (
            /* List of Samples for Selected Day */
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {selectedDaySamples.map((sample, idx) => {
                const station = stationMap.get(sample.stationId);
                const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';
                const isDueToday = sample.status === 'due_today';
                const isOverdue = sample.status === 'overdue';

                return (
                  <div 
                    key={sample.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isTested
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isDueToday
                        ? 'bg-red-50/40 border-red-200 shadow-xs'
                        : isOverdue
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Top Row: Station + Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-800 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{station ? station.name.replace('Trạm Tasago ', '') : 'Trạm Tasago'}</span>
                      </span>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isTested
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDueToday
                          ? 'bg-red-500 text-white animate-pulse'
                          : isOverdue
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isTested ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã Nén Xong</span>
                          </>
                        ) : isDueToday ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-white" />
                            <span>Đến Hạn Hôm Nay</span>
                          </>
                        ) : isOverdue ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>Quá Hạn</span>
                          </>
                        ) : (
                          <span>Chưa Đến Hạn</span>
                        )}
                      </span>
                    </div>

                    {/* Project Title */}
                    <div>
                      <h4 className="font-black text-sm text-slate-900 leading-snug">
                        #{idx + 1}. {sample.projectName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {sample.contractor} • Mã mẫu: <span className="font-mono font-bold text-slate-700">{sample.sampleCode || sample.id}</span>
                      </p>
                    </div>

                    {/* Concrete Specifications Grid */}
                    <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Hạng mục:</span>
                        <span className="font-bold text-slate-900">{sample.component} ({sample.volumeM3} m³)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Mác bê tông:</span>
                        <span className="font-bold text-emerald-800">{sample.concreteGrade} (Sụt {sample.slumpCm}cm)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tuổi nén:</span>
                        <span className="font-extrabold text-blue-700">{sample.ageType} ({sample.ageDays} ngày) • {sample.groupCount} tổ ({sample.pieceCount} viên)</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Liên hệ:</span>
                        <a 
                          href={`tel:${sample.contactPhone}`} 
                          className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{sample.contactPerson} ({sample.contactPhone})</span>
                        </a>
                      </div>
                    </div>

                    {/* Tested Result Summary if Tested */}
                    {isTested && sample.testResult && (
                      <div className="bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-emerald-900 block">KẾT QUẢ NÉN:</span>
                          <span className="text-sm font-black text-emerald-900">
                            {sample.testResult.avgStrengthMpa.toFixed(1)} MPa
                          </span>
                          <span className="text-xs text-emerald-700 font-bold ml-1.5">
                            ({sample.testResult.percentageOfDesign.toFixed(0)}% Thiết Kế)
                          </span>
                        </div>
                        <span className="bg-emerald-700 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-2xs">
                          {sample.status === 'tested_passed' ? 'ĐẠT CHUẨN' : 'KHÔNG ĐẠT'}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons Toolbar for this Sample */}
                    <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-end gap-1.5">
                      
                      {/* Mark as Tested (1-click) */}
                      {!isTested ? (
                        <button
                          onClick={() => {
                            if (onQuickMarkTested) {
                              onQuickMarkTested(sample);
                            } else {
                              onSelectSampleForTest(sample);
                            }
                          }}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Đánh dấu đã nén mẫu xong"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã Nén Xong</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectSampleForTest(sample)}
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                          title="Sửa lại chỉ số nén MPa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa Kết Quả</span>
                        </button>
                      )}

                      {/* Enter detailed Test Result (MPa) */}
                      {!isTested && (
                        <button
                          onClick={() => onSelectSampleForTest(sample)}
                          className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer"
                          title="Nhập lực nén KN & cường độ MPa chi tiết"
                        >
                          <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Nhập MPa</span>
                        </button>
                      )}

                      {/* View Detail Modal */}
                      <button
                        onClick={() => onSelectSampleDetail(sample)}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs p-1.5 rounded-xl border border-slate-200 cursor-pointer"
                        title="Xem chi tiết & In phiếu"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                      </button>

                      {/* Send Zalo / Email */}
                      {onOpenNotification && (
                        <button
                          onClick={() => onOpenNotification(sample)}
                          className="bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs p-1.5 rounded-xl border border-slate-200 cursor-pointer"
                          title="Bắn tin Zalo / Email cho mẫu này"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete compression schedule / sample */}
                      <button
                        onClick={() => handleDeleteSchedule(sample)}
                        className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-semibold text-xs p-1.5 rounded-xl border border-slate-200 hover:border-red-200 cursor-pointer"
                        title="Xóa lịch nén mẫu này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
