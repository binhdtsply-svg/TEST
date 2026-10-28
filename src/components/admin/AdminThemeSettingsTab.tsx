/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Layout,
  Type,
  Sparkles,
  RotateCcw,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Sliders,
  Paintbrush,
  Upload,
  Trash2,
  Eye,
  ShieldCheck,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  AlertCircle
} from 'lucide-react';
import { adminThemeService, AdminThemeConfig } from '../../services/AdminThemeService';

const FONT_OPTIONS = [
  { id: 'Be Vietnam Pro', name: 'Be Vietnam Pro (Tiêu chuẩn Hiện đại & Sắc nét)', family: 'Be Vietnam Pro' },
  { id: 'Inter', name: 'Inter (Quản trị & Bảng biểu Tối ưu)', family: 'Inter' },
  { id: 'Roboto', name: 'Roboto (Hình học Cân bằng)', family: 'Roboto' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Tinh tế & Cao cấp)', family: 'Plus Jakarta Sans' },
  { id: 'Outfit', name: 'Outfit (Thanh thoát & Năng động)', family: 'Outfit' },
  { id: 'Playfair Display', name: 'Playfair Display (Sang trọng & Học thuật)', family: 'Playfair Display' }
];

const PRESET_COVERS = [
  {
    id: 'cover_modern_indigo',
    name: 'Executive Indigo Gradient',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'cover_datacenter',
    name: 'Công nghệ & Dữ liệu Xanh',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'cover_architecture',
    name: 'Kiến trúc Tối giản Hiện đại',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'cover_aurora',
    name: 'Ánh cực quang Tím & Xanh',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80'
  }
];

const PRESET_THEMES: Array<{
  id: AdminThemeConfig['themeMode'];
  name: string;
  desc: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  secText: string;
}> = [
  {
    id: 'executive_blue',
    name: 'Executive Indigo & Blue',
    desc: 'Phong cách quản trị điều hành chuyên nghiệp, chuẩn mực giáo dục hiện đại',
    primary: '#4338CA',
    secondary: '#3B82F6',
    accent: '#0EA5E9',
    bg: '#F8FAFC',
    text: '#0F172A',
    secText: '#64748B'
  },
  {
    id: 'emerald_pro',
    name: 'Emerald Green Governance',
    desc: 'Tươi sáng, năng lượng học đường và ổn định vững chắc',
    primary: '#047857',
    secondary: '#10B981',
    accent: '#14B8A6',
    bg: '#F0FDF4',
    text: '#064E3B',
    secText: '#047857'
  },
  {
    id: 'royal_indigo',
    name: 'Royal Purple & Deep Slate',
    desc: 'Sang trọng, uy tín, độ tương phản cao và tập trung',
    primary: '#6D28D9',
    secondary: '#8B5CF6',
    accent: '#EC4899',
    bg: '#FAF5FF',
    text: '#3B0764',
    secText: '#6B21A8'
  },
  {
    id: 'slate',
    name: 'Clean Neutral Slate',
    desc: 'Tối giản, trung tính, không gây mỏi mắt trong phiên làm việc dài',
    primary: '#1E293B',
    secondary: '#475569',
    accent: '#2563EB',
    bg: '#F8FAFC',
    text: '#0F172A',
    secText: '#475569'
  },
  {
    id: 'warm_ivory',
    name: 'Warm Amber & Ivory',
    desc: 'Ấm áp, thân thiện và giàu cảm hứng sư phạm',
    primary: '#B45309',
    secondary: '#F59E0B',
    accent: '#F97316',
    bg: '#FFFBEB',
    text: '#451A03',
    secText: '#92400E'
  }
];

