/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, Check, RotateCcw, X, Upload, Phone, Mail, Users, Edit3, Sliders, MoveVertical, ZoomIn } from 'lucide-react';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';
import { authService } from '../../services/AuthService';
import { ClassSizeModal } from '../students/ClassSizeModal';

const PRESET_COVERS = [
  { name: 'Khuôn viên trường học', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Thư viện tri thức', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Bầu trời thanh xuân', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80' },
  { name: 'Màu sắc sáng tạo', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80' }
];

interface ClassCoverProps {
  onNavigateModule?: (mod: any) => void;
  onOpenReport?: () => void;
  onOpenAI?: () => void;
}

export const ClassCover: React.FC<ClassCoverProps> = ({
  onNavigateModule,
  onOpenReport,
  onOpenAI
}) => {
  const [settings, setSettings] = useState(classService.getSettings());
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClassSizeModalOpen, setIsClassSizeModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(settings.coverImage);
  const [positionY, setPositionY] = useState<number>(settings.coverPositionY ?? 50);
  const [zoomLevel, setZoomLevel] = useState<number>(settings.coverZoom ?? 100);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  React.useEffect(() => {
    const unsubClass = classService.subscribe(() => {
      const current = classService.getSettings();
      setSettings(current);
      setPositionY(current.coverPositionY ?? 50);
      setZoomLevel(current.coverZoom ?? 100);
    });
    const unsubStudent = studentService.subscribe(() => {
      setSettings(classService.getSettings());
    });
    return () => {
      unsubClass();
      unsubStudent();
    };
  }, []);

  const handleOpenModal = () => {
    const current = classService.getSettings();
    setPreviewUrl(current.coverImage);
    setPositionY(current.coverPositionY ?? 50);
    setZoomLevel(current.coverZoom ?? 100);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const tempUrl = URL.createObjectURL(file);
      setPreviewUrl(tempUrl);
    }
  };

  const handleSave = () => {
    classService.updateCoverImage(previewUrl, {
      positionY,
      position: `center ${positionY}%`,
      zoom: zoomLevel
    });
    setIsModalOpen(false);
  };

  const handleReset = () => {
    classService.resetCoverImage();
    const fresh = classService.getSettings();
    setPreviewUrl(fresh.coverImage);
    setPositionY(fresh.coverPositionY ?? 50);
    setZoomLevel(fresh.coverZoom ?? 100);
    setIsModalOpen(false);
  };

  return (
    <div className="relative mb-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
      {/* Cover Image Background with Dynamic Alignment */}
      <div className="relative h-48 sm:h-56 md:h-64 w-full overflow-hidden bg-slate-800">
        <img
          src={settings.coverImage || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80'}
          alt={`Lớp ${settings.className}`}
          referrerPolicy="no-referrer"
          style={{
            objectPosition: settings.coverPosition || `center ${settings.coverPositionY ?? 50}%`,
            transform: `scale(${(settings.coverZoom ?? 100) / 100})`
          }}
          className="h-full w-full object-cover opacity-85 transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />

        {/* Change Cover Button (Teacher only) */}
        {isTeacher && (
          <button
            onClick={handleOpenModal}
            className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-800 backdrop-blur-md transition-all hover:bg-white hover:shadow-lg cursor-pointer"
          >
            <Camera className="h-4 w-4 text-blue-600" />
            <span>Thay ảnh bìa</span>
          </button>
        )}

        {/* Banner Details */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {(settings?.educationTrack || settings?.grade || settings?.stream) ? (
              <span className="rounded-lg bg-blue-600/95 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase backdrop-blur-xs shadow-xs">
                {settings?.educationTrack
                  ? settings.educationTrack
                  : settings?.grade && settings?.stream
                  ? `${settings.grade} · ${settings.stream}`
                  : settings?.grade || settings?.stream}
              </span>
            ) : null}
            <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-xs">
              Năm học: {settings?.academicYear || '2025 - 2026'} ({settings?.semester || 'HK1'})
            </span>
            <button
              type="button"
              onClick={() => isTeacher && setIsClassSizeModalOpen(true)}
              className={`rounded-lg bg-emerald-500/95 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5 text-white ${
                isTeacher ? 'hover:bg-emerald-600 active:scale-95 transition-all cursor-pointer shadow-xs' : ''
              }`}
              title={isTeacher ? 'Nhấp để xem & cập nhật sĩ số lớp học' : undefined}
            >
              <Users className="h-3 w-3" />
              <span>Sĩ số: {settings?.totalStudents || 0} học sinh</span>
              {settings?.confirmedTotalStudents && settings.confirmedTotalStudents !== settings.totalStudents && (
                <span className="text-[10px] text-emerald-100 font-medium bg-emerald-700/60 px-1.5 py-0.2 rounded-md">
                  (Xác nhận: {settings.confirmedTotalStudents})
                </span>
              )}
              {isTeacher && <Edit3 className="h-2.5 w-2.5 opacity-75 hover:opacity-100" />}
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight drop-shadow-sm">
                Lớp {settings?.className || settings?.name || '11A1'} — {settings?.schoolName || 'THPT Chuyên'}
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-200 italic font-medium line-clamp-1">
                "{settings?.slogan || 'Đoàn kết - Sáng tạo - Vươn lên'}"
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end text-xs text-slate-300 gap-0.5 shrink-0">
              <div>
                GVCN: <span className="font-bold text-white">{settings?.homeroomTeacherName || settings?.teacherName || 'Giáo viên'}</span>
              </div>
              {(settings?.teacherPhone || settings?.teacherEmail) && (
                <div className="flex items-center gap-2.5 text-[11px] text-slate-300">
                  {settings.teacherPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {settings.teacherPhone}
                    </span>
                  )}
                  {settings.teacherEmail && (
                    <span className="hidden sm:flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-400" />
                      {settings.teacherEmail}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Change Cover using Portal */}
      {isModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div 
            className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-800">Thay đổi Ảnh bìa Lớp học</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Preview with Dynamic Alignment */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xem trước ảnh bìa</span>
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Vị trí: {positionY}% · Tỷ lệ: {zoomLevel}%
                  </span>
                </div>
                <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-950 border border-slate-200 group">
                  <img
                    src={previewUrl || settings.coverImage || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80'}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    style={{
                      objectPosition: `center ${positionY}%`,
                      transform: `scale(${zoomLevel / 100})`
                    }}
                    className="h-full w-full object-cover transition-all duration-150"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 font-medium pointer-events-none">
                    <span className="bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs font-bold">Lớp {settings.className}</span>
                    <span className="bg-blue-600/80 px-2 py-0.5 rounded-md backdrop-blur-xs font-bold">Căn chỉnh trực tiếp</span>
                  </div>
                </div>
              </div>

              {/* Cover Alignment & Position Controls */}
              <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Căn chỉnh ảnh bìa
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    Vị trí hiển thị
                  </span>
                </div>

                {/* Vertical Position Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
                      Vị trí dọc (Trọng tâm ảnh):
                    </span>
                    <span className="font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md text-[11px]">
                      {positionY === 0 ? '0% (Trên cùng)' : positionY === 50 ? '50% (Chính giữa)' : positionY === 100 ? '100% (Dưới cùng)' : `${positionY}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={positionY}
                    onChange={(e) => setPositionY(Number(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 font-medium px-0.5">
                    <span>0% (Trên cùng)</span>
                    <span>50% (Chính giữa)</span>
                    <span>100% (Dưới cùng)</span>
                  </div>
                </div>

                {/* Quick alignment presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-600">Chọn nhanh:</span>
                  <div className="grid grid-cols-3 gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => setPositionY(0)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer border ${
                        positionY === 0
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Trên cùng (0%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPositionY(50)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer border ${
                        positionY === 50
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Chính giữa (50%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPositionY(100)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer border ${
                        positionY === 100
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Dưới cùng (100%)
                    </button>
                  </div>
                </div>

                {/* Zoom Level Slider */}
                <div className="space-y-1.5 pt-2 border-t border-blue-100/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                      Thu phóng (Tỷ lệ ảnh):
                    </span>
                    <span className="font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md text-[11px]">
                      {zoomLevel}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="180"
                    step="2"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Upload file */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tải ảnh từ thiết bị (JPG, PNG, WEBP)
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span>{selectedFile ? selectedFile.name : 'Nhấp để chọn tệp ảnh mới...'}</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Preset Gallery */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Hoặc chọn ảnh mẫu chủ đề giáo dục
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setPreviewUrl(preset.url)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition-all cursor-pointer ${
                        previewUrl === preset.url
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <img src={preset.url} alt="" className="h-8 w-12 rounded-lg object-cover" />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>LƯU ẢNH BÌA</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Class Size Adjustment Modal */}
      {isTeacher && (
        <ClassSizeModal
          isOpen={isClassSizeModalOpen}
          onClose={() => setIsClassSizeModalOpen(false)}
          onSuccess={() => setSettings(classService.getSettings())}
        />
      )}
    </div>
  );
};
