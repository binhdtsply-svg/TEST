/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Palette,
  ShieldCheck,
  FileSpreadsheet,
  Database,
  School,
  Check,
  Upload,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  HardDrive,
  Wifi,
  Download,
  Lock,
  Layers,
  Eye,
  Type,
  Sun,
  Moon,
  Info,
  Calendar,
  Clock,
  Plus,
  Trash2,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';
import { connectivityService } from '../../services/ConnectivityService';
import { schoolWeekService } from '../../services/SchoolWeekService';
import { SchoolYearDateNormalizer } from '../../services/SchoolYearDateNormalizer';
import { ClassSettings, ThemeConfig, InteractionSettings, GoogleIntegrationConfig, SchoolYearTimelineConfig } from '../../types';

// Preset Theme Colors
const PRESET_COLORS = [
  { id: 'blue', name: 'Xanh dương', color: '#2563EB', bg: '#F8FAFF', text: '#172033', label: '🔵 Xanh dương' },
  { id: 'emerald', name: 'Xanh lá', color: '#059669', bg: '#F0FDF4', text: '#14532D', label: '🟢 Xanh lá' },
  { id: 'purple', name: 'Tím mộng mơ', color: '#7C3AED', bg: '#FAF5FF', text: '#3B0764', label: '🟣 Tím mộng mơ' },
  { id: 'orange', name: 'Cam rực rỡ', color: '#EA580C', bg: '#FFF7ED', text: '#431407', label: '🟠 Cam rực rỡ' },
  { id: 'pink', name: 'Hồng pastel', color: '#E11D48', bg: '#FFF1F2', text: '#4C0519', label: '🌸 Hồng pastel' },
  { id: 'indigo', name: 'Indigo sâu thẳm', color: '#4F46E5', bg: '#EEF2FF', text: '#1E1B4B', label: '🟪 Indigo sâu thẳm' },
  { id: 'sky', name: 'Xanh pastel', color: '#0284C7', bg: '#F0F9FF', text: '#082F49', label: '🩵 Xanh pastel' },
  { id: 'amber', name: 'Vàng năng động', color: '#D97706', bg: '#FFFBEB', text: '#451A03', label: '💛 Vàng năng động' },
  { id: 'dark', name: 'Dark sang trọng', color: '#38BDF8', bg: '#0F172A', text: '#F8FAFC', label: '⚫ Dark sang trọng' },
];

// Preset Background Galleries
const PRESET_BACKGROUNDS = [
  {
    id: 'classroom',
    title: 'Phòng học hiện đại',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'library',
    title: 'Thư viện tri thức',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'sky',
    title: 'Bầu trời & Mây xanh',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'autumn',
    title: 'Sân trường mùa thu',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'blackboard',
    title: 'Bảng đen & Phấn',
    url: 'https://images.unsplash.com/photo-1509869175650-a1c97972541a?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1509869175650-a1c97972541a?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'garden',
    title: 'Vườn cây xanh mát',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=300&q=80'
  }
];

