/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Award,
  User,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import {
  ConductEvaluationPeriodType,
  ConductEvaluationGrade,
  ConductStudentEvaluation,
  Student
} from '../../types';
import { conductEvaluationService } from '../../services/ConductEvaluationService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { normalizeConductGrade, extractCleanAnswerText } from '../../utils/surveyAnswerUtils';

const GRADE_OPTIONS: Array<{
  value: ConductEvaluationGrade;
  label: string;
  desc: string;
  colorClass: string;
  activeClass: string;
}> = [
  {
    value: 'Tốt',
    label: 'Tốt',
    desc: 'Chấp hành xuất sắc kỷ luật, nề nếp, tích cực tham gia phong trào',
    colorClass: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
    activeClass: 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
  },
  {
    value: 'Khá',
    label: 'Khá',
    desc: 'Thực hiện tốt nội quy, không vi phạm quy chế lớp học',
    colorClass: 'border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400',
    activeClass: 'border-blue-600 bg-blue-600 text-white shadow-xs'
  },
  {
    value: 'Đạt',
    label: 'Đạt',
    desc: 'Có khuyết điểm nhỏ nhưng đã khắc phục và cố gắng rèn luyện',
    colorClass: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400',
    activeClass: 'border-amber-600 bg-amber-600 text-white shadow-xs'
  },
  {
    value: 'Chưa đạt',
    label: 'Chưa đạt',
    desc: 'Còn vi phạm nội quy, chưa hoàn thành kế hoạch rèn luyện',
    colorClass: 'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-400',
    activeClass: 'border-rose-600 bg-rose-600 text-white shadow-xs'
  }
];

interface StudentConductSelfAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  initialPeriod?: ConductEvaluationPeriodType;
  onSaved?: () => void;
}

