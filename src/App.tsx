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
  parseDesignStrengthMpa
} from './utils/storage';
import { exportSamplesToExcel } from './utils/excelExport';
import { 
  checkAndTriggerAutoNotifications, 
  requestBrowserNotificationPermission,
  playAlertChime 
} from './utils/notificationService';
import { AlertTriangle, Bell, MessageSquare, Volume2, X, Sparkles } from 'lucide-react';

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

  // UI state
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

  // If user is station member, default filter to their station
  useEffect(() => {
    if (currentUser && currentUser.role === 'member' && currentUser.stationId) {
      setSelectedStationId(currentUser.stationId);
    }
  }, [currentUser]);

  // Recalculate status and trigger 100% automated notification check on mount & periodically
  useEffect(() => {
    const fresh = recalculateSampleStatuses(loadSamples());
    setSamples(fresh);
    saveSamples(fresh);

    // 100% Automated Background Notification Check
    if (currentUser) {
      checkAndTriggerAutoNotifications(fresh, stations, notificationConfig).catch(console.error);
    }

    // Interval check every 10 minutes for automatic daily triggers
    const timer = setInterval(() => {
      const currentSamples = recalculateSampleStatuses(loadSamples());
      setSamples(currentSamples);
      if (currentUser) {
        checkAndTriggerAutoNotifications(currentSamples, stations, notificationConfig).catch(console.error);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(timer);
  }, [currentUser, notificationConfig, stations]);

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
        stationId: sampleData.stationId || stations[0]?.id || 'station_1',
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
    setIsFormModalOpen(false);
    setEditingSample(null);
  };

  // Handler: Delete Sample
  const handleDeleteSample = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mẫu bê tông này khỏi hệ thống?')) {
      const updated = samples.filter(s => s.id !== id);
      setSamples(updated);
      saveSamples(updated);
    }
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
    setIsTestResultModalOpen(false);
    setTestingSample(null);
  };

  // Handler: Save Notification Config
  const handleSaveNotificationConfig = (config: NotificationConfig) => {
    setNotificationConfig(config);
    saveNotificationConfig(config);
  };

  // Handler: Save Users (Admin)
  const handleSaveUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  };

  // Handler: Save Stations (Admin)
  const handleSaveStations = (updatedStations: Station[]) => {
    setStations(updatedStations);
    saveStations(updatedStations);
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
    return <AuthScreen onLogin={handleLogin} onLoginSuccess={handleLogin} users={users} />;
  }

  // Count urgent samples for notification badge
  const urgentCount = samples.filter(s => s.status === 'due_today' || s.status === 'overdue').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Automatic Realtime Urgent Alert Banner */}
        {urgentCount > 0 && showAutoAlertBanner && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-4 sm:p-5 rounded-2xl shadow-xl shadow-red-600/20 border border-red-500/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white animate-pulse">
                <Bell className="w-6 h-6" />
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
                <h3 className="font-black text-sm sm:text-base text-white mt-0.5">
                  Phát hiện <span className="underline underline-offset-2">{urgentCount} mẫu bê tông</span> có lịch nén cần thực hiện ngay!
                </h3>
                <p className="text-xs text-red-100/90 hidden sm:block mt-0.5">
                  Hệ thống đã tự động tính toán tiến độ. Đề nghị kiểm tra máy nén và liên hệ công trình để tiến hành nén mẫu.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {!browserNotificationGranted && (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer backdrop-blur-sm"
                  title="Bật thông báo đẩy lên màn hình điện thoại/máy tính"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bật Push Thông Báo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  playAlertChime();
                  handleOpenNotificationModal();
                }}
                className="bg-white text-red-700 hover:bg-red-50 font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Xem & Bắn Tin Bot Zalo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAutoAlertBanner(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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
        />

        {/* Tab 1: SAMPLES TABLE */}
        {activeTab === 'samples' && (
          <SampleList
            samples={samples}
            stations={stations}
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
          />
        )}

        {/* Tab 2: CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <CalendarView
            samples={samples}
            stations={stations}
            selectedStationId={selectedStationId}
            onSelectSampleDetail={handleOpenDetailModal}
            onSelectSampleForTest={handleOpenTestModal}
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

      {/* Footer - Professional Polish Theme */}
      <footer className="bg-slate-100 px-6 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-2 mt-auto">
        <div className="flex items-center gap-4">
          <span>Phiên bản: 2.0.26-Enterprise</span>
          <span>•</span>
          <span>Bảo trì: 12/2026</span>
          <span>•</span>
          <button
            onClick={() => setIsGitHubExportModalOpen(true)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
          >
            Sao Lưu & Hướng Dẫn GitHub
          </button>
        </div>
        <div className="font-bold text-slate-700 tracking-tight text-center sm:text-right">
          &copy; 2026 CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO - BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH
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
        initialSample={editingSample}
        stations={stations}
        onSave={handleSaveSample}
        currentUserName={currentUser.fullName}
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
