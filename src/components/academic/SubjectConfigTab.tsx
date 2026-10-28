/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Check,
  RotateCcw,
  AlertTriangle,
  Trash2,
  Edit2,
  Save,
  CheckSquare,
  Square,
  Sparkles,
  ShieldCheck,
  Info,
  CheckCircle2,
  FileCheck2,
  BookOpen,
  X
} from 'lucide-react';
import { SubjectConfig, AssessmentMode } from '../../types';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';
import { academicService } from '../../services/AcademicService';
import { initialSubjects } from '../../data/demoData';

interface SubjectConfigTabProps {
  onSaved?: () => void;
}

export const SubjectConfigTab: React.FC<SubjectConfigTabProps> = ({ onSaved }) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Modal Add Subject
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubCode, setNewSubCode] = useState<string>('');
  const [newSubPeriods, setNewSubPeriods] = useState<number>(70);
  const [newSubTxCount, setNewSubTxCount] = useState<number>(3);
  const [newSubMode, setNewSubMode] = useState<AssessmentMode>('SCORE_AND_COMMENT');
  const [newSubType, setNewSubType] = useState<'MANDATORY' | 'ELECTIVE' | 'ACTIVITY'>('ELECTIVE');

  // Load subject configuration
  const loadConfig = () => {
    const subs = classService.getSubjects();
    setSubjects(JSON.parse(JSON.stringify(subs)));
    setHasChanges(false);
  };

  useEffect(() => {
    loadConfig();
    return classService.subscribe(loadConfig);
  }, []);

  if (!isTeacher) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-black text-rose-900">Quyền truy cập bị giới hạn</h3>
        <p className="text-xs text-rose-700 max-w-md mx-auto mt-1">
          Chỉ Giáo viên Chủ nhiệm (GVCN) mới có thẩm quyền cấu hình danh mục môn học, số cột kiểm tra và hình thức đánh giá của lớp theo quy định.
        </p>
      </div>
    );
  }

  const handleToggleSelected = (index: number) => {
    setSubjects((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
    setHasChanges(true);
  };

  const handleFieldChange = <K extends keyof SubjectConfig>(index: number, field: K, val: SubjectConfig[K]) => {
    setSubjects((prev) => {
      const copy = [...prev];
      const oldVal = copy[index][field];
      
      // Warn when reducing TX columns count
      if (field === 'txColumnCount' && typeof val === 'number' && typeof oldVal === 'number' && val < oldVal) {
        setWarningMsg(`Lưu ý: Giảm số cột TX của môn ${copy[index].name} từ ${oldVal} xuống ${val}. Dữ liệu điểm cũ ở các cột ${val + 1}..${oldVal} vẫn được hệ thống lưu giữ an toàn.`);
        setTimeout(() => setWarningMsg(null), 5000);
      }

      copy[index] = { ...copy[index], [field]: val };

      // If mode changed to COMMENT_ONLY, set txColumnCount to 0 if desired, or keep
      if (field === 'assessmentMode' && val === 'COMMENT_ONLY') {
        copy[index].txColumnCount = Math.min(copy[index].txColumnCount, 2);
      }

      return copy;
    });
    setHasChanges(true);
  };

  const handleSelectAll = (select: boolean) => {
    setSubjects((prev) => prev.map((s) => ({ ...s, selected: select })));
    setHasChanges(true);
  };

  const handleResetStandard = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục danh mục môn học chuẩn theo Thông tư 43 & CT GDPT 2018 không?')) {
      classService.resetSubjectsToStandardGDPT();
      loadConfig();
      setSuccessMsg('Đã khôi phục danh mục môn học chuẩn GDPT 2018!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setWarningMsg(null);
    setSuccessMsg(null);

    try {
      const res = await classService.updateSubjectList(subjects);
      if (res && res.success === false) {
        setWarningMsg(res.error || 'Không thể đồng bộ cấu hình danh mục môn học lên máy chủ. Vui lòng thử lại.');
        setTimeout(() => setWarningMsg(null), 6000);
      } else {
        academicService.notify();
        setHasChanges(false);
        setSuccessMsg('Đã lưu cấu hình danh mục môn học thành công! Toàn bộ Thời khóa biểu, Báo bài và Bảng điểm đã đồng bộ theo dữ liệu môn học mới.');
        setTimeout(() => setSuccessMsg(null), 4000);
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setWarningMsg(err?.message || 'Lỗi khi lưu cấu hình môn học.');
      setTimeout(() => setWarningMsg(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubject = (id: string, name: string) => {
    if (subjects.length <= 1) {
      setWarningMsg('Lớp học cần có ít nhất 1 môn học.');
      setTimeout(() => setWarningMsg(null), 3000);
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa môn "${name}" khỏi danh sách môn học của lớp?`)) {
      setSubjects((prev) => prev.filter((s) => s.id !== id && s.name !== name));
      setHasChanges(true);
    }
  };

  const handleAddSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const trimmedName = newSubName.trim();
    const generatedCode = newSubCode.trim().toUpperCase() || trimmedName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() || 'SUB';

    const newSub: SubjectConfig = {
      id: `sub-${Date.now()}`,
      name: trimmedName,
      subjectName: trimmedName,
      code: generatedCode,
      subjectCode: generatedCode,
      subjectType: newSubType,
      category: newSubType === 'MANDATORY' ? 'Môn học bắt buộc' : (newSubType === 'ACTIVITY' ? 'Hoạt động giáo dục bắt buộc' : 'Môn học lựa chọn'),
      selected: true,
      annualPeriods: Number(newSubPeriods) || 70,
      txColumnCount: newSubMode === 'COMMENT_ONLY' ? 0 : (Number(newSubTxCount) || 3),
      assessmentMode: newSubMode,
      active: true,
      displayOrder: subjects.length + 1,
      isCustom: true,
      timetableColor: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-900', label: 'Tùy chỉnh' }
    };

    setSubjects((prev) => [...prev, newSub]);
    setHasChanges(true);
    setIsAddModalOpen(false);
    setNewSubName('');
    setNewSubCode('');
    setNewSubPeriods(70);
    setNewSubTxCount(3);
    setNewSubMode('SCORE_AND_COMMENT');
    setNewSubType('ELECTIVE');

    setSuccessMsg(`Đã thêm môn "${trimmedName}". Nhấn "Lưu cấu hình" để áp dụng.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const selectedCount = subjects.filter((s) => s.selected).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Description */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  CẤU HÌNH DANH SÁCH MÔN HỌC CỦA LỚP
                </h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-700">
                  {selectedCount}/{subjects.length} Môn áp dụng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Thiết lập môn học, số tiết, số cột đánh giá thường xuyên và hình thức đánh giá áp dụng cho lớp trong năm học hiện tại theo chuẩn CT GDPT 2018 / GDTX và Thông tư 43.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetStandard}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Khôi phục danh sách theo chương trình GDPT 2018"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Chuẩn GDPT 2018</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm môn học</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveAll()}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black text-white shadow-xs transition-all ${
                isSaving
                  ? 'bg-blue-400 cursor-not-allowed opacity-80'
                  : hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-300 animate-pulse cursor-pointer'
                  : 'bg-slate-800 hover:bg-slate-900 cursor-pointer'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Đang lưu lên máy chủ...' : (hasChanges ? 'Lưu cấu hình môn học *' : 'Lưu cấu hình môn học')}</span>
            </button>
          </div>
        </div>

        {/* Bulk select toggle bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
              <span>[Chọn tất cả]</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="flex items-center gap-1 text-slate-600 hover:text-rose-600 font-bold transition-colors cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 text-slate-400" />
              <span>[Bỏ chọn tất cả]</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Dữ liệu môn học là Single Source of Truth được đồng bộ tự động sang Thời khóa biểu, Báo bài, Nhập điểm & Export Excel.
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {warningMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* Safety Policy Card */}
      <div className="rounded-xl bg-blue-50/60 p-3.5 text-xs text-blue-900 border border-blue-200 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Chính sách bảo toàn dữ liệu điểm:</p>
          <p className="text-[11px] text-blue-800">
            Việc sửa đổi số cột TX hoặc chuyển đổi hình thức đánh giá <span className="font-bold underline">KHÔNG LÀM MẤT</span> dữ liệu điểm số đã nhập của học viên. Khi giảm số cột hiển thị, các điểm đã nhập ở cột vượt quá vẫn được hệ thống lưu giữ an toàn.
          </p>
        </div>
      </div>

      {/* Main Configuration Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-700">
                <th className="py-3 px-3 text-center w-12">Tích chọn</th>
                <th className="py-3 px-3 min-w-[160px]">Tên môn học</th>
                <th className="py-3 px-3 w-28">Mã môn</th>
                <th className="py-3 px-3 w-28 text-center">Số tiết/Năm</th>
                <th className="py-3 px-3 w-32 text-center">Số cột TX</th>
                <th className="py-3 px-3 min-w-[220px]">Hình thức đánh giá</th>
                <th className="py-3 px-3 w-28 text-center">Trạng thái</th>
                <th className="py-3 px-3 text-right w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {subjects.map((sub, idx) => {
                const isSelected = sub.selected !== false;
                const isCommentOnly = sub.assessmentMode === 'COMMENT_ONLY';

                return (
                  <tr
                    key={sub.id || idx}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      !isSelected ? 'opacity-50 bg-slate-50/30' : ''
                    }`}
                  >
                    {/* 1. Tích chọn */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelected(idx)}
                        className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title={isSelected ? 'Bỏ áp dụng môn này' : 'Áp dụng môn này'}
                      />
                    </td>

                    {/* 2. Tên môn học */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{sub.name}</span>
                        {sub.subjectType === 'MANDATORY' && (
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-700 border border-blue-200">
                            Bắt buộc
                          </span>
                        )}
                        {sub.subjectType === 'ELECTIVE' && (
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200">
                            Lựa chọn
                          </span>
                        )}
                        {sub.subjectType === 'ACTIVITY' && (
                          <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-700 border border-purple-200">
                            HĐGD
                          </span>
                        )}
                        {sub.isCustom && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800">
                            Tự tạo
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Mã môn */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={sub.subjectCode || sub.code || ''}
                        onChange={(e) => handleFieldChange(idx, 'subjectCode', e.target.value.toUpperCase())}
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden"
                        placeholder="MÃ"
                      />
                    </td>

                    {/* 4. Số tiết / Năm */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="350"
                        value={sub.annualPeriods !== undefined ? sub.annualPeriods : 70}
                        onChange={(e) => handleFieldChange(idx, 'annualPeriods', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-18 text-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden"
                      />
                    </td>

                    {/* 5. Số cột TX */}
                    <td className="py-3 px-3 text-center">
                      <select
                        value={sub.txColumnCount !== undefined ? sub.txColumnCount : 3}
                        onChange={(e) => handleFieldChange(idx, 'txColumnCount', parseInt(e.target.value))}
                        disabled={isCommentOnly}
                        className={`rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden ${
                          isCommentOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        {isCommentOnly ? (
                          <option value="0">0 cột (Nhận xét)</option>
                        ) : (
                          <>
                            <option value="1">1 cột (TX1)</option>
                            <option value="2">2 cột (TX1, TX2)</option>
                            <option value="3">3 cột (TX1..TX3)</option>
                            <option value="4">4 cột (TX1..TX4)</option>
                            <option value="5">5 cột (TX1..TX5)</option>
                            <option value="6">6 cột (TX1..TX6)</option>
                          </>
                        )}
                      </select>
                    </td>

                    {/* 6. Hình thức đánh giá */}
                    <td className="py-3 px-3">
                      <select
                        value={sub.assessmentMode || 'SCORE_AND_COMMENT'}
                        onChange={(e) => handleFieldChange(idx, 'assessmentMode', e.target.value as AssessmentMode)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                      >
                        <option value="SCORE_AND_COMMENT">
                          📊 Điểm số kết hợp nhận xét (TX, GK, CK)
                        </option>
                        <option value="COMMENT_ONLY">
                          📝 Đánh giá bằng nhận xét (Đạt / Chưa đạt)
                        </option>
                      </select>
                    </td>

                    {/* 7. Trạng thái */}
                    <td className="py-3 px-3 text-center">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                          <Check className="h-3 w-3" />
                          <span>Áp dụng</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          Tạm ẩn
                        </span>
                      )}
                    </td>

                    {/* 8. Thao tác */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id, sub.name)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Xóa môn học"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 p-4">
          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{subjects.length}</strong> môn ({selectedCount} môn đang áp dụng trong năm học)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetStandard}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy thay đổi
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveAll()}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors ${
                isSaving
                  ? 'bg-blue-400 cursor-not-allowed opacity-80'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Đang lưu lên máy chủ...' : 'Lưu cấu hình môn học'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Thêm môn học */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-black text-slate-800">Thêm môn học mới cho lớp</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubjectSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên môn học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Âm nhạc, Mỹ thuật, Tiếng Pháp..."
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã môn (viết tắt)</label>
                  <input
                    type="text"
                    placeholder="TỰ ĐỘNG"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân loại môn</label>
                  <select
                    value={newSubType}
                    onChange={(e) => setNewSubType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="MANDATORY">Bắt buộc</option>
                    <option value="ELECTIVE">Lựa chọn</option>
                    <option value="ACTIVITY">Hoạt động GD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số tiết/Năm</label>
                <input
                  type="number"
                  min="0"
                  max="350"
                  value={newSubPeriods}
                  onChange={(e) => setNewSubPeriods(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hình thức đánh giá</label>
                <select
                  value={newSubMode}
                  onChange={(e) => setNewSubMode(e.target.value as AssessmentMode)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="SCORE_AND_COMMENT">Điểm số kết hợp nhận xét (TX, GK, CK)</option>
                  <option value="COMMENT_ONLY">Chỉ đánh giá bằng nhận xét (Đạt / Chưa đạt)</option>
                </select>
              </div>

              {newSubMode === 'SCORE_AND_COMMENT' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số cột điểm thường xuyên (TX)</label>
                  <select
                    value={newSubTxCount}
                    onChange={(e) => setNewSubTxCount(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="1">1 cột TX</option>
                    <option value="2">2 cột TX</option>
                    <option value="3">3 cột TX</option>
                    <option value="4">4 cột TX</option>
                    <option value="5">5 cột TX</option>
                    <option value="6">6 cột TX</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  Thêm vào danh sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
