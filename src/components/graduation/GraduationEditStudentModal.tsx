/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Edit3, X, Save, AlertCircle, Sparkles, ShieldCheck, Trash2, HelpCircle } from 'lucide-react';
import { GraduationRegistration } from '../../types';
import { graduationService, ELECTIVE_SUBJECTS_LIST } from '../../services/GraduationService';

interface GraduationEditStudentModalProps {
  registration: GraduationRegistration;
  onClose: () => void;
}

export const GraduationEditStudentModal: React.FC<GraduationEditStudentModalProps> = ({ registration, onClose }) => {
  const [electiveSubject1, setElectiveSubject1] = useState<string>(registration.electiveSubject1 || '');
  const [electiveSubject2, setElectiveSubject2] = useState<string>(registration.electiveSubject2 || '');
  const [isForeignLanguageExempt, setIsForeignLanguageExempt] = useState<boolean>(!!registration.isForeignLanguageExempt);

  const [math, setMath] = useState<string>(registration.scores?.math !== undefined ? String(registration.scores.math) : '');
  const [literature, setLiterature] = useState<string>(registration.scores?.literature !== undefined ? String(registration.scores.literature) : '');
  const [elective1Score, setElective1Score] = useState<string>(registration.scores?.elective1 !== undefined ? String(registration.scores.elective1) : '');
  const [elective2Score, setElective2Score] = useState<string>(registration.scores?.elective2 !== undefined ? String(registration.scores.elective2) : '');

  const [gpa10, setGpa10] = useState<string>(registration.gpa10 !== undefined ? String(registration.gpa10) : '');
  const [gpa11, setGpa11] = useState<string>(registration.gpa11 !== undefined ? String(registration.gpa11) : '');
  const [gpa12, setGpa12] = useState<string>(registration.gpa12 !== undefined ? String(registration.gpa12) : '');

  const [priorityBonus, setPriorityBonus] = useState<string>(() => {
    const n = Number(registration.priorityBonus ?? 0);
    return isNaN(n) ? '0' : String(n);
  });
  const [encouragementBonus, setEncouragementBonus] = useState<string>(() => {
    const n = Number(registration.encouragementBonus ?? 0);
    return isNaN(n) ? '0' : String(n);
  });
  const [teacherNote, setTeacherNote] = useState<string>(registration.teacherNote || '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showEncouragementGuide, setShowEncouragementGuide] = useState<boolean>(false);
  const [showPriorityGuide, setShowPriorityGuide] = useState<boolean>(false);

  const handleDelete = async () => {
    if (!window.confirm(`Xác nhận xóa bản ghi đăng ký tốt nghiệp của học sinh "${registration.studentName}"?`)) {
      return;
    }
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await graduationService.deleteRegistration(registration.studentId);
      onClose();
    } catch (err: any) {
      console.error('Error deleting graduation record:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi xóa dữ liệu.');
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isDeleting) return;
    setErrorMsg(null);

    if (!isForeignLanguageExempt && electiveSubject1 && electiveSubject2 && electiveSubject1 === electiveSubject2) {
      setErrorMsg('Hai môn thi tự chọn không được trùng nhau.');
      return;
    }

    setIsSaving(true);

    try {
      const parseNum = (val: string, label: string) => {
        if (val.trim() === '') return undefined;
        const n = parseFloat(val.replace(',', '.'));
        if (isNaN(n) || n < 0 || n > 10) {
          throw new Error(`Điểm ${label} phải nằm trong khoảng từ 0 đến 10.`);
        }
        return n;
      };

      const parsedPrio = Number(priorityBonus.replace(',', '.'));
      if (isNaN(parsedPrio) || ![0, 0.25, 0.5].includes(parsedPrio)) {
        throw new Error('Điểm Ưu tiên không hợp lệ. Chỉ chấp nhận các mức theo quy định: 0, 0.25 hoặc 0.5 điểm.');
      }

      const parsedEnc = Number(encouragementBonus.replace(',', '.'));
      if (isNaN(parsedEnc) || ![0, 1, 1.5, 2].includes(parsedEnc)) {
        throw new Error('Điểm Khuyến khích không hợp lệ. Chỉ chấp nhận một mức điểm của giải cao nhất theo quy định: 0, 1.0, 1.5 hoặc 2.0 điểm.');
      }

      const trimmedNote = teacherNote.trim();
      const hasReasons = Array.isArray(registration.flagReasons) && registration.flagReasons.length > 0;
      const nextIsFlagged = trimmedNote.length > 0 ? true : hasReasons ? Boolean(registration.isFlagged) : false;

      await graduationService.updateRegistration(registration.studentId, {
        studentId: registration.studentId,
        studentCode: registration.studentCode,
        studentName: registration.studentName,
        electiveSubject1: electiveSubject1 || '',
        electiveSubject2: isForeignLanguageExempt ? (electiveSubject2 || 'Ngoại ngữ') : (electiveSubject2 || ''),
        isForeignLanguageExempt,
        scores: {
          math: parseNum(math, 'Toán'),
          literature: parseNum(literature, 'Ngữ văn'),
          elective1: parseNum(elective1Score, 'Môn tự chọn 1'),
          elective2: isForeignLanguageExempt ? undefined : parseNum(elective2Score, 'Môn tự chọn 2')
        },
        gpa10: parseNum(gpa10, 'ĐTB Lớp 10'),
        gpa11: parseNum(gpa11, 'ĐTB Lớp 11'),
        gpa12: parseNum(gpa12, 'ĐTB Lớp 12'),
        priorityBonus: parsedPrio,
        encouragementBonus: parsedEnc,
        isFlagged: nextIsFlagged,
        teacherNote: trimmedNote,
        schoolYear: registration.schoolYear,
        updatedBy: 'Giáo viên chủ nhiệm'
      });

      onClose();
    } catch (err: any) {
      console.error('Error updating graduation scores:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                CẬP NHẬT DỮ LIỆU TỐT NGHIỆP THPT
              </h3>
              <p className="text-[11px] text-slate-500">
                {registration.studentName} ({registration.studentCode}) • Tổ {registration.studentGroup}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Elective Subjects */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">
                1. 02 MÔN THI TỰ CHỌN & MIỄN THI NGOẠI NGỮ
              </span>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isForeignLanguageExempt}
                  onChange={e => setIsForeignLanguageExempt(e.target.checked)}
                  className="h-3.5 w-3.5 rounded text-emerald-600"
                />
                <span>Miễn thi Ngoại ngữ</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Môn tự chọn 1</span>
                <select
                  value={electiveSubject1}
                  onChange={e => setElectiveSubject1(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold text-blue-900"
                >
                  <option value="">-- Chọn môn TC 1 --</option>
                  {ELECTIVE_SUBJECTS_LIST.map(s => (
                    <option key={s} value={s} disabled={!isForeignLanguageExempt && s === electiveSubject2}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Môn tự chọn 2</span>
                <select
                  value={isForeignLanguageExempt ? 'Ngoại ngữ' : electiveSubject2}
                  disabled={isForeignLanguageExempt}
                  onChange={e => setElectiveSubject2(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold text-indigo-900 disabled:bg-slate-100"
                >
                  <option value="">{isForeignLanguageExempt ? 'Miễn thi Ngoại ngữ' : '-- Chọn môn TC 2 --'}</option>
                  {ELECTIVE_SUBJECTS_LIST.map(s => (
                    <option key={s} value={s} disabled={s === electiveSubject1}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Exam Scores */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">
              2. ĐIỂM 4 MÔN THI DỰ KIẾN (THANG ĐIỂM 10)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block">Toán (Bắt buộc)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={math}
                  onChange={e => setMath(e.target.value)}
                  placeholder="8.0"
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block">Ngữ văn (Bắt buộc)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={literature}
                  onChange={e => setLiterature(e.target.value)}
                  placeholder="7.5"
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-blue-50/50 p-2.5 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 block truncate">
                  {electiveSubject1 || 'Môn TC 1'}
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={elective1Score}
                  onChange={e => setElective1Score(e.target.value)}
                  placeholder="8.5"
                  className="w-full rounded-lg border border-blue-300 bg-white p-1.5 text-xs font-bold text-blue-900"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-indigo-50/50 p-2.5 border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-800 block truncate">
                  {isForeignLanguageExempt ? 'Ngoại ngữ (Miễn)' : (electiveSubject2 || 'Môn TC 2')}
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isForeignLanguageExempt}
                  value={isForeignLanguageExempt ? '' : elective2Score}
                  onChange={e => setElective2Score(e.target.value)}
                  placeholder={isForeignLanguageExempt ? 'Miễn' : '8.0'}
                  className="w-full rounded-lg border border-indigo-300 bg-white p-1.5 text-xs font-bold text-indigo-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: GPA 3 Years */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">
              3. ĐIỂM HỌC BẠ 3 NĂM HỌC (HỆ SỐ 1-2-3)
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block">ĐTB Lớp 10 (×1)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={gpa10}
                  onChange={e => setGpa10(e.target.value)}
                  placeholder="8.0"
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block">ĐTB Lớp 11 (×2)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={gpa11}
                  onChange={e => setGpa11(e.target.value)}
                  placeholder="8.2"
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block">ĐTB Lớp 12 (×3)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  value={gpa12}
                  onChange={e => setGpa12(e.target.value)}
                  placeholder="8.5"
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bonus points & Teacher Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Điểm Khuyến khích</label>
                <button
                  type="button"
                  onClick={() => setShowEncouragementGuide(prev => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>{showEncouragementGuide ? 'Ẩn hướng dẫn' : 'Tra cứu mức điểm'}</span>
                </button>
              </div>
              <select
                value={encouragementBonus}
                onChange={e => setEncouragementBonus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-bold"
              >
                <option value="0">0.0 điểm</option>
                <option value="1">1.0 điểm</option>
                <option value="1.5">1.5 điểm</option>
                <option value="2">2.0 điểm</option>
                {!['0', '1', '1.5', '2'].includes(encouragementBonus) && (
                  <option value={encouragementBonus}>{encouragementBonus} điểm</option>
                )}
              </select>
              {showEncouragementGuide && (
                <div className="mt-1.5 rounded-xl bg-blue-50/70 p-2.5 border border-blue-200 text-[11px] text-slate-700 space-y-1 leading-relaxed">
                  <div className="font-extrabold text-blue-950 uppercase text-[10px]">
                    Tra cứu Điểm Khuyến khích (Cấp THPT)
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong className="text-slate-900">+2,0 điểm:</strong> Giải Nhất, Nhì, Ba kỳ thi chọn HSG quốc gia hoặc giải Nhất cấp tỉnh; Giải Nhất, Nhì, Ba quốc gia hoặc giải Nhất cấp tỉnh / Huy chương Vàng các cuộc thi thí nghiệm thực hành (Vật lí, Hóa học, Sinh học), văn nghệ, TDTT, hội thao GDQP, KHKT, viết thư quốc tế do ngành Giáo dục phối hợp tổ chức từ cấp tỉnh trở lên.
                    </li>
                    <li>
                      <strong className="text-slate-900">+1,5 điểm:</strong> Giải Khuyến khích kỳ thi chọn HSG quốc gia hoặc giải Nhì cấp tỉnh; Giải KK quốc gia, giải Tư KHKT cấp quốc gia hoặc giải Nhì cấp tỉnh / Huy chương Bạc các cuộc thi nêu trên.
                    </li>
                    <li>
                      <strong className="text-slate-900">+1,0 điểm:</strong> Giải Ba cấp tỉnh kỳ thi chọn HSG; Giải Ba cấp tỉnh / Huy chương Đồng các cuộc thi nêu trên.
                    </li>
                  </ul>
                  <div className="text-[10px] text-slate-600 pt-1 border-t border-blue-200/70 space-y-0.5">
                    <div>
                      <strong>Nguyên tắc:</strong> Giải đồng đội chỉ cộng đối với giải cấp quốc gia. Đoạt nhiều giải khác nhau chỉ hưởng một mức điểm của giải cao nhất.
                    </div>
                    <div>
                      <strong>Căn cứ pháp lý:</strong> Điều 43 Quy chế thi tốt nghiệp THPT (Thông tư số 24/2024/TT-BGDĐT, sửa đổi bổ sung bởi Thông tư số 13/2026/TT-BGDĐT).
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Điểm Ưu tiên</label>
                <button
                  type="button"
                  onClick={() => setShowPriorityGuide(prev => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>{showPriorityGuide ? 'Ẩn hướng dẫn' : 'Tra cứu mức điểm'}</span>
                </button>
              </div>
              <select
                value={priorityBonus}
                onChange={e => setPriorityBonus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs font-bold"
              >
                <option value="0">Diện 1 (0đ)</option>
                <option value="0.25">Diện 2 (+0.25đ)</option>
                <option value="0.5">Diện 3 (+0.50đ)</option>
                {!['0', '0.25', '0.5'].includes(priorityBonus) && (
                  <option value={priorityBonus}>+{priorityBonus}đ</option>
                )}
              </select>
              {showPriorityGuide && (
                <div className="mt-1.5 rounded-xl bg-indigo-50/70 p-2.5 border border-indigo-200 text-[11px] text-slate-700 space-y-1 leading-relaxed">
                  <div className="font-extrabold text-indigo-950 uppercase text-[10px]">
                    Tra cứu Điểm Ưu tiên Xét Tốt nghiệp
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong className="text-slate-900">Diện 1 (0,0 điểm):</strong> Thí sinh bình thường không thuộc diện hưởng ưu tiên.
                    </li>
                    <li>
                      <strong className="text-slate-900">Diện 2 (+0,25 điểm):</strong> Thương binh, bệnh binh, người hưởng chính sách như thương binh suy giảm KNLĐ dưới 81% (GDTX) hoặc con của các đối tượng này; Anh hùng LLVTND, Anh hùng Lao động, con Bà mẹ VNAH, con Anh hùng LLVTND/Lao động; Người dân tộc thiểu số; Người Kinh, người nước ngoài cư trú tại Việt Nam học ít nhất 2/3 thời gian cấp THPT tại trường phổ thông (không thuộc các quận của TP trực thuộc TW) ở xã ĐBKK, xã biên giới, xã an toàn khu (CT 135), xã ĐBKK vùng bãi ngang ven biển và hải đảo, xã khu vực I, II, III hoặc xã có thôn ĐBKK vùng đồng bào DTTS và miền núi; Người nhiễm chất độc hóa học hoặc con của họ, người bị dị dạng/dị tật/suy giảm khả năng tự lực do chất độc hóa học; Thí sinh GDTX từ 35 tuổi trở lên tính đến ngày thi.
                    </li>
                    <li>
                      <strong className="text-slate-900">Diện 3 (+0,50 điểm):</strong> Người dân tộc thiểu số học ít nhất 2/3 thời gian cấp THPT tại các xã ĐBKK, xã biên giới, xã an toàn khu (CT 135), xã ĐBKK vùng bãi ngang ven biển và hải đảo, xã khu vực I, II, III và xã có thôn ĐBKK vùng đồng bào DTTS và miền núi; Thương binh, bệnh binh, người hưởng chính sách như thương binh suy giảm KNLĐ từ 81% trở lên (GDTX); Con của liệt sĩ; con của thương binh, bệnh binh, người hưởng chính sách như thương binh suy giảm KNLĐ từ 81% trở lên.
                    </li>
                  </ul>
                  <div className="text-[10px] text-slate-600 pt-1 border-t border-indigo-200/70 space-y-0.5">
                    <div>
                      <strong>Nguyên tắc:</strong> Thí sinh có nhiều tiêu chuẩn ưu tiên chỉ được hưởng tiêu chuẩn ưu tiên cao nhất.
                    </div>
                    <div>
                      <strong>Căn cứ pháp lý:</strong> Điều 42 Quy chế thi tốt nghiệp THPT (Thông tư số 24/2024/TT-BGDĐT, sửa đổi bổ sung bởi Thông tư số 13/2026/TT-BGDĐT).
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Ghi chú & Hướng hỗ trợ của GVCN</label>
            <textarea
              value={teacherNote}
              onChange={e => setTeacherNote(e.target.value)}
              rows={2}
              placeholder="VD: Cần bổ trợ thêm môn Toán, nhắc nhở ôn tập chuyên đề..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2 text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? 'Đang xóa...' : 'Xóa đăng ký'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