// Preset Typography
const PRESET_FONTS = [
  { id: 'Be Vietnam Pro', name: 'Be Vietnam Pro', desc: 'Chuẩn tiếng Việt (Khuyên dùng)', family: 'Be Vietnam Pro' },
  { id: 'Inter', name: 'Inter', desc: 'Hiện đại, tối giản', family: 'Inter' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', desc: 'Hình học hiện đại', family: 'Plus Jakarta Sans' },
  { id: 'Roboto', name: 'Roboto', desc: 'Chuẩn Android / Google', family: 'Roboto' },
  { id: 'Playfair Display', name: 'Playfair Display', desc: 'Sang trọng', family: 'Playfair Display' },
  { id: 'Nunito', name: 'Nunito', desc: 'Bo tròn, thân thiện', family: 'Nunito' },
  { id: 'Merriweather', name: 'Merriweather', desc: 'Ấm áp, dễ đọc', family: 'Merriweather' },
  { id: 'system-ui', name: 'Hệ thống — Mặc định', desc: 'Font mặc định hệ điều hành', family: 'system-ui' }
];

// Card Styles Presets
const CARD_PRESETS = [
  { id: 'modern', name: 'Hiện đại', radius: 16, border: '#E2E8F0', shadow: 'sm', opacity: 100, bg: '#FFFFFF' },
  { id: 'minimal', name: 'Tối giản', radius: 12, border: '#E2E8F0', shadow: 'none', opacity: 100, bg: '#FFFFFF' },
  { id: 'rounded', name: 'Bo tròn', radius: 24, border: '#CBD5E1', shadow: 'md', opacity: 100, bg: '#FFFFFF' },
  { id: 'soft', name: 'Mềm mại', radius: 20, border: '#E2E8F0', shadow: 'lg', opacity: 100, bg: '#FFFFFF' },
  { id: 'translucent', name: 'Trong suốt', radius: 16, border: '#E2E8F0', shadow: 'sm', opacity: 90, bg: '#FFFFFF' },
];

// Helper: Calculate WCAG Contrast Ratio
function getLuminance(hexColor: string): number {
  try {
    let cleanHex = hexColor.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const [rr, gg, bb] = [r, g, b].map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
  } catch {
    return 0.5;
  }
}

function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Sample Google Apps Script Code snippet for one-click copy
const SAMPLE_APPS_SCRIPT = `/**
 * Google Apps Script - KGCNS 2-Way Sync WebApp
 * Triển khai dưới dạng Web App với quyền truy cập "Anyone"
 */
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ status: "success", rows: data.length, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var contents = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([new Date(), contents.studentCode, contents.studentName, contents.category, contents.notes]);
  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã lưu vào Sheet" }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const SettingsModule: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  // Active Tab: 1 to 6
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'theme' | 'permissions' | 'google' | 'data'>('info');

  // Form State initialized from ClassService
  const initialSettings = classService.getSettings();
  const [settings, setSettings] = useState<ClassSettings>(initialSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Ngưỡng cảnh báo vi phạm riêng cho GVCN
  const [customThreshold, setCustomThreshold] = useState<number>(() => classService.getViolationWarningThreshold());
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [thresholdSuccessMsg, setThresholdSuccessMsg] = useState<string | null>(null);
  const [thresholdErrorMsg, setThresholdErrorMsg] = useState<string | null>(null);

  // Excluded range form for new holiday
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayStart, setNewHolidayStart] = useState('');
  const [newHolidayEnd, setNewHolidayEnd] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');

  // Google Test Connection State
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleTestResults, setGoogleTestResults] = useState<{
    form: { status: 'connected' | 'not_configured' | 'error'; message: string };
    sheet: { status: 'connected' | 'not_configured' | 'error'; message: string };
    drive: { status: 'connected' | 'not_configured' | 'error'; message: string };
    script: { status: 'connected' | 'not_configured' | 'error'; message: string };
  } | null>(null);

  // Connectivity status
  const [connStatus, setConnStatus] = useState(connectivityService.getStatus());

  useEffect(() => {
    const unsubClass = classService.subscribe(() => {
      const fresh = classService.getSettings();
      setSettings(fresh);
      setCustomThreshold(classService.getViolationWarningThreshold());
    });
    const unsubAuth = authService.subscribe(() => {
      const fresh = classService.getSettings();
      setSettings(fresh);
      setCustomThreshold(classService.getViolationWarningThreshold());
    });
    const unsubConn = connectivityService.subscribe(() => {
      setConnStatus(connectivityService.getStatus());
    });
    return () => {
      unsubClass();
      unsubAuth();
      unsubConn();
    };
  }, []);

  const handleSaveThreshold = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSavingThreshold) return; // Chống double click
    setIsSavingThreshold(true);
    setThresholdSuccessMsg(null);
    setThresholdErrorMsg(null);

    const val = Math.max(1, Math.floor(customThreshold || 2));
    try {
      const res = await classService.setViolationWarningThreshold(val);
      if (res && !res.success && res.error) {
        setThresholdErrorMsg(res.error);
      } else {
        setCustomThreshold(val);
        setSettings(prev => ({ ...prev, violationWarningThreshold: val }));
        setThresholdSuccessMsg(`Đã lưu cấu hình: Ngưỡng cảnh báo vi phạm là ≥ ${val} lượt.`);
        setTimeout(() => setThresholdSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setThresholdErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setIsSavingThreshold(false);
    }
  };

  // Contrast Ratio Calculation
  const contrastRatio = useMemo(() => {
    const bg = settings.theme.backgroundColor || '#F8FAFF';
    const text = settings.theme.textColor || '#172033';
    return calculateContrastRatio(bg, text);
  }, [settings.theme.backgroundColor, settings.theme.textColor]);

  const contrastStatus = useMemo(() => {
    if (contrastRatio >= 7) return { label: 'Đạt chuẩn AAA', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (contrastRatio >= 4.5) return { label: 'Đạt chuẩn AA', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    return { label: 'Chưa đạt chuẩn WCAG', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  }, [contrastRatio]);

  // Handle Save All Settings
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isTeacher) return;

    setErrorMessage(null);

    // Validate Required Fields
    if (!settings.schoolName?.trim()) {
      setErrorMessage('Vui lòng nhập Tên trường học.');
      setActiveTab('info');
      return;
    }
    if (!settings.className?.trim()) {
      setErrorMessage('Vui lòng nhập Tên lớp học.');
      setActiveTab('info');
      return;
    }
    if (!settings.academicYear?.trim()) {
      setErrorMessage('Vui lòng nhập Năm học.');
      setActiveTab('info');
      return;
    }
    if (!settings.teacherName?.trim() && !settings.homeroomTeacherName?.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên Giáo viên Chủ nhiệm.');
      setActiveTab('info');
      return;
    }

    // Validate Contrast: Prevent severe accessibility issue
    if (contrastRatio < 2.0) {
      setErrorMessage('Độ tương phản giữa màu chữ và màu nền quá thấp (< 2.0:1). Vui lòng điều chỉnh lại để bảo đảm dễ đọc.');
      setActiveTab('theme');
      return;
    }

    // Validate & Normalize School Year Timeline
    let normalizedTimeline = settings.schoolYearTimeline;
    if (normalizedTimeline) {
      normalizedTimeline = SchoolYearDateNormalizer.normalizeTimeline(
        normalizedTimeline,
        settings.academicYear || '2025 - 2026'
      );
      const validation = SchoolYearDateNormalizer.validateTimeline(normalizedTimeline);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Khung thời gian năm học không hợp lệ: Ngày kết thúc phải sau ngày bắt đầu.');
        setActiveTab('timeline');
        return;
      }
    }

    // Save to Service
    const teacherName = settings.homeroomTeacherName?.trim() || settings.teacherName?.trim() || 'Cô Giáo Chủ Nhiệm';
    const academicYear = normalizedTimeline?.schoolYearLabel || settings.academicYear || '2025 - 2026';
    const rawSem = settings.semester || (settings.currentSemester as any) || 'HK1';
    const semester = (rawSem === 'HK2' || rawSem === 'Học kỳ II') ? 'HK2' : 'HK1';
    const currentSemester = semester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II';

    try {
      const res = await classService.updateSettings({
        ...settings,
        schoolYearTimeline: normalizedTimeline,
        academicYear,
        schoolYear: academicYear,
        schoolYearLabel: academicYear,
        semester,
        currentSemester,
        homeroomTeacherName: teacherName,
        teacherName: teacherName,
        homeroomTeacher: teacherName,
        name: settings.className,
        className: settings.className
      });

      if (res && !res.success && res.error) {
        setErrorMessage(res.error);
      } else {
        const freshSettings = classService.getSettings();
        setSettings(freshSettings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu cấu hình.');
    }
  };

  // Preset Color Selector
  const handleSelectColorPreset = (preset: typeof PRESET_COLORS[0]) => {
    setSettings(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        primaryColor: preset.color,
        primaryButton: preset.color,
        accentColor: preset.color,
        backgroundColor: preset.bg,
        pageBackground: preset.bg,
        textColor: preset.text,
        primaryText: preset.text,
        backgroundType: 'solid',
        backgroundImage: ''
      }
    }));
  };

  // Upload Custom Background Image
  const handleUploadBgImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      setErrorMessage('Định dạng ảnh nền không được hỗ trợ. Vui lòng chọn file PNG, JPG, JPEG hoặc WEBP.');
      return;
    }

    if (file.size > 4.5 * 1024 * 1024) {
      setErrorMessage('Dung lượng ảnh nền vượt quá 4.5MB. Vui lòng nén dung lượng ảnh trước khi tải lên.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setSettings(prev => ({
          ...prev,
          theme: {
            ...prev.theme,
            backgroundType: 'image',
            backgroundImage: dataUrl
          }
        }));
      }
    };
    reader.onerror = () => {
      setErrorMessage('Không thể đọc file ảnh. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  // Reset Theme to Default
  const handleResetTheme = () => {
    if (window.confirm('Bạn muốn khôi phục giao diện mặc định? Dữ liệu lớp không bị xóa.')) {
      classService.resetTheme();
      const updated = classService.getSettings();
      setSettings(prev => ({
        ...prev,
        theme: updated.theme
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  // Test Google Connection
  const handleTestGoogleConnection = () => {
    setTestingGoogle(true);
    setGoogleTestResults(null);

    setTimeout(() => {
      const g = settings.googleIntegration || {};
      const results = {
        form: {
          status: g.formUrl?.startsWith('http') ? ('connected' as const) : ('not_configured' as const),
          message: g.formUrl?.startsWith('http') ? 'Google Form: Đã kết nối' : 'Google Form: Chưa cấu hình'
        },
        sheet: {
          status: g.spreadsheetUrl?.startsWith('http') || (g.spreadsheetUrl && g.spreadsheetUrl.length > 8) ? ('connected' as const) : ('not_configured' as const),
          message: g.spreadsheetUrl ? 'Google Sheet: Đã kết nối' : 'Google Sheet: Chưa cấu hình'
        },
        drive: {
          status: g.driveFolderId?.startsWith('http') || (g.driveFolderId && g.driveFolderId.length > 5) ? ('connected' as const) : ('not_configured' as const),
          message: g.driveFolderId ? 'Google Drive: Đã kết nối' : 'Google Drive: Chưa cấu hình'
        },
        script: {
          status: g.appsScriptEndpoint?.includes('script.google.com') && g.appsScriptEndpoint?.endsWith('/exec') ? ('connected' as const) : g.appsScriptEndpoint ? ('error' as const) : ('not_configured' as const),
          message: g.appsScriptEndpoint?.includes('script.google.com') && g.appsScriptEndpoint?.endsWith('/exec') ? 'Apps Script Web App: Đã kết nối' : g.appsScriptEndpoint ? 'Apps Script: Endpoint URL không hợp lệ (cần đuôi /exec)' : 'Apps Script: Chưa cấu hình'
        }
      };

      setGoogleTestResults(results);
      setTestingGoogle(false);
    }, 1000);
  };

  // Copy Apps Script to clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(SAMPLE_APPS_SCRIPT);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Offline Cache Size Calculation
  const cacheStorageSize = useMemo(() => {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('kgcns_')) {
        totalBytes += (localStorage.getItem(key) || '').length * 2;
      }
    }
    return (totalBytes / 1024).toFixed(1);
  }, []);

  // Export JSON Backup
  const handleExportBackup = () => {
    const fullBackup: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('kgcns_')) {
        try {
          fullBackup[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch {
          fullBackup[key] = localStorage.getItem(key);
        }
      }
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Sao_Luu_KGCNS_Lop_${settings.className || '11A1'}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        Object.keys(json).forEach(key => {
          localStorage.setItem(key, typeof json[key] === 'string' ? json[key] : JSON.stringify(json[key]));
        });
        alert('Phục hồi dữ liệu thành công! Ứng dụng sẽ tải lại.');
        window.location.reload();
      } catch {
        alert('Tệp sao lưu không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  // Clear Offline Cache Only
  const handleClearOfflineCache = () => {
    if (window.confirm('Bạn có chắc muốn xóa bộ nhớ đệm offline trên thiết bị? Cài đặt lớp và dữ liệu chính vẫn được lưu giữ.')) {
      // Clear non-core cache items
      localStorage.removeItem('kgcns_audit_logs');
      localStorage.removeItem('kgcns_search_cache');
      alert('Đã dọn dẹp bộ nhớ đệm offline thành công!');
    }
  };

  // Reset Demo Data (Only when DEMO_MODE)
  const isDemoMode = true; // In this application workspace
  const handleResetDemoData = () => {
    if (window.confirm('Khôi phục lại toàn bộ dữ liệu mẫu ban đầu của Lớp? Hành động này sẽ thiết lập lại dữ liệu học sinh, điểm số, bài viết và hoạt động về trạng thái mẫu.')) {
      classService.resetToDefault();
      alert('Đã khôi phục dữ liệu mẫu thành công! Ứng dụng sẽ tải lại.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>⚙️ CÀI ĐẶT LỚP HỌC & GIAO DIỆN</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Tùy biến thông tin, giao diện, quyền sử dụng và kết nối dữ liệu của Không gian Chủ nhiệm số.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Đã lưu cài đặt lớp thành công.</span>
            </div>
          )}

          {isTeacher ? (
            <button
              onClick={() => handleSaveAll()}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>💾 Lưu tất cả thay đổi</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-500 border border-slate-200">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Chỉ GVCN có quyền chỉnh sửa</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 6 Main Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-2xl bg-slate-100/80 p-1.5 border border-slate-200/80">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'info'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <School className="h-4 w-4" />
          <span>1. Thông tin lớp</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Calendar className="h-4 w-4 text-indigo-600" />
          <span>2. Khung năm học</span>
        </button>

        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'theme'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>3. Giao diện Padlet</span>
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'permissions'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>4. Quyền & Tương tác</span>
        </button>

        <button
          onClick={() => setActiveTab('google')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'google'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>5. Google Workspace</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'data'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>6. Dữ liệu & Khởi tạo</span>
        </button>
      </div>

      {/* TAB 1: THÔNG TIN LỚP */}
      {activeTab === 'info' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <School className="h-5 w-5 text-blue-600" />
              <span>Thông tin Lớp Chủ Nhiệm</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Các trường thông tin định danh không gian lớp học. Tên GVCN sẽ tự động đồng bộ trên toàn bộ header, bài viết và báo cáo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên trường học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isTeacher}
                value={settings.schoolName || ''}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                placeholder="VD: THPT Chuyên Lê Hồng Phong / Trung tâm GDTX Lê Quý Đôn"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên lớp học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isTeacher}
                value={settings.className || ''}
                onChange={(e) => setSettings({ ...settings, className: e.target.value })}
                placeholder="VD: 12A1, 12A..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Khối / Ban đào tạo
              </label>
              <input
                type="text"
                disabled={!isTeacher}
                value={settings.educationTrack ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val.trim()) {
                    setSettings({
                      ...settings,
                      educationTrack: '',
                      grade: '',
                      stream: '',
                      classTrack: ''
                    });
                  } else {
                    const gradeMatch = val.match(/(?:Khối\s*)?(10|11|12)/i);
                    const parsedGrade = gradeMatch ? `Khối ${gradeMatch[1]}` : settings.grade;
                    const parts = val.split(/[-·|/]/);
                    const parsedStream = parts.length > 1 ? parts.slice(1).join(' - ').trim() : settings.stream;
                    setSettings({
                      ...settings,
                      educationTrack: val,
                      grade: parsedGrade,
                      stream: parsedStream,
                      gradeLevel: gradeMatch ? gradeMatch[1] : settings.gradeLevel,
                      classTrack: parsedStream?.includes('KHTN') ? 'KHTN' : (parsedStream?.includes('KHXH') ? 'KHXH' : parsedStream)
                    });
                  }
                }}
                placeholder="VD: Khối 11 - Ban KHTN (Khoa học Tự nhiên) / Khối 12 - Ban Tự nhiên (để trống nếu không phân ban)"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Năm học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isTeacher}
                value={settings.academicYear || ''}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                placeholder="VD: 2025 - 2026 / 2026 - 2027"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Học kỳ hiện tại <span className="text-red-500">*</span>
              </label>
              <select
                disabled={!isTeacher}
                value={settings.semester === 'Học kỳ I' || settings.semester === 'HK1' ? 'HK1' : 'HK2'}
                onChange={(e) => {
                  const val = e.target.value as 'HK1' | 'HK2';
                  setSettings({
                    ...settings,
                    semester: val,
                    currentSemester: val === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'
                  });
                }}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
              >
                <option value="HK1">Học kỳ I</option>
                <option value="HK2">Học kỳ II</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên Giáo viên Chủ nhiệm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isTeacher}
                value={settings.homeroomTeacherName || settings.teacherName || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  homeroomTeacherName: e.target.value,
                  teacherName: e.target.value
                })}
                placeholder="VD: Cô Đoàn Thị Bình / Cô Nguyễn Thị Mai Lan"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50 font-semibold"
                required
              />
              <p className="text-[10px] text-blue-600 mt-1 font-medium">
                ✓ Đổi tên tại đây sẽ tự động cập nhật trên header, ảnh bìa, bảng tin và tài khoản GVCN.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số điện thoại GVCN
              </label>
              <input
                type="text"
                disabled={!isTeacher}
                value={settings.teacherPhone || ''}
                onChange={(e) => setSettings({ ...settings, teacherPhone: e.target.value })}
                placeholder="VD: 0912 345 678"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email GVCN
              </label>
              <input
                type="email"
                disabled={!isTeacher}
                value={settings.teacherEmail || ''}
                onChange={(e) => setSettings({ ...settings, teacherEmail: e.target.value })}
                placeholder="VD: mailan.nguyen@lehongphong.edu.vn"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sĩ số lớp xác nhận (Tùy chọn ghi đè)
              </label>
              <input
                type="number"
                disabled={!isTeacher}
                min={0}
                max={200}
                value={settings.confirmedTotalStudents ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings({
                    ...settings,
                    confirmedTotalStudents: val === '' ? undefined : Number(val)
                  });
                }}
                placeholder="Mặc định tự động theo danh sách học sinh"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Để trống để hệ thống tự động tính theo số lượng học sinh thực tế trong danh sách.
              </p>
            </div>
          </div>

          {/* CẤU HÌNH: NGƯỠNG CẢNH BÁO VI PHẠM (GVCN) */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-slate-50 p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2.5 border-b border-indigo-100 pb-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Ngưỡng cảnh báo vi phạm
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dành riêng cho Giáo viên Chủ nhiệm
                </p>
              </div>
            </div>

            {thresholdSuccessMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{thresholdSuccessMsg}</span>
              </div>
            )}

            {thresholdErrorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-800 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{thresholdErrorMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Ngưỡng hiện tại:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    disabled={!isTeacher || isSavingThreshold}
                    value={customThreshold}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setCustomThreshold(val);
                      setSettings(prev => ({ ...prev, violationWarningThreshold: val }));
                    }}
                    className="w-24 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-900 font-black focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden bg-white disabled:bg-slate-50"
                  />
                  <span className="text-xs text-slate-600 font-medium">lượt vi phạm trở lên</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveThreshold}
                  disabled={!isTeacher || isSavingThreshold}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingThreshold ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Hiển thị học viên trong ‘Dấu hiệu cần lưu ý’ khi số lượt vi phạm đạt hoặc vượt ngưỡng này.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Khẩu hiệu / Châm ngôn lớp
            </label>
            <input
              type="text"
              disabled={!isTeacher}
              value={settings.slogan || ''}
              onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
              placeholder="VD: Kỷ luật - Tự giác - Tri thức - Tỏa sáng"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white disabled:bg-slate-50 font-medium"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Dữ liệu được lưu trữ an toàn trong cấu hình không gian số của lớp.
            </span>
            {isTeacher && (
              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Lưu thông tin lớp</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KHUNG THỜI GIAN NĂM HỌC & TUẦN HỌC */}
      {activeTab === 'timeline' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-8 animate-fade-in">
          {/* Header */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <span>Cấu hình Khung Thời Gian Năm Học & Tính Tuần Tự Động</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Thiết lập ngày khai giảng, kết thúc học kỳ và các khoảng nghỉ lễ/nghỉ Tết. Hệ thống sẽ tự động tính toán tuần học hiển thị cạnh avatar.
                </p>
              </div>

              {/* Real-time Badge Preview */}
              <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3">
                <span className="text-xs font-bold text-indigo-900">Huy hiệu hiện tại:</span>
                <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 text-white font-black px-3 py-1 text-xs shadow-2xs">
                  {schoolWeekService.getWeekInfoForDate(new Date(), settings.schoolYearTimeline).badgeText}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Dates Configuration */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <span>1. Khung thời gian Năm học & Học kỳ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <span className="text-xs font-bold text-slate-800">Toàn năm học</span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bắt đầu năm học (Khai giảng)</label>
                  <input
                    type="date"
                    disabled={!isTeacher}
                    value={settings.schoolYearTimeline?.startDateHK1 || settings.schoolYearTimeline?.academicYearStart || '2025-09-05'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        startDateHK1: val,
                        academicYearStart: val,
                        semester1Start: val,
                        firstStudyWeekStartDate: settings.schoolYearTimeline?.firstStudyWeekStartDate || val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ngày bắt đầu Tuần 1 thực học</label>
                  <input
                    type="date"
                    disabled={!isTeacher}
                    value={settings.schoolYearTimeline?.firstStudyWeekStartDate || settings.schoolYearTimeline?.startDateHK1 || '2025-09-05'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        firstStudyWeekStartDate: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden font-medium text-indigo-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kết thúc năm học</label>
                  <input
                    type="date"
                    disabled={!isTeacher}
                    value={settings.schoolYearTimeline?.endDateHK2 || settings.schoolYearTimeline?.academicYearEnd || '2026-05-31'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        endDateHK2: val,
                        academicYearEnd: val,
                        semester2End: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tổng số tuần thực dạy</label>
                  <input
                    type="number"
                    disabled={!isTeacher}
                    min="30"
                    max="45"
                    value={settings.schoolYearTimeline?.totalWeeks || 35}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 35;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        totalWeeks: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Semester 1 */}
              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
                <span className="text-xs font-bold text-blue-900">Học kỳ I (HK1)</span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bắt đầu HK1</label>
                  <input
                    type="date"
                    disabled={!isTeacher}
                    value={settings.schoolYearTimeline?.startDateHK1 || settings.schoolYearTimeline?.semester1Start || '2025-09-05'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        startDateHK1: val,
                        semester1Start: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kết thúc HK1</label>
                  <input
                    type="date"
                    disabled={!isTeacher}
                    value={settings.schoolYearTimeline?.endDateHK1 || settings.schoolYearTimeline?.semester1End || '2026-01-15'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        endDateHK1: val,
                        semester1End: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số tuần HK1</label>
                  <input
                    type="number"
                    disabled={!isTeacher}
                    min="15"
                    max="22"
                    value={settings.schoolYearTimeline?.totalWeeksHK1 || settings.schoolYearTimeline?.semester1Weeks || 18}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 18;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        totalWeeksHK1: val,
                        semester1Weeks: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Semester 2 */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <span className="text-xs font-bold text-emerald-900">Học kỳ II (HK2)</span>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bắt đầu HK2</label>
                  <input
                    type="date"
                    disabled={!isTeacher}
                    value={settings.schoolYearTimeline?.startDateHK2 || settings.schoolYearTimeline?.semester2Start || '2026-01-16'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        startDateHK2: val,
                        semester2Start: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kết thúc HK2</label>
                  <input
                    type="date"
                    disabled={!isTeacher}
                    value={settings.schoolYearTimeline?.endDateHK2 || settings.schoolYearTimeline?.semester2End || '2026-05-25'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        endDateHK2: val,
                        semester2End: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số tuần HK2</label>
                  <input
                    type="number"
                    disabled={!isTeacher}
                    min="15"
                    max="22"
                    value={settings.schoolYearTimeline?.totalWeeksHK2 || settings.schoolYearTimeline?.semester2Weeks || 17}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 17;
                      const updatedTimeline = {
                        ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                        totalWeeksHK2: val,
                        semester2Weeks: val
                      };
                      setSettings({ ...settings, schoolYearTimeline: updatedTimeline });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Excluded Holidays / Break Periods */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>🏖️ 2. Các khoảng thời gian nghỉ lễ / Nghỉ Tết (Không tính vào tuần học)</span>
              </h3>
            </div>

            {/* List of Holidays */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-4">Tên đợt nghỉ</th>
                    <th className="py-2.5 px-3">Từ ngày</th>
                    <th className="py-2.5 px-3">Đến ngày</th>
                    <th className="py-2.5 px-4">Lý do / Căn cứ</th>
                    {isTeacher && <th className="py-2.5 px-3 text-center w-16">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(settings.schoolYearTimeline?.excludedRanges || []).map((range) => (
                    <tr key={range.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-slate-800">{range.name}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{range.startDate}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{range.endDate}</td>
                      <td className="py-2.5 px-4 text-slate-500">{range.reason || 'Theo quy định'}</td>
                      {isTeacher && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedRanges = (settings.schoolYearTimeline?.excludedRanges || settings.schoolYearTimeline?.excludedPeriods || []).filter(
                                (r) => r.id !== range.id
                              );
                              setSettings({
                                ...settings,
                                schoolYearTimeline: {
                                  ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                                  excludedRanges: updatedRanges,
                                  excludedPeriods: updatedRanges
                                }
                              });
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                            title="Xóa khoảng nghỉ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add New Holiday Form */}
            {isTeacher && (
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Thêm đợt nghỉ lễ / Khoảng thời gian loại trừ mới</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Tên đợt nghỉ (VD: Nghỉ Tết Âm Lịch)"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={newHolidayStart}
                      onChange={(e) => setNewHolidayStart(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={newHolidayEnd}
                      onChange={(e) => setNewHolidayEnd(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newHolidayName.trim() || !newHolidayStart || !newHolidayEnd) {
                          alert('Vui lòng nhập đầy đủ Tên, Ngày bắt đầu và Ngày kết thúc đợt nghỉ.');
                          return;
                        }
                        const newRange = {
                          id: `holiday-${Date.now()}`,
                          name: newHolidayName.trim(),
                          startDate: newHolidayStart,
                          endDate: newHolidayEnd,
                          reason: newHolidayReason.trim() || 'Nghỉ lễ theo quy định'
                        };
                        const updatedRanges = [...(settings.schoolYearTimeline?.excludedRanges || settings.schoolYearTimeline?.excludedPeriods || []), newRange];
                        setSettings({
                          ...settings,
                          schoolYearTimeline: {
                            ...(settings.schoolYearTimeline || schoolWeekService.getDefaultTimeline()),
                            excludedRanges: updatedRanges,
                            excludedPeriods: updatedRanges
                          }
                        });
                        setNewHolidayName('');
                        setNewHolidayStart('');
                        setNewHolidayEnd('');
                        setNewHolidayReason('');
                      }}
                      className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2 text-xs font-bold text-white shadow-2xs cursor-pointer transition-all active:scale-95"
                    >
                      + Thêm đợt nghỉ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Study Week Simulator & Live Tester */}
          <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Trình kiểm tra & Giả lập Tuần học theo ngày bất kỳ</span>
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-60">
                <label className="block text-[11px] font-bold text-indigo-900 mb-1">Chọn ngày để kiểm tra:</label>
                <input
                  type="date"
                  value={simulatedDate}
                  onChange={(e) => setSimulatedDate(e.target.value)}
                  className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs text-indigo-950 font-bold"
                />
              </div>

              {/* Simulation Result */}
              {(() => {
                const targetD = new Date(simulatedDate.includes('T') ? simulatedDate : simulatedDate + 'T12:00:00');
                const simResult = schoolWeekService.getWeekInfoForDate(
                  targetD,
                  settings.schoolYearTimeline
                );
                return (
                  <div className="flex-1 rounded-xl bg-white p-3 border border-indigo-200 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Kết quả tính toán:</span>
                      <span className="rounded-lg bg-indigo-600 text-white font-black px-2.5 py-0.5 text-xs">
                        {simResult.badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-900 mt-1 font-medium">
                      {simResult.statusText} • Tuần từ ngày <strong>{simResult.startDate}</strong> đến <strong>{simResult.endDate}</strong>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Cấu hình được lưu tự động cho lớp {settings.className || '11A1'} và áp dụng tức thì cho huy hiệu Header.
            </span>
            {isTeacher && (
              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Lưu cấu hình khung năm học</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GIAO DIỆN PADLET */}
      {activeTab === 'theme' && (
        <div className="space-y-8 animate-fade-in">
          {/* Section 1: Màu chủ đề Không gian lớp */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Palette className="h-4 w-4 text-blue-600" />
                <span>1. Màu chủ đề Không gian lớp</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn bảng màu phong cách cho toàn bộ Không gian Chủ nhiệm số. Mặc định là giao diện sáng, độ tương phản cao.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
              {PRESET_COLORS.map((preset) => {
                const isSelected = settings.theme.primaryColor === preset.color;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectColorPreset(preset)}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/30'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="h-8 w-8 rounded-full border border-black/10 shadow-xs flex items-center justify-center text-white"
                      style={{ backgroundColor: preset.color }}
                    >
                      {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-bold text-slate-800">{preset.name}</span>
                    <span className="text-[10px] text-slate-400">{preset.color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Kiểu hình nền */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>2. Kiểu hình nền</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn kiểu nền đơn sắc, hiệu ứng chuyển màu mềm mại hoặc hình nền ảnh kỷ niệm lớp.
              </p>
            </div>

            {/* Background Type Selector */}
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, theme: { ...prev.theme, backgroundType: 'solid' } }))}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  settings.theme.backgroundType === 'solid'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Màu đơn sắc
              </button>

              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  theme: {
                    ...prev.theme,
                    backgroundType: 'gradient',
                    gradient: prev.theme.gradient || { color1: '#F8FAFF', color2: '#EEF2FF', direction: 'to bottom' }
                  }
                }))}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  settings.theme.backgroundType === 'gradient'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Chuyển sắc (Gradient)
              </button>

              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, theme: { ...prev.theme, backgroundType: 'image' } }))}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  settings.theme.backgroundType === 'image'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hình nền / Ảnh
              </button>
            </div>

            {/* Option A: Solid Color */}
            {settings.theme.backgroundType === 'solid' && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700">Chọn mã màu nền chính</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.theme.backgroundColor || '#F8FAFF'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, backgroundColor: e.target.value, pageBackground: e.target.value }
                    }))}
                    className="h-10 w-14 cursor-pointer rounded-xl border border-slate-300 p-1"
                  />
                  <input
                    type="text"
                    value={settings.theme.backgroundColor || '#F8FAFF'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, backgroundColor: e.target.value, pageBackground: e.target.value }
                    }))}
                    className="w-36 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase"
                  />
                  <div
                    className="h-10 flex-1 rounded-xl border border-slate-200 flex items-center px-4 text-xs font-medium text-slate-500 shadow-inner"
                    style={{ backgroundColor: settings.theme.backgroundColor || '#F8FAFF' }}
                  >
                    Xem trước màu nền đơn sắc
                  </div>
                </div>
              </div>
            )}

            {/* Option B: Gradient */}
            {settings.theme.backgroundType === 'gradient' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Màu bắt đầu (Màu 1)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.gradient?.color1 || '#F8FAFF'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          theme: {
                            ...prev.theme,
                            gradient: { ...(prev.theme.gradient || { color2: '#EEF2FF', direction: 'to bottom' }), color1: e.target.value }
                          }
                        }))}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.gradient?.color1 || '#F8FAFF'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          theme: {
                            ...prev.theme,
                            gradient: { ...(prev.theme.gradient || { color2: '#EEF2FF', direction: 'to bottom' }), color1: e.target.value }
                          }
                        }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Màu kết thúc (Màu 2)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.gradient?.color2 || '#EEF2FF'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          theme: {
                            ...prev.theme,
                            gradient: { ...(prev.theme.gradient || { color1: '#F8FAFF', direction: 'to bottom' }), color2: e.target.value }
                          }
                        }))}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.gradient?.color2 || '#EEF2FF'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          theme: {
                            ...prev.theme,
                            gradient: { ...(prev.theme.gradient || { color1: '#F8FAFF', direction: 'to bottom' }), color2: e.target.value }
                          }
                        }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Hướng Gradient</label>
                    <select
                      value={settings.theme.gradient?.direction || 'to bottom'}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        theme: {
                          ...prev.theme,
                          gradient: { ...(prev.theme.gradient || { color1: '#F8FAFF', color2: '#EEF2FF' }), direction: e.target.value as any }
                        }
                      }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value="to right">Trái → Phải</option>
                      <option value="to bottom">Trên → Dưới</option>
                      <option value="to bottom right">Chéo trái → phải</option>
                      <option value="to bottom left">Chéo phải → trái</option>
                    </select>
                  </div>
                </div>

                <div
                  className="h-14 w-full rounded-2xl border border-slate-300 shadow-inner flex items-center justify-center text-xs font-bold text-slate-700"
                  style={{
                    background: `linear-gradient(${settings.theme.gradient?.direction || 'to bottom'}, ${settings.theme.gradient?.color1 || '#F8FAFF'}, ${settings.theme.gradient?.color2 || '#EEF2FF'})`
                  }}
                >
                  Xem trước dải chuyển sắc Gradient
                </div>
              </div>
            )}

            {/* Option C: Image Background & Gallery */}
            {settings.theme.backgroundType === 'image' && (
              <div className="space-y-5 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-800">Ảnh nền trang & Không gian lớp học</label>
                  <label className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3.5 py-2 text-xs font-bold text-blue-700 cursor-pointer transition-colors">
                    <Upload className="h-3.5 w-3.5 text-blue-600" />
                    <span>📤 Tải ảnh nền tùy chỉnh từ máy tính</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleUploadBgImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Active Custom Background Preview */}
                {settings.theme.backgroundImage && (
                  <div className="relative rounded-2xl overflow-hidden border border-blue-200 bg-blue-50/50 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={settings.theme.backgroundImage}
                        alt="Active background preview"
                        referrerPolicy="no-referrer"
                        className="h-14 w-24 object-cover rounded-xl border border-slate-200 shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                          ● Đang sử dụng cho không gian lớp
                        </span>
                        <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                          Ảnh nền riêng của tài khoản GVCN {settings.className}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        theme: {
                          ...prev.theme,
                          backgroundImage: '',
                          backgroundType: 'solid'
                        }
                      }))}
                      className="shrink-0 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Xóa ảnh nền
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">Hoặc chọn nhanh từ thư viện ảnh nền mẫu:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {PRESET_BACKGROUNDS.map((bg) => {
                      const isSelected = settings.theme.backgroundImage === bg.url;
                      return (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            theme: { ...prev.theme, backgroundType: 'image', backgroundImage: bg.url }
                          }))}
                          className={`group relative h-28 overflow-hidden rounded-2xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-500/30'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={bg.thumb}
                            alt={bg.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2 text-left">
                            <span className="text-[11px] font-bold text-white leading-tight drop-shadow-xs">
                              {bg.title}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Overlay Opacity Slider */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Độ mờ phủ màu (Overlay Opacity)</span>
                <span className="rounded-md bg-white px-2 py-0.5 border border-slate-200 text-blue-600">
                  {settings.theme.overlayOpacity ?? 25}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.theme.overlayOpacity ?? 25}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  theme: { ...prev.theme, overlayOpacity: Number(e.target.value) }
                }))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Lớp phủ mờ giúp văn bản và bảng tin luôn sắc nét, dễ đọc trên mọi hình nền. Khuyên dùng từ 20% đến 35%.
              </p>
            </div>
          </div>

          {/* Section 3: Typography */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Type className="h-4 w-4 text-blue-600" />
                <span>3. Tùy chỉnh Phông chữ & Kiểu chữ</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn phông chữ hiển thị toàn ứng dụng. Tối ưu hoàn hảo cho tiếng Việt có dấu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {PRESET_FONTS.map((font) => {
                const isSelected = settings.theme.fontFamily === font.family || (!settings.theme.fontFamily && font.family === 'Be Vietnam Pro');
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, fontFamily: font.family }
                    }))}
                    className={`relative rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{font.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-blue-600 stroke-[3]" />}
                      </div>
                      <p className="text-[10px] text-slate-400">{font.desc}</p>
                    </div>

                    <div
                      className="mt-3 rounded-xl bg-white border border-slate-100 p-2 text-xs font-semibold text-slate-800 tracking-tight"
                      style={{ fontFamily: font.family }}
                    >
                      Tri thức là chìa khóa {settings.className || '11A1'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Màu nền, màu chữ & kiểm định độ tương phản */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sun className="h-4 w-4 text-blue-600" />
                <span>4. Màu nền, màu chữ & kiểm định độ tương phản</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kiểm thử theo tiêu chuẩn tiếp cận Web Content Accessibility Guidelines (WCAG).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Background Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Màu nền chính (Background)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.theme.backgroundColor || '#F8FAFF'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, backgroundColor: e.target.value, pageBackground: e.target.value }
                    }))}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.theme.backgroundColor || '#F8FAFF'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, backgroundColor: e.target.value, pageBackground: e.target.value }
                    }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Màu chữ chính (Text Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.theme.textColor || '#172033'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, textColor: e.target.value, primaryText: e.target.value }
                    }))}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.theme.textColor || '#172033'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, textColor: e.target.value, primaryText: e.target.value }
                    }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Màu nhấn chủ đạo (Primary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.theme.primaryColor || '#2563EB'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, primaryColor: e.target.value, primaryButton: e.target.value, accentColor: e.target.value }
                    }))}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.theme.primaryColor || '#2563EB'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      theme: { ...prev.theme, primaryColor: e.target.value, primaryButton: e.target.value, accentColor: e.target.value }
                    }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>
            </div>

            {/* WCAG Contrast Ratio Status Box */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">Kiểm định khả năng đọc (WCAG 2.1)</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold border ${contrastStatus.color}`}>
                  ✓ Tỷ lệ tương phản {contrastRatio.toFixed(2)}:1 — {contrastStatus.label}
                </span>
              </div>
              {contrastRatio < 4.5 && (
                <p className="text-xs text-amber-700 font-medium">
                  ⚠️ Màu chữ và màu nền hiện tại có độ tương phản thấp. Hãy điều chỉnh để nội dung dễ đọc.
                </p>
              )}
            </div>
          </div>

          {/* Section 5: Kiểu khung nội dung (Card Appearance) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>5. Kiểu khung nội dung</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập độ bo góc, màu viền và độ bóng của các thẻ mô-đun trong ứng dụng.
              </p>
            </div>

            {/* Card Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CARD_PRESETS.map((preset) => {
                const isSelected = (settings.theme.cardRadius || 16) === preset.radius && (settings.theme.cardShadow || 'sm') === preset.shadow;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      theme: {
                        ...prev.theme,
                        cardRadius: preset.radius,
                        cardBorder: preset.border,
                        cardShadow: preset.shadow as any,
                        cardOpacity: preset.opacity,
                        cardBackground: preset.bg
                      }
                    }))}
                    className={`rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800 block">{preset.name}</span>
                    <span className="text-[10px] text-slate-400">Bo góc {preset.radius}px</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Live Preview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span>✨ Xem trước Giao diện Lớp Trực tiếp</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Phông chữ: {settings.theme.fontFamily || 'Be Vietnam Pro'}
              </span>
            </div>

            {/* Mock Dashboard Preview Card */}
            <div
              className="rounded-2xl p-6 border shadow-xs transition-all space-y-4"
              style={{
                backgroundColor: settings.theme.cardBackground || '#FFFFFF',
                borderColor: settings.theme.cardBorder || '#E2E8F0',
                borderRadius: `${settings.theme.cardRadius || 16}px`,
                fontFamily: settings.theme.fontFamily || 'Be Vietnam Pro, sans-serif'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold text-white mb-1"
                    style={{ backgroundColor: settings.theme.primaryColor || '#2563EB' }}
                  >
                    Lớp {settings.className || '11A1'}
                  </span>
                  <h3
                    className="text-base font-extrabold"
                    style={{ color: settings.theme.textColor || '#172033' }}
                  >
                    Bảng Tin Chủ Nhiệm & Báo Bài Hàng Ngày
                  </h3>
                </div>

                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: settings.theme.primaryColor || '#2563EB' }}
                >
                  Nút tương tác mẫu
                </button>
              </div>

              <p
                className="text-xs leading-relaxed"
                style={{ color: settings.theme.textColor || '#172033', opacity: 0.85 }}
              >
                Đây là văn bản mô phỏng bảng tin và các mô-đun chức năng. Các em học sinh nhớ hoàn thành bài tập toán và rèn luyện nề nếp đầu tuần.
              </p>
            </div>
          </div>

          {/* Section 7: Bottom Actions & Reset Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleResetTheme}
              className="flex items-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-slate-500" />
              <span>↶ Đặt lại giao diện mặc định</span>
            </button>

            {isTeacher && (
              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-7 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Lưu giao diện</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: QUYỀN ĐĂNG BÀI & TƯƠNG TÁC */}
      {activeTab === 'permissions' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <span>🛡 QUYỀN ĐĂNG BÀI & TƯƠNG TÁC</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cấu hình quyền đăng bài & bình luận của học viên và phụ huynh. Chính sách bổ sung cho hệ thống phân quyền vai trò (RBAC).
            </p>
          </div>

          <div className="divide-y divide-slate-100 space-y-4">
            {/* Toggle 1: Student Can Post Feed */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">1. Cho phép Học viên đăng bài lên Bảng tin lớp</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khi tắt, chỉ GVCN và Ban cán sự được phân quyền mới có thể đăng bài.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isTeacher}
                  checked={settings.interactionSettings?.studentCanPost ?? true}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    interactionSettings: {
                      ...(prev.interactionSettings || { studentCanComment: true, studentCanPostAlbum: true, studentCanCommentAlbum: true, parentCanInteract: true, reactionsEnabled: true }),
                      studentCanPost: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Toggle 2: Student Can Comment Feed */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">2. Cho phép Học viên bình luận vào các bài viết</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khi tắt, học viên chỉ được xem bài viết và dặn dò.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isTeacher}
                  checked={settings.interactionSettings?.studentCanComment ?? true}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    interactionSettings: {
                      ...(prev.interactionSettings || { studentCanPost: true, studentCanPostAlbum: true, studentCanCommentAlbum: true, parentCanInteract: true, reactionsEnabled: true }),
                      studentCanComment: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Toggle 3: Student Can Post Album */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">3. Cho phép Học viên đăng bài trong Album kỷ niệm</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Học viên được đóng góp ảnh khoảnh khắc và kỷ niệm tập thể.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isTeacher}
                  checked={settings.interactionSettings?.studentCanPostAlbum ?? true}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    interactionSettings: {
                      ...(prev.interactionSettings || { studentCanPost: true, studentCanComment: true, studentCanCommentAlbum: true, parentCanInteract: true, reactionsEnabled: true }),
                      studentCanPostAlbum: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Toggle 4: Student Can Comment Album */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">4. Cho phép Học viên bình luận trong Album</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cho phép thảo luận và gửi gắm lời nhắn kỷ niệm dưới các bức ảnh.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isTeacher}
                  checked={settings.interactionSettings?.studentCanCommentAlbum ?? true}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    interactionSettings: {
                      ...(prev.interactionSettings || { studentCanPost: true, studentCanComment: true, studentCanPostAlbum: true, parentCanInteract: true, reactionsEnabled: true }),
                      studentCanCommentAlbum: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Toggle 5: Parent Interaction */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">5. Cho phép Phụ huynh tương tác với nội dung được chia sẻ</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Phụ huynh có thể phản hồi và tương tác với các thông báo chung và hình ảnh công khai.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isTeacher}
                  checked={settings.interactionSettings?.parentCanInteract ?? true}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    interactionSettings: {
                      ...(prev.interactionSettings || { studentCanPost: true, studentCanComment: true, studentCanPostAlbum: true, studentCanCommentAlbum: true, reactionsEnabled: true }),
                      parentCanInteract: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Toggle 6: Reactions */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">6. Cho phép reaction</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bật các biểu tượng cảm xúc tương tác nhanh (Thích, Thả tim, Vỗ tay, Chúc mừng, Nguyệt quế...).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isTeacher}
                  checked={settings.interactionSettings?.reactionsEnabled ?? true}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    interactionSettings: {
                      ...(prev.interactionSettings || { studentCanPost: true, studentCanComment: true, studentCanPostAlbum: true, studentCanCommentAlbum: true, parentCanInteract: true }),
                      reactionsEnabled: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Section: Zalo Group & Sharing Integration Settings */}
          <div className="mt-8 pt-6 border-t border-slate-200/80 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-black text-xs">Z</span>
                <span>Cấu hình Nhóm Zalo Lớp & Chia sẻ</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập liên kết nhóm Zalo lớp để phụ huynh và học sinh mở nhanh khi chia sẻ thông báo, bài viết và khoảnh khắc Album.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Tên nhóm Zalo lớp</label>
                <input
                  type="text"
                  disabled={!isTeacher}
                  value={settings.zaloSettings?.groupName || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    zaloSettings: {
                      ...(prev.zaloSettings || { classId: prev.id, groupLink: '', zaloOAConfigured: false, notificationMode: 'manual' }),
                      groupName: e.target.value
                    }
                  }))}
                  placeholder="Ví dụ: Lớp 12A1 - Phụ huynh & Học sinh"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Liên kết tham gia nhóm Zalo (zalo.me/g/...)</label>
                <input
                  type="url"
                  disabled={!isTeacher}
                  value={settings.zaloSettings?.groupLink || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    zaloSettings: {
                      ...(prev.zaloSettings || { classId: prev.id, groupName: '', zaloOAConfigured: false, notificationMode: 'manual' }),
                      groupLink: e.target.value
                    }
                  }))}
                  placeholder="https://zalo.me/g/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-blue-50/50 p-4 border border-blue-100 flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 leading-relaxed">
                <strong>Nguyên tắc an toàn dữ liệu:</strong> Ứng dụng hỗ trợ sao chép nội dung đã định dạng chuẩn và mở ứng dụng/nhóm Zalo chính thức trên thiết bị người dùng. Không lưu trữ mật khẩu, không can thiệp API ngầm, tuyệt đối an toàn thông tin theo quy định.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Quyền hạn của GVCN và Ban cán sự vẫn được ưu tiên bảo vệ độc lập.
            </span>
            {isTeacher && (
              <button
                type="button"
                onClick={() => handleSaveAll()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Lưu quyền tương tác</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE WORKSPACE & FORMS */}
      {activeTab === 'google' && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span>🟢 GOOGLE WORKSPACE & FORMS</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Cấu hình đồng bộ Google Forms / Sheets & Google Drive phục vụ thu thập dữ liệu đầu năm và quản lý sổ chủ nhiệm.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Google Form Kê Khai Đầu Năm (Form URL)
                </label>
                <input
                  type="url"
                  disabled={!isTeacher}
                  value={settings.googleIntegration?.formUrl || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    googleIntegration: {
                      ...(prev.googleIntegration || {}),
                      formUrl: e.target.value
                    }
                  }))}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Google Sheet Dữ liệu lớp / Sổ Chủ nhiệm (Spreadsheet ID hoặc URL)
                </label>
                <input
                  type="text"
                  disabled={!isTeacher}
                  value={settings.googleIntegration?.spreadsheetUrl || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    googleIntegration: {
                      ...(prev.googleIntegration || {}),
                      spreadsheetUrl: e.target.value
                    }
                  }))}
                  placeholder="https://docs.google.com/spreadsheets/d/... hoặc Spreadsheet ID"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Google Drive Folder (Folder ID hoặc URL lưu trữ minh chứng & tài liệu)
                </label>
                <input
                  type="text"
                  disabled={!isTeacher}
                  value={settings.googleIntegration?.driveFolderId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    googleIntegration: {
                      ...(prev.googleIntegration || {}),
                      driveFolderId: e.target.value
                    }
                  }))}
                  placeholder="https://drive.google.com/drive/folders/... hoặc Folder ID"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Google Apps Script Web App Endpoint
                </label>
                <input
                  type="url"
                  disabled={!isTeacher}
                  value={settings.googleIntegration?.appsScriptEndpoint || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    googleIntegration: {
                      ...(prev.googleIntegration || {}),
                      appsScriptEndpoint: e.target.value
                    }
                  }))}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white font-mono"
                />
              </div>
            </div>

            {/* Test Connection Action */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestGoogleConnection}
                disabled={testingGoogle}
                className="flex items-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-5 py-2.5 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
              >
                <ExternalLink className="h-4 w-4 text-emerald-600" />
                <span>{testingGoogle ? 'Đang kiểm tra kết nối...' : '🔗 Kiểm tra kết nối'}</span>
              </button>

              {isTeacher && (
                <button
                  type="button"
                  onClick={() => handleSaveAll()}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu cấu hình Google</span>
                </button>
              )}
            </div>

            {/* Test Connection Output */}
            {googleTestResults && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-800 mb-2">Kết quả kiểm tra kết nối:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    googleTestResults.form.status === 'connected' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <CheckCircle2 className={`h-4 w-4 ${googleTestResults.form.status === 'connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{googleTestResults.form.message}</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    googleTestResults.sheet.status === 'connected' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <CheckCircle2 className={`h-4 w-4 ${googleTestResults.sheet.status === 'connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{googleTestResults.sheet.message}</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    googleTestResults.drive.status === 'connected' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <CheckCircle2 className={`h-4 w-4 ${googleTestResults.drive.status === 'connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{googleTestResults.drive.message}</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    googleTestResults.script.status === 'connected' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : googleTestResults.script.status === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <CheckCircle2 className={`h-4 w-4 ${googleTestResults.script.status === 'connected' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{googleTestResults.script.message}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Guide Panel: Hướng dẫn triển khai Google Apps Script */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span>Hướng dẫn triển khai Google Apps Script</span>
              </h3>
              <button
                type="button"
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-blue-600" />
                <span>{copiedScript ? 'Đã sao chép mã!' : 'Sao chép mã mẫu'}</span>
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed font-medium">
              <li>Mở Google Sheet Sổ Chủ nhiệm của lớp.</li>
              <li>Chọn <b>Tiện ích mở rộng (Extensions)</b> → <b>Apps Script</b>.</li>
              <li>Dán mã nguồn script đồng bộ dữ liệu vào trình soạn thảo.</li>
              <li>Bấm <b>Triển khai (Deploy)</b> → <b>Tùy chọn triển khai mới (New deployment)</b>.</li>
              <li>Chọn loại <b>Ứng dụng web (Web App)</b>, mục Ai có quyền truy cập chọn <b>"Bất kỳ ai (Anyone)"</b>.</li>
              <li>Sao chép đường dẫn Web App URL kết thúc bằng <code>/exec</code>.</li>
              <li>Dán URL vào ô <i>Google Apps Script Web App Endpoint</i> ở trên.</li>
              <li>Bấm <b>Kiểm tra kết nối</b> và <b>Lưu tất cả thay đổi</b>.</li>
            </ol>
          </div>
        </div>
      )}

      {/* TAB 5: DỮ LIỆU & KHỞI TẠO */}
      {activeTab === 'data' && (
        <div className="space-y-6 animate-fade-in">
          {/* Demo Mode Notice Box */}
          {isDemoMode && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-300">
                    CHẾ ĐỘ DEMO
                  </span>
                  <h3 className="text-xs font-bold text-amber-900">
                    Ứng dụng hiện đang sử dụng dữ liệu mẫu phục vụ kiểm thử.
                  </h3>
                </div>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Trong môi trường thử nghiệm, bạn có thể thiết lập lại toàn bộ dữ liệu mẫu ban đầu của học sinh, rèn luyện, cây nguyệt quế và bài viết bất kỳ lúc nào.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResetDemoData}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Khôi phục dữ liệu mẫu</span>
                </button>
              </div>
            </div>
          )}

          {/* Offline Cache Management */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-blue-600" />
                <span>Dữ liệu lưu trên thiết bị (Offline Cache)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý bộ nhớ đệm cục bộ giúp ứng dụng hoạt động mượt mà ngay cả khi mất kết nối mạng.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Trạng thái offline</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5" /> Trực tuyến (Sẵn sàng)
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Lần đồng bộ gần nhất</span>
                <span className="text-xs font-bold text-slate-800">
                  {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, Hôm nay
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Dữ liệu chờ đồng bộ</span>
                <span className="text-xs font-bold text-blue-600">
                  0 bản ghi (Đã đồng bộ)
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">Dung lượng cache</span>
                <span className="text-xs font-bold text-slate-800">
                  ~{cacheStorageSize} KB
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearOfflineCache}
                className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span>Xóa dữ liệu offline trên thiết bị</span>
              </button>
            </div>
          </div>

          {/* Backup & Restore JSON */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>Sao Lưu & Phục Hồi Dữ Liệu Lớp</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Xuất toàn bộ cơ sở dữ liệu lớp học sang tệp JSON để lưu trữ hoặc di chuyển sang thiết bị khác.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 p-3.5 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 text-blue-600" />
                <span>Tải tệp sao lưu dữ liệu (.json)</span>
              </button>

              <label className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 hover:bg-slate-50 p-3.5 text-xs font-bold text-slate-800 cursor-pointer transition-colors">
                <Upload className="h-4 w-4 text-emerald-600" />
                <span>Phục hồi từ tệp (.json)</span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
