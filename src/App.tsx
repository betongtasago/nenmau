import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, 
  ConcreteSample, 
  Station, 
  NotificationConfig, 
  NotificationLog, 
  TestResultData 
} from './types';
import { 
  getCurrentUser, 
  setCurrentUser as saveCurrentUserToStorage, 
  loadUsers, 
  saveUsers, 
  loadStations, 
  saveStations, 
  loadSamples, 
  saveSamples, 
  loadNotificationConfig, 
  saveNotificationConfig, 
  loadNotificationLogs,
  recalculateSampleStatuses,
  parseDesignStrengthMpa,
  loadViewMode,
  saveViewMode,
  ViewMode
} from './utils/storage';
import { exportSamplesToExcel } from './utils/excelExport';
import { 
  checkAndTriggerAutoNotifications, 
  requestBrowserNotificationPermission,
  playAlertChime 
} from './utils/notificationService';
import { 
  AlertTriangle, 
  Bell, 
  MessageSquare, 
  Volume2, 
  X, 
  Sparkles,
  Phone,
  LayoutGrid,
  CalendarDays,
  Plus,
  BarChart3,
  FileText,
  Smartphone,
  Monitor
} from 'lucide-react';

// Components
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { DashboardStats } from './components/DashboardStats';
import { SampleList } from './components/SampleList';
import { SampleFormModal } from './components/SampleFormModal';
import { TestResultModal } from './components/TestResultModal';
import { SampleDetailModal } from './components/SampleDetailModal';
import { NotificationModal } from './components/NotificationModal';
import { AnalyticsView } from './components/AnalyticsView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { UserManagementModal } from './components/UserManagementModal';
import { GitHubExportModal } from './components/GitHubExportModal';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => loadUsers());

  // Core Data state
  const [stations, setStations] = useState<Station[]>(() => loadStations());
  const [samples, setSamples] = useState<ConcreteSample[]>(() => recalculateSampleStatuses(loadSamples()));
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(() => loadNotificationConfig());
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(() => loadNotificationLogs());

  // UI state & ViewMode (Mobile / PC / Auto)
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [selectedStationId, setSelectedStationId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'samples' | 'calendar' | 'analytics' | 'reports'>('samples');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<ConcreteSample | null>(null);

  const [isTestResultModalOpen, setIsTestResultModalOpen] = useState(false);
  const [testingSample, setTestingSample] = useState<ConcreteSample | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailSample, setDetailSample] = useState<ConcreteSample | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationPreselectedSample, setNotificationPreselectedSample] = useState<ConcreteSample | null>(null);

  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [userManagementTab, setUserManagementTab] = useState<'users' | 'stations'>('stations');
  const [isGitHubExportModalOpen, setIsGitHubExportModalOpen] = useState(false);
  const [showAutoAlertBanner, setShowAutoAlertBanner] = useState(true);
  const [browserNotificationGranted, setBrowserNotificationGranted] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    saveViewMode(newMode);
  };

  // If user is station member, default filter to their station
  useEffect(() => {
    if (currentUser && currentUser.role === 'member' && currentUser.stationId) {
      setSelectedStationId(currentUser.stationId);
    }
  }, [currentUser]);

  // Two-way Real-time synchronization helper
  const syncWithServer = useCallback(async (pushData?: { samples?: ConcreteSample[]; stations?: Station[]; users?: User[]; config?: NotificationConfig }) => {
    try {
      if (pushData) {
        // Push state to backend server
        const res = await fetch('/api/server-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            samples: pushData.samples || samples,
            stations: pushData.stations || stations,
            users: pushData.users || users,
            config: pushData.config || notificationConfig
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.users && Array.isArray(data.users) && data.users.length > 0) {
            setUsers(data.users);
            saveUsers(data.users);
          }
          if (data.samples && Array.isArray(data.samples)) {
            const recalced = recalculateSampleStatuses(data.samples);
            setSamples(recalced);
            saveSamples(recalced);
          }
          if (data.stations && Array.isArray(data.stations)) {
            setStations(data.stations);
            saveStations(data.stations);
          }
        }
      } else {
        // Pull latest state from backend server
        const res = await fetch('/api/server-sync');
        if (res.ok) {
          const data = await res.json();
          if (data.users && Array.isArray(data.users) && data.users.length > 0) {
            setUsers(prev => {
              // Only update if changed
              if (JSON.stringify(prev) !== JSON.stringify(data.users)) {
                saveUsers(data.users);
                return data.users;
              }
              return prev;
            });
          }
          if (data.samples && Array.isArray(data.samples) && data.samples.length > 0) {
            setSamples(prev => {
              const currentJson = JSON.stringify(prev);
              const serverJson = JSON.stringify(data.samples);
              if (currentJson !== serverJson) {
                const recalced = recalculateSampleStatuses(data.samples);
                saveSamples(recalced);
                return recalced;
              }
              return prev;
            });
          }
          if (data.stations && Array.isArray(data.stations) && data.stations.length > 0) {
            setStations(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(data.stations)) {
                saveStations(data.stations);
                return data.stations;
              }
              return prev;
            });
          }
        }
      }
    } catch (err) {
      // Offline fallback
    }
  }, [samples, stations, users, notificationConfig]);

  // Recalculate status and trigger automated notification check on mount & periodically
  useEffect(() => {
    const fresh = recalculateSampleStatuses(loadSamples());
    setSamples(fresh);
    saveSamples(fresh);

    // Initial server push & sync
    syncWithServer({
      samples: fresh,
      stations,
      users,
      config: notificationConfig
    });

    // Background Notification Check (Triggers at 07:00 AM VN Time)
    if (currentUser) {
      checkAndTriggerAutoNotifications(fresh, stations, notificationConfig).catch(console.error);
    }

    // Interval check every 5 seconds for real-time multi-user synchronization & notifications
    const timer = setInterval(() => {
      syncWithServer();
      const currentSamples = recalculateSampleStatuses(loadSamples());
      setSamples(currentSamples);
      if (currentUser) {
        checkAndTriggerAutoNotifications(currentSamples, stations, notificationConfig).catch(console.error);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const handleRequestPushPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserNotificationGranted(granted);
    if (granted) {
      playAlertChime();
      alert('Đã bật tính năng Thông Báo Đẩy (Web Push) thành công! Hệ thống sẽ tự động nhắc nhở trên thiết bị.');
    }
  };

  // Handler: Login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    saveCurrentUserToStorage(user);
    if (user.role === 'member' && user.stationId) {
      setSelectedStationId(user.stationId);
    } else {
      setSelectedStationId('all');
    }
  };

  // Handler: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    saveCurrentUserToStorage(null);
  };

  // Handler: Save Sample (Create or Edit)
  const handleSaveSample = (sampleData: Partial<ConcreteSample>) => {
    let updatedSamples: ConcreteSample[];

    if (editingSample) {
      // Update existing
      updatedSamples = samples.map(s => {
        if (s.id === editingSample.id) {
          const updated = {
            ...s,
            ...sampleData,
            updatedAt: new Date().toISOString(),
          } as ConcreteSample;
          return updated;
        }
        return s;
      });
    } else {
      // Create new
      const newSample: ConcreteSample = {
        id: `TSG-${Date.now().toString().slice(-6)}`,
        sampleCode: sampleData.sampleCode || `M-${Date.now().toString().slice(-4)}`,
        category: sampleData.category || 'commercial',
        stationId: sampleData.stationId || stations[0]?.id || 'station_hocmon',
        projectName: sampleData.projectName || '',
        contractor: sampleData.contractor || '',
        component: sampleData.component || '',
        location: sampleData.location || '',
        concreteGrade: sampleData.concreteGrade || 'M300 R28',
        slumpCm: sampleData.slumpCm || '12±2',
        volumeM3: Number(sampleData.volumeM3) || 10,
        castDate: sampleData.castDate || new Date().toISOString().split('T')[0],
        castTime: sampleData.castTime || '09:00',
        ageDays: Number(sampleData.ageDays) || 28,
        ageType: sampleData.ageType || 'R28',
        scheduledTestDate: sampleData.scheduledTestDate || new Date().toISOString().split('T')[0],
        groupCount: Number(sampleData.groupCount) || 1,
        pieceCount: Number(sampleData.pieceCount) || 3,
        sampleShape: sampleData.sampleShape || 'cube_150',
        contactPerson: sampleData.contactPerson || '',
        contactPhone: sampleData.contactPhone || '',
        samplerName: sampleData.samplerName || currentUser?.fullName || 'KTV Tasago',
        witnessPerson: sampleData.witnessPerson || '',
        status: 'pending',
        notes: sampleData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.username || 'system',
        createdByName: currentUser?.fullName || 'Hệ Thống Tasago',
      };

      updatedSamples = [newSample, ...samples];
    }

    const finalized = recalculateSampleStatuses(updatedSamples);
    setSamples(finalized);
    saveSamples(finalized);
    syncWithServer({ samples: finalized });
    setIsFormModalOpen(false);
    setEditingSample(null);
  };

  // Handler: Delete Sample
  const handleDeleteSample = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mẫu bê tông này khỏi hệ thống?')) {
      const updated = samples.filter(s => s.id !== id);
      setSamples(updated);
      saveSamples(updated);
      syncWithServer({ samples: updated });
    }
  };

  // Handler: Direct Delete Sample without double confirm
  const handleDeleteSampleDirect = (id: string) => {
    const updated = samples.filter(s => s.id !== id);
    const finalized = recalculateSampleStatuses(updated);
    setSamples(finalized);
    saveSamples(finalized);
    syncWithServer({ samples: finalized });
  };

  // Handler: Quick Mark Sample Tested (1-click from Calendar)
  const handleQuickMarkTested = (sample: ConcreteSample) => {
    const designMpa = sample.concreteGrade.startsWith('M')
      ? Math.round(Number(sample.concreteGrade.replace('M', '')) / 10)
      : Number(sample.concreteGrade.replace('B', '')) || 25;
    
    const autoMpa = Number((designMpa * 1.05).toFixed(1));
    const pieceBreakMpa = [
      Number((autoMpa * 0.98).toFixed(1)),
      Number((autoMpa * 1.02).toFixed(1)),
      Number(autoMpa.toFixed(1))
    ];

    const quickResult: TestResultData = {
      testDate: new Date().toISOString().split('T')[0],
      testedBy: currentUser?.fullName || 'KTV Tasago',
      machineCode: 'MN-2000KN-01',
      avgStrengthMpa: autoMpa,
      designStrengthMpa: designMpa,
      percentageOfDesign: 105,
      isPassed: true,
      pieceResults: pieceBreakMpa.map((mpa, idx) => ({
        pieceNumber: idx + 1,
        failureLoadKn: Number((mpa * 22.5).toFixed(1)),
        measuredStrengthMpa: mpa,
      })),
      notes: 'Đã nén & cập nhật trực tiếp trên Lịch Nén Mẫu'
    };

    const updated = samples.map(s => {
      if (s.id === sample.id) {
        return {
          ...s,
          status: 'tested_passed' as const,
          testResult: quickResult,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    const finalized = recalculateSampleStatuses(updated);
    setSamples(finalized);
    saveSamples(finalized);
    syncWithServer({ samples: finalized });
  };

  // Handler: Save Test Result
  const handleSaveTestResult = (sampleId: string, resultData: TestResultData) => {
    const updated = samples.map(s => {
      if (s.id === sampleId) {
        const newStatus = resultData.isPassed ? 'tested_passed' : 'tested_failed';
        return {
          ...s,
          status: newStatus as any,
          testResult: resultData,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    const finalized = recalculateSampleStatuses(updated);
    setSamples(finalized);
    saveSamples(finalized);
    syncWithServer({ samples: finalized });
    setIsTestResultModalOpen(false);
    setTestingSample(null);
  };

  // Handler: Save Notification Config
  const handleSaveNotificationConfig = (config: NotificationConfig) => {
    setNotificationConfig(config);
    saveNotificationConfig(config);
    syncWithServer({ config });
  };

  // Handler: Save Users (Admin)
  const handleSaveUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    syncWithServer({ users: updatedUsers });
  };

  // Handler: Save Stations (Admin)
  const handleSaveStations = (updatedStations: Station[]) => {
    setStations(updatedStations);
    saveStations(updatedStations);
    syncWithServer({ stations: updatedStations });
  };

  // Handler: Import Full State (Backup Restore)
  const handleImportFullState = (stateData: any) => {
    if (stateData.samples) {
      const recalc = recalculateSampleStatuses(stateData.samples);
      setSamples(recalc);
      saveSamples(recalc);
    }
    if (stateData.stations) {
      setStations(stateData.stations);
      saveStations(stateData.stations);
    }
    if (stateData.users) {
      setUsers(stateData.users);
      saveUsers(stateData.users);
    }
    if (stateData.notificationConfig) {
      setNotificationConfig(stateData.notificationConfig);
      saveNotificationConfig(stateData.notificationConfig);
    }
  };

  // Quick Action: Open Add Form
  const handleOpenAddForm = () => {
    setEditingSample(null);
    setIsFormModalOpen(true);
  };

  // Quick Action: Open Edit Form
  const handleOpenEditForm = (sample: ConcreteSample) => {
    setEditingSample(sample);
    setIsFormModalOpen(true);
  };

  // Quick Action: Open Test Result Modal
  const handleOpenTestModal = (sample: ConcreteSample) => {
    setTestingSample(sample);
    setIsTestResultModalOpen(true);
  };

  // Quick Action: Open Detail Modal
  const handleOpenDetailModal = (sample: ConcreteSample) => {
    setDetailSample(sample);
    setIsDetailModalOpen(true);
  };

  // Quick Action: Open Notification Modal
  const handleOpenNotificationModal = (sample?: ConcreteSample) => {
    setNotificationPreselectedSample(sample || null);
    setIsNotificationModalOpen(true);
  };

  // If not logged in, show AuthScreen
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} onSelectUser={handleLogin} users={users} />;
  }

  // Count urgent samples for notification badge
  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;

  const isMobileLayout = viewMode === 'mobile';

  return (
    <div className={`min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white ${isMobileLayout ? 'pb-20' : ''}`}>
      {/* Header */}
      <Header
        currentUser={currentUser}
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStation={setSelectedStationId}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAddModal={handleOpenAddForm}
        onOpenNotificationModal={() => handleOpenNotificationModal()}
        onOpenUserManagement={(tab) => {
          setUserManagementTab(tab || 'stations');
          setIsUserManagementModalOpen(true);
        }}
        onOpenExportBackup={() => setIsGitHubExportModalOpen(true)}
        urgentCount={urgentCount}
        viewMode={viewMode}
        onChangeViewMode={handleViewModeChange}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 ${
        viewMode === 'mobile' ? 'max-w-2xl' : 'max-w-7xl'
      }`}>
        
        {/* Automatic Realtime Urgent Alert Banner */}
        {urgentCount > 0 && showAutoAlertBanner && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 sm:p-5 rounded-2xl shadow-lg shadow-red-600/15 border border-red-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-white text-red-700 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                    Cảnh Báo Tự Động
                  </span>
                  <span className="text-xs text-red-100 font-semibold">
                    Thời gian thực
                  </span>
                </div>
                <h3 className="font-black text-xs sm:text-base text-white mt-0.5">
                  Phát hiện <span className="underline underline-offset-2">{urgentCount} mẫu bê tông</span> có lịch nén cần thực hiện ngay!
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {!browserNotificationGranted && (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer backdrop-blur-sm"
                  title="Bật thông báo đẩy lên màn hình điện thoại/máy tính"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bật Push</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  playAlertChime();
                  handleOpenNotificationModal();
                }}
                className="bg-white text-red-700 hover:bg-red-50 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Xem Thông Báo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAutoAlertBanner(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Tạm ẩn cảnh báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* KPI Dashboard Stats Bar */}
        <DashboardStats
          samples={samples}
          stations={stations}
          selectedStationId={selectedStationId}
          onFilterStatus={(status) => {
            setActiveTab('samples');
          }}
          onOpenNotificationCenter={() => handleOpenNotificationModal()}
          viewMode={viewMode}
        />

        {/* Tab 1: SAMPLES TABLE / CARDS */}
        {activeTab === 'samples' && (
          <SampleList
            samples={samples}
            stations={stations}
            currentUser={currentUser}
            selectedStationId={selectedStationId}
            onAddNew={handleOpenAddForm}
            onEdit={handleOpenEditForm}
            onDelete={handleDeleteSample}
            onOpenTestResult={handleOpenTestModal}
            onOpenDetail={handleOpenDetailModal}
            onOpenNotification={handleOpenNotificationModal}
            onExportExcel={(listToExport) => {
              exportSamplesToExcel(listToExport || samples, stations);
            }}
            userRole={currentUser.role}
            viewMode={viewMode}
          />
        )}

        {/* Tab 2: CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <CalendarView
            samples={samples}
            stations={stations}
            currentUser={currentUser}
            selectedStationId={selectedStationId}
            onSelectSampleDetail={handleOpenDetailModal}
            onSelectSampleForTest={handleOpenTestModal}
            onQuickMarkTested={handleQuickMarkTested}
            onDeleteSample={handleDeleteSampleDirect}
            onOpenNotification={handleOpenNotificationModal}
            onAddNewSampleForDate={(dateStr) => {
              setEditingSample({
                id: '',
                sampleCode: '',
                category: 'commercial',
                stationId: selectedStationId !== 'all' ? selectedStationId : (stations[0]?.id || ''),
                projectName: '',
                contractor: '',
                location: '',
                component: '',
                concreteGrade: 'M300 (B22.5)',
                slumpCm: '12±2',
                volumeM3: 20,
                castDate: dateStr,
                ageType: 'R28',
                ageDays: 28,
                scheduledTestDate: dateStr,
                sampleShape: 'cube_150',
                groupCount: 1,
                pieceCount: 3,
                contactPerson: '',
                contactPhone: '',
                samplerName: currentUser.fullName,
                notes: '',
                status: 'due_today',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: currentUser.username,
                createdByName: currentUser.fullName,
              });
              setIsFormModalOpen(true);
            }}
          />
        )}

        {/* Tab 3: ANALYTICS & CHARTS */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            samples={samples}
            stations={stations}
            selectedStationId={selectedStationId}
          />
        )}

        {/* Tab 4: REPORTS & EXCEL EXPORT */}
        {activeTab === 'reports' && (
          <ReportsView
            samples={samples}
            stations={stations}
          />
        )}

      </main>

      {/* Floating Action Button (FAB) - Always visible, fixed at the bottom-right corner with prominent pulsing effect */}
      <div className="fixed bottom-16 sm:bottom-8 right-4 sm:right-8 z-40 flex flex-col items-end">
        <button
          type="button"
          onClick={handleOpenAddForm}
          className="group relative flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full font-extrabold shadow-2xl border-2 border-white/60 animate-pulse-glow transition-all active:scale-95 cursor-pointer select-none"
          title="Nhập mẫu mới / Tạo lịch nén bê tông"
        >
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
          </span>
          <div className="p-1 bg-white/20 rounded-full group-hover:rotate-90 transition-transform duration-300">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>
          <span className="text-sm sm:text-base font-black tracking-wide uppercase drop-shadow-md whitespace-nowrap">
            Nhập Mẫu Mới
          </span>
        </button>
      </div>

      {/* Fixed Bottom Navigation Bar for Mobile (Always visible in Mobile mode or on small screens) */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 px-2 py-1.5 text-slate-300 shadow-2xl ${
        viewMode === 'pc' ? 'hidden' : 'md:hidden'
      }`}>
        <div className="flex items-center justify-around max-w-lg mx-auto">
          
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'samples' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <LayoutGrid className="w-5 h-5 mb-0.5" />
            <span>Mẫu Nén</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'calendar' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <CalendarDays className="w-5 h-5 mb-0.5" />
            <span>Lịch Nén</span>
          </button>

          {/* Floating Center Action Button */}
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30 border-2 border-slate-900 transition-transform active:scale-90 cursor-pointer"
            title="Thêm mẫu mới"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'analytics' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span>Thống Kê</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'text-emerald-400 bg-slate-800' : 'hover:text-slate-100'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span>Báo Cáo</span>
          </button>

        </div>
      </div>

      {/* Footer with updated Technical Support Phone 0942320923 */}
      <footer className="bg-slate-100 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2 mt-auto">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4">
          <span>Phiên bản: 2.0.26</span>
          <span>•</span>
          <a 
            href="tel:0942320923" 
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
          >
            <Phone className="w-3 h-3" />
            <span>Hỗ trợ kỹ thuật: 0942320923 (0942.320.923)</span>
          </a>
          {currentUser.role === 'admin' && (
            <>
              <span>•</span>
              <button
                onClick={() => setIsGitHubExportModalOpen(true)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
              >
                Sao Lưu & GitHub
              </button>
            </>
          )}
        </div>
        <div className="font-bold text-slate-700 tracking-tight text-center sm:text-right">
          &copy; {new Date().getFullYear()} CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO - BÊ TÔNG XANH SÀI GÒN
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Add / Edit Sample Modal */}
      <SampleFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingSample(null);
        }}
        editingSample={editingSample}
        stations={stations}
        onSave={handleSaveSample}
        currentUser={currentUser}
      />

      {/* 2. Test Result Entry Modal */}
      <TestResultModal
        isOpen={isTestResultModalOpen}
        onClose={() => {
          setIsTestResultModalOpen(false);
          setTestingSample(null);
        }}
        sample={testingSample}
        onSaveResult={handleSaveTestResult}
        currentUserName={currentUser.fullName}
      />

      {/* 3. Sample Detail & Test Certificate Modal */}
      <SampleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailSample(null);
        }}
        sample={detailSample}
        stations={stations}
        allSamples={samples}
        currentUser={currentUser}
        onOpenTestModal={handleOpenTestModal}
        onOpenEditModal={handleOpenEditForm}
        onSendNotification={(sample) => {
          setIsDetailModalOpen(false);
          handleOpenNotificationModal(sample);
        }}
      />

      {/* 4. Zalo Bot & Email Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => {
          setIsNotificationModalOpen(false);
          setNotificationPreselectedSample(null);
        }}
        samples={samples}
        stations={stations}
        config={notificationConfig}
        onSaveConfig={handleSaveNotificationConfig}
        notificationLogs={notificationLogs}
        preselectedSample={notificationPreselectedSample}
        currentUser={currentUser}
      />

      {/* 5. User & Station Management Modal (Admin) */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        users={users}
        stations={stations}
        samples={samples}
        onSaveUsers={handleSaveUsers}
        onSaveStations={handleSaveStations}
        onSaveSamples={(updatedSamples) => {
          setSamples(updatedSamples);
          saveSamples(updatedSamples);
        }}
        initialTab={userManagementTab}
      />

      {/* 6. GitHub Export & JSON Backup Modal */}
      <GitHubExportModal
        isOpen={isGitHubExportModalOpen}
        onClose={() => setIsGitHubExportModalOpen(false)}
        samples={samples}
        stations={stations}
        users={users}
        notificationConfig={notificationConfig}
        onImportFullState={handleImportFullState}
      />

    </div>
  );
}
