/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  BookOpen,
  Building2,
  Check,
  History,
  Eye,
  Sliders,
  Sparkles,
  Target,
  Briefcase
} from 'lucide-react';
import { WorkValuesResult, Student } from '../../types';
import { WORK_VALUES_QUESTIONS, calculateWorkValuesResult } from '../../data/careerAssessmentData';
import { careerService } from '../../services/CareerService';
import { AssessmentHistoryModal } from './AssessmentHistoryModal';
import { AssessmentHistoryCardList } from './AssessmentHistoryCardList';

interface Props {
  student: Student;
  isStudent: boolean;
  onNavigateToMajors?: () => void;
  onNavigateToUnis?: () => void;
}

export const WorkValuesAssessmentSection: React.FC<Props> = ({
  student,
  isStudent,
  onNavigateToMajors,
  onNavigateToUnis
}) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const latestResult = careerService.getWorkValuesResult(student.id);
  const history = careerService.getWorkValuesHistory(student.id);
  const [viewingResult, setViewingResult] = useState<WorkValuesResult | null>(latestResult);

  React.useEffect(() => {
    const res = careerService.getWorkValuesResult(student.id);
    setViewingResult(res);
    setIsTakingQuiz(false);
    setAnswers({});
  }, [student.id]);

  const answeredCount = Object.values(answers).filter(v => Number(v) > 0).length;
  const totalQuestions = WORK_VALUES_QUESTIONS.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const handleScore = (questionId: number, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }));
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
      if (!window.confirm(`Bạn đã hoàn thành ${answeredCount}/${totalQuestions} câu hỏi. Bạn có muốn nộp bài để xem báo cáo sở thích & giá trị nghề nghiệp ngay?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const calculated = calculateWorkValuesResult(answers);
      const saved = careerService.saveWorkValuesResult(student.id, calculated);
      setViewingResult(saved);
      setIsTakingQuiz(false);
      setSuccessMsg('Chúc mừng bạn đã hoàn thành bài khảo sát Giá trị & Sở thích Nghề nghiệp!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-100 shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  KHÁM PHÁ GIÁ TRỊ NGHỀ NGHIỆP CỐT LÕI
                </h3>
                <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                  6 Nhóm Giá Trị (18 Câu hỏi) • Thang Likert 1-5
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Nhận diện 6 giá trị: Ổn định, Thu nhập & Thành tựu, Tự chủ, Phát triển, Cống hiến xã hội, Sáng tạo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {history.length > 0 && !isTakingQuiz && (
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/60 px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <History className="h-3.5 w-3.5 text-teal-600" />
                <span>Lịch sử ({history.length} lần)</span>
              </button>
            )}

            {!isTakingQuiz && (
              <button
                type="button"
                onClick={handleStartNewTest}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
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

        {/* Disclaimer */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold">Lưu ý sư phạm:</strong> Đây là công cụ tự phản tư giúp học viên GDTX hiểu rõ hơn về mong đợi môi trường làm việc lý tưởng, không phải bài kiểm tra tâm lý chẩn đoán.
          </div>
        </div>

        {/* History pills if multiple attempts exist */}
        {!isTakingQuiz && history.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
              <History className="h-3.5 w-3.5 text-teal-600" />
              <span>Lịch sử khảo sát ({history.length} lần):</span>
            </div>
            {history.map((item, idx) => {
              const isSelected = viewingResult?.testedAt === item.testedAt;
              const dateStr = item.testedAt ? new Date(item.testedAt).toLocaleDateString('vi-VN') : 'Lần ' + (idx + 1);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setViewingResult(item)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>Lần {history.length - idx}: {item.topValues[0]?.name || 'Giá trị'}</span>
                  <span className="text-[10px] opacity-80">({dateStr})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Banner when viewing a past attempt */}
        {!isTakingQuiz && history.length > 1 && viewingResult && viewingResult.id !== history[0]?.id && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-teal-600 shrink-0" />
              <span>
                Bạn đang xem lại kết quả chi tiết của <strong>Lần {viewingResult.attemptNumber || 'trước'}</strong> ({viewingResult.createdAt || viewingResult.testedAt || 'lịch sử'}).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewingResult(history[0])}
              className="rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Xem kết quả gần nhất (Lần {history[0]?.attemptNumber || history.length})
            </button>
          </div>
        )}

        {/* VIEW 1: RESULTS */}
        {!isTakingQuiz && viewingResult && (
          <div className="space-y-6">
            {/* Top Cards: Core Value & Core Interest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interest Card */}
              <div className="rounded-3xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/70 to-emerald-50/40 p-5 space-y-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  <span>Sở thích hoạt động nổi trội</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-teal-950">
                  {viewingResult.topInterests[0]?.name || 'Làm việc với Con người'}
                </div>
                <p className="text-xs text-teal-900/80 leading-relaxed">
                  {viewingResult.topInterests[0]?.description}
                </p>
                <div className="pt-2 border-t border-teal-200 flex items-center justify-between text-xs font-bold text-teal-900">
                  <span>Điểm tương thích:</span>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-teal-800">
                    {viewingResult.topInterests[0]?.score}/10 điểm
                  </span>
                </div>
              </div>

              {/* Value Card */}
              <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-5 space-y-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Award className="h-4 w-4" />
                  <span>Giá trị nghề nghiệp ưu tiên</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-950">
                  {viewingResult.topValues[0]?.name || 'Ổn định & An toàn'}
                </div>
                <p className="text-xs text-emerald-900/80 leading-relaxed">
                  {viewingResult.topValues[0]?.description}
                </p>
                <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Mức độ ưu tiên:</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-800">
                    {viewingResult.topValues[0]?.score}/10 điểm
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended Work Styles & Environment */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-600" />
                <span>Môi trường & Phong cách làm việc phù hợp:</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {(viewingResult.recommendedWorkStyles || []).map((style, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{style}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Careers & Majors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Vị trí công việc gợi ý
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(viewingResult.recommendedCareers || []).map((c, i) => (
                    <span key={i} className="rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-bold text-teal-900">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Ngành đào tạo tương thích
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(viewingResult.recommendedMajors || []).map((m, i) => (
                    <span key={i} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-900">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold text-teal-950">
                  Đối chiếu với các ngành đào tạo thực tế
                </div>
                <div className="text-[11px] text-teal-800">
                  Tra cứu chi tiết các trường Đại học, Cao đẳng hoặc Trung cấp nghề phù hợp với các giá trị trên.
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onNavigateToMajors && (
                  <button
                    type="button"
                    onClick={onNavigateToMajors}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Tra cứu ngành đào tạo</span>
                  </button>
                )}

                {onNavigateToUnis && (
                  <button
                    type="button"
                    onClick={onNavigateToUnis}
                    className="flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Tra cứu điểm chuẩn</span>
                  </button>
                )}
              </div>

              {/* Assessment History Cards List */}
              {history.length > 0 && (
                <AssessmentHistoryCardList
                  title="Khảo sát Giá trị Nghề nghiệp"
                  testType="work_values"
                  items={history.map((item, idx) => ({
                    id: item.id || `wv-${idx}`,
                    attemptNumber: item.attemptNumber || history.length - idx,
                    dateStr: item.createdAt || (item.testedAt ? new Date(item.testedAt).toLocaleDateString('vi-VN') : '---'),
                    codeOrTitle: item.topValues?.[0]?.name || 'Giá trị nghề nghiệp',
                    subSummary: `Sở thích: ${item.topInterests?.[0]?.name || 'Con người'}`,
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
                  themeColor="teal"
                />
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isTakingQuiz && !viewingResult && (
          <div className="text-center py-12 space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <Briefcase className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Học sinh chưa thực hiện bài khảo sát Giá trị & Sở thích Nghề nghiệp
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bài khảo sát gồm 16 câu hỏi ngắn, giúp nhận diện sở thích hoạt động (con người, dữ liệu, kỹ thuật, sáng tạo) và các giá trị công việc cốt lõi (ổn định, thử thách, tự chủ, cống hiến).
            </p>
            <button
              type="button"
              onClick={handleStartNewTest}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-xs cursor-pointer mt-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Bắt đầu làm bài khảo sát</span>
            </button>
          </div>
        )}

        {/* VIEW 2: QUESTIONNAIRE */}
        {isTakingQuiz && (
          <div className="space-y-6 pt-2">
            {/* Progress bar */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">Tiến độ câu hỏi:</span>
                <span className="text-teal-700">
                  {answeredCount}/{totalQuestions} câu ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {WORK_VALUES_QUESTIONS.map((q) => {
                const currentScore = answers[q.id];
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-4 transition-all bg-white ${
                      currentScore
                        ? 'border-teal-300 bg-teal-50/20 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-teal-100 text-teal-800 px-2 py-0.5 text-xs font-black">
                            Câu {q.id}
                          </span>
                          <span className="rounded-lg bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
                            {(q as any).categoryName || q.category}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {q.text}
                        </h4>
                      </div>

                      {/* 1 to 5 scale buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {[
                          { score: 1, label: '1 - Rất không thích / Không quan trọng' },
                          { score: 2, label: '2 - Không thích / Ít quan trọng' },
                          { score: 3, label: '3 - Bình thường' },
                          { score: 4, label: '4 - Thích / Khá quan trọng' },
                          { score: 5, label: '5 - Rất thích / Rất quan trọng' }
                        ].map((opt) => {
                          const isChosen = currentScore === opt.score;
                          return (
                            <button
                              key={opt.score}
                              type="button"
                              onClick={() => handleScore(q.id, opt.score)}
                              title={opt.label}
                              className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-xs transition-all cursor-pointer ${
                                isChosen
                                  ? 'bg-teal-600 text-white shadow-xs scale-105 ring-2 ring-teal-400'
                                  : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-900'
                              }`}
                            >
                              {opt.score}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Thang điểm: <strong>1: Rất không thích / Ít quan trọng</strong> → <strong>5: Rất thích / Rất quan trọng</strong>
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
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Hoàn thành & Xem kết quả</span>
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
          assessmentType="work_values"
          title="Khảo sát Giá trị Nghề nghiệp Cốt lõi (6 Nhóm)"
          historyList={history}
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
