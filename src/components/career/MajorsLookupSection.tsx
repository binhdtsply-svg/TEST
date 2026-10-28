/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Filter,
  GraduationCap,
  Sparkles,
  Layers,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Compass,
  Brain,
  Info,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import {
  CareerMajorItem,
  Student,
  CareerAssessment,
  TrainingLevel,
  BenchmarkTier,
  RegionType
} from '../../types';
import {
  CAREER_MAJORS_DATABASE,
  MAJOR_GROUPS,
  EXAM_COMBINATIONS,
  BENCHMARK_TIERS,
  REGIONS
} from '../../data/majorsAndBenchmarksData';
import { careerService } from '../../services/CareerService';

interface Props {
  student: Student;
  currentAssessment: CareerAssessment | null;
  initialFilterMbti?: string | null;
  onNavigateToUnis?: () => void;
}

export const MajorsLookupSection: React.FC<Props> = ({
  student,
  currentAssessment,
  initialFilterMbti,
  onNavigateToUnis
}) => {
  const mbtiResult = careerService.getMBTIResult(student.id);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Tất cả nhóm ngành');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState<TrainingLevel | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<BenchmarkTier | 'all'>('all');
  const [selectedRegion, setSelectedRegion] = useState<RegionType | 'all'>('all');
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  // Expanded major card modal/accordion
  const [expandedMajorId, setExpandedMajorId] = useState<string | null>(null);

  // Recommendations check
  const hollandTopLetters = currentAssessment?.topInterestCodes || [];
  const mbtiCode = mbtiResult?.code || initialFilterMbti || '';

  const isMajorRecommended = (major: CareerMajorItem) => {
    // Check Holland match
    const hollandMatch = hollandTopLetters.some(code => (major.suitableHolland || []).includes(code));
    // Check MBTI match
    const mbtiMatch = mbtiCode && (major.suitableMbti || []).some(m => m === mbtiCode || mbtiCode.includes(m.slice(0, 2)));
    return Boolean(hollandMatch || mbtiMatch);
  };

  const filteredMajors = useMemo(() => {
    return CAREER_MAJORS_DATABASE.filter(m => {
      const typical = m.typicalInstitutions || [];
      const examList = m.examGroups || m.examCombinations || [];
      const levelList = m.trainingLevels || ['Đại học'];

      // Search
      const matchSearch =
        !searchTerm.trim() ||
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        typical.some(i => (i.schoolName || '').toLowerCase().includes(searchTerm.toLowerCase()));

      // Group
      const matchGroup = selectedGroup === 'Tất cả nhóm ngành' || m.group === selectedGroup;

      // Exam
      const matchExam = selectedExam === 'all' || examList.includes(selectedExam);

      // Training Level
      const matchLevel = selectedLevel === 'all' || levelList.includes(selectedLevel);

      // Benchmark Tier
      const matchTier = selectedTier === 'all' || m.benchmarkTier === selectedTier;

      // Region
      const matchRegion =
        selectedRegion === 'all' ||
        selectedRegion === 'Toàn quốc' ||
        m.region === selectedRegion ||
        typical.some(i => i.region === selectedRegion || i.region === 'Toàn quốc');

      // Recommended toggle
      const matchRecommended = !onlyRecommended || isMajorRecommended(m);

      return matchSearch && matchGroup && matchExam && matchLevel && matchTier && matchRegion && matchRecommended;
    });
  }, [searchTerm, selectedGroup, selectedExam, selectedLevel, selectedTier, selectedRegion, onlyRecommended, hollandTopLetters, mbtiCode]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Smart Orientation Recommendation Banner */}
      {(hollandTopLetters.length > 0 || mbtiCode) && (
        <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-amber-50/70 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                  <span>GỢI Ý TÌM HIỂU NGÀNH THEO KẾT QUẢ TRẮC NGHIỆM</span>
                  <span className="rounded-md bg-white border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    Chỉ là gợi ý tham khảo
                  </span>
                </h3>
                <p className="text-xs text-indigo-900/80 mt-0.5">
                  Dựa trên mã Holland <strong>{currentAssessment?.primaryCode || 'RIASEC'}</strong> {mbtiCode && `và xu hướng MBTI ${mbtiCode}`}, hệ thống lọc sẵn các ngành có phong cách tư duy tương đồng.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOnlyRecommended(!onlyRecommended)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                onlyRecommended
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-indigo-900 border border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <span>{onlyRecommended ? '✓ Đang lọc ngành gợi ý' : 'Lọc các ngành được gợi ý'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Search & Stratified Filters Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
              <span>TRA CỨU NGÀNH ĐÀO TẠO & PHƯƠNG ÁN XÉT TUYỂN</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Hệ thống phân tầng đa bậc học: Đại học điểm cao, Đại học vừa sức, Cao đẳng thực hành và Giáo dục nghề nghiệp
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Hiển thị: <strong>{filteredMajors.length}</strong> ngành đào tạo
          </span>
        </div>

        {/* Filter Controls Grid */}
        <div className="space-y-3">
          {/* Row 1: Search Input */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên ngành, mã ngành (7480201...), tên trường đào tạo hoặc từ khóa..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition-colors"
            />
          </div>

          {/* Row 2: Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 min-w-0">
            {/* Nhóm ngành */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-600 truncate block">Nhóm ngành:</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
              >
                {MAJOR_GROUPS.map((g: any) => {
                  const val = typeof g === 'string' ? g : (g.label || g.id || g.name);
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
            </div>

            {/* Tổ hợp môn */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-600 truncate block">Tổ hợp môn:</label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
              >
                <option value="all">Tất cả tổ hợp môn</option>
                {EXAM_COMBINATIONS.map((ex: any) => {
                  const val = typeof ex === 'string' ? ex : (ex.id || ex.code || ex.label);
                  const label = typeof ex === 'string' ? ex : (ex.label || ex.name || ex.id);
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>

            {/* Bậc đào tạo */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-600 truncate block">Bậc đào tạo:</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
              >
                <option value="all">Tất cả bậc học</option>
                <option value="Đại học">Đại học</option>
                <option value="Cao đẳng">Cao đẳng</option>
                <option value="Giáo dục nghề nghiệp">Giáo dục nghề nghiệp / Nghề</option>
              </select>
            </div>

            {/* Mức điểm tham khảo */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-600 truncate block">Mức điểm tham khảo:</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
                className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
              >
                <option value="all">Tất cả phân tầng điểm</option>
                {BENCHMARK_TIERS.map((t: any) => {
                  const val = typeof t === 'string' ? t : (t.code || t.id || t.label);
                  const label = typeof t === 'string' ? t : (t.label || t.name || t.code);
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>

            {/* Khu vực */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-600 truncate block">Khu vực:</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as any)}
                className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
              >
                <option value="all">Tất cả khu vực</option>
                {REGIONS.map((r: any) => {
                  const val = typeof r === 'string' ? r : (r.code || r.id || r.label);
                  const label = typeof r === 'string' ? r : (r.label || r.name || r.code);
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>
          </div>
        </div>

        {/* List of Majors Cards */}
        {filteredMajors.length === 0 ? (
          <div className="text-center py-12 space-y-2 border-t border-slate-100">
            <p className="text-sm font-bold text-slate-700">Không tìm thấy ngành đào tạo phù hợp với bộ lọc</p>
            <p className="text-xs text-slate-500">Vui lòng thử xóa từ khóa tìm kiếm hoặc chọn lại mức điểm và bậc đào tạo khác.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedGroup('Tất cả nhóm ngành');
                setSelectedExam('all');
                setSelectedLevel('all');
                setSelectedTier('all');
                setSelectedRegion('all');
                setOnlyRecommended(false);
              }}
              className="mt-2 text-xs font-bold text-amber-700 hover:underline cursor-pointer"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {filteredMajors.map((major) => {
              const isRecommended = isMajorRecommended(major);
              const isExpanded = expandedMajorId === major.id;

              return (
                <div
                  key={major.id}
                  className={`rounded-3xl border transition-all ${
                    isRecommended
                      ? 'border-amber-300 bg-gradient-to-br from-amber-50/20 via-white to-slate-50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-black">
                            Mã: {major.code}
                          </span>
                          <span className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-bold">
                            {major.group}
                          </span>
                          {isRecommended && (
                            <span className="rounded-lg bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[11px] font-black flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-amber-500" />
                              <span>Gợi ý theo bài test</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                          {major.name}
                        </h4>
                      </div>

                      {/* Training Levels Badges & Save */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {(major.trainingLevels || ['Đại học']).map((lvl) => (
                          <span
                            key={lvl}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                              lvl === 'Đại học'
                                ? 'bg-blue-100 text-blue-800'
                                : lvl === 'Cao đẳng'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {lvl}
                          </span>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const isSaved = careerService.isItemSaved(student.id, 'major', major.id);
                            if (isSaved) {
                              careerService.removeSavedItem(student.id, major.id);
                            } else {
                              const examStr = (major.examGroups || major.examCombinations || []).join(', ');
                              careerService.saveItem(student.id, {
                                itemType: 'major',
                                itemId: major.id,
                                itemTitle: major.name,
                                itemSubtitle: `${major.code} • ${major.group}`,
                                status: 'exploring',
                                notes: `Điểm chuẩn: ${major.scoreRangeDescription || major.benchmarkRange || 'Tham khảo'} | Tổ hợp: ${examStr}`,
                                data: major
                              });
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ml-1 ${
                            careerService.isItemSaved(student.id, 'major', major.id)
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                          }`}
                          title={careerService.isItemSaved(student.id, 'major', major.id) ? 'Đã lưu vào Lựa chọn của tôi' : 'Lưu ngành quan tâm'}
                        >
                          {careerService.isItemSaved(student.id, 'major', major.id) ? (
                            <BookmarkCheck className="h-4 w-4" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {major.description}
                    </p>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700">Tổ hợp môn xét tuyển:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(major.examGroups || major.examCombinations || []).map((g) => (
                            <span key={g} className="rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-800 border border-slate-200">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700">Khoảng điểm đầu vào tham khảo:</span>
                        <div className="text-[11px] font-semibold text-amber-800 mt-1">
                          {major.scoreRangeDescription || major.benchmarkRange || 'Theo đề án tuyển sinh'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700">Triển vọng việc làm:</span>
                        <div className="text-[11px] text-emerald-800 font-medium mt-1 line-clamp-2">
                          {major.prospects || major.pros || 'Đa dạng cơ hội việc làm'}
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-500">
                        Dữ liệu: <strong>{major.dataYear || '2025 - 2026'}</strong> • Nguồn: <strong>{major.dataSource || 'Bộ GD&ĐT'}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpandedMajorId(isExpanded ? null : major.id)}
                        className="flex items-center gap-1.5 font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Thu gọn danh sách trường' : `Xem các trường đào tạo phân tầng (${(major.typicalInstitutions || []).length} trường)`}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Stratified School List */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-4 rounded-b-3xl">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-amber-600" />
                          <span>Các cơ sở đào tạo phân tầng điểm chuẩn & học bạ:</span>
                        </h5>
                        <span className="text-[11px] text-slate-500">
                          Đã sắp xếp theo các mức điểm tham khảo & cơ hội đào tạo thay thế
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(major.typicalInstitutions || []).map((inst, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 hover:border-amber-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                  inst.tier === 'Mức điểm cao'
                                    ? 'bg-rose-100 text-rose-800'
                                    : inst.tier === 'Mức điểm trung bình'
                                    ? 'bg-blue-100 text-blue-800'
                                    : inst.tier === 'Mức điểm vừa sức'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {inst.tier}
                                </span>
                                <h6 className="text-xs font-bold text-slate-900 mt-1">
                                  {inst.schoolName} ({inst.schoolCode})
                                </h6>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 whitespace-nowrap">
                                {inst.region}
                              </span>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-2 text-xs space-y-1">
                              <div className="font-bold text-slate-800">
                                Mức điểm tham khảo: <span className="text-amber-800 font-extrabold">{inst.benchmark}</span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                {inst.admissionNote}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {onNavigateToUnis && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={onNavigateToUnis}
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                          >
                            <span>Xem chi tiết tại Tab "Trường ĐH & Điểm chuẩn"</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
