/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Compass,
  Brain,
  Briefcase,
  GraduationCap,
  Building2,
  BookOpen,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Printer,
  Sparkles,
  Target,
  Award,
  Layers
} from 'lucide-react';
import { Student, CareerAssessment, MBTIResult, WorkValuesResult } from '../../types';
import { careerService } from '../../services/CareerService';
import { RIASEC_INFO } from '../../data/onetQuestions';

interface Props {
  student: Student;
  currentAssessment: CareerAssessment | null;
  onNavigateToMajors: (filterCode?: string) => void;
  onNavigateToUnis: () => void;
  onSelectTestTab: (tab: 'holland' | 'mbti' | 'work_values') => void;
}

export const ComprehensiveCareerResultSection: React.FC<Props> = ({
  student,
  currentAssessment,
  onNavigateToMajors,
  onNavigateToUnis,
  onSelectTestTab
}) => {
  const studentId = student?.id || '';
  const mbtiResult = studentId ? careerService.getMBTIResult(studentId) : null;
  const workValuesResult = studentId ? careerService.getWorkValuesResult(studentId) : null;
  const hollandHistory = studentId ? careerService.getHollandHistory(studentId) : [];
  const mbtiHistory = studentId ? careerService.getMBTIHistory(studentId) : [];
  const workValuesHistory = studentId ? careerService.getWorkValuesHistory(studentId) : [];

  const hasHolland = !!currentAssessment && currentAssessment.status === 'completed';
  const hasMbti = !!mbtiResult;
  const hasWorkValues = !!workValuesResult;

  // Aggregate recommended careers and majors
  const combinedCareers = React.useMemo(() => {
    const set = new Set<string>();
    if (hasHolland && currentAssessment && Array.isArray(currentAssessment.suggestedCareers)) {
      currentAssessment.suggestedCareers.forEach(c => c && set.add(c));
    }
    if (hasMbti && mbtiResult && Array.isArray(mbtiResult.recommendedCareers)) {
      mbtiResult.recommendedCareers.forEach(c => c && set.add(c));
    }
    if (hasWorkValues && workValuesResult && Array.isArray(workValuesResult.recommendedCareers)) {
      workValuesResult.recommendedCareers.forEach(c => c && set.add(c));
    }
    if (set.size === 0) {
      return ['Công nghệ Thông tin', 'Quản trị Kinh doanh', 'Kỹ thuật Cơ điện tử', 'Kế toán Doanh nghiệp'];
    }
    return Array.from(set).slice(0, 8);
  }, [hasHolland, currentAssessment, hasMbti, mbtiResult, hasWorkValues, workValuesResult]);

  const combinedMajors = React.useMemo(() => {
    const set = new Set<string>();
    if (hasHolland && currentAssessment && Array.isArray(currentAssessment.suggestedMajors)) {
      currentAssessment.suggestedMajors.forEach(m => m && set.add(m));
    }
    if (hasMbti && mbtiResult && Array.isArray(mbtiResult.recommendedMajors)) {
      mbtiResult.recommendedMajors.forEach(m => m && set.add(m));
    }
    if (hasWorkValues && workValuesResult && Array.isArray(workValuesResult.recommendedMajors)) {
      workValuesResult.recommendedMajors.forEach(m => m && set.add(m));
    }
    if (set.size === 0) {
      return ['Công nghệ Thông tin', 'Quản trị Kinh doanh', 'Kỹ thuật Ô tô', 'Du lịch & Lữ hành'];
    }
    return Array.from(set).slice(0, 8);
  }, [hasHolland, currentAssessment, hasMbti, mbtiResult, hasWorkValues, workValuesResult]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in w-full min-w-0 overflow-x-auto">
      {/* Top Banner Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-indigo-600 text-white shadow-md shadow-amber-100">
              <Award className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  KẾT QUẢ KHÁM PHÁ NGHỀ NGHIỆP TỔNG HỢP
                </h2>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shrink-0">
                  Hồ sơ học sinh: {student?.fullName || 'Học sinh'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Bản tổng hợp đa chiều từ Holland RIASEC, Khung MBTI và Giá trị nghề nghiệp nhằm hỗ trợ định hướng chọn ngành, chọn trường
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In Báo cáo Tổng hợp</span>
          </button>
        </div>

        {/* Disclaimer Notice */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold">Nguyên tắc định hướng nghề nghiệp:</strong> Hệ thống không tự động quyết định ngành học hay trường đào tạo thay học sinh. Kết quả là công cụ tham khảo sư phạm, học sinh và phụ huynh cần cân nhắc cùng năng lực học tập thực tế, điều kiện kinh tế gia đình và nguyện vọng cá nhân.
          </div>
        </div>

        {/* Assessment Cards Overview (3 Tools) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
          {/* Tool 1: Holland RIASEC */}
          <div className={`rounded-2xl border p-4 space-y-3 transition-all flex flex-col justify-between ${hasHolland ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-slate-50'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-amber-800 flex items-center gap-1.5">
                  <Compass className="h-4 w-4" />
                  <span>1. HOLLAND RIASEC</span>
                </span>
                {hasHolland ? (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                    Đã làm ({hollandHistory?.length || 0} lần)
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">Chưa làm</span>
                )}
              </div>

              {hasHolland && currentAssessment ? (
                <div className="space-y-1.5">
                  <div className="text-xl font-black text-amber-950">
                    Mã: {currentAssessment.primaryCode}
                  </div>
                  <div className="text-xs font-bold text-amber-800 line-clamp-1">
                    {currentAssessment.codeMeaning}
                  </div>
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-amber-200">
                    Top 3 nhóm nổi trội: <strong>{currentAssessment.topInterestCodes?.join(' - ') || currentAssessment.primaryCode || 'Chưa xác định'}</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Chưa có kết quả khảo sát 6 nhóm sở thích nghề nghiệp O*NET.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectTestTab('holland')}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <span>{hasHolland ? 'Xem chi tiết & Lịch sử' : 'Làm bài ngay'}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              {hasHolland && (
                <span className="text-[10px] font-bold text-slate-400">
                  Lần gần nhất: {currentAssessment?.createdAt?.slice(0, 10) || 'Mới nhất'}
                </span>
              )}
            </div>
          </div>

          {/* Tool 2: MBTI */}
          <div className={`rounded-2xl border p-4 space-y-3 transition-all flex flex-col justify-between ${hasMbti ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-indigo-800 flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  <span>2. KHUNG MBTI</span>
                </span>
                {hasMbti ? (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                    Đã làm ({mbtiHistory?.length || 0} lần)
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">Chưa làm</span>
                )}
              </div>

              {hasMbti && mbtiResult ? (
                <div className="space-y-1.5">
                  <div className="text-xl font-black text-indigo-950">
                    Xu hướng: {mbtiResult.code}
                  </div>
                  <div className="text-xs font-bold text-indigo-800 line-clamp-1">
                    {mbtiResult.title}
                  </div>
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-indigo-200">
                    Phong cách: <strong>{mbtiResult.percentages?.EI?.dominant === 'E' ? 'Hướng ngoại' : 'Hướng nội'} • {mbtiResult.percentages?.TF?.dominant === 'T' ? 'Lý trí' : 'Cảm xúc'}</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Chưa có kết quả 4 cặp xu hướng tính cách MBTI.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectTestTab('mbti')}
                className="text-xs font-bold text-indigo-800 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
              >
                <span>{hasMbti ? 'Xem chi tiết & Lịch sử' : 'Làm bài ngay'}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              {hasMbti && (
                <span className="text-[10px] font-bold text-slate-400">
                  Lần gần nhất: {mbtiResult?.createdAt?.slice(0, 10) || mbtiResult?.testedAt?.slice(0, 10) || 'Mới nhất'}
                </span>
              )}
            </div>
          </div>

          {/* Tool 3: Work Values & Interests */}
          <div className={`rounded-2xl border p-4 space-y-3 transition-all flex flex-col justify-between ${hasWorkValues ? 'border-teal-300 bg-teal-50/30' : 'border-slate-200 bg-slate-50'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-teal-800 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  <span>3. GIÁ TRỊ NGHỀ NGHIỆP</span>
                </span>
                {hasWorkValues ? (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                    Đã làm ({workValuesHistory?.length || 0} lần)
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">Chưa làm</span>
                )}
              </div>

              {hasWorkValues && workValuesResult ? (
                <div className="space-y-1.5">
                  <div className="text-lg font-black text-teal-950 line-clamp-1">
                    {workValuesResult.topValues[0]?.name || 'Ổn định & An toàn'}
                  </div>
                  <div className="text-xs font-bold text-teal-800 line-clamp-1">
                    Sở thích: {workValuesResult.topInterests?.[0]?.name || 'Con người'}
                  </div>
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-teal-200">
                    Môi trường ưu tiên: <strong>{workValuesResult.topValues[0]?.name}</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Chưa có kết quả khảo sát giá trị & phong cách công việc.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectTestTab('work_values')}
                className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
              >
                <span>{hasWorkValues ? 'Xem chi tiết & Lịch sử' : 'Làm bài ngay'}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              {hasWorkValues && (
                <span className="text-[10px] font-bold text-slate-400">
                  Lần gần nhất: {workValuesResult?.createdAt?.slice(0, 10) || workValuesResult?.testedAt?.slice(0, 10) || 'Mới nhất'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section: Nhóm nghề & Ngành đào tạo có thể tìm hiểu (Kèm giải thích 'Vì sao được gợi ý?') */}
        <div className="space-y-4 pt-2">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>CÁC NHÓM NGÀNH/NGHỀ BẠN CÓ THỂ TÌM HIỂU (GỢI Ý TỔNG HỢP)</span>
              </span>
              <span className="text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg">
                Trọng số: Holland (50%) + Giá trị (30%) + Tính cách (20%)
              </span>
            </div>
            <p className="text-xs text-indigo-900 leading-relaxed">
              * Đây là gợi ý tham khảo dựa trên thuật toán tương đồng dữ liệu. Hệ thống không khẳng định tuyệt đối hay quyết định thay học viên.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Suggested Careers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                <Briefcase className="h-4 w-4 text-amber-600" />
                <span>Nhóm nghề có thể tham khảo ({combinedCareers.length})</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nhóm nghề này có một số đặc điểm tương đồng với hồ sơ của bạn:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {combinedCareers.map((career, idx) => (
                  <span
                    key={idx}
                    className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-950"
                  >
                    {career}
                  </span>
                ))}
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <strong className="text-slate-800 font-bold block">Vì sao được gợi ý?</strong>
                <div>• Tương đồng với nhóm mã RIASEC {currentAssessment?.primaryCode || 'chủ đạo'} (50%).</div>
                <div>• Phù hợp với ưu tiên giá trị {workValuesResult?.topValues?.[0]?.name || 'cốt lõi'} (30%).</div>
                <div>• Tương thích phong cách làm việc của xu hướng {mbtiResult?.code || 'tính cách'} (20%).</div>
              </div>
            </div>

            {/* Suggested Majors */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                <span>Ngành đào tạo có thể tìm hiểu ({combinedMajors.length})</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Các ngành đào tạo có môn học và đầu ra tương thích cao với hồ sơ của bạn:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {combinedMajors.map((major, idx) => (
                  <span
                    key={idx}
                    className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-950"
                  >
                    {major}
                  </span>
                ))}
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <strong className="text-slate-800 font-bold block">Định hướng ôn tập:</strong>
                <div>• Tổ hợp môn tham khảo: {currentAssessment?.expectedExamCombinations?.join(', ') || 'A00, A01, D01'}.</div>
                <div>• Thích hợp xét tuyển theo điểm thi tốt nghiệp hoặc xét học bạ THPT.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: CÁC LỰA CHỌN SAU THPT (5 lộ trình đa dạng) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <Layers className="h-4 w-4 text-emerald-600" />
              <span>CÁC LỰA CHỌN SAU THPT (ĐA DẠNG HÓA LỘ TRÌNH PHÙ HỢP HỌC VIÊN THPT / GDTX)</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
              Không mặc định Đại học là lựa chọn duy nhất
            </span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 pt-1 min-w-[640px] sm:min-w-0">
            {/* Lộ trình 1: Đại học */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900">1. ĐẠI HỌC</h4>
                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">3.5 - 4 năm</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Đào tạo chuyên sâu lý thuyết & nghiên cứu ứng dụng.
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                Xét tuyển thi THPT, ĐGNL hoặc học bạ.
              </div>
            </div>

            {/* Lộ trình 2: Cao đẳng */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900">2. CAO ĐẲNG</h4>
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">2.5 - 3 năm</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                70% thời lượng thực hành tay nghề, học phí vừa phải.
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                Dễ xin việc sớm, có thể liên thông ĐH.
              </div>
            </div>

            {/* Lộ trình 3: Giáo dục nghề nghiệp / Trung cấp */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900">3. GDNN / TRUNG CẤP</h4>
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">1.5 - 2 năm</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Thực học thực nghiệp, cầm tay chỉ việc tại xưởng.
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                Chính sách miễn giảm học phí nhà nước.
              </div>
            </div>

            {/* Lộ trình 4: Học nghề & Chứng chỉ */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900">4. HỌC NGHỀ & CC</h4>
                <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">3 - 12 tháng</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Khóa đào tạo ngắn hạn: nấu ăn, đồ họa, sửa máy...
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                Thời gian nhanh, đi làm tự nuôi sống bản thân.
              </div>
            </div>

            {/* Lộ trình 5: Đi làm kết hợp học tiếp */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900">5. VỪA HỌC VỪA LÀM</h4>
                <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">Linh hoạt</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Đi làm tích lũy kinh nghiệm + học đại học từ xa / buổi tối.
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                Chủ động tài chính, không phụ thuộc gia đình.
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Action Button Strip: Link to Majors and Unis */}
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-indigo-950">
              Bước tiếp theo: Tra cứu thực tế để hiện thực hóa ước mơ
            </h4>
            <p className="text-xs text-slate-600">
              Sử dụng 2 công cụ tra cứu tích hợp đã được phân tầng điểm chuẩn để tìm kiếm phương án tối ưu nhất.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToMajors()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>Tra cứu ngành đào tạo</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToUnis}
              className="flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <Building2 className="h-4 w-4" />
              <span>Tra cứu trường và điểm chuẩn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
