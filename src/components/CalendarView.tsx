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
  Send 
} from 'lucide-react';
import { ConcreteSample, Station } from '../types';
import { formatDateVN } from '../utils/storage';

interface CalendarViewProps {
  samples: ConcreteSample[];
  stations: Station[];
  selectedStationId: string;
  onSelectSampleDetail: (sample: ConcreteSample) => void;
  onSelectSampleForTest: (sample: ConcreteSample) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  samples,
  stations,
  selectedStationId,
  onSelectSampleDetail,
  onSelectSampleForTest,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach(s => map.set(s.id, s));
    return map;
  }, [stations]);

  const activeSamples = useMemo(() => {
    return selectedStationId === 'all'
      ? samples
      : samples.filter(s => s.stationId === selectedStationId);
  }, [samples, selectedStationId]);

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

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Adjust so Monday is first day (0 = Mon, 6 = Sun)
  const adjustedFirstDay = (firstDayIndex + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDaySamples = samplesByDate[selectedDateStr] || [];

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-black text-slate-900">
              Lịch Nén Mẫu Bê Tông Theo Tháng
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem trực quan các ngày có lịch nén mẫu của từng trạm và nhấp vào ngày để xem chi tiết
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-extrabold text-sm text-slate-900 px-3 py-1 bg-slate-100 rounded-xl min-w-[140px] text-center">
            Tháng {month + 1} / {year}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl ml-2 shadow-sm"
          >
            Hôm Nay
          </button>
        </div>
      </div>

      {/* Calendar & Day Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs text-slate-600 pb-2 border-b border-slate-100">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span className="text-emerald-700">T7</span>
            <span className="text-red-600">CN</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Empty slots for offset */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[85px] p-1 bg-slate-50/50 rounded-xl opacity-40" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const daySamples = samplesByDate[dateKey] || [];
              const isToday = dateKey === todayStr;
              const isSelected = dateKey === selectedDateStr;
              const hasDueOrOverdue = daySamples.some(s => s.status === 'due_today' || s.status === 'overdue');

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDateStr(dateKey)}
                  className={`min-h-[70px] sm:min-h-[85px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-400'
                      : isToday
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-emerald-600 text-white' : ''
                    }`}>
                      {dayNum}
                    </span>
                    {daySamples.length > 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-emerald-700 text-emerald-100' :
                        hasDueOrOverdue ? 'bg-red-500 text-white animate-pulse' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {daySamples.length}
                      </span>
                    )}
                  </div>

                  {/* Badges preview */}
                  <div className="space-y-0.5 mt-1 overflow-hidden">
                    {daySamples.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate font-semibold ${
                          isSelected ? 'bg-emerald-800 text-emerald-100' :
                          s.status === 'due_today' ? 'bg-red-100 text-red-800' :
                          s.status === 'tested_passed' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {s.concreteGrade} • {s.projectName.slice(0, 10)}
                      </div>
                    ))}
                    {daySamples.length > 2 && (
                      <span className={`text-[8px] font-bold block ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                        +{daySamples.length - 2} mẫu nữa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Details Pane (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              CHI TIẾT LỊCH NÉN NGÀY:
            </span>
            <h3 className="text-base font-black text-slate-900 mt-0.5">
              {formatDateVN(selectedDateStr)} {selectedDateStr === todayStr && '(HÔM NAY)'}
            </h3>
            <p className="text-xs text-slate-500">
              Có <strong>{selectedDaySamples.length} mẫu bê tông</strong> có lịch nén trong ngày này
            </p>
          </div>

          {selectedDaySamples.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">Không có lịch nén mẫu</p>
              <p className="text-[11px] mt-1">Chọn một ngày khác trên lịch để xem</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {selectedDaySamples.map((sample) => {
                const station = stationMap.get(sample.stationId);
                const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';

                return (
                  <div 
                    key={sample.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800">
                        {station ? station.name.replace('Trạm Tasago ', '') : 'Trạm Tasago'}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        sample.status === 'due_today' ? 'bg-red-100 text-red-800' :
                        sample.status === 'tested_passed' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {sample.status === 'due_today' ? '🔴 Hôm Nay' :
                         sample.status === 'tested_passed' ? '✅ Đã Nén' : '⏳ Chưa Nén'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 line-clamp-1">
                      {sample.projectName}
                    </h4>

                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p><strong>Hạng mục:</strong> {sample.component} ({sample.volumeM3} m³)</p>
                      <p><strong>Mác bê tông:</strong> <span className="font-bold text-emerald-800">{sample.concreteGrade}</span> (Tuổi {sample.ageType})</p>
                      <p><strong>Liên hệ:</strong> {sample.contactPerson} - <a href={`tel:${sample.contactPhone}`} className="text-emerald-700 font-bold">{sample.contactPhone}</a></p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onSelectSampleDetail(sample)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px]"
                      >
                        Chi Tiết
                      </button>
                      <button
                        onClick={() => onSelectSampleForTest(sample)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                      >
                        Nhập Kết Quả
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
