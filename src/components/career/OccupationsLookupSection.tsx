/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Briefcase,
  Filter,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  X,
  Compass,
  Award,
  BookOpen,
  Building2,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Layers,
  Info
} from 'lucide-react';
import { CareerOccupation, Student, RIASECCategory } from '../../types';
import { careerService } from '../../services/CareerService';
import { RIASEC_INFO } from '../../data/onetQuestions';

interface Props {
  student: Student;
  onNavigateToMajors?: (majorKeyword?: string) => void;
  onNavigateToSaved?: () => void;
}

export const OccupationsLookupSection: React.FC<Props> = ({
  student,
  onNavigateToMajors,
  onNavigateToSaved
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedHolland, setSelectedHolland] = useState<'all' | RIASECCategory>('all');
  const [activeOccupation, setActiveOccupation] = useState<CareerOccupation | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  const occupations = careerService.getOccupations();
  const savedItems = careerService.getSavedItems(student.id);

  // Derive unique groups
  const occupationGroups = useMemo(() => {
    const set = new Set<string>();
    occupations.forEach(o => set.add(o.group));
    return ['all', ...Array.from(set)];
  }, [occupations]);

  // Filtering
  const filteredOccupations = useMemo(() => {
    return (occupations || []).filter(occ => {
      const matchSearch =
        !searchTerm.trim() ||
        (occ.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (occ.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (occ.requiredSkills || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (occ.relatedMajors || []).some(m => m.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchGroup = selectedGroup === 'all' || occ.group === selectedGroup;
      const matchHolland = selectedHolland === 'all' || (occ.relatedHolland || []).includes(selectedHolland);

      return matchSearch && matchGroup && matchHolland;
    });
  }, [occupations, searchTerm, selectedGroup, selectedHolland]);

  const isSaved = (occId: string) => {
    return (savedItems || []).some(item => item.itemType === 'occupation' && item.itemId === occId);
  };

  const handleToggleSave = (occ: CareerOccupation) => {
    if (isSaved(occ.id)) {
      careerService.removeSavedItem(student.id, occ.id);
      setSavedSuccessMsg(`Đã bỏ lưu nghề "${occ.name}".`);
    } else {
      careerService.saveItem(student.id, {
        itemType: 'occupation',
        itemId: occ.id,
        itemTitle: occ.name,
        itemSubtitle: occ.group,
        status: 'exploring',
        notes: `Mã Holland: ${(occ.relatedHolland || []).join('')} | Lộ trình: ${occ.trainingRoadmap || ''}`,
        data: occ
      });
      setSavedSuccessMsg(`Đã thêm nghề "${occ.name}" vào "Lựa chọn của tôi"!`);
    }
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {savedSuccessMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{savedSuccessMsg}</span>
          </div>
          {onNavigateToSaved && (
            <button
              type="button"
              onClick={onNavigateToSaved}
              className="underline text-emerald-900 font-extrabold hover:text-emerald-700 cursor-pointer ml-3"
            >
              Xem danh sách lựa chọn
            </button>
          )}
        </div>
      )}

      {/* Top Banner Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-100">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                CƠ SỞ DỮ LIỆU NGHỀ NGHIỆP CÓ CẤU TRÚC
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Khám phá chi tiết công việc thực tế, môi trường làm việc, kỹ năng cốt lõi và lộ trình đào tạo phù hợp cho học viên THPT/GDTX
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Tổng cộng: <strong>{filteredOccupations.length}</strong> ngành nghề
          </span>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên nghề, kỹ năng (ví dụ: lập trình, ô tô, logistics, thiết kế, nấu ăn...)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Filter by Group */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-indigo-500" />
                <span>Nhóm lĩnh vực nghề:</span>
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 focus:border-indigo-500 focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">Tất cả lĩnh vực nghề</option>
                {occupationGroups.filter(g => g !== 'all').map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Filter by Holland Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Compass className="h-3 w-3 text-indigo-500" />
                <span>Theo nhóm sở thích Holland (RIASEC):</span>
              </label>
              <select
                value={selectedHolland}
                onChange={(e) => setSelectedHolland(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-700 focus:border-indigo-500 focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">Tất cả nhóm sở thích RIASEC</option>
                <option value="R">R – Thực tế / Kỹ thuật (Realistic)</option>
                <option value="I">I – Nghiên cứu / Khám phá (Investigative)</option>
                <option value="A">A – Nghệ thuật / Sáng tạo (Artistic)</option>
                <option value="S">S – Xã hội / Giúp đỡ (Social)</option>
                <option value="E">E – Quản lý / Lãnh đạo (Enterprising)</option>
                <option value="C">C – Nghiệp vụ / Quy củ (Conventional)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Occupations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 pt-2">
          {filteredOccupations.map((occ) => {
            const saved = isSaved(occ.id);
            return (
              <div
                key={occ.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group min-w-0"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-900 line-clamp-1">
                      {occ.group}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleSave(occ)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        saved
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                      }`}
                      title={saved ? 'Đã lưu nghề quan tâm' : 'Lưu nghề quan tâm'}
                    >
                      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {occ.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {occ.description}
                    </p>
                  </div>

                  {/* Holland Tags */}
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 pt-1">
                    <span className="text-[10px] text-slate-400 uppercase">RIASEC:</span>
                    {(occ.relatedHolland || []).map(code => (
                      <span
                        key={code}
                        className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-black text-indigo-800"
                        title={RIASEC_INFO[code]?.name || code}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 line-clamp-1">
                    Lộ trình: {occ.trainingRoadmap.split(' ')[0]} {occ.trainingRoadmap.split(' ')[1]}...
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveOccupation(occ)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Xem chi tiết</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredOccupations.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Không tìm thấy nghề nghiệp phù hợp với từ khóa.</p>
            <p className="text-[11px] text-slate-400">Hãy thử tìm với các từ khóa phổ biến hơn hoặc đặt lại bộ lọc.</p>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {activeOccupation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                  {activeOccupation.group}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {activeOccupation.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSave(activeOccupation)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    isSaved(activeOccupation.id)
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                  }`}
                >
                  {isSaved(activeOccupation.id) ? (
                    <>
                      <BookmarkCheck className="h-3.5 w-3.5" />
                      <span>Đã lưu vào Lựa chọn của tôi</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>Lưu nghề quan tâm</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveOccupation(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Description */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
                <span className="font-extrabold text-slate-900 uppercase tracking-wide text-[10px]">
                  Mô tả tổng quan
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {activeOccupation.description}
                </p>
              </div>

              {/* Main tasks */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Công việc chính hàng ngày</span>
                </h4>
                <ul className="space-y-1.5 text-slate-700 bg-white rounded-2xl border border-slate-200 p-4">
                  {(activeOccupation.mainTasks || []).map((task, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Work Environment & Required Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4 space-y-1.5">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Môi trường làm việc</span>
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {activeOccupation.workEnvironment || 'Môi trường làm việc hiện đại, chuyên nghiệp.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1.5">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-600" />
                    <span>Kỹ năng quan trọng</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(activeOccupation.requiredSkills || []).map((sk, idx) => (
                      <span key={idx} className="rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Related subjects and Holland */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4 space-y-1.5">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Môn học THPT liên quan</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(activeOccupation.relatedSubjects || []).map((sub, idx) => (
                      <span key={idx} className="rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1.5">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-teal-600" />
                    <span>Giá trị nghề nghiệp cốt lõi</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(activeOccupation.relatedWorkValues || []).map((val, idx) => (
                      <span key={idx} className="rounded-md bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 text-[10px] font-bold">
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Roadmap and majors */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
                <div className="font-extrabold text-indigo-950 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  <span>Lộ trình đào tạo & Ngành học phù hợp</span>
                </div>
                <p className="text-slate-800 font-medium">
                  {activeOccupation.trainingRoadmap}
                </p>
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-600">Ngành đào tạo gần:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(activeOccupation.relatedMajors || []).map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveOccupation(null);
                          if (onNavigateToMajors) onNavigateToMajors(m);
                        }}
                        className="rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
                        title="Bấm để tra cứu ngành này"
                      >
                        {m} →
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Note */}
              {activeOccupation.notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Ghi chú thực tiễn:</strong> {activeOccupation.notes}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Thông tin tham khảo chuẩn hướng nghiệp THPT/GDTX
              </span>
              <button
                type="button"
                onClick={() => setActiveOccupation(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