export const AdminThemeSettingsTab: React.FC = () => {
  const [theme, setTheme] = useState<AdminThemeConfig>(adminThemeService.getAdminTheme());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = adminThemeService.subscribe(() => {
      setTheme(adminThemeService.getAdminTheme());
    });
    return unsub;
  }, []);

  const handleApplyPreset = (preset: typeof PRESET_THEMES[0]) => {
    const updated = adminThemeService.updateAdminTheme({
      themeMode: preset.id,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
      backgroundColor: preset.bg,
      textColor: preset.text,
      secondaryTextColor: preset.secText,
      backgroundType: 'solid'
    });
    setTheme(updated);
    triggerSaveAlert();
  };

  const handleChange = <K extends keyof AdminThemeConfig>(key: K, value: AdminThemeConfig[K]) => {
    const updated = adminThemeService.updateAdminTheme({ [key]: value });
    setTheme(updated);
    triggerSaveAlert();
  };

  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      setUploadError('Định dạng file không hỗ trợ. Vui lòng chọn file ảnh PNG, JPG, JPEG hoặc WEBP.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Dung lượng ảnh vượt quá 4MB. Vui lòng nén nhỏ lại trước khi tải lên.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        handleChange('coverImage', dataUrl);
      }
    };
    reader.onerror = () => {
      setUploadError('Không thể đọc file ảnh. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      setUploadError('Định dạng file không hỗ trợ. Vui lòng chọn file ảnh PNG, JPG, JPEG hoặc WEBP.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Dung lượng ảnh nền vượt quá 4MB. Vui lòng nén nhỏ lại.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        const updated = adminThemeService.updateAdminTheme({
          backgroundType: 'image',
          backgroundImage: dataUrl
        });
        setTheme(updated);
        triggerSaveAlert();
      }
    };
    reader.onerror = () => {
      setUploadError('Không thể đọc file ảnh nền. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (window.confirm('Khôi phục toàn bộ giao diện Admin về mặc định ban đầu? Dữ liệu tài khoản không bị ảnh hưởng.')) {
      const updated = adminThemeService.resetAdminTheme();
      setTheme(updated);
      triggerSaveAlert();
    }
  };

  const triggerSaveAlert = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2200);
  };

  return (
    <div className="space-y-6 animate-fade-in" style={{ fontFamily: `'${theme.fontFamily}', system-ui, sans-serif` }}>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Không gian Giao diện Quản trị Độc lập</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Cài Đặt Giao Diện & Theme Hệ Thống Admin
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Cấu hình màu sắc, phông chữ, màu chữ, ảnh bìa banner và bố cục không gian dành riêng cho Quản trị viên. 
              Các thiết lập này hoàn toàn biệt lập, lưu persistent và không bao giờ bị ảnh hưởng bởi theme của các lớp/GVCN.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-md active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Khôi phục Mặc định</span>
            </button>
            {saveSuccess && (
              <span className="flex items-center gap-1.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-2 text-xs font-bold animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Đã lưu tự động</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Presets */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Palette className="h-4 w-4" />
              </div>
              <span>1. Bộ Theme Quản Trị Chuẩn (Presets)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_THEMES.map((preset) => {
                const isActive = theme.themeMode === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-4 w-4 rounded-full border border-white shadow-2xs" style={{ backgroundColor: preset.primary }} />
                        <span className="h-4 w-4 rounded-full border border-white shadow-2xs" style={{ backgroundColor: preset.secondary }} />
                        <span className="h-4 w-4 rounded-full border border-white shadow-2xs" style={{ backgroundColor: preset.accent }} />
                      </div>
                      {isActive && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Banner / Cover Image Admin */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <span>2. Cài Đặt Ảnh Bìa / Banner Admin</span>
              </div>
              {theme.coverImage && (
                <button
                  type="button"
                  onClick={() => handleChange('coverImage', '')}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa ảnh bìa
                </button>
              )}
            </div>

            {/* Current Cover Preview */}
            {theme.coverImage ? (
              <div className="space-y-4">
                <div className="relative h-36 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-950">
                  <img
                    src={theme.coverImage}
                    alt="Admin Cover Banner"
                    referrerPolicy="no-referrer"
                    style={{
                      objectPosition: `center ${theme.coverPositionY ?? 50}%`,
                      transform: `scale(${(theme.coverZoom ?? 100) / 100})`
                    }}
                    className="h-full w-full object-cover transition-all duration-200"
                  />
                  <div
                    className="absolute inset-0 bg-black pointer-events-none"
                    style={{ opacity: (theme.coverOverlayOpacity ?? 30) / 100 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between p-4 text-white pointer-events-none">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        Banner Quản Trị
                      </span>
                      <h4 className="text-sm font-black mt-1 drop-shadow-xs">Hệ Thống Quản Trị Trung Tâm</h4>
                    </div>
                    <label className="flex items-center gap-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-900 px-3 py-1.5 text-xs font-bold shadow-sm cursor-pointer transition-all pointer-events-auto">
                      <Upload className="h-3.5 w-3.5 text-indigo-600" /> Thay ảnh bìa
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleUploadCover}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Alignment Controls */}
                <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Căn chỉnh vị trí & Thu phóng ảnh bìa
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                      Vị trí: {theme.coverPositionY ?? 50}% · Tỷ lệ: {theme.coverZoom ?? 100}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Vị trí dọc (Trọng tâm ảnh):</span>
                      <span className="font-extrabold text-indigo-700">{theme.coverPositionY ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={theme.coverPositionY ?? 50}
                      onChange={(e) => handleChange('coverPositionY', Number(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>0% (Trên cùng)</span>
                      <span>50% (Chính giữa)</span>
                      <span>100% (Dưới cùng)</span>
                    </div>
                  </div>

                  {/* Alignment quick presets */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-600">Chọn nhanh:</span>
                    <div className="grid grid-cols-3 gap-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => handleChange('coverPositionY', 0)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer border ${
                          (theme.coverPositionY ?? 50) === 0
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Trên cùng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('coverPositionY', 50)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer border ${
                          (theme.coverPositionY ?? 50) === 50
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Chính giữa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('coverPositionY', 100)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer border ${
                          (theme.coverPositionY ?? 50) === 100
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Dưới cùng
                      </button>
                    </div>
                  </div>

                  {/* Zoom slider */}
                  <div className="space-y-1.5 pt-2 border-t border-indigo-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Thu phóng:</span>
                      <span className="font-extrabold text-indigo-700">{theme.coverZoom ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="180"
                      step="2"
                      value={theme.coverZoom ?? 100}
                      onChange={(e) => handleChange('coverZoom', Number(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center space-y-2 bg-slate-50/50">
                <p className="text-xs text-slate-600 font-medium">Chưa thiết lập ảnh bìa banner riêng. Admin đang dùng giao diện tiêu chuẩn.</p>
                <label className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer transition-all">
                  <Upload className="h-3.5 w-3.5" /> Tải ảnh bìa mới từ thiết bị
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleUploadCover}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Preset Covers Library */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700">Hoặc chọn từ bộ sưu tập banner mẫu:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_COVERS.map((cov) => {
                  const isSelected = theme.coverImage === cov.url;
                  return (
                    <button
                      key={cov.id}
                      type="button"
                      onClick={() => handleChange('coverImage', cov.url)}
                      className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        isSelected ? 'border-indigo-600 ring-2 ring-indigo-500/30' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={cov.thumb}
                        alt={cov.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                        <span className="text-[10px] font-bold text-white leading-tight drop-shadow-xs truncate">
                          {cov.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Overlay Opacity */}
            {theme.coverImage && (
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs font-bold text-slate-700">Độ mờ phủ đen của Banner:</label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={theme.coverOverlayOpacity ?? 30}
                  onChange={(e) => handleChange('coverOverlayOpacity', Number(e.target.value))}
                  className="w-44 accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-600">{theme.coverOverlayOpacity ?? 30}%</span>
              </div>
            )}
          </div>

          {/* Section 3: Custom Color Palette & Text Colors */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Paintbrush className="h-4 w-4" />
              </div>
              <span>3. Bảng Màu Sắc & Màu Chữ Hệ Thống</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Màu Chủ Đạo (Primary)</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 bg-slate-50/50">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-800 uppercase bg-transparent outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Màu Phụ (Secondary)</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 bg-slate-50/50">
                  <input
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-800 uppercase bg-transparent outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Màu Nhấn (Accent)</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 bg-slate-50/50">
                  <input
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-800 uppercase bg-transparent outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Màu Chữ Chính (Primary Text)</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 bg-slate-50/50">
                  <input
                    type="color"
                    value={theme.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-800 uppercase bg-transparent outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Màu Chữ Phụ (Secondary Text / Subtitle)</label>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 bg-slate-50/50">
                  <input
                    type="color"
                    value={theme.secondaryTextColor}
                    onChange={(e) => handleChange('secondaryTextColor', e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.secondaryTextColor}
                    onChange={(e) => handleChange('secondaryTextColor', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-800 uppercase bg-transparent outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Background & Wallpaper Mode */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Sliders className="h-4 w-4" />
              </div>
              <span>4. Kiểu Nền Hệ Thống Quản Trị</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'solid', label: 'Màu Đơn Sắc' },
                { id: 'gradient', label: 'Chuyển Màu (Gradient)' },
                { id: 'image', label: 'Ảnh Nền Tùy Biến' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleChange('backgroundType', m.id as any)}
                  className={`rounded-2xl py-2.5 px-3 text-xs font-bold border transition-all cursor-pointer ${
                    theme.backgroundType === m.id
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {theme.backgroundType === 'solid' && (
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs font-bold text-slate-700">Màu nền chính:</label>
                <input
                  type="color"
                  value={theme.backgroundColor}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200"
                />
                <span className="text-xs font-mono text-slate-600 uppercase font-bold">{theme.backgroundColor}</span>
              </div>
            )}

            {theme.backgroundType === 'gradient' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Màu bắt đầu:</label>
                  <input
                    type="color"
                    value={theme.gradient?.color1 || '#F8FAFC'}
                    onChange={(e) =>
                      handleChange('gradient', {
                        direction: theme.gradient?.direction || 'to bottom right',
                        color1: e.target.value,
                        color2: theme.gradient?.color2 || '#EFF6FF'
                      })
                    }
                    className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    value={theme.gradient?.color1 || '#F8FAFC'}
                    onChange={(e) =>
                      handleChange('gradient', {
                        direction: theme.gradient?.direction || 'to bottom right',
                        color1: e.target.value,
                        color2: theme.gradient?.color2 || '#EFF6FF'
                      })
                    }
                    className="w-24 text-xs font-mono font-bold text-slate-800 uppercase"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Màu kết thúc:</label>
                  <input
                    type="color"
                    value={theme.gradient?.color2 || '#EFF6FF'}
                    onChange={(e) =>
                      handleChange('gradient', {
                        direction: theme.gradient?.direction || 'to bottom right',
                        color1: theme.gradient?.color1 || '#F8FAFC',
                        color2: e.target.value
                      })
                    }
                    className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    value={theme.gradient?.color2 || '#EFF6FF'}
                    onChange={(e) =>
                      handleChange('gradient', {
                        direction: theme.gradient?.direction || 'to bottom right',
                        color1: theme.gradient?.color1 || '#F8FAFC',
                        color2: e.target.value
                      })
                    }
                    className="w-24 text-xs font-mono font-bold text-slate-800 uppercase"
                  />
                </div>
              </div>
            )}

            {theme.backgroundType === 'image' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 text-xs font-bold cursor-pointer transition-colors border border-indigo-200">
                    <Upload className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Tải ảnh nền từ máy tính</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleUploadBg}
                      className="hidden"
                    />
                  </label>
                  {theme.backgroundImage && (
                    <button
                      type="button"
                      onClick={() => handleChange('backgroundImage', '')}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Xóa ảnh nền
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Hoặc nhập URL ảnh nền..."
                  value={theme.backgroundImage || ''}
                  onChange={(e) => handleChange('backgroundImage', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                />
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700">Độ mờ lớp phủ nền:</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={theme.overlayOpacity ?? 20}
                    onChange={(e) => handleChange('overlayOpacity', Number(e.target.value))}
                    className="w-48 cursor-pointer accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-600">{theme.overlayOpacity ?? 20}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Typography & Space Layout */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-black text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Type className="h-4 w-4" />
              </div>
              <span>5. Phông Chữ & Bố Cục Không Gian</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Kiểu phông chữ hiển thị:</label>
                <select
                  value={theme.fontFamily}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Độ bo góc giao diện (Card Radius):</label>
                <select
                  value={theme.borderRadius}
                  onChange={(e) => handleChange('borderRadius', e.target.value as any)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                >
                  <option value="md">Trung bình (12px)</option>
                  <option value="lg">Rộng (16px)</option>
                  <option value="xl">Mềm mại (20px)</option>
                  <option value="2xl">Chuẩn Hiện đại (24px)</option>
                  <option value="3xl">Siêu bo tròn (32px)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Vị trí Menu Danh mục Admin:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('sidebarPosition', 'left')}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-2 px-3 text-xs font-bold border transition-all ${
                      theme.sidebarPosition === 'left'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <PanelLeft className="h-4 w-4" /> Bên Trái
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('sidebarPosition', 'right')}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-2 px-3 text-xs font-bold border transition-all ${
                      theme.sidebarPosition === 'right'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <PanelRight className="h-4 w-4" /> Bên Phải
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mật độ hiển thị nội dung:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('contentDensity', 'comfortable')}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-2 px-3 text-xs font-bold border transition-all ${
                      theme.contentDensity === 'comfortable'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Tiêu chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('contentDensity', 'compact')}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-2 px-3 text-xs font-bold border transition-all ${
                      theme.contentDensity === 'compact'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Minimize2 className="h-3.5 w-3.5" /> Tinh gọn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Preview Widget */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-4 sticky top-6">
            <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
              <Layout className="h-4 w-4 text-indigo-600" />
              <span>Xem Trước Trực Quan (Live Preview)</span>
            </div>

            {/* Mock Preview Card */}
            <div
              className="p-5 rounded-2xl border shadow-sm space-y-4 transition-all overflow-hidden"
              style={{
                backgroundColor: theme.cardBackground,
                borderColor: '#E2E8F0',
                fontFamily: `'${theme.fontFamily}', sans-serif`
              }}
            >
              {/* Preview Banner */}
              {theme.coverImage ? (
                <div className="relative h-20 -mx-5 -mt-5 rounded-t-2xl overflow-hidden mb-3">
                  <img
                    src={theme.coverImage}
                    alt="Cover preview"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: (theme.coverOverlayOpacity ?? 30) / 100 }}
                  />
                  <div className="absolute inset-0 flex items-center p-3 text-white">
                    <span className="text-xs font-black drop-shadow-xs">Admin Platform Hub</span>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    AD
                  </div>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: theme.textColor }}>Bảng Điều Khiển Quản Trị</h4>
                    <span className="text-[10px]" style={{ color: theme.secondaryTextColor }}>Hệ thống Quản trị Trung tâm</span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: theme.secondaryColor }}
                >
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-2.5 bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Tài khoản GVCN</span>
                  <div className="text-base font-black" style={{ color: theme.primaryColor }}>
                    24
                  </div>
                </div>
                <div className="rounded-xl p-2.5 bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Lớp hoạt động</span>
                  <div className="text-base font-black" style={{ color: theme.accentColor }}>
                    24
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Nút Hành Động Mẫu
              </button>
            </div>

            {/* Scope Isolation Notice */}
            <div className="rounded-2xl bg-indigo-50/70 p-4 border border-indigo-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Bảo chứng Cô lập Không gian</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Tất cả cấu hình trên giao diện này được lưu trữ độc quyền cho vai trò <strong>SUPER_ADMIN</strong> và không bao giờ can thiệp vào cài đặt của các lớp học do GVCN quản lý.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
