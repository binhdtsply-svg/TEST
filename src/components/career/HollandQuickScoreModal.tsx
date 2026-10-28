/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Save, CheckCircle2, AlertCircle, Compass } from 'lucide-react';
import { RIASEC_INFO } from '../../data/onetQuestions';
import { RIASECCategory, CareerAssessment, Student } from '../../types';
import { careerService } from '../../services/CareerService';
import { classService } from '../../services/ClassService';

interface HollandQuickScoreModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (assessment: CareerAssessment) => void;
}

export const HollandQuickScoreModal: React.FC<HollandQuickScoreModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaved
}) => {
  const [scores, setScores] = useState<Record<RIASECCategory, number>>({
    R: 15,
    I: 18,
    A: 12,
    S: 22,
    E: 20,
    C: 16
  });
  const [examGroup, setExamGroup] = useState('D01 (Toán, Văn, Anh)');
  const [firstMajor, setFirstMajor] = useState('Kinh doanh Quốc tế & Logistics');
  const [secondMajor, setSecondMajor] = useState('Truyền thông Đa phương tiện');

  if (!isOpen) return null;

  const categories: RIASECCategory[] = ['R', 'I', 'A', 'S', 'E', 'C'];

  const handleScoreChange = (cat: RIASECCategory, val: number) => {
    const clamped = Math.max(0, Math.min(25, isNaN(val) ? 0 : val));
    setScores(prev => ({ ...prev, [cat]: clamped }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sort to find top 3 categories
    const sorted = [...categories].sort((a, b) => scores[b] - scores[a]);
    const topInterestCodes = sorted.slice(0, 3);
    const primaryCode = topInterestCodes.join('');
    const codeMeaning = topInterestCodes.map(c => RIASEC_INFO[c].name).join(' - ');

    const classSettings = classService.getSettings();

    const assessment: Omit<CareerAssessment, 'id' | 'createdAt' | 'updatedAt' | 'attemptNumber'> & { id?: string } = {
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.code,
      studentAvatar: student.avatar,
      workspaceId: classSettings.id,
      classId: classSettings.className,
      provider: 'HOLLAND_RIASEC_RADAR',
      assessmentType: 'standard_holland',
      assessmentVersion: 'Holland Radar v2.0 (Nhập điểm trực tiếp)',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rawAnswers: {},
      scores: {
        realistic: scores.R,
        investigative: scores.I,
        artistic: scores.A,
        social: scores.S,
        enterprising: scores.E,
        conventional: scores.C
      },
      riasec: {
        R: scores.R,
        I: scores.I,
        A: scores.A,
        S: scores.S,
        E: scores.E,
        C: scores.C
      },
      topInterestCodes,
      primaryCode,
      codeMeaning,
      suggestedMajors: [firstMajor, secondMajor].filter(Boolean),
      suggestedCareers: [
        `Chuyên viên ${firstMajor}`,
        `Quản trị ${secondMajor}`,
        'Chuyên viên tư vấn & phát triển dự án'
      ],
      expectedExamCombinations: [examGroup],
      source: 'Nhập điểm trực tiếp kết quả trắc nghiệm Holland / Phiếu đánh giá'
    };

    const saved = careerService.saveAssessment(assessment);
    onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Nhập Điểm Trắc Nghiệm Holland / RIASEC
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Áp dụng cho học sinh: <strong className="text-slate-800">{student.fullName} ({student.code})</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Điểm số 6 nhóm Holland (Thang 0 - 25 điểm)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(cat => {
                const info = RIASEC_INFO[cat];
                return (
                  <div key={cat} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-white font-black text-xs"
                        style={{ backgroundColor: info.color }}
                      >
                        {cat}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 truncate ml-1">
                        {info.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        value={scores[cat] ?? 0}
                        onChange={(e) => handleScoreChange(cat, parseInt(e.target.value, 10))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-xs font-black text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-none"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">/25</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tổ hợp môn xét tuyển dự kiến
              </label>
              <input
                type="text"
                value={examGroup || ''}
                onChange={(e) => setExamGroup(e.target.value)}
                placeholder="VD: D01 (Toán, Văn, Anh), A00 (Toán, Lý, Hóa)..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nguyện vọng ngành 1
                </label>
                <input
                  type="text"
                  value={firstMajor || ''}
                  onChange={(e) => setFirstMajor(e.target.value)}
                  placeholder="VD: Kinh doanh quốc tế"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nguyện vọng ngành 2
                </label>
                <input
                  type="text"
                  value={secondMajor || ''}
                  onChange={(e) => setSecondMajor(e.target.value)}
                  placeholder="VD: Khoa học máy tính"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Lưu kết quả Holland</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
