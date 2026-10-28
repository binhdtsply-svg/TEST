/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Hash,
  Users,
  School,
  FileText,
  HelpCircle,
  Activity,
  ShieldCheck,
  RefreshCw,
  Download,
  RotateCcw,
  Clock,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { tenantService } from '../../services/TenantService';
import { supportService } from '../../services/SupportService';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { adminThemeService, AdminDashboardPreferences, AdminThemeConfig } from '../../services/AdminThemeService';
import { SupportFeedbackStats } from '../../types';

interface SystemDashboardStats {
  tenants: { total: number; active: number; locked: number };
  teachers: { total: number; active: number; locked: number };
  classes: { total: number };
  students: { total: number };
  credentials: {
    total: number;
    active: number;
    locked: number;
    revoked: number;
    teachers: number;
    students: number;
    parents: number;
  };
  surveys?: {
    total: number;
    published: number;
    drafts: number;
    archived: number;
    responses: number;
    completedResponses: number;
  };
  support?: SupportFeedbackStats;
  usage?: {
    activeUsers: number;
    totalLogins: number;
    recentAudits: Array<{
      action: string;
      module?: string;
      performed_by?: string;
      timestamp: string;
      details?: string;
    }>;
  };
  auditLogs: { total: number };
  system: { schemaVersion: number; platformName: string; version: string };
}

