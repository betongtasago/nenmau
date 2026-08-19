import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Search, 
  PlusCircle, 
  FileSpreadsheet, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Edit3, 
  Phone, 
  Send, 
  Printer, 
  ArrowUpDown,
  Building2,
  ExternalLink
} from 'lucide-react';
import { ConcreteSample, Station, User } from '../types';
import { formatDateVN } from '../utils/storage';

interface SampleListProps {
  samples: ConcreteSample[];
  stations: Station[];
  currentUser?: User | null;
  selectedStationId: string;
  onSelectStation?: (stationId: string) => void;
  onOpenNewSampleModal?: () => void;
  onAddNew?: () => void;
  onSelectSampleForEdit?: (sample: ConcreteSample) => void;
  onEdit?: (sample: ConcreteSample) => void;
  onSelectSampleForTest?: (sample: ConcreteSample) => void;
  onOpenTestResult?: (sample: ConcreteSample) => void;
  onSelectSampleDetail?: (sample: ConcreteSample) => void;
  onOpenDetail?: (sample: ConcreteSample) => void;
  onDeleteSample?: (sampleId: string) => void;
  onDelete?: (sampleId: string) => void;
  onSendSingleNotification?: (sample: ConcreteSample) => void;
  onOpenNotification?: (sample: ConcreteSample) => void;
  onExportExcel?: (samples: ConcreteSample[]) => void;
  userRole?: string;
}

