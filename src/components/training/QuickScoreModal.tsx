/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PlusCircle, MinusCircle, Award, CheckCircle2, ShieldCheck } from 'lucide-react';
import { trainingService } from '../../services/TrainingService';
import { studentService } from '../../services/StudentService';
import { authService } from '../../services/AuthService';
import { Student } from '../../types';

interface QuickScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickScoreModal: React.FC<QuickScoreModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [students, setStudents] = useState<Student[]>(studentService.getAll());
  const currentUser = authService.getCurrentUser();

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [pointsType, setPointsType] = useState<'plus' | 'minus'>('plus');
  const [points, setPoints] = useState<number>(5);
  const [category, setCategory] = useState<string>('Học tập');
  const [reason, setReason] = useState<string>('');
  const [parentVisible, setParentVisible] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStudents(studentService.getAll());
      setSelectedStudentIds([]);
      setReason('');
      setStudentSearch('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const currentRules = trainingService.getRules();
  const predefinedReasons = useMemo(() => {
    const defaultDict: Record<string, { text: string; pts: number; icon?: string }[]> = {
      'Học tập': [
        { text: 'Điểm kiểm tra đạt từ 9.0 trở lên', pts: 10 },
        { text: 'Hăng hái phát biểu xây dựng bài', pts: 5 },
        { text: 'Làm bài tập đầy đủ, chuẩn bị bài tốt', pts: 5 },
        { text: 'Không làm bài tập về nhà', pts: -5 },
        { text: 'Nói chuyện riêng trong giờ học', pts: -5 }
      ],
      'Nề nếp & Kỷ luật': [
        { text: 'Đi học muộn không phép', pts: -5 },
        { text: 'Nghỉ học không phép', pts: -5 },
        { text: 'Vi phạm đồng phục / tác phong', pts: -5 },
        { text: 'Sử dụng điện thoại trong giờ học', pts: -10 },
        { text: 'Chấp hành nghiêm túc nội quy', pts: 5 }
      ],
      'Phong trào & Hoạt động': [
        { text: 'Tham gia hoạt động phong trào Đoàn', pts: 10 },
        { text: 'Tích cực tham gia văn nghệ, thể thao', pts: 10 },
        { text: 'Đạt giải phong trào cấp Trường/Tỉnh', pts: 20 },
        { text: 'Không tham gia sinh hoạt tập thể', pts: -5 }
      ],
      'Việc tốt & Giúp đỡ': [
        { text: 'Giúp đỡ bạn bè cùng tiến bộ', pts: 5 },
        { text: 'Nhặt được của rơi trả người đánh mất', pts: 10 },
        { text: 'Tích cực vệ sinh lớp học, giữ gìn tài sản chung', pts: 5 }
      ],
      'Khác': [
        { text: 'Có tiến bộ vượt bậc tuần này', pts: 10 },
        { text: 'Ghi nhận đặc biệt của GVCN', pts: 5 }
      ]
    };

    currentRules.forEach(r => {
      const cat = r.category in defaultDict ? r.category : 'Khác';
      if (!defaultDict[cat].some(p => p.text === r.title)) {
        defaultDict[cat].push({
          text: r.title,
          pts: r.points,
          icon: r.icon
        });
      }
    });

    return defaultDict;
  }, [currentRules]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      `tổ ${s.group}`.includes(q)
    );
  }, [students, studentSearch]);

  const handleSelectPreset = (presetText: string, presetPts: number) => {
    setReason(presetText);
    setErrorMessage(null);
    if (presetPts < 0) {
      setPointsType('minus');
      setPoints(Math.abs(presetPts));
    } else {
      setPointsType('plus');
      setPoints(presetPts);
    }
  };

  const handleToggleStudent = (id: string) => {
    setErrorMessage(null);
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setErrorMessage(null);
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  const isTeacher = currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (selectedStudentIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một học sinh nhận điểm.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập nội dung ghi nhận chi tiết.');
      return;
    }

    setIsSubmitting(true);
    const finalPoints = pointsType === 'plus' ? Math.abs(points) : -Math.abs(points);

    try {
      trainingService.recordTransaction({
        studentIds: selectedStudentIds,
        points: finalPoints,
        category,
        reason: reason.trim(),
        recordedBy: currentUser.name,
        proposedByName: currentUser.name,
        proposedByRole: currentUser.role,
        role: currentUser.role,
        status: isTeacher ? 'approved' : 'pending',
        reviewStatus: isTeacher ? 'approved' : 'pending',
        parentVisible: isTeacher ? parentVisible : false
      });

      setSuccessMessage(`Đã ghi nhận ${finalPoints > 0 ? '+' : ''}${finalPoints} điểm cho ${selectedStudentIds.length} học sinh thành công!`);

      if (onSuccess) onSuccess();

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage(null);
        setSelectedStudentIds([]);
        setReason('');
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(`Lỗi khi ghi nhận điểm: ${err?.message || 'Vui lòng thử lại.'}`);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isTeacher ? 'Ghi Nhận Điểm Rèn Luyện & Việc Tốt' : 'Báo Cáo Nhanh Rèn Luyện (Gửi GVCN Duyệt)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTeacher
                  ? 'Cộng/Trừ điểm trực tiếp vào Cây Nguyệt Quế của học viên'
                  : 'Báo cáo sự kiện rèn luyện/vi phạm để GVCN phê duyệt chính thức'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200 animate-fade-in">
            <X className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Student selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                1. Chọn Học sinh nhận điểm ({selectedStudentIds.length} đã chọn)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Tìm học sinh..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-800 outline-hidden w-28 sm:w-36 focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {selectedStudentIds.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn cả lớp'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50/50">
              {filteredStudents.map((s) => {
                const isSelected = selectedStudentIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleToggleStudent(s.id)}
                    className={`flex items-center gap-2 rounded-lg p-1.5 text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <img src={s.avatar} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                    <span className="truncate">{s.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">2. Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 outline-hidden bg-white"
              >
                <option value="Học tập">📚 Học tập</option>
                <option value="Nề nếp & Kỷ luật">⏰ Nề nếp & Kỷ luật</option>
                <option value="Phong trào & Hoạt động">🎉 Phong trào</option>
                <option value="Việc tốt & Giúp đỡ">❤️ Việc tốt & Giúp đỡ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Loại điểm</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPointsType('plus')}
                  className={`rounded-lg py-1 text-xs font-bold transition-all ${
                    pointsType === 'plus' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  + Điểm cộng
                </button>
                <button
                  type="button"
                  onClick={() => setPointsType('minus')}
                  className={`rounded-lg py-1 text-xs font-bold transition-all ${
                    pointsType === 'minus' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  - Điểm trừ
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số điểm ({pointsType === 'plus' ? '+' : '-'})</label>
              <input
                type="number"
                min="1"
                max="50"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-black text-slate-900 outline-hidden"
              />
            </div>
          </div>

          {/* Preset Reasons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Lý do nhanh mẫu</label>
            <div className="flex flex-wrap gap-1.5">
              {(predefinedReasons as any)[category]?.map((preset: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset.text, preset.pts)}
                  className="rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-[11px] text-slate-700 border border-slate-200 transition-colors"
                >
                  {preset.text} ({preset.pts > 0 ? `+${preset.pts}` : preset.pts}đ)
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung ghi nhận chi tiết</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do rèn luyện..."
              rows={2}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-hidden"
              required
            />
          </div>

          {/* Parent Visibility */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={parentVisible}
                onChange={(e) => setParentVisible(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Hiển thị thông báo này tới Phụ huynh của học sinh</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Đang ghi nhận...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isTeacher ? 'Lưu & Tích điểm chính thức' : 'Gửi đề xuất / Chờ duyệt'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
