import { User, Station, ConcreteSample, NotificationConfig, NotificationLog, ConcreteAgeType } from '../types';
import { INITIAL_USERS, INITIAL_STATIONS, INITIAL_SAMPLES, INITIAL_NOTIFICATION_CONFIG } from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'tasago_users_v2',
  CURRENT_USER: 'tasago_current_user_v2',
  STATIONS: 'tasago_stations_v2',
  SAMPLES: 'tasago_samples_v2',
  NOTIFICATION_CONFIG: 'tasago_notif_config_v2',
  NOTIFICATION_LOGS: 'tasago_notif_logs_v2',
};

// Calculate age days from AgeType
export function getDaysFromAgeType(ageType: ConcreteAgeType, customDays?: number): number {
  switch (ageType) {
    case 'R3': return 3;
    case 'R7': return 7;
    case 'R14': return 14;
    case 'R28': return 28;
    case 'R60': return 60;
    case 'R90': return 90;
    case 'R28_WATERPROOF': return 28;
    case 'EXPANSION': return 14;
    case 'CUSTOM': return customDays || 28;
    default: return 28;
  }
}

// Calculate Scheduled Date: castDate + days
export function calculateScheduledDate(castDateStr: string, days: number): string {
  if (!castDateStr) return '';
  const parts = castDateStr.split('-');
  if (parts.length !== 3) return castDateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + days);
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Extract numeric design strength (MPa) from grade string (e.g. M350 -> 35, B25 -> 25)
export function parseDesignStrengthMpa(gradeStr: string): number {
  if (!gradeStr) return 30;
  const mMatch = gradeStr.match(/M\s*(\d+)/i);
  if (mMatch && mMatch[1]) {
    const val = parseInt(mMatch[1], 10);
    // M200 is 20 MPa (200 daN/cm2), M300 is 30 MPa, M350 is 35 MPa
    return val >= 100 ? val / 10 : val;
  }
  const bMatch = gradeStr.match(/B\s*(\d+(?:\.\d+)?)/i);
  if (bMatch && bMatch[1]) {
    return parseFloat(bMatch[1]);
  }
  return 30;
}

// Format date for display in Vietnamese: DD/MM/YYYY
export function formatDateVN(dateStr: string | undefined): string {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Check sample status dynamically based on current date
export function refreshSampleStatus(sample: ConcreteSample): ConcreteSample {
  if (sample.status === 'tested_passed' || sample.status === 'tested_failed' || sample.status === 'cancelled') {
    return sample;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const scheduled = sample.scheduledTestDate;

  if (!scheduled) return sample;

  if (scheduled === todayStr) {
    return { ...sample, status: 'due_today' };
  } else if (scheduled < todayStr) {
    return { ...sample, status: 'overdue' };
  } else {
    return { ...sample, status: 'pending' };
  }
}

// Storage operations
export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored users:', e);
    return INITIAL_USERS;
  }
}

export const loadUsers = getStoredUsers;

export function saveStoredUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export const saveUsers = saveStoredUsers;

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function getStoredStations(): Station[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(INITIAL_STATIONS));
      return INITIAL_STATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored stations:', e);
    return INITIAL_STATIONS;
  }
}

export const loadStations = getStoredStations;

export function saveStoredStations(stations: Station[]): void {
  localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(stations));
}

export const saveStations = saveStoredStations;

export function getStoredSamples(): ConcreteSample[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAMPLES);
    let samples: ConcreteSample[] = [];
    if (!raw) {
      samples = INITIAL_SAMPLES;
      localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(samples));
    } else {
      samples = JSON.parse(raw);
    }
    // Update statuses dynamically relative to current date
    const updated = samples.map(refreshSampleStatus);
    return updated;
  } catch (e) {
    console.error('Failed to parse stored samples:', e);
    return INITIAL_SAMPLES.map(refreshSampleStatus);
  }
}

export const loadSamples = getStoredSamples;

export function saveStoredSamples(samples: ConcreteSample[]): void {
  localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(samples));
}

export const saveSamples = saveStoredSamples;

export function recalculateSampleStatuses(samples: ConcreteSample[]): ConcreteSample[] {
  return samples.map(refreshSampleStatus);
}

export function getStoredNotificationConfig(): NotificationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_CONFIG, JSON.stringify(INITIAL_NOTIFICATION_CONFIG));
      return INITIAL_NOTIFICATION_CONFIG;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATION_CONFIG;
  }
}

export const loadNotificationConfig = getStoredNotificationConfig;

export function saveStoredNotificationConfig(config: NotificationConfig): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_CONFIG, JSON.stringify(config));
}

export const saveNotificationConfig = saveStoredNotificationConfig;

export function getStoredNotificationLogs(): NotificationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export const loadNotificationLogs = getStoredNotificationLogs;

export function addNotificationLog(log: Omit<NotificationLog, 'id' | 'timestamp'>): NotificationLog {
  const logs = getStoredNotificationLogs();
  const newLog: NotificationLog = {
    ...log,
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...logs].slice(0, 100); // keep last 100 logs
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_LOGS, JSON.stringify(updated));
  return newLog;
}

export function resetAllDataToDefault(): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(INITIAL_STATIONS));
  localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(INITIAL_SAMPLES));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_CONFIG, JSON.stringify(INITIAL_NOTIFICATION_CONFIG));
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATION_LOGS);
}

export function exportAllDataAsJsonString(): string {
  const data = {
    app: 'Tasago Concrete Compression Testing Management System',
    exportedAt: new Date().toISOString(),
    version: '2.0.0',
    users: getStoredUsers().map(u => ({ ...u, password: '[PROTECTED]' })),
    stations: getStoredStations(),
    samples: getStoredSamples(),
    notificationConfig: getStoredNotificationConfig(),
    notificationLogs: getStoredNotificationLogs(),
  };
  return JSON.stringify(data, null, 2);
}
