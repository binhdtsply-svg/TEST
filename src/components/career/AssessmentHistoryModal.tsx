/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  History,
  Calendar,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Award,
  ArrowRight,
  Eye,
  Sliders,
  Sparkles,
  Printer,
  Info
} from 'lucide-react';
import { CareerAssessment, MBTIResult, WorkValuesResult, Student } from '../../types';

interface Props {
  student: Student;
  assessmentType: 'holland' | 'mbti' | 'work_values';
  title: string;
  historyList: Array<any>;
  onClose: () => void;
  onSelectAttemptToView: (attempt: any) => void;
}

export const AssessmentHistoryModal: React.FC<Props> = ({
  student,
  assessmentType,
  title,
  historyList,
  onClose,
  onSelectAttemptToView
}) => {
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const toggleSelectForCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(prev => prev.filter(i => i !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert('Bạn chỉ có thể chọn tối đa 3 lần làm bài để so sánh đối chiếu.');
        return;
      }
      setSelectedForCompare(prev => [...prev, id]);
    }
  };

  const comparedAttempts = historyList.filter(item => selectedForCompare.includes(item.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                LỊCH SỬ LÀM BÀI: {title.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Học viên: <strong className="text-slate-700">{student.fullName}</strong> ({student.code || 'Mã học viên'}) • Tổng số lần: <span className="font-bold text-indigo-600">{historyList.length}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isComparing && historyList.length >= 2 && (
              <button
                type="button"
                onClick={() => setIsComparing(true)}
                disabled={selectedForCompare.length < 2}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>So sánh {selectedForCompare.length > 0 ? `(${selectedForCompare.length})` : ''}</span>
              </button>
            )}

            {isComparing && (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="In phiếu đối chiếu kết quả các lần làm bài"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>In đối chiếu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsComparing(false)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span>Quay lại danh sách</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Note Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 flex items-start gap-2.5 text-xs text-indigo-900">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Hệ thống bảo toàn toàn bộ các lần làm bài:</span>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Mỗi lần làm bài là một phiên kết quả độc lập, không bị ghi đè. Bạn có thể bấm <strong>"Xem kết quả"</strong> để xem chi tiết bản ghi của lần đó hoặc chọn 2-3 lần để <strong>"So sánh kết quả"</strong> đối chiếu sự chuyển biến sở thích theo thời gian.
              </p>
            </div>
          </div>

          {/* VIEW 1: COMPARISON TABLE */}
          {isComparing ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  <span>BẢNG ĐỐI CHIẾU SỰ THAY ĐỔI GIỮA CÁC LẦN LÀM BÀI</span>
                </h4>
                <span className="text-[11px] text-slate-500 italic">
                  * Kết quả mới không phủ định kết quả cũ, chỉ phản ánh sự tự nhận thức và thay đổi sở thích cá nhân.
                </span>
              </div>

              {/* Comparison table depending on assessment type */}
              {assessmentType === 'holland' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Nhóm RIASEC</th>
                          {comparedAttempts.map((att, idx) => (
                            <th key={att.id} className="px-4 py-3 text-center">
                              Lần {att.attemptNumber || idx + 1}
                              <div className="text-[10px] text-slate-400 font-normal lowercase">{att.createdAt?.slice(0, 16)}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-800">Mã nổi trội (3 chữ cái)</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2.5 text-center font-black text-indigo-600 text-sm">
                              {att.primaryCode || '---'}
                            </td>
                          ))}
                        </tr>
                        {[
                          { key: 'realistic', label: 'R – Thực tế (Kỹ thuật)', cat: 'R' },
                          { key: 'investigative', label: 'I – Nghiên cứu (Khám phá)', cat: 'I' },
                          { key: 'artistic', label: 'A – Nghệ thuật (Sáng tạo)', cat: 'A' },
                          { key: 'social', label: 'S – Xã hội (Giao tiếp)', cat: 'S' },
                          { key: 'enterprising', label: 'E – Quản lý (Lãnh đạo)', cat: 'E' },
                          { key: 'conventional', label: 'C – Nghiệp vụ (Quy củ)', cat: 'C' }
                        ].map(row => (
                          <tr key={row.key} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2 font-medium text-slate-700">{row.label}</td>
                            {comparedAttempts.map((att, attIdx) => {
                              const score = att.scores?.[row.key] ?? att.riasec?.[row.cat] ?? 0;
                              let diffBadge = null;
                              if (attIdx > 0) {
                                const prevAtt = comparedAttempts[attIdx - 1];
                                const prevScore = prevAtt.scores?.[row.key] ?? prevAtt.riasec?.[row.cat] ?? 0;
                                const diff = score - prevScore;
                                if (diff > 0) {
                                  diffBadge = <span className="ml-1 text-[10px] font-bold text-emerald-600">(+{diff})</span>;
                                } else if (diff < 0) {
                                  diffBadge = <span className="ml-1 text-[10px] font-bold text-amber-600">({diff})</span>;
                                } else {
                                  diffBadge = <span className="ml-1 text-[10px] text-slate-400">(=)</span>;
                                }
                              }

                              return (
                                <td key={att.id} className="px-4 py-2 text-center font-bold text-slate-800">
                                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 font-mono">
                                    {score}
                                  </span>
                                  {diffBadge}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-800">Gợi ý ngành nghề tại thời điểm</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2.5 text-center text-[11px] text-slate-600">
                              {(att.suggestedMajors || []).slice(0, 3).join(', ') || '---'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Holland Trend Analysis Card */}
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4 space-y-2.5">
                    <h5 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      <span>Phân tích xu hướng chuyển biến sở thích nghề nghiệp:</span>
                    </h5>
                    <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                      <p>
                        • <strong>Mã nổi trội qua các giai đoạn:</strong> {comparedAttempts.map((a, idx) => `Lần ${a.attemptNumber || idx + 1}: ${a.primaryCode}`).join(' ➔ ')}.
                      </p>
                      <p>
                        • <strong>Ý nghĩa sư phạm:</strong> Sự chuyển dịch hoặc ổn định giữa các lần làm bài phản ánh tiến trình tự nhận thức, trải nghiệm học tập và mức độ trưởng thành của học viên. Nhà trường và GVCN khuyến khích học viên nhìn nhận điểm mạnh cốt lõi thay vì áp lực phải có kết quả bất biến.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {assessmentType === 'mbti' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Tiêu chí tính cách</th>
                          {comparedAttempts.map((att, idx) => (
                            <th key={att.id} className="px-4 py-3 text-center">
                              Lần {att.attemptNumber || idx + 1}
                              <div className="text-[10px] text-slate-400 font-normal lowercase">{att.createdAt?.slice(0, 16) || att.testedAt?.slice(0, 10)}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-800">Mã xu hướng MBTI</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2.5 text-center font-black text-indigo-600 text-base">
                              {att.code}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-slate-700">Hướng ngoại (E) vs Hướng nội (I)</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2 text-center font-bold text-slate-800">
                              E: {att.dimensionScores?.E ?? 0} | I: {att.dimensionScores?.I ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-slate-700">Thực tế (S) vs Trực giác (N)</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2 text-center font-bold text-slate-800">
                              S: {att.dimensionScores?.S ?? 0} | N: {att.dimensionScores?.N ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-slate-700">Lý trí (T) vs Cảm xúc (F)</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2 text-center font-bold text-slate-800">
                              T: {att.dimensionScores?.T ?? 0} | F: {att.dimensionScores?.F ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium text-slate-700">Nguyên tắc (J) vs Linh hoạt (P)</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2 text-center font-bold text-slate-800">
                              J: {att.dimensionScores?.J ?? 0} | P: {att.dimensionScores?.P ?? 0}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* MBTI Trend Analysis Card */}
                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4 space-y-2">
                    <h5 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      <span>Nhận định tính nhất quán trong phong cách làm việc:</span>
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Các cặp xu hướng thể hiện sự định hình phong cách học tập và tương tác. Học viên có thể quan sát xem mình kiên định ở cặp xu hướng nào (ví dụ Lý trí T hay Cảm xúc F) để chọn môi trường làm việc phù hợp.
                    </p>
                  </div>
                </div>
              )}

              {assessmentType === 'work_values' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Nhóm giá trị nghề nghiệp</th>
                          {comparedAttempts.map((att, idx) => (
                            <th key={att.id} className="px-4 py-3 text-center">
                              Lần {att.attemptNumber || idx + 1}
                              <div className="text-[10px] text-slate-400 font-normal lowercase">{att.createdAt?.slice(0, 16) || att.testedAt?.slice(0, 10)}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {[
                          { key: 'STABILITY', label: '1. Ổn định & An toàn' },
                          { key: 'ACHIEVEMENT', label: '2. Thu nhập & Thành tựu' },
                          { key: 'AUTONOMY', label: '3. Tự chủ & Tự do' },
                          { key: 'GROWTH', label: '4. Phát triển & Học hỏi' },
                          { key: 'CONTRIBUTION', label: '5. Cống hiến & Xã hội' },
                          { key: 'CREATIVITY', label: '6. Sáng tạo & Đổi mới' }
                        ].map(row => (
                          <tr key={row.key} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{row.label}</td>
                            {comparedAttempts.map((att, attIdx) => {
                              const score = att.scores?.[row.key] ?? 0;
                              let diffBadge = null;
                              if (attIdx > 0) {
                                const prevScore = comparedAttempts[attIdx - 1]?.scores?.[row.key] ?? 0;
                                const diff = score - prevScore;
                                if (diff > 0) diffBadge = <span className="ml-1 text-[10px] font-bold text-emerald-600">(+{diff})</span>;
                                else if (diff < 0) diffBadge = <span className="ml-1 text-[10px] font-bold text-amber-600">({diff})</span>;
                              }

                              return (
                                <td key={att.id} className="px-4 py-2.5 text-center font-bold text-slate-800">
                                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                                    {score}/15
                                  </span>
                                  {diffBadge}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-800">Giá trị nổi trội nhất</td>
                          {comparedAttempts.map(att => (
                            <td key={att.id} className="px-4 py-2.5 text-center font-black text-teal-700 text-xs">
                              {att.topValues?.[0]?.name || '---'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Work Values Trend Analysis */}
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 space-y-1.5">
                    <h5 className="text-xs font-black uppercase text-teal-950 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-teal-700" />
                      <span>Nhận định động lực nghề nghiệp:</span>
                    </h5>
                    <p className="text-xs text-teal-900 leading-relaxed">
                      Sự thay đổi về giá trị ưu tiên (như ưu tiên Thu nhập vs Cống hiến xã hội) phản ánh những tác động từ trải nghiệm thực tế và hoàn cảnh gia đình. GVCN nên trò chuyện đồng hành để giúp học sinh cân bằng các giá trị này.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: LIST OF ALL ATTEMPTS */
            <div className="space-y-3">
              {historyList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Chưa có lịch sử làm bài cho mục này.
                </div>
              ) : (
                historyList.map((item, index) => {
                  const attemptNum = item.attemptNumber || historyList.length - index;
                  const isSelected = selectedForCompare.includes(item.id);
                  const isLatest = index === 0;

                  return (
                    <div
                      key={item.id || index}
                      className={`rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-400/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectForCompare(item.id)}
                            className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Chọn để so sánh đối chiếu"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-slate-900 text-white px-2.5 py-0.5 text-xs font-black">
                              Lần {attemptNum}
                            </span>
                            {isLatest && (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                                Kết quả gần nhất
                              </span>
                            )}
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {item.createdAt || item.completedAt || item.testedAt || '---'}
                            </span>
                          </div>

                          {/* Summary Details */}
                          <div className="text-xs text-slate-700 font-medium">
                            {assessmentType === 'holland' && (
                              <div>
                                Mã RIASEC: <strong className="text-indigo-600 font-black">{item.primaryCode}</strong> • {item.codeMeaning || 'Bộ 3 nhóm tính cách'}
                              </div>
                            )}
                            {assessmentType === 'mbti' && (
                              <div>
                                Xu hướng MBTI: <strong className="text-indigo-600 font-black">{item.code}</strong> – {item.title}
                              </div>
                            )}
                            {assessmentType === 'work_values' && (
                              <div>
                                Giá trị hàng đầu: <strong className="text-teal-700 font-black">{item.topValues?.[0]?.name || 'Ổn định & An toàn'}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAttemptToView(item);
                            onClose();
                          }}
                          className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Xem kết quả lần này</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <span>Chọn tối đa 3 lần làm bài để đối chiếu xu hướng thay đổi.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