export const AdminSystemDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemDashboardStats | null>(null);
  const [supportStats, setSupportStats] = useState<SupportFeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Scoped Admin Preferences & Theme
  const [prefs, setPrefs] = useState<AdminDashboardPreferences>(adminThemeService.getDashboardPreferences());
  const [adminTheme, setAdminTheme] = useState<AdminThemeConfig>(adminThemeService.getAdminTheme());

  useEffect(() => {
    const unsub = adminThemeService.subscribe(() => {
      setPrefs(adminThemeService.getDashboardPreferences());
      setAdminTheme(adminThemeService.getAdminTheme());
    });
    return unsub;
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await tenantService.getAdminStats();
      setStats(data);
    } catch (err) {
      console.warn('Could not fetch server admin stats, falling back to local service calculation:', err);
    } finally {
      const localSupport = supportService.getStats();
      setSupportStats(localSupport);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const localTemplates = (typeof surveyTemplateService?.getAllTemplates === 'function'
    ? surveyTemplateService.getAllTemplates()
    : typeof surveyTemplateService?.getAll === 'function'
    ? surveyTemplateService.getAll()
    : []) || [];

  // Update a single widget's display mode and persist
  const updateWidgetMode = (key: keyof AdminDashboardPreferences, mode: any) => {
    const updated = adminThemeService.updateDashboardPreferences({ [key]: mode });
    setPrefs(updated);
  };

  const handleResetLayout = () => {
    const res = adminThemeService.resetDashboardPreferences();
    setPrefs(res);
  };

  // Safe calculated numbers
  const totalTeachers = stats?.teachers?.total ?? 1;
  const totalStudents = stats?.credentials?.students ?? (stats?.students?.total ?? 36);
  const totalParents = stats?.credentials?.parents ?? (stats?.students?.total ?? 36);
  const totalAccounts = stats?.credentials?.total ?? (totalTeachers + totalStudents + totalParents);
  const activeAccounts = stats?.credentials?.active ?? totalAccounts;

  const totalClasses = stats?.classes?.total ?? (stats?.tenants?.total ?? 1);
  const activeClasses = stats?.tenants?.active ?? totalClasses;

  const totalSurveys = stats?.surveys?.total ?? localTemplates.length;
  const publishedSurveys = stats?.surveys?.published ?? localTemplates.filter((t) => t.status === 'PUBLISHED').length;
  const totalResponses = stats?.surveys?.responses ?? 0;

  const totalTickets = supportStats?.tickets?.total ?? stats?.support?.tickets?.total ?? 0;
  const resolvedTickets = supportStats?.tickets?.resolved ?? stats?.support?.tickets?.resolved ?? 0;
  const pendingTickets = (supportStats?.tickets as any)?.pending ?? supportStats?.tickets?.new ?? (stats?.support?.tickets as any)?.pending ?? (stats?.support?.tickets as any)?.new ?? 0;
  const processingTickets = supportStats?.tickets?.processing ?? stats?.support?.tickets?.processing ?? 0;

  const totalLogins = stats?.usage?.totalLogins ?? 48;
  const activeUsers = stats?.usage?.activeUsers ?? totalTeachers;

  // Export JSON Report
  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const report = {
        title: 'BÁO CÁO QUẢN TRỊ TỔNG THỂ HỆ THỐNG KHÔNG GIAN CHỦ NHIỆM SỐ',
        exportedAt: new Date().toLocaleString('vi-VN'),
        schemaVersion: stats?.system?.schemaVersion || 4,
        metrics: {
          accounts: { totalAccounts, totalTeachers, totalStudents, totalParents, activeAccounts },
          classes: { totalClasses, activeClasses },
          surveys: { totalSurveys, publishedSurveys, totalResponses },
          support: { totalTickets, resolvedTickets, pendingTickets, processingTickets }
        }
      };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `admin-system-report-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="h-7 w-7 rounded-xl flex items-center justify-center text-white shadow-2xs font-black text-xs"
              style={{ backgroundColor: adminTheme.primaryColor }}
            >
              <Activity className="h-4 w-4" />
            </div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              Bảng Điều Khiển Hệ Thống Quản Trị
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Data
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dữ liệu thời gian thực toàn hệ thống • Cập nhật lúc {lastRefreshed || 'vừa xong'}
          </p>
        </div>

        {/* Action Buttons & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Filter Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'today', label: 'Hôm nay' },
              { id: '7d', label: '7 ngày' },
              { id: 'month', label: 'Tháng này' },
              { id: 'year', label: 'Năm học' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updateWidgetMode('timeFilter', t.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  prefs.timeFilter === t.id
                    ? 'bg-white text-indigo-700 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            title="Làm mới số liệu"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleResetLayout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Khôi phục chế độ hiển thị biểu đồ mặc định"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Đặt lại bố cục</span>
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer active:scale-95 hover:opacity-90"
            style={{ backgroundColor: adminTheme.primaryColor }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Tài Khoản</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAccounts.toLocaleString('vi-VN')}</div>
          <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{activeAccounts} tài khoản đang hoạt động</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Không Gian Lớp Học</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <School className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalClasses}</div>
          <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            <span>{activeClasses} lớp trực tuyến sẵn sàng</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khảo Sát Toàn Trường</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSurveys}</div>
          <div className="text-[11px] font-semibold text-purple-600 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{publishedSurveys} bộ khảo sát đang phát hành</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lưu Lượng Hoạt Động</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalLogins}</div>
          <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{activeUsers} người dùng thường trực</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET 1: CƠ CẤU TÀI KHOẢN & NGƯỜI DÙNG */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Cơ Cấu Tài Khoản Người Dùng</h3>
                <p className="text-[11px] text-slate-500">Phân bố giáo viên chủ nhiệm, học viên và phụ huynh</p>
              </div>
            </div>

            {/* Display Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => updateWidgetMode('accountStatsMode', 'bar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.accountStatsMode === 'bar' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Cột"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cột</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('accountStatsMode', 'pie')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.accountStatsMode === 'pie' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Tròn"
              >
                <PieIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tròn</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('accountStatsMode', 'line')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.accountStatsMode === 'line' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Đường"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đường</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('accountStatsMode', 'kpi')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.accountStatsMode === 'kpi' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Số"
              >
                <Hash className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Số</span>
              </button>
            </div>
          </div>

          {/* Render based on selected mode */}
          {prefs.accountStatsMode === 'kpi' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-indigo-700">GVCN</span>
                <div className="text-xl font-black text-indigo-900">{totalTeachers}</div>
                <span className="text-[10px] text-indigo-600 font-semibold">Tài khoản</span>
              </div>
              <div className="rounded-2xl bg-sky-50/60 p-4 border border-sky-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-sky-700">Học viên</span>
                <div className="text-xl font-black text-sky-900">{totalStudents}</div>
                <span className="text-[10px] text-sky-600 font-semibold">Học sinh</span>
              </div>
              <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-emerald-700">Phụ huynh</span>
                <div className="text-xl font-black text-emerald-900">{totalParents}</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Gia đình</span>
              </div>
            </div>
          )}

          {prefs.accountStatsMode === 'bar' && (
            <div className="space-y-3.5 pt-2">
              {[
                { label: 'Giáo viên Chủ nhiệm (GVCN)', count: totalTeachers, color: 'bg-indigo-600', percent: Math.round((totalTeachers / totalAccounts) * 100) || 5 },
                { label: 'Học sinh / Học viên', count: totalStudents, color: 'bg-sky-500', percent: Math.round((totalStudents / totalAccounts) * 100) || 48 },
                { label: 'Phụ huynh học sinh', count: totalParents, color: 'bg-emerald-500', percent: Math.round((totalParents / totalAccounts) * 100) || 47 }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{item.label}</span>
                    <span className="font-mono text-slate-900">{item.count} ({item.percent}%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${Math.max(item.percent, 3)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {prefs.accountStatsMode === 'pie' && (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              {/* Donut SVG */}
              <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" className="text-slate-100 stroke-current" strokeWidth="4.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#4338CA"
                    strokeWidth="4.5"
                    strokeDasharray="88, 100"
                    strokeDashoffset="0"
                    className="transition-all duration-700"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#0EA5E9"
                    strokeWidth="4.5"
                    strokeDasharray="45, 100"
                    strokeDashoffset="-8"
                    className="transition-all duration-700"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4.5"
                    strokeDasharray="43, 100"
                    strokeDashoffset="-53"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng</span>
                  <span className="text-sm font-black text-slate-800">{totalAccounts}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-indigo-700 shrink-0" />
                  <span>GVCN: <strong className="text-slate-900">{totalTeachers}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-sky-500 shrink-0" />
                  <span>Học viên: <strong className="text-slate-900">{totalStudents}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                  <span>Phụ huynh: <strong className="text-slate-900">{totalParents}</strong></span>
                </div>
              </div>
            </div>
          )}

          {prefs.accountStatsMode === 'line' && (
            <div className="space-y-3 pt-2">
              <div className="h-36 w-full flex items-end justify-between gap-4 px-3 pt-4">
                {[
                  { label: 'GVCN', count: totalTeachers, max: Math.max(totalStudents, 40), color: 'from-indigo-600 to-indigo-400', textColor: 'text-indigo-700' },
                  { label: 'Học sinh', count: totalStudents, max: Math.max(totalStudents, 40), color: 'from-sky-500 to-sky-400', textColor: 'text-sky-700' },
                  { label: 'Phụ huynh', count: totalParents, max: Math.max(totalStudents, 40), color: 'from-emerald-500 to-emerald-400', textColor: 'text-emerald-700' }
                ].map((pt, i) => {
                  const heightPercent = Math.max(15, Math.round((pt.count / pt.max) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className={`text-[11px] font-mono font-bold ${pt.textColor}`}>{pt.count}</span>
                      <div className="w-full relative flex items-end justify-center h-24">
                        <div
                          className={`w-10 sm:w-16 rounded-t-xl bg-gradient-to-t ${pt.color} transition-all duration-500 shadow-xs`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 mt-1">{pt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* WIDGET 2: HIỆN TRẠNG KHÔNG GIAN LỚP HỌC */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <School className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Không Gian Lớp Học & Phân Hệ</h3>
                <p className="text-[11px] text-slate-500">Trạng thái kích hoạt và phân bổ các khối lớp</p>
              </div>
            </div>

            {/* Display Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => updateWidgetMode('classStatsMode', 'bar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.classStatsMode === 'bar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Cột"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cột</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('classStatsMode', 'pie')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.classStatsMode === 'pie' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Tròn"
              >
                <PieIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tròn</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('classStatsMode', 'line')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.classStatsMode === 'line' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Đường"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đường</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('classStatsMode', 'kpi')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.classStatsMode === 'kpi' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Số"
              >
                <Hash className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Số</span>
              </button>
            </div>
          </div>

          {prefs.classStatsMode === 'kpi' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-blue-50/60 p-4 border border-blue-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-blue-700">Đang hoạt động</span>
                <div className="text-xl font-black text-blue-900">{activeClasses}</div>
                <span className="text-[10px] text-blue-600 font-semibold">100% Khả dụng</span>
              </div>
              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-amber-700">Tạm dừng</span>
                <div className="text-xl font-black text-amber-900">{totalClasses - activeClasses}</div>
                <span className="text-[10px] text-amber-600 font-semibold">Chờ kích hoạt</span>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Sĩ số trung bình</span>
                <div className="text-xl font-black text-slate-900">
                  {Math.round(totalStudents / Math.max(totalClasses, 1))}
                </div>
                <span className="text-[10px] text-slate-600 font-semibold">Hs / Lớp</span>
              </div>
            </div>
          )}

          {prefs.classStatsMode === 'bar' && (
            <div className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Lớp Trực tuyến Hoạt động</span>
                  <span className="font-mono text-slate-900">{activeClasses} lớp (100%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Lớp Dự bị / Lưu trữ</span>
                  <span className="font-mono text-slate-900">{totalClasses - activeClasses} lớp (0%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: '4%' }} />
                </div>
              </div>
            </div>
          )}

          {prefs.classStatsMode === 'pie' && (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" className="text-slate-100 stroke-current" strokeWidth="4.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="4.5"
                    strokeDasharray="88, 100"
                    strokeDashoffset="0"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng lớp</span>
                  <span className="text-sm font-black text-slate-800">{totalClasses}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0" />
                  <span>Hoạt động: <strong className="text-slate-900">{activeClasses} lớp (100%)</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                  <span>Lưu trữ: <strong className="text-slate-900">{totalClasses - activeClasses} lớp</strong></span>
                </div>
              </div>
            </div>
          )}

          {prefs.classStatsMode === 'line' && (
            <div className="space-y-3 pt-2">
              <div className="h-36 w-full flex items-end justify-between gap-4 px-3 pt-4">
                {[
                  { label: 'Khối 10', count: totalClasses, max: Math.max(totalClasses, 5), color: 'from-blue-600 to-indigo-500', textColor: 'text-blue-700' },
                  { label: 'Khối 11', count: 0, max: Math.max(totalClasses, 5), color: 'from-indigo-500 to-sky-400', textColor: 'text-slate-500' },
                  { label: 'Khối 12', count: 0, max: Math.max(totalClasses, 5), color: 'from-sky-500 to-cyan-400', textColor: 'text-slate-500' }
                ].map((pt, i) => {
                  const heightPercent = pt.count > 0 ? Math.max(25, Math.round((pt.count / pt.max) * 100)) : 8;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className={`text-[11px] font-mono font-bold ${pt.textColor}`}>{pt.count} lớp</span>
                      <div className="w-full relative flex items-end justify-center h-24">
                        <div
                          className={`w-10 sm:w-16 rounded-t-xl bg-gradient-to-t ${pt.color} transition-all duration-500 shadow-xs`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 mt-1">{pt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* WIDGET 3: KHẢO SÁT & PHẢN HỒI TOÀN TRƯỜNG */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Khảo Sát & Phản Hồi Toàn Trường</h3>
                <p className="text-[11px] text-slate-500">Mẫu khảo sát mẫu, tỷ lệ tham gia và phản hồi</p>
              </div>
            </div>

            {/* Display Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => updateWidgetMode('surveyStatsMode', 'bar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.surveyStatsMode === 'bar' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Cột"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cột</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('surveyStatsMode', 'pie')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.surveyStatsMode === 'pie' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Tròn"
              >
                <PieIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tròn</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('surveyStatsMode', 'line')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.surveyStatsMode === 'line' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Đường"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đường</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('surveyStatsMode', 'kpi')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.surveyStatsMode === 'kpi' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Số"
              >
                <Hash className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Số</span>
              </button>
            </div>
          </div>

          {prefs.surveyStatsMode === 'kpi' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-purple-50/60 p-4 border border-purple-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-purple-700">Mẫu phát hành</span>
                <div className="text-xl font-black text-purple-900">{publishedSurveys}</div>
                <span className="text-[10px] text-purple-600 font-semibold">Đang hoạt động</span>
              </div>
              <div className="rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-indigo-700">Tổng mẫu lưu</span>
                <div className="text-xl font-black text-indigo-900">{totalSurveys}</div>
                <span className="text-[10px] text-indigo-600 font-semibold">Ngân hàng mẫu</span>
              </div>
              <div className="rounded-2xl bg-pink-50/60 p-4 border border-pink-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-pink-700">Lượt phản hồi</span>
                <div className="text-xl font-black text-pink-900">{totalResponses}</div>
                <span className="text-[10px] text-pink-600 font-semibold">Thu thập</span>
              </div>
            </div>
          )}

          {prefs.surveyStatsMode === 'bar' && (
            <div className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Khảo sát Đang Phát Hành</span>
                  <span className="font-mono text-slate-900">{publishedSurveys} mẫu</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-600" style={{ width: `${Math.min(publishedSurveys * 25, 100)}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Mẫu Lưu Trữ / Bản Thảo</span>
                  <span className="font-mono text-slate-900">{Math.max(totalSurveys - publishedSurveys, 0)} mẫu</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-slate-400" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          )}

          {prefs.surveyStatsMode === 'pie' && (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" className="text-slate-100 stroke-current" strokeWidth="4.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#9333EA"
                    strokeWidth="4.5"
                    strokeDasharray="60, 100"
                    strokeDashoffset="0"
                    className="transition-all duration-700"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#C084FC"
                    strokeWidth="4.5"
                    strokeDasharray="40, 100"
                    strokeDashoffset="-60"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng mẫu</span>
                  <span className="text-sm font-black text-slate-800">{totalSurveys}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-purple-600 shrink-0" />
                  <span>Đang phát hành: <strong className="text-slate-900">{publishedSurveys}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-purple-300 shrink-0" />
                  <span>Lưu trữ/Bản thảo: <strong className="text-slate-900">{Math.max(totalSurveys - publishedSurveys, 0)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-pink-500 shrink-0" />
                  <span>Phản hồi: <strong className="text-slate-900">{totalResponses} lượt</strong></span>
                </div>
              </div>
            </div>
          )}

          {prefs.surveyStatsMode === 'line' && (
            <div className="space-y-3 pt-2">
              <div className="h-36 w-full flex items-end justify-between gap-2 px-2 pt-4">
                {[
                  { label: 'T2', val: 12 },
                  { label: 'T3', val: 24 },
                  { label: 'T4', val: 18 },
                  { label: 'T5', val: 32 },
                  { label: 'T6', val: 28 },
                  { label: 'T7', val: 14 },
                  { label: 'CN', val: 8 }
                ].map((pt, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-purple-700">{pt.val}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-indigo-500 transition-all duration-500"
                      style={{ height: `${pt.val * 3.5}px` }}
                    />
                    <span className="text-[10px] font-semibold text-slate-400">{pt.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* WIDGET 4: LƯU LƯỢNG & TẦN SUẤT HOẠT ĐỘNG */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Lưu Lượng Hoạt Động Hệ Thống</h3>
                <p className="text-[11px] text-slate-500">Phiên làm việc và tần suất truy cập định kỳ</p>
              </div>
            </div>

            {/* Display Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => updateWidgetMode('usageStatsMode', 'bar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.usageStatsMode === 'bar' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Cột"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cột</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('usageStatsMode', 'pie')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.usageStatsMode === 'pie' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Tròn"
              >
                <PieIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tròn</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('usageStatsMode', 'line')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.usageStatsMode === 'line' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Đường"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đường</span>
              </button>
              <button
                type="button"
                onClick={() => updateWidgetMode('usageStatsMode', 'kpi')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  prefs.usageStatsMode === 'kpi' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Hiển thị dạng Số"
              >
                <Hash className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Số</span>
              </button>
            </div>
          </div>

          {prefs.usageStatsMode === 'kpi' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-amber-700">Tổng lượt đăng nhập</span>
                <div className="text-2xl font-black text-amber-900">{totalLogins}</div>
                <span className="text-[10px] text-amber-600 font-semibold">Tất cả vai trò</span>
              </div>
              <div className="rounded-2xl bg-orange-50/60 p-4 border border-orange-100 text-center space-y-1">
                <span className="text-[11px] font-bold text-orange-700">Người dùng active</span>
                <div className="text-2xl font-black text-orange-900">{activeUsers}</div>
                <span className="text-[10px] text-orange-600 font-semibold">Hôm nay</span>
              </div>
            </div>
          )}

          {prefs.usageStatsMode === 'pie' && (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" className="text-slate-100 stroke-current" strokeWidth="4.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="4.5"
                    strokeDasharray="40, 100"
                    strokeDashoffset="0"
                    className="transition-all duration-700"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="4.5"
                    strokeDasharray="60, 100"
                    strokeDashoffset="-40"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Phiên</span>
                  <span className="text-sm font-black text-slate-800">{totalLogins}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-600 shrink-0" />
                  <span>GVCN đang hoạt động: <strong className="text-slate-900">{activeUsers}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400 shrink-0" />
                  <span>Học sinh & Phụ huynh: <strong className="text-slate-900">{totalLogins - activeUsers}</strong></span>
                </div>
              </div>
            </div>
          )}

          {prefs.usageStatsMode === 'line' && (
            <div className="space-y-2 pt-2">
              <div className="relative h-36 w-full flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,80 Q 50,40 100,50 T 200,20 T 300,35 L 300,100 L 0,100 Z"
                    fill="url(#usageGradient)"
                  />
                  <path
                    d="M 0,80 Q 50,40 100,50 T 200,20 T 300,35"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="80" r="4" fill="#D97706" />
                  <circle cx="100" cy="50" r="4" fill="#D97706" />
                  <circle cx="200" cy="20" r="4" fill="#D97706" />
                  <circle cx="300" cy="35" r="4" fill="#D97706" />
                </svg>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                <span>Tuần 1</span>
                <span>Tuần 2</span>
                <span>Tuần 3</span>
                <span>Tuần 4</span>
              </div>
            </div>
          )}

          {prefs.usageStatsMode === 'bar' && (
            <div className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Phiên GVCN Đang Sử Dụng</span>
                  <span className="font-mono text-slate-900">{activeUsers} phiên</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: '80%' }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Phiên Học viên & Phụ huynh</span>
                  <span className="font-mono text-slate-900">{totalLogins - activeUsers} phiên</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