export const SampleList: React.FC<SampleListProps> = ({
  samples,
  stations,
  currentUser,
  selectedStationId,
  onSelectStation,
  onOpenNewSampleModal,
  onAddNew,
  onSelectSampleForEdit,
  onEdit,
  onSelectSampleForTest,
  onOpenTestResult,
  onSelectSampleDetail,
  onOpenDetail,
  onDeleteSample,
  onDelete,
  onSendSingleNotification,
  onOpenNotification,
  onExportExcel,
  userRole,
}) => {
  const handleAddNew = onAddNew || onOpenNewSampleModal || (() => {});
  const handleEdit = onEdit || onSelectSampleForEdit || (() => {});
  const handleTest = onOpenTestResult || onSelectSampleForTest || (() => {});
  const handleDetail = onOpenDetail || onSelectSampleDetail || (() => {});
  const handleDelete = onDelete || onDeleteSample || (() => {});
  const handleNotify = onOpenNotification || onSendSingleNotification || (() => {});
  const handleExport = onExportExcel || (() => {});
  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    stations.forEach(s => map.set(s.id, s));
    return map;
  }, [stations]);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'scheduledTestDate' | 'castDate' | 'projectName'>('scheduledTestDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Available grades for filter
  const availableGrades = useMemo(() => {
    const grades = new Set<string>();
    samples.forEach(s => {
      if (s.concreteGrade) grades.add(s.concreteGrade);
    });
    return Array.from(grades);
  }, [samples]);

  // Filtered and Sorted list
  const filteredSamples = useMemo(() => {
    return samples.filter(item => {
      if (selectedStationId !== 'all' && item.stationId !== selectedStationId) {
        return false;
      }
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (ageFilter !== 'all' && item.ageType !== ageFilter) {
        return false;
      }
      if (gradeFilter !== 'all' && item.concreteGrade !== gradeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchProject = item.projectName.toLowerCase().includes(q);
        const matchContractor = item.contractor.toLowerCase().includes(q);
        const matchComponent = item.component.toLowerCase().includes(q);
        const matchCode = (item.sampleCode || '').toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
        const matchPhone = (item.contactPhone || '').includes(q);
        const matchPerson = (item.contactPerson || '').toLowerCase().includes(q);
        const matchSampler = (item.samplerName || '').toLowerCase().includes(q);
        if (!matchProject && !matchContractor && !matchComponent && !matchCode && !matchPhone && !matchPerson && !matchSampler) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [samples, selectedStationId, activeCategory, statusFilter, ageFilter, gradeFilter, searchQuery, sortField, sortAsc]);

  const shapeMap: Record<string, string> = {
    cube_150: 'Vuông 150',
    cylinder_150_300: 'Trụ Ø150x300',
    waterproof_150: 'Chống thấm',
    expansion: 'Bù co ngót',
    other: 'Khác',
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Control Ribbon & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Lịch Nén Mẫu Bê Tông & Cấp Phối
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedStationId === 'all' 
                ? `Hiển thị ${filteredSamples.length}/${samples.length} mẫu từ tất cả các trạm`
                : `Danh sách mẫu tại ${stationMap.get(selectedStationId)?.name || 'Trạm'} (${filteredSamples.length} mẫu)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Thêm Mẫu Mới</span>
            </button>

            <button
              onClick={() => handleExport(filteredSamples)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-md border border-slate-200 text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Xuất Excel ({filteredSamples.length})</span>
            </button>
          </div>
        </div>

        {/* Category Tabs: Tất Cả / Bê Tông Đã Cấp / Trialmix */}
        <div className="flex border-b border-slate-200 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveCategory('all')}
            className={`pb-2.5 px-4 transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất Cả Mẫu ({samples.length})
          </button>

          <button
            onClick={() => setActiveCategory('commercial')}
            className={`pb-2.5 px-4 transition-all cursor-pointer ${
              activeCategory === 'commercial'
                ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🚚 Bê Tông Thương Phẩm ({samples.filter(s => s.category === 'commercial').length})
          </button>

          <button
            onClick={() => setActiveCategory('trialmix')}
            className={`pb-2.5 px-4 transition-all cursor-pointer ${
              activeCategory === 'trialmix'
                ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🧪 Thí Nghiệm Trialmix ({samples.filter(s => s.category === 'trialmix').length})
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên công trình, nhà thầu, SĐT, KTV..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">🔍 Tất Cả Tình Trạng</option>
              <option value="due_today">🔴 Đến Hạn Hôm Nay</option>
              <option value="overdue">⚠️ Quá Hạn Chưa Nén</option>
              <option value="pending">⏳ Chưa Đến Hạn</option>
              <option value="tested_passed">✅ Đã Nén - ĐẠT</option>
              <option value="tested_failed">❌ Đã Nén - KHÔNG ĐẠT</option>
            </select>
          </div>

          {/* Age Filter */}
          <div>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">⏱️ Tất Cả Tuổi Nén</option>
              <option value="R3">Tuổi R3 (3 ngày)</option>
              <option value="R7">Tuổi R7 (7 ngày)</option>
              <option value="R14">Tuổi R14 (14 ngày)</option>
              <option value="R28">Tuổi R28 (28 ngày)</option>
              <option value="R28_WATERPROOF">R28 Chống Thấm</option>
              <option value="EXPANSION">Bù Co Ngót</option>
            </select>
          </div>

          {/* Concrete Grade Filter */}
          <div>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-700 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">🧪 Mác Bê Tông (Tất Cả)</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Main Table - Styled exactly as Professional Polish */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredSamples.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FlaskConical className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-600">Không tìm thấy mẫu bê tông nào phù hợp</p>
            <p className="text-xs text-slate-400">Thử xóa bớt bộ lọc hoặc thêm mẫu mới</p>
            <button
              onClick={onOpenNewSampleModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md text-xs inline-flex items-center gap-1.5 mt-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Thêm Mẫu Mới Ngay</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Ngày nén</th>
                  <th className="px-6 py-3">Công trình / Trạm</th>
                  <th className="px-6 py-3">Hạng mục</th>
                  <th className="px-6 py-3">Mác / Tuổi</th>
                  <th className="px-6 py-3 text-center">Số tổ</th>
                  <th className="px-6 py-3">Tình Trạng / KQ</th>
                  <th className="px-6 py-3">Liên hệ</th>
                  <th className="px-6 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredSamples.map((sample) => {
                  const station = stationMap.get(sample.stationId);
                  const isTested = sample.status === 'tested_passed' || sample.status === 'tested_failed';
                  const isDueToday = sample.status === 'due_today';
                  const isOverdue = sample.status === 'overdue';

                  return (
                    <tr 
                      key={sample.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isDueToday ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      {/* Ngày nén */}
                      <td className="px-6 py-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        <div>{formatDateVN(sample.scheduledTestDate)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Đúc: {formatDateVN(sample.castDate)}
                        </div>
                      </td>

                      {/* Công trình / Trạm */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onSelectSampleDetail(sample)}
                          className="font-bold text-slate-900 hover:text-emerald-700 text-left line-clamp-1 block cursor-pointer"
                        >
                          {sample.projectName}
                        </button>
                        <div className="text-xs text-slate-400">
                          {station ? station.name.replace('Trạm Tasago ', 'Trạm ') : 'Trạm Tasago'} • {sample.contractor}
                        </div>
                      </td>

                      {/* Hạng mục */}
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        <div className="font-medium text-slate-800">{sample.component}</div>
                        <div className="text-slate-400">{sample.volumeM3} m³</div>
                      </td>

                      {/* Mác / Tuổi */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-800">
                          {sample.concreteGrade}
                        </span>
                        <span className={`font-bold ml-1 text-xs ${
                          sample.ageType === 'R7' ? 'text-orange-600' :
                          sample.ageType === 'R28' ? 'text-blue-600' :
                          sample.ageType.includes('WATERPROOF') ? 'text-purple-600' : 'text-emerald-700'
                        }`}>
                          {sample.ageType}
                        </span>
                      </td>

                      {/* Số tổ */}
                      <td className="px-6 py-4 text-center font-semibold text-slate-700 text-xs">
                        {String(sample.groupCount).padStart(2, '0')}
                        <div className="text-[10px] text-slate-400 font-normal">
                          ({sample.pieceCount} viên)
                        </div>
                      </td>

                      {/* Tình Trạng / KQ */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isTested && sample.testResult ? (
                          <div>
                            <span className="font-bold text-emerald-700 text-xs">
                              {sample.testResult.avgStrengthMpa.toFixed(1)} MPa
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({sample.testResult.percentageOfDesign.toFixed(0)}%)
                            </span>
                            <span className={`block text-[10px] font-bold ${sample.status === 'tested_passed' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {sample.status === 'tested_passed' ? '✅ Đạt' : '❌ Không Đạt'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                              isDueToday ? 'bg-red-100 text-red-700 animate-pulse' :
                              isOverdue ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isDueToday ? '🔴 Đến Hạn' : isOverdue ? '⚠️ Quá Hạn' : '⏳ Chưa Đến Hạn'}
                            </span>
                            <button
                              onClick={() => handleTest(sample)}
                              className="block text-emerald-700 hover:text-emerald-900 font-semibold text-[11px] hover:underline cursor-pointer"
                            >
                              + Nhập KQ
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Liên hệ */}
                      <td className="px-6 py-4 text-xs italic text-slate-600 whitespace-nowrap">
                        <div>{sample.contactPerson}</div>
                        <a 
                          href={`tel:${sample.contactPhone}`} 
                          className="text-emerald-700 font-mono font-medium not-italic hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{sample.contactPhone}</span>
                        </a>
                      </td>

                      {/* Thao tác */}
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleNotify(sample)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Gửi Zalo / Email"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDetail(sample)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Xem Chi Tiết & In"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(sample)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          title="Chỉnh Sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sample.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