export const StudentConductSelfAssessmentModal: React.FC<StudentConductSelfAssessmentModalProps> = ({
  isOpen,
  onClose,
  studentId,
  initialPeriod = 'SEMESTER_1',
  onSaved
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ConductEvaluationPeriodType>(
    initialPeriod === 'SEMESTER_2' ? 'SEMESTER_2' : 'SEMESTER_1'
  );

  const student: Student | undefined = useMemo(() => {
    return studentService.getById(studentId);
  }, [studentId]);

  const classSettings = classService.getSettings();

  // Current evaluation in system for the selected period
  const [evaluation, setEvaluation] = useState<ConductStudentEvaluation | undefined>(undefined);
  const [isFinalized, setIsFinalized] = useState<boolean>(false);

  // Form states (Method A - Manual entry)
  const [formGrade, setFormGrade] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('Học viên tự nhận xét');

  // Survey sync states (Method B - Survey sync)
  const [isSyncingSurvey, setIsSyncingSurvey] = useState<boolean>(false);
  const [surveyPreview, setSurveyPreview] = useState<{
    grade: string;
    note: string;
    sourceTitle: string;
    submittedAt?: string;
  } | null>(null);
  const [surveySyncMsg, setSurveySyncMsg] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  // Status and messages
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Load current data when student or period changes
  const loadPeriodData = () => {
    const session = conductEvaluationService.getOrCreateEvaluation(selectedPeriod);
    setIsFinalized(session.status === 'FINALIZED');
    const studentEval = session.evaluations?.find(e => e.studentId === studentId);
    setEvaluation(studentEval);

    const cleanGrade = normalizeConductGrade(studentEval?.selfAssessment) || '';
    setFormGrade(cleanGrade);

    // Extract autoSummaryNote or teacherNote
    let existingNote = '';
    if (studentEval?.autoSummaryNote && studentEval.autoSummaryNote.includes('Tự nhận xét:')) {
      const match = studentEval.autoSummaryNote.match(/Tự nhận xét:\s*([^|;]+)/);
      if (match) existingNote = match[1].trim();
    }
    setFormNote(existingNote);
    setSelectedSource(studentEval?.selfAssessmentSource || 'Học viên tự nhận xét');
    setSurveyPreview(null);
    setSurveySyncMsg(null);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  useEffect(() => {
    if (isOpen) {
      loadPeriodData();
    }
  }, [isOpen, studentId, selectedPeriod]);

  // Method B: Sync from survey
  const handleCheckSurvey = () => {
    setIsSyncingSurvey(true);
    setSurveySyncMsg(null);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const surveyResult = conductEvaluationService.getSurveySelfAssessment(studentId, selectedPeriod);

      if (!surveyResult || !surveyResult.grade) {
        setSurveyPreview(null);
        setSurveySyncMsg({
          type: 'warning',
          text: `Không tìm thấy bài khảo sát rèn luyện phù hợp cho ${selectedPeriod === 'SEMESTER_1' ? 'Học kỳ I' : 'Học kỳ II'} của bạn. Vui lòng sử dụng Phương thức A (nhập thủ công) hoặc hoàn thành bài khảo sát trong mục "Khảo sát".`
        });
      } else {
        const cleanGrade = normalizeConductGrade(surveyResult.grade);
        const cleanNote = extractCleanAnswerText(surveyResult.note);
        setSurveyPreview({
          grade: cleanGrade,
          note: cleanNote,
          sourceTitle: surveyResult.sourceTitle,
          submittedAt: surveyResult.submittedAt
        });
        setSurveySyncMsg({
          type: 'success',
          text: `Tìm thấy bài nộp khảo sát rèn luyện: "${surveyResult.sourceTitle}". Bạn có thể bấm "Áp dụng vào biểu mẫu" bên dưới để cập nhật.`
        });
      }
    } catch (e) {
      setSurveySyncMsg({
        type: 'warning',
        text: 'Có lỗi xảy ra khi tra cứu khảo sát. Vui lòng thử lại hoặc nhập thủ công.'
      });
    } finally {
      setIsSyncingSurvey(false);
    }
  };

  // Apply survey preview to form
  const handleApplySurvey = () => {
    if (!surveyPreview) return;
    setFormGrade(surveyPreview.grade);
    if (surveyPreview.note) {
      setFormNote(surveyPreview.note);
    }
    setSelectedSource(surveyPreview.sourceTitle || 'Đồng bộ từ khảo sát rèn luyện');
    setSurveySyncMsg({
      type: 'info',
      text: `Đã điền mức xếp loại "${surveyPreview.grade}" từ khảo sát vào biểu mẫu. Vui lòng bấm "Lưu tự nhận xét" để hoàn tất.`
    });
  };

  // Save changes to primary conduct evaluation storage
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (!formGrade) {
      setSaveErrorMsg('Vui lòng chọn mức xếp loại tự nhận xét rèn luyện (Tốt, Khá, Đạt hoặc Chưa đạt).');
      return;
    }

    if (isFinalized) {
      setSaveErrorMsg('Đợt đánh giá rèn luyện học kỳ này đã được GVCN chốt chính thức, không thể sửa đổi.');
      return;
    }

    setIsSaving(true);
    try {
      const res = conductEvaluationService.updateStudentSelfAssessment(
        studentId,
        selectedPeriod,
        formGrade,
        formNote,
        selectedSource
      );

      if (res.success) {
        setSaveSuccessMsg(res.message);
        loadPeriodData();
        if (onSaved) onSaved();
      } else {
        setSaveErrorMsg(res.message);
      }
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Lỗi khi lưu tự nhận xét rèn luyện.');
    } finally {
      setIsSaving(false);
    }
  };

  // Conflict detection between student self assessment and teacher Excel assessment
  const teacherGrade = normalizeConductGrade(evaluation?.teacherAssessment);
  const cleanSelfGrade = normalizeConductGrade(formGrade);
  const hasConflict = Boolean(teacherGrade && cleanSelfGrade && teacherGrade !== cleanSelfGrade);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 animate-scale-up space-y-4 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 tracking-wider">
                Rèn Luyện Định Kỳ
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Năm học {classSettings.academicYear || '2024-2025'} • Lớp {classSettings.className || '11A1'}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              <span>Tự Nhận Xét & Đánh Giá Rèn Luyện Học Viên</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Học viên: <b className="text-slate-800">{student?.fullName || 'Học viên'}</b> ({student?.code || 'HV'}) • GVCN: {classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Semester Tab Switcher */}
        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedPeriod('SEMESTER_1')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                selectedPeriod === 'SEMESTER_1'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Học kỳ I (HKI)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('SEMESTER_2')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                selectedPeriod === 'SEMESTER_2'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Học kỳ II (HKII)</span>
            </button>
          </div>

          <div className="pr-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 ${
                isFinalized
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isFinalized ? '🔒 Đã chốt chính thức (Khóa sửa)' : '🟢 Đang mở nhận xét (Dự thảo)'}
            </span>
          </div>
        </div>

        {/* Informative notice on data independence */}
        <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200 p-3 text-xs text-indigo-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-[11px] text-indigo-950 uppercase tracking-wide">
              Nguyên tắc lưu trữ & bảo vệ dữ liệu
            </div>
            <div className="text-[11px] text-indigo-800 leading-relaxed">
              Mục "Học viên tự nhận xét" được lưu độc lập với cột "Đánh giá của GVCN" (nhập từ Excel/Sổ rèn luyện). Khi có chênh lệch giữa hai nguồn, hệ thống giữ nguyên cả hai và hiển thị cảnh báo đối chiếu minh bạch.
            </div>
          </div>
        </div>

        {/* SECTION: TWO INPUT METHODS */}
        <div className="space-y-4">
          {/* METHOD B: SYNC FROM SURVEY */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h4 className="font-black text-xs text-blue-950 uppercase tracking-wider">
                  Phương Thức B — Đồng Bộ Từ Khảo Sát Rèn Luyện
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCheckSurvey}
                disabled={isSyncingSurvey || isFinalized}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                title={`Tra cứu kết quả khảo sát tự đánh giá của ${selectedPeriod === 'SEMESTER_1' ? 'HKI' : 'HKII'}`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingSurvey ? 'animate-spin' : ''}`} />
                <span>{isSyncingSurvey ? 'Đang tra cứu...' : `Tra cứu khảo sát ${selectedPeriod === 'SEMESTER_1' ? 'HKI' : 'HKII'}`}</span>
              </button>
            </div>

            {surveySyncMsg && (
              <div
                className={`rounded-xl p-3 text-xs leading-relaxed ${
                  surveySyncMsg.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : surveySyncMsg.type === 'info'
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {surveySyncMsg.text}
              </div>
            )}

            {surveyPreview && (
              <div className="rounded-xl border border-blue-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Biểu mẫu nguồn:</span>
                  <span className="text-xs font-extrabold text-blue-900">{surveyPreview.sourceTitle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Mức xếp loại đã chọn:</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                    {surveyPreview.grade}
                  </span>
                </div>
                {surveyPreview.note && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <b className="text-slate-700">Ghi chú tự đánh giá:</b> {surveyPreview.note}
                  </div>
                )}
                {surveyPreview.submittedAt && (
                  <div className="text-[10px] text-slate-400">
                    Thời gian nộp: {new Date(surveyPreview.submittedAt).toLocaleString('vi-VN')}
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplySurvey}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Áp dụng dữ liệu khảo sát này vào biểu mẫu</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* METHOD A: MANUAL ENTRY & COMPARISON WITH TEACHER/EXCEL DATA */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="h-4 w-4 text-emerald-600" />
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                  Phương Thức A — Nhập Thủ Công & Đối Chiếu Dữ Liệu GVCN (Excel)
                </h4>
              </div>

              {/* Step 1: Select Grade */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Mức xếp loại rèn luyện tự nhận xét: <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRADE_OPTIONS.map(opt => {
                    const isSelected = formGrade === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isFinalized}
                        onClick={() => {
                          setFormGrade(opt.value);
                          if (!selectedSource.includes('khảo sát')) {
                            setSelectedSource('Học viên tự nhận xét thủ công');
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected ? opt.activeClass : opt.colorClass
                        } disabled:opacity-50`}
                      >
                        <div className="font-black text-sm">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 line-clamp-2 ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Note / Reflection text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Nội dung tự nhận xét & Minh chứng rèn luyện:
                </label>
                <textarea
                  rows={3}
                  disabled={isFinalized}
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Ghi rõ các ưu điểm, tiến bộ, việc tốt đã thực hiện hoặc kế hoạch khắc phục khuyết điểm trong học kỳ..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white disabled:bg-slate-50"
                />
              </div>

              {/* Nguồn dữ liệu ghi nhận */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Nguồn tự nhận xét hiện tại: <b className="text-slate-700">{selectedSource}</b></span>
                {evaluation?.selfAssessmentSubmittedAt && (
                  <span>Lần cập nhật cuối: {new Date(evaluation.selfAssessmentSubmittedAt).toLocaleDateString('vi-VN')}</span>
                )}
              </div>
            </div>

            {/* COMPARISON BLOCK: Student Self-Assessment vs. Teacher Assessment (Excel) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Đối Chiếu Dữ Liệu: Tự Nhận Xét ↔ Đánh Giá GVCN (File Excel)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Column 1: Student Input */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900">1. Học viên tự nhận xét</span>
                    <span className="rounded-md bg-emerald-200/70 px-1.5 py-0.5 text-[9px] font-black text-emerald-900">
                      Nguồn: {selectedSource}
                    </span>
                  </div>
                  <div className="text-lg font-black text-emerald-950">
                    {formGrade ? (
                      <span>{formGrade}</span>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Chưa có tự nhận xét</span>
                    )}
                  </div>
                  {formNote && (
                    <div className="text-[10px] text-emerald-800 italic bg-white/70 p-1.5 rounded-lg border border-emerald-200/50">
                      💬 "{formNote}"
                    </div>
                  )}
                </div>

                {/* Column 2: Teacher / Excel Data */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-900">2. GVCN đánh giá (Excel / Hệ thống)</span>
                    <span className="rounded-md bg-indigo-200/70 px-1.5 py-0.5 text-[9px] font-black text-indigo-900">
                      Nguồn: GVCN / File Excel
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-black text-indigo-950">
                      {evaluation?.teacherAssessment || evaluation?.finalGrade ? (
                        <span>{evaluation.teacherAssessment || evaluation.finalGrade}</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic text-xs">GVCN chưa nhập</span>
                      )}
                    </div>
                    {evaluation?.finalGrade && (
                      <span className="text-[10px] text-indigo-700 font-bold">
                        (Kết quả: {evaluation.finalGrade})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-indigo-800">
                    Tập thể lớp: <b>{evaluation?.collectiveAssessment || 'Chưa đánh giá'}</b>
                  </div>
                  {evaluation?.teacherNote && (
                    <div className="text-[10px] text-indigo-900 italic bg-white/70 p-1.5 rounded-lg border border-indigo-200/50">
                      💬 GVCN: "{evaluation.teacherNote}"
                    </div>
                  )}
                </div>
              </div>

              {/* CONFLICT ALERT if student self-assessment differs from teacher Excel assessment */}
              {hasConflict && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-[11px]">
                      Ghi nhận chênh lệch giữa Tự nhận xét và Đánh giá GVCN:
                    </div>
                    <div className="text-[11px] text-amber-800 leading-relaxed">
                      Bạn đang tự nhận xét mức <b>"{cleanSelfGrade}"</b>, trong khi GVCN / file Excel ghi nhận mức <b>"{teacherGrade}"</b>. Hệ thống ghi nhận độc lập cả hai nguồn; việc bạn lưu tự nhận xét sẽ <b>không ghi đè</b> lên đánh giá chính thức của GVCN.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error & Success Messages */}
            {saveErrorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {saveErrorMsg}
              </div>
            )}
            {saveSuccessMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSaving || isFinalized}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Tự Nhận Xét'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};
