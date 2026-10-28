/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  History,
  Eye
} from 'lucide-react';
import { MBTIQuestion, MBTIResult, Student } from '../../types';
import { MBTI_QUESTIONS, calculateMBTIResult } from '../../data/careerAssessmentData';
import { careerService } from '../../services/CareerService';
import { AssessmentHistoryModal } from './AssessmentHistoryModal';
import { AssessmentHistoryCardList } from './AssessmentHistoryCardList';

interface Props {
  student: Student;
  isStudent: boolean;
  onNavigateToMajors?: (mbtiCode?: string) => void;
  onNavigateToUnis?: () => void;
}

export const MBTIAssessmentSection: React.FC<Props> = ({
  student,
  isStudent,
  onNavigateToMajors,
  onNavigateToUnis
}) => {
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Load existing result and history
  const latestResult = careerService.getMBTIResult(student.id);
  const mbtiHistory = careerService.getMBTIHistory(student.id);
  const [viewingResult, setViewingResult] = useState<MBTIResult | null>(latestResult);

  // Keep viewingResult in sync if student changes
  React.useEffect(() => {
    const res = careerService.getMBTIResult(student.id);
    setViewingResult(res);
    setIsTakingQuiz(false);
    setAnswers({});
  }, [student.id]);

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = MBTI_QUESTIONS.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const handleSelectOption = (questionId: number, trait: 'A' | 'B') => {
    setAnswers(prev => ({ ...prev, [questionId]: trait }));
  };

  const handleStartNewTest = () => {
    setAnswers({});
    setIsTakingQuiz(true);
  };

  const handleCancelQuiz = () => {
    setIsTakingQuiz(false);
    setAnswers({});
  };

  const handleSubmit = () => {
    if (answeredCount < totalQuestions) {
      if (!window.confirm(`Bạn đã trả lời ${answeredCount}/${totalQuestions} câu hỏi. Bạn có muốn hoàn thành và xem phân tích xu hướng MBTI ngay?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const calculated = calculateMBTIResult(answers);
      const saved = careerService.saveMBTIResult(student.id, calculated);
      setViewingResult(saved);
      setIsTakingQuiz(false);
      setSuccessMsg('Chúc mừng bạn đã hoàn thành bài khảo sát xu hướng tính cách MBTI!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
        {/* Header / Intro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-100 shrink-0">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  KHÁM PHÁ XU HƯỚNG TÍNH CÁCH THEO KHUNG MBTI
                </h3>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                  4 Cặp Xu Hướng (20 Câu hỏi)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Tìm hiểu phong cách tư duy, giao tiếp và môi trường học tập - nghề nghiệp tương thích cho học viên GDTX
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {mbtiHistory.length > 0 && !isTakingQuiz && (
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <History className="h-3.5 w-3.5 text-indigo-600" />
                <span>Lịch sử ({mbtiHistory.length} lần)</span>
              </button>
            )}

            {!isTakingQuiz && (
              <button
                type="button"
                onClick={handleStartNewTest}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{viewingResult ? '+ Làm lại bài mới' : 'Bắt đầu làm bài'}</span>
              </button>
            )}

            {isTakingQuiz && (
              <button
                type="button"
                onClick={handleCancelQuiz}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span>Đóng bài làm</span>
              </button>
            )}
          </div>
        </div>

        {/* Mandatory Educational Disclaimer */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold">Lưu ý định hướng sư phạm:</strong> Đánh giá theo khung MBTI là công cụ tham khảo định hướng, TUYỆT ĐỐI không phải chẩn đoán tâm lý hay kết luận tuyệt đối về tính cách hoặc giới hạn năng lực của học viên.
          </div>
        </div>

        {/* History selector if multiple attempts exist */}
        {!isTakingQuiz && mbtiHistory.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
              <History className="h-3.5 w-3.5 text-indigo-600" />
              <span>Lịch sử khảo sát MBTI ({mbtiHistory.length} lần):</span>
            </div>
            {mbtiHistory.map((item, idx) => {
              const isSelected = viewingResult?.testedAt === item.testedAt;
              const dateStr = item.testedAt ? new Date(item.testedAt).toLocaleDateString('vi-VN') : 'Lần ' + (idx + 1);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setViewingResult(item)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>Lần {mbtiHistory.length - idx}: {item.code}</span>
                  <span className="text-[10px] opacity-80">({dateStr})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Banner when viewing a past attempt */}
        {!isTakingQuiz && mbtiHistory.length > 1 && viewingResult && viewingResult.id !== mbtiHistory[0]?.id && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                Bạn đang xem lại kết quả chi tiết của <strong>Lần {viewingResult.attemptNumber || 'trước'}</strong> ({viewingResult.createdAt || viewingResult.testedAt || 'lịch sử'}).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewingResult(mbtiHistory[0])}
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Xem kết quả gần nhất (Lần {mbtiHistory[0]?.attemptNumber || mbtiHistory.length})
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: RESULTS DISPLAY                                                   */}
        {/* ========================================================================= */}
        {!isTakingQuiz && viewingResult && (
          <div className="space-y-6">
            {/* Top MBTI Result Card */}
            <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-white p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                    Kết quả Trắc nghiệm
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-indigo-950 mt-0.5">
                    Xu hướng MBTI: <span className="text-indigo-600">{viewingResult.code}</span>
                  </h4>
                  <p className="text-sm font-bold text-purple-900 mt-1">
                    {viewingResult.title}
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                    Khảo sát: {new Date(viewingResult.testedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {viewingResult.description}
              </p>

              {/* 4 Dimension Balances */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Tỷ lệ 4 Cặp Xu Hướng Đặc Trưng
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Pair 1: E vs I */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={viewingResult.percentages.EI.dominant === 'E' ? 'text-indigo-700 font-black' : 'text-slate-500'}>
                        [E] Hướng ngoại ({viewingResult.dimensionScores.E})
                      </span>
                      <span className={viewingResult.percentages.EI.dominant === 'I' ? 'text-indigo-700 font-black' : 'text-slate-500'}>
                        [I] Hướng nội ({viewingResult.dimensionScores.I})
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.E / 5) * 100}%` }}
                        title={`Hướng ngoại ${Math.round((viewingResult.dimensionScores.E / 5) * 100)}%`}
                      />
                      <div
                        className="bg-purple-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.I / 5) * 100}%` }}
                        title={`Hướng nội ${Math.round((viewingResult.dimensionScores.I / 5) * 100)}%`}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 text-center font-semibold">
                      Thiên hướng: <strong className="text-indigo-700">{viewingResult.percentages.EI.dominant === 'E' ? 'Hướng ngoại (E)' : 'Hướng nội (I)'}</strong> ({viewingResult.percentages.EI.percent}%)
                    </div>
                  </div>

                  {/* Pair 2: S vs N */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={viewingResult.percentages.SN.dominant === 'S' ? 'text-blue-700 font-black' : 'text-slate-500'}>
                        [S] Thực tế ({viewingResult.dimensionScores.S})
                      </span>
                      <span className={viewingResult.percentages.SN.dominant === 'N' ? 'text-blue-700 font-black' : 'text-slate-500'}>
                        [N] Trực giác ({viewingResult.dimensionScores.N})
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.S / 5) * 100}%` }}
                      />
                      <div
                        className="bg-cyan-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.N / 5) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 text-center font-semibold">
                      Thiên hướng: <strong className="text-blue-700">{viewingResult.percentages.SN.dominant === 'S' ? 'Thực tế (S)' : 'Trực giác (N)'}</strong> ({viewingResult.percentages.SN.percent}%)
                    </div>
                  </div>

                  {/* Pair 3: T vs F */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={viewingResult.percentages.TF.dominant === 'T' ? 'text-emerald-700 font-black' : 'text-slate-500'}>
                        [T] Lý trí ({viewingResult.dimensionScores.T})
                      </span>
                      <span className={viewingResult.percentages.TF.dominant === 'F' ? 'text-emerald-700 font-black' : 'text-slate-500'}>
                        [F] Cảm xúc ({viewingResult.dimensionScores.F})
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.T / 5) * 100}%` }}
                      />
                      <div
                        className="bg-teal-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.F / 5) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 text-center font-semibold">
                      Thiên hướng: <strong className="text-emerald-700">{viewingResult.percentages.TF.dominant === 'T' ? 'Lý trí (T)' : 'Cảm xúc (F)'}</strong> ({viewingResult.percentages.TF.percent}%)
                    </div>
                  </div>

                  {/* Pair 4: J vs P */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={viewingResult.percentages.JP.dominant === 'J' ? 'text-amber-700 font-black' : 'text-slate-500'}>
                        [J] Nguyên tắc ({viewingResult.dimensionScores.J})
                      </span>
                      <span className={viewingResult.percentages.JP.dominant === 'P' ? 'text-amber-700 font-black' : 'text-slate-500'}>
                        [P] Linh hoạt ({viewingResult.dimensionScores.P})
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.J / 5) * 100}%` }}
                      />
                      <div
                        className="bg-orange-500 h-full transition-all"
                        style={{ width: `${(viewingResult.dimensionScores.P / 5) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 text-center font-semibold">
                      Thiên hướng: <strong className="text-amber-700">{viewingResult.percentages.JP.dominant === 'J' ? 'Nguyên tắc (J)' : 'Linh hoạt (P)'}</strong> ({viewingResult.percentages.JP.percent}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Grid: Strengths, Environment, Careers, Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <span>Điểm mạnh có thể phát huy</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(viewingResult.strengths || []).map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Learning / Work Environment */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>Môi trường học tập / Làm việc phù hợp</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(viewingResult.learningWorkEnvironments || []).map((env, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span>{env}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Careers */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  <span>Nhóm nghề có thể tham khảo</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(viewingResult.recommendedCareers || []).map((c, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-900"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes for Growth */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>Một số điểm cần lưu ý rèn luyện</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(viewingResult.notesForGrowth || []).map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quick Actions to Search Majors & Benchmarks */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold text-indigo-950">
                  Khám phá các ngành đào tạo phù hợp với xu hướng {viewingResult.code}
                </div>
                <div className="text-[11px] text-indigo-800">
                  Chuyển sang công cụ Tra cứu Ngành hoặc Tra cứu Trường ĐH - CĐ để đối chiếu với năng lực thực tế.
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onNavigateToMajors && (
                  <button
                    type="button"
                    onClick={() => onNavigateToMajors(viewingResult.code)}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Tra cứu ngành đào tạo</span>
                  </button>
                )}

                {onNavigateToUnis && (
                  <button
                    type="button"
                    onClick={onNavigateToUnis}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Tra cứu điểm chuẩn</span>
                  </button>
                )}
              </div>

              {/* Assessment History Cards List */}
              {mbtiHistory.length > 0 && (
                <AssessmentHistoryCardList
                  title="Khảo sát xu hướng MBTI"
                  testType="mbti"
                  items={mbtiHistory.map((item, idx) => ({
                    id: item.id || `mbti-${idx}`,
                    attemptNumber: item.attemptNumber || mbtiHistory.length - idx,
                    dateStr: item.createdAt || (item.testedAt ? new Date(item.testedAt).toLocaleDateString('vi-VN') : '---'),
                    codeOrTitle: `${item.code} – ${item.title}`,
                    subSummary: item.description,
                    isLatest: idx === 0,
                    isSelectedForView: viewingResult?.id === item.id || viewingResult?.testedAt === item.testedAt,
                    rawItem: item
                  }))}
                  onSelectAttemptToView={(item) => {
                    setIsTakingQuiz(false);
                    setViewingResult(item);
                  }}
                  onStartNewAttempt={handleStartNewTest}
                  onOpenCompareModal={() => setIsHistoryModalOpen(true)}
                  isTakingQuiz={isTakingQuiz}
                  themeColor="indigo"
                />
              )}
            </div>
          </div>
        )}

        {/* Empty state if no result yet */}
        {!isTakingQuiz && !viewingResult && (
          <div className="text-center py-12 space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Brain className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Học sinh chưa thực hiện bài khảo sát xu hướng tính cách MBTI
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bài khảo sát gồm 20 câu hỏi lựa chọn đơn giản, giúp học sinh nhận diện phong cách tư duy, điểm mạnh cá nhân và môi trường học tập tương thích.
            </p>
            <button
              type="button"
              onClick={handleStartNewTest}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer mt-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Bắt đầu làm bài trắc nghiệm MBTI</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: QUESTIONNAIRE (20 QUESTIONS)                                      */}
        {/* ========================================================================= */}
        {isTakingQuiz && (
          <div className="space-y-6 pt-2">
            {/* Progress bar */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">Tiến độ hoàn thành:</span>
                <span className="text-indigo-700">
                  {answeredCount}/{totalQuestions} câu ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {MBTI_QUESTIONS.map((q) => {
                const choice = answers[q.id];
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all bg-white ${
                      choice
                        ? 'border-indigo-300 bg-indigo-50/20 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs font-black">
                          Câu {q.id}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          Hãy chọn phương án thể hiện đúng nhất phản ứng hoặc thói quen của bạn:
                        </h4>
                      </div>

                      {/* Options A & B */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelectOption(q.id, 'A')}
                          className={`rounded-xl border p-3.5 text-left text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                            choice === 'A'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-400/30'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                              choice === 'A' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            A
                          </span>
                          <span className="leading-relaxed">{q.optionA.text}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectOption(q.id, 'B')}
                          className={`rounded-xl border p-3.5 text-left text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                            choice === 'B'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-400/30'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                              choice === 'B' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            B
                          </span>
                          <span className="leading-relaxed">{q.optionB.text}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Hãy chọn phương án tự nhiên và gần gũi nhất với bạn, không có câu trả lời đúng hay sai.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelQuiz}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Hoàn thành & Xem kết quả MBTI</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History & Comparative Modal */}
      {isHistoryModalOpen && (
        <AssessmentHistoryModal
          student={student}
          assessmentType="mbti"
          title="Khảo sát Xu hướng Tính cách MBTI"
          historyList={mbtiHistory}
          onClose={() => setIsHistoryModalOpen(false)}
          onSelectAttemptToView={(attempt) => {
            setViewingResult(attempt);
            setIsTakingQuiz(false);
          }}
        />
      )}
    </div>
  );
};
