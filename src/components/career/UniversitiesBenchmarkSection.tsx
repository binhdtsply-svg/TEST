/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Building2,
  Filter,
  ExternalLink,
  GraduationCap,
  MapPin,
  Calendar,
  CheckCircle2,
  Info,
  BookOpen,
  Layers,
  Award
} from 'lucide-react';
import {
  BenchmarkRecord,
  TrainingLevel,
  BenchmarkTier,
  RegionType,
  Student
} from '../../types';
import {
  BENCHMARK_RECORDS_DATABASE,
  BENCHMARK_TIERS,
  REGIONS
} from '../../data/majorsAndBenchmarksData';
import { careerService } from '../../services/CareerService';

interface Props {
  student?: Student;
  onNavigateToMajors?: () => void;
}

export const UniversitiesBenchmarkSection: React.FC<Props> = ({ student, onNavigateToMajors }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<TrainingLevel | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<BenchmarkTier | 'all'>('all');
  const [selectedRegion, setSelectedRegion] = useState<RegionType | 'all'>('all');

  const filteredRecords = useMemo(() => {
    return BENCHMARK_RECORDS_DATABASE.filter((rec) => {
      const city = rec.city || '';
      const matchSearch =
        !searchTerm.trim() ||
        (rec.institutionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.institutionCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.majorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLevel =
        selectedLevel === 'all' ||
        rec.trainingLevel === selectedLevel ||
        rec.level === selectedLevel ||
        (selectedLevel === 'Đại học' && rec.level === 'dai_hoc') ||
        (selectedLevel === 'Cao đẳng' && rec.level === 'cao_dang');

      const matchTier =
        selectedTier === 'all' ||
        rec.benchmarkTier === selectedTier ||
        rec.tier === selectedTier;

      const matchRegion =
        selectedRegion === 'all' ||
        selectedRegion === 'Toàn quốc' ||
        rec.region === selectedRegion ||
        rec.region === 'Toàn quốc' ||
        (selectedRegion === 'mien_nam' && rec.region === 'Miền Nam') ||
        (selectedRegion === 'mien_bac' && rec.region === 'Miền Bắc') ||
        (selectedRegion === 'mien_trung' && rec.region === 'Miền Trung & Tây Nguyên');

      return matchSearch && matchLevel && matchTier && matchRegion;
    });
  }, [searchTerm, selectedLevel, selectedTier, selectedRegion]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              <span>TRA CỨU TRƯỜNG ĐÀO TẠO & ĐIỂM CHUẨN XÉT TUYỂN</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cập nhật dữ liệu Đại học, Cao đẳng thực hành và Giáo dục nghề nghiệp với các mức điểm tham khảo phù hợp cho học viên GDTX
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Tổng cộng: <strong>{filteredRecords.length}</strong> cơ sở / ngành đào tạo
          </span>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên trường, mã trường (QSB, UEH, CKC...), tên ngành hoặc tỉnh/thành phố..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition-colors"
            />
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
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
                  const val = typeof t === 'string' ? t : t.code;
                  const label = typeof t === 'string' ? t : t.label;
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
                <option value="all">Tất cả bậc đào tạo</option>
                <option value="Đại học">Đại học</option>
                <option value="Cao đẳng">Cao đẳng</option>
                <option value="Giáo dục nghề nghiệp">Giáo dục nghề nghiệp / Trường nghề</option>
              </select>
            </div>

            {/* Khu vực */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-bold text-slate-600 truncate block">Khu vực địa lý:</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as any)}
                className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer truncate"
              >
                <option value="all">Tất cả khu vực</option>
                {REGIONS.map((r: any) => {
                  const val = typeof r === 'string' ? r : r.code;
                  const label = typeof r === 'string' ? r : r.label;
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Informative Note for GDTX Students */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Lời khuyên tuyển sinh:</strong> Ngoài phương thức xét điểm thi tốt nghiệp THPT, học viên GDTX có thể tận dụng phương thức <strong>xét học bạ THPT</strong> (nhiều trường mở cổng xét tuyển sớm từ tháng 3 - tháng 6) hoặc đăng ký các chương trình <strong>Cao đẳng 2 - 2.5 năm</strong> có liên thông lên Đại học chính quy.
          </div>
        </div>

        {/* Records Grid */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12 space-y-2 border-t border-slate-100">
            <p className="text-sm font-bold text-slate-700">Không tìm thấy trường đào tạo phù hợp</p>
            <p className="text-xs text-slate-500">Hãy thử xóa bộ lọc hoặc đổi sang mức điểm khác.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedLevel('all');
                setSelectedTier('all');
                setSelectedRegion('all');
              }}
              className="mt-2 text-xs font-bold text-amber-700 hover:underline cursor-pointer"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3.5 hover:border-amber-300 transition-all shadow-xs flex flex-col justify-between min-w-0"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-black text-xs shrink-0">
                        {rec.institutionCode}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                          {rec.institutionName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{rec.city || 'TP.HCM'} • {rec.region || 'Miền Nam'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold whitespace-nowrap ${
                      (rec.trainingLevel === 'Đại học' || rec.level === 'dai_hoc')
                        ? 'bg-blue-100 text-blue-800'
                        : (rec.trainingLevel === 'Cao đẳng' || rec.level === 'cao_dang')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rec.trainingLevel || (rec.level === 'cao_dang' ? 'Cao đẳng' : 'Đại học')}
                    </span>
                  </div>

                  {/* Major & Benchmark Highlight */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700">
                      Ngành xét tuyển: <strong className="text-slate-900">{rec.majorName}</strong> ({rec.majorCode})
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                      <span className="text-xs font-bold text-slate-700">Mức điểm tham khảo:</span>
                      <span className="text-sm font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded-lg">
                        {rec.benchmarkScore}
                      </span>
                    </div>
                  </div>

                  {/* Details Strip */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div>
                      <strong>Tổ hợp môn:</strong> {Array.isArray(rec.examGroups) ? rec.examGroups.join(', ') : (rec.examCombination || 'A00, A01, D01')}
                    </div>
                    <div>
                      <strong>Phương thức:</strong> {rec.admissionMethod || 'Xét tuyển THPT'}
                    </div>
                    {rec.note && (
                      <div className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded-xl">
                        💡 {rec.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer link and data reference */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400">
                    Năm {rec.dataYear || rec.year || 2025} • {rec.dataSource || 'Điểm chuẩn chính thức'}
                  </span>

                  <div className="flex items-center gap-2">
                    {rec.website ? (
                      <>
                        <a
                          href={rec.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-800 hover:bg-amber-100 hover:underline"
                        >
                          <span>Website Tuyển sinh</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Chưa xác minh</span>
                    )}

                    {student && (
                      <button
                        type="button"
                        onClick={() => {
                          const isAlreadySaved = careerService.isItemSaved(student.id, 'institution', rec.id);
                          if (isAlreadySaved) {
                            careerService.removeSavedItem(student.id, rec.id);
                          } else {
                            careerService.saveItem(student.id, {
                              itemType: 'institution',
                              itemId: rec.id,
                              itemTitle: rec.institutionName,
                              itemSubtitle: `${rec.majorName} • ${rec.trainingLevel}`,
                              status: 'exploring',
                              notes: `Mức điểm tham khảo: ${rec.benchmarkScore} | Tổ hợp: ${Array.isArray(rec.examGroups) ? rec.examGroups.join(', ') : (rec.examCombination || 'A00')}`,
                              data: {
                                ...rec,
                                officialWebsite: rec.website
                              }
                            });
                          }
                        }}
                        className={`rounded-lg px-2.5 py-1 font-bold text-xs transition-colors cursor-pointer ${
                          student && careerService.isItemSaved(student.id, 'institution', rec.id)
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Lưu vào Lựa chọn của tôi"
                      >
                        {student && careerService.isItemSaved(student.id, 'institution', rec.id) ? 'Đã lưu' : 'Lưu'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
