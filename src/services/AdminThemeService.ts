/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AdminThemeConfig {
  themeMode: 'slate' | 'executive_blue' | 'emerald_pro' | 'royal_indigo' | 'warm_ivory';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundType: 'solid' | 'gradient' | 'pattern' | 'image';
  gradient?: {
    direction: string;
    color1: string;
    color2: string;
  };
  backgroundImage?: string;
  patternType?: 'none' | 'dots' | 'grid' | 'diagonal';
  overlayOpacity?: number;
  fontFamily: string;
  textColor: string;
  secondaryTextColor: string;
  coverImage?: string;
  coverPositionY?: number; // 0 to 100
  coverPosition?: string;
  coverZoom?: number;
  coverOverlayOpacity?: number;
  sidebarPosition: 'left' | 'right';
  contentDensity: 'comfortable' | 'compact';
  cardBackground: string;
  borderRadius: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export type DashboardViewMode = 'kpi' | 'pie' | 'bar' | 'line';

export interface AdminDashboardPreferences {
  accountStatsMode: DashboardViewMode;
  classStatsMode: DashboardViewMode;
  surveyStatsMode: DashboardViewMode;
  supportStatsMode: DashboardViewMode;
  usageStatsMode: DashboardViewMode;
  timeFilter: 'all' | 'today' | '7d' | '30d' | 'month' | 'year';
  compactMode: boolean;
}

const DEFAULT_ADMIN_THEME: AdminThemeConfig = {
  themeMode: 'executive_blue',
  primaryColor: '#4338CA', // Indigo 700
  secondaryColor: '#3B82F6', // Blue 500
  accentColor: '#0EA5E9', // Sky 500
  backgroundColor: '#F8FAFC', // Slate 50
  backgroundType: 'solid',
  gradient: {
    direction: 'to bottom right',
    color1: '#F8FAFC',
    color2: '#EFF6FF'
  },
  backgroundImage: '',
  patternType: 'none',
  overlayOpacity: 20,
  fontFamily: 'Be Vietnam Pro',
  textColor: '#0F172A', // Slate 900
  secondaryTextColor: '#64748B', // Slate 500
  coverImage: '',
  coverOverlayOpacity: 30,
  sidebarPosition: 'left',
  contentDensity: 'comfortable',
  cardBackground: '#FFFFFF',
  borderRadius: '2xl'
};

const DEFAULT_DASHBOARD_PREFERENCES: AdminDashboardPreferences = {
  accountStatsMode: 'bar',
  classStatsMode: 'pie',
  surveyStatsMode: 'bar',
  supportStatsMode: 'pie',
  usageStatsMode: 'line',
  timeFilter: 'month',
  compactMode: false
};

const THEME_STORAGE_KEY = 'admin_theme_settings_scoped_v1';
const PREFS_STORAGE_KEY = 'admin_dashboard_preferences_scoped_v1';

class AdminThemeService {
  private static instance: AdminThemeService;
  private theme: AdminThemeConfig;
  private preferences: AdminDashboardPreferences;
  private listeners: Array<() => void> = [];

  private constructor() {
    this.theme = this.loadTheme();
    this.preferences = this.loadPreferences();
  }

  public static getInstance(): AdminThemeService {
    if (!AdminThemeService.instance) {
      AdminThemeService.instance = new AdminThemeService();
    }
    return AdminThemeService.instance;
  }

  private loadTheme(): AdminThemeConfig {
    if (typeof window === 'undefined') return { ...DEFAULT_ADMIN_THEME };
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_ADMIN_THEME, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load admin theme from localStorage', e);
    }
    return { ...DEFAULT_ADMIN_THEME };
  }

  private loadPreferences(): AdminDashboardPreferences {
    if (typeof window === 'undefined') return { ...DEFAULT_DASHBOARD_PREFERENCES };
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_DASHBOARD_PREFERENCES, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load admin preferences from localStorage', e);
    }
    return { ...DEFAULT_DASHBOARD_PREFERENCES };
  }

  public getAdminTheme(): AdminThemeConfig {
    return { ...this.theme };
  }

  public getDashboardPreferences(): AdminDashboardPreferences {
    return { ...this.preferences };
  }

  public updateAdminTheme(updates: Partial<AdminThemeConfig>): AdminThemeConfig {
    this.theme = { ...this.theme, ...updates };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.theme));
      } catch (e) {
        console.error('Failed to save admin theme to localStorage', e);
      }
    }
    this.notify();
    return this.getAdminTheme();
  }

  public updateDashboardPreferences(updates: Partial<AdminDashboardPreferences>): AdminDashboardPreferences {
    this.preferences = { ...this.preferences, ...updates };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.preferences));
      } catch (e) {
        console.error('Failed to save admin dashboard preferences to localStorage', e);
      }
    }
    this.notify();
    return this.getDashboardPreferences();
  }

  public resetDashboardPreferences(): AdminDashboardPreferences {
    this.preferences = { ...DEFAULT_DASHBOARD_PREFERENCES };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.preferences));
      } catch (e) {
        console.error('Failed to reset admin preferences in localStorage', e);
      }
    }
    this.notify();
    return this.getDashboardPreferences();
  }

  public resetAdminTheme(): AdminThemeConfig {
    this.theme = { ...DEFAULT_ADMIN_THEME };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.theme));
      } catch (e) {
        console.error('Failed to reset admin theme in localStorage', e);
      }
    }
    this.notify();
    return this.getAdminTheme();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in AdminThemeService listener', e);
      }
    });
  }
}

export const adminThemeService = AdminThemeService.getInstance();
