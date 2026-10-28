/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  Users,
  AlertCircle,
  Eye,
  Sparkles
} from 'lucide-react';
import { studentService } from '../../services/StudentService';
import { academicService, PERIOD_NAMES } from '../../services/AcademicService';
import { classService } from '../../services/ClassService';
import { fileStorageService } from '../../services/FileStorageService';
import { AcademicPeriod, AttachedFile, SharedGradeFile } from '../../types';

interface UploadTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPeriod: AcademicPeriod;
  onSuccess: () => void;
}

export const UploadTranscriptModal: React.FC<UploadTranscriptModalProps> = ({
  isOpen,
  onClose,
  currentPeriod,
  onSuccess
}) => {
  const students = studentService.getAll();

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod>(currentPeriod);
  const [targetType, setTargetType] = useState<'class' | 'student'>('class');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 'hs-01');

  // Sharing permissions
  const [teacherVisible, setTeacherVisible] = useState<boolean>(true);
  const [studentVisible, setStudentVisible] = useState<boolean>(true);
  const [parentVisible, setParentVisible] = useState<boolean>(true);

  // File state
  const [selectedFile, setSelectedFile] = useState<AttachedFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const uploaded = await fileStorageService.uploadLocalFile(file);
      setSelectedFile(uploaded);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }

      // If image or pdf, simulate smart OCR extraction preview
      if (uploaded.type === 'image' || uploaded.type === 'pdf') {
        setOcrText(
          `[Gợi ý nhận dạng từ ${uploaded.name}]: Đã phát hiện tiêu đề "Bảng điểm kiểm tra định kỳ", ngày lập ${new Date().toLocaleDateString('vi-VN')}. (Kết quả nhận dạng cần GVCN kiểm tra trước khi lưu)`
        );
      } else {
        setOcrText(null);
      }
    } catch {
      setErrorMsg('Không thể tải file lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Vui lòng chọn file tải lên.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên tài liệu / phiếu điểm.');
      return;
    }

    const matchedStudent = targetType === 'student' ? students.find((s) => s.id === selectedStudentId) : undefined;
    const settings = classService.getSettings();

    academicService.addSharedGradeFile({
      title: title.trim(),
      description: description.trim() || undefined,
      file: selectedFile,
      period: selectedPeriod,
      semester: (selectedPeriod.includes('hk2') ? 'HK2' : 'HK1') as any,
      schoolYear: settings.schoolYear || '2025 - 2026',
      targetType,
      studentId: targetType === 'student' ? selectedStudentId : undefined,
      studentName: matchedStudent?.fullName,
      teacherVisible,
      studentVisible,
      parentVisible,
      uploadedBy: settings.homeroomTeacherName ? `${settings.homeroomTeacherName} (GVCN)` : 'GVCN'
    });

    onSuccess();
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tải Lên Minh Chứng & Phiếu Điểm</h3>
              <p className="text-xs text-slate-500">Hỗ trợ PDF, Ảnh (JPG/PNG), Excel (.xlsx), Word (.docx)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* File selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">1. Chọn file tài liệu *</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              {selectedFile ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
                    {selectedFile.type === 'pdf' ? (
                      <FileText className="h-5 w-5" />
                    ) : selectedFile.type === 'image' ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <FileSpreadsheet className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500">{selectedFile.size}</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-slate-400 mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">Nhấp để chọn file hoặc kéo thả vào đây</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">PDF, PNG, JPG, XLSX, DOCX (Tối đa 15MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {ocrText && (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-800">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{ocrText}</span>
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">2. Tiêu đề tài liệu / Phiếu điểm *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`VD: Bảng điểm tổng kết Giữa HKI - Lớp ${classService.getSettings().className || '12A1'}...`}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-hidden focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">3. Mốc học kỳ áp dụng</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as AcademicPeriod)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 outline-hidden"
              >
                {Object.entries(PERIOD_NAMES).map(([pKey, pLabel]) => (
                  <option key={pKey} value={pKey}>
                    {pLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">4. Đối tượng áp dụng</label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setTargetType('class')}
                  className={`rounded-lg py-1 text-xs font-bold transition-all cursor-pointer ${
                    targetType === 'class' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Toàn lớp
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('student')}
                  className={`rounded-lg py-1 text-xs font-bold transition-all cursor-pointer ${
                    targetType === 'student' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Cá nhân học sinh
                </button>
              </div>
            </div>
          </div>

          {targetType === 'student' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chọn Học sinh nhận phiếu điểm</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 outline-hidden"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.fullName} (Tổ {s.group})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm (Tùy chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Bản scan có xác nhận của BGH và GVCN..."
              rows={2}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 outline-hidden"
            />
          </div>

          {/* Visibility / Sharing settings */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <h5 className="text-xs font-bold text-slate-800">Quyền xem & Chia sẻ tài liệu:</h5>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={studentVisible}
                  onChange={(e) => setStudentVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Cho phép Học sinh xem ({targetType === 'class' ? 'cả lớp' : 'học sinh được chọn'})</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={parentVisible}
                  onChange={(e) => setParentVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Cho phép Phụ huynh xem trên Cổng liên lạc Phụ huynh</span>
              </label>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !title.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Lưu vào hệ thống</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
