/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Compass,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Eye,
  TrendingUp,
  Brain,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  UserCheck,
  UserX,
  X
} from 'lucide-react';
import { Student, CareerAssessment, RIASECCategory, MBTIResult, WorkValuesResult } from '../../types';
import { careerService } from '../../services/CareerService';
import { exportService } from '../../services/ExportService';
import { RIASEC_INFO } from '../../data/onetQuestions';
import { Pagination } from '../common/Pagination';

interface ClassCareerAnalyticsDashboardProps {
  students: Student[];
  className?: string;
  onSelectStudentProfile?: (studentId: string) => void;
}

export const ClassCareerAnalyticsDashboard: React.FC<ClassCareerAnalyticsDashboardProps> = ({
  students,
  className = '11A1',
  onSelectStudentProfile
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<number | 'all'>('all');
  const [surveyStatusFilter, setSurveyStatusFilter] = useState<'all' | 'completed' | 'not_started'>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  // Drill-down modal for inspecting students in a specific category
  const [drillDownModal, setDrillDownModal] = useState<{
    title: string;
    subtitle: string;
    categoryType: 'riasec' | 'mbti' | 'work_value' | 'major' | 'exam_group' | 'status';
    categoryKey: string;
    studentsList: Student[];
  } | null>(null);

  // Pagination for student list in dashboard
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 12;

  // 1. Gather all student assessment details
  const studentStatsList = useMemo(() => {
    return students.map(s => {
      const hollandHist = careerService.getHollandHistory(s.id);
      const mbtiHist = careerService.getMBTIHistory(s.id);
      const wvHist = careerService.getWorkValuesHistory(s.id);
      const latestHolland = hollandHist[0] || careerService.getLatestAssessmentForStudent(s.id);
      const latestMBTI = mbtiHist[0] || careerService.getMBTIResult(s.id);
      const latestWV = wvHist[0] || careerService.getWorkValuesResult(s.id);
      const prof = careerService.getProfile(s.id);

      const hasHolland = !!(latestHolland && latestHolland.status === 'completed');
      const hasMBTI = !!latestMBTI;
      const hasWV = !!latestWV;
      const hasAnySurvey = hasHolland || hasMBTI || hasWV;
      const completedSurveysCount = (hasHolland ? 1 : 0) + (hasMBTI ? 1 : 0) + (hasWV ? 1 : 0);

      const primaryCode = latestHolland?.primaryCode || prof.primaryCode || '';
      const topCodes = latestHolland?.topInterestCodes || (primaryCode ? primaryCode.split('').filter(c => ['R', 'I', 'A', 'S', 'E', 'C'].includes(c)) : []);
      const mbtiCode = latestMBTI?.code || prof.mbtiResult?.code || '';
      const topWorkValue = latestWV?.topValues?.[0]?.name || prof.workValuesResult?.topValues?.[0]?.name || '';
      const targetMajor = latestHolland?.suggestedMajors?.[0] || prof.suggestedMajors?.[0] || '';
      const examGroup = latestHolland?.expectedExamCombinations?.[0] || prof.examGroups?.[0] || '';

      return {
        student: s,
        hasHolland,
        hasMBTI,
        hasWV,
        hasAnySurvey,
        completedSurveysCount,
        latestHolland,
        latestMBTI,
        latestWV,
        hollandAttemptsCount: hollandHist.length,
        mbtiAttemptsCount: mbtiHist.length,
        wvAttemptsCount: wvHist.length,
        primaryCode,
        topCodes,
        mbtiCode,
        topWorkValue,
        targetMajor,
        examGroup
      };
    });
  }, [students]);

  // Overall Completion Metrics
  const totalStudents = students.length;
  const completedAnyCount = studentStatsList.filter(s => s.hasAnySurvey).length;
  const notStartedCount = totalStudents - completedAnyCount;
  const completionRate = totalStudents > 0 ? Math.round((completedAnyCount / totalStudents) * 100) : 0;

  const hollandCompletedCount = studentStatsList.filter(s => s.hasHolland).length;
  const mbtiCompletedCount = studentStatsList.filter(s => s.hasMBTI).length;
  const wvCompletedCount = studentStatsList.filter(s => s.hasWV).length;
  const fullAllThreeCount = studentStatsList.filter(s => s.hasHolland && s.hasMBTI && s.hasWV).length;

  const hasAnyData = completedAnyCount > 0;

  // 2. RIASEC Group Distribution (only calculated from completed assessments)
  const riasecDistribution = useMemo(() => {
    const cats: RIASECCategory[] = ['R', 'I', 'A', 'S', 'E', 'C'];
    return cats.map(cat => {
      const info = RIASEC_INFO[cat];
      const matchedStudents = studentStatsList
        .filter(item => item.hasHolland && item.primaryCode.includes(cat))
        .map(item => item.student);

      const count = matchedStudents.length;
      const percentage = hollandCompletedCount > 0 ? Math.round((count / hollandCompletedCount) * 100) : 0;

      return {
        category: cat,
        info,
        count,
        percentage,
        students: matchedStudents
      };
    });
  }, [studentStatsList, hollandCompletedCount]);

  // Top RIASEC trait for the whole class
  const prominentRIASECCategory = useMemo(() => {
    if (hollandCompletedCount === 0) return null;
    const sorted = [...riasecDistribution].sort((a, b) => b.count - a.count);
    return sorted[0]?.count > 0 ? sorted[0] : null;
  }, [riasecDistribution, hollandCompletedCount]);

  // 3. MBTI Distribution
  const mbtiDistribution = useMemo(() => {
    const typeCounts: Record<string, Student[]> = {};
    studentStatsList.forEach(item => {
      if (item.hasMBTI && item.mbtiCode) {
        const code = item.mbtiCode.toUpperCase();
        if (!typeCounts[code]) typeCounts[code] = [];
        typeCounts[code].push(item.student);
      }
    });

    const entries = Object.entries(typeCounts).map(([code, stuList]) => ({
      code,
      count: stuList.length,
      percentage: mbtiCompletedCount > 0 ? Math.round((stuList.length / mbtiCompletedCount) * 100) : 0,
      students: stuList
    }));

    return entries.sort((a, b) => b.count - a.count);
  }, [studentStatsList, mbtiCompletedCount]);

  // 4. Work Values Distribution
  const workValuesDistribution = useMemo(() => {
    const valueCounts: Record<string, Student[]> = {};
    studentStatsList.forEach(item => {
      if (item.hasWV && item.topWorkValue) {
        const val = item.topWorkValue;
        if (!valueCounts[val]) valueCounts[val] = [];
        valueCounts[val].push(item.student);
      }
    });

    const entries = Object.entries(valueCounts).map(([valueName, stuList]) => ({
      name: valueName,
      count: stuList.length,
      percentage: wvCompletedCount > 0 ? Math.round((stuList.length / wvCompletedCount) * 100) : 0,
      students: stuList
    }));

    return entries.sort((a, b) => b.count - a.count);
  }, [studentStatsList, wvCompletedCount]);

  // 5. Top Majors & Career Orientations
  const topMajorsDistribution = useMemo(() => {
    const majorCounts: Record<string, Student[]> = {};
    studentStatsList.forEach(item => {
      if (item.targetMajor) {
        const m = item.targetMajor.trim();
        if (!majorCounts[m]) majorCounts[m] = [];
        majorCounts[m].push(item.student);
      }
    });

    const entries = Object.entries(majorCounts).map(([majorName, stuList]) => ({
      name: majorName,
      count: stuList.length,
      percentage: completedAnyCount > 0 ? Math.round((stuList.length / completedAnyCount) * 100) : 0,
      students: stuList
    }));

    return entries.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [studentStatsList, completedAnyCount]);

  // 6. Exam Combinations Distribution
  const examGroupsDistribution = useMemo(() => {
    const groupCounts: Record<string, Student[]> = {};
    studentStatsList.forEach(item => {
      if (item.examGroup) {
        const code = item.examGroup.split(' ')[0] || item.examGroup;
        if (!groupCounts[code]) groupCounts[code] = [];
        groupCounts[code].push(item.student);
      }
    });

    const entries = Object.entries(groupCounts).map(([groupCode, stuList]) => ({
      code: groupCode,
      count: stuList.length,
      percentage: completedAnyCount > 0 ? Math.round((stuList.length / completedAnyCount) * 100) : 0,
      students: stuList
    }));

    return entries.sort((a, b) => b.count - a.count);
  }, [studentStatsList, completedAnyCount]);

  // Filtered Student Table
  const filteredStudents = useMemo(() => {
    return studentStatsList.filter(item => {
      if (selectedGroupFilter !== 'all' && item.student.group !== selectedGroupFilter) {
        return false;
      }
      if (surveyStatusFilter === 'completed' && !item.hasAnySurvey) {
        return false;
      }
      if (surveyStatusFilter === 'not_started' && item.hasAnySurvey) {
        return false;
      }
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const matchName = item.student.fullName.toLowerCase().includes(q);
        const matchCode = item.student.code.toLowerCase().includes(q);
        const matchMajor = item.targetMajor.toLowerCase().includes(q);
        const matchRIASEC = item.primaryCode.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchMajor && !matchRIASEC) return false;
      }
      return true;
    });
  }, [studentStatsList, selectedGroupFilter, surveyStatusFilter, searchKeyword]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  // Handle Export Excel
  const handleExportAnalyticsExcel = () => {
    const exportData = studentStatsList.map((item, idx) => {
      return {
        'STT': idx + 1,
        'Mã học sinh': item.student.code,
        'Họ và tên': item.student.fullName,
        'Tổ': `Tổ ${item.student.group}`,
        'Giới tính': item.student.gender,
        'Trạng thái khảo sát': item.hasAnySurvey ? `Đã làm (${item.completedSurveysCount}/3 bài)` : 'Chưa khảo sát',
        'Mã Holland/RIASEC': item.primaryCode || 'Chưa làm',
        'Số lần trắc nghiệm Holland': item.hollandAttemptsCount,
        'Mã MBTI': item.mbtiCode || 'Chưa làm',
        'Giá trị nghề nghiệp hàng đầu': item.topWorkValue || 'Chưa làm',
        'Ngành học định hướng': item.targetMajor || 'Chưa chọn',
        'Tổ hợp môn xét tuyển': item.examGroup || 'Chưa chọn'
      };
    });

    exportService.exportToExcel(
      exportData,
      `Thong_Ke_Huong_Nghiep_Lop_${className}_${new Date().toISOString().slice(0, 10)}`,
      'Thống kê Hướng nghiệp'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Action Center */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-200 shrink-0">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Thống kê & Phân tích Hướng nghiệp của Lớp {className}
                </h2>
                <span className="rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 border border-amber-200">
                  Dành cho GVCN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bức tranh toàn cảnh tiến độ khảo sát, sở thích nghề nghiệp RIASEC, tính cách MBTI và định hướng ngành học của lớp
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="In báo cáo thống kê hướng nghiệp"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              <span>In báo cáo</span>
            </button>
            <button
              type="button"
              onClick={handleExportAnalyticsExcel}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Xuất Excel Thống kê</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          {/* Total Class Students */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Sĩ số cả lớp</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalStudents} <span className="text-xs font-semibold text-slate-500">học sinh</span></div>
            <div className="text-[11px] text-slate-500">
              Không gian lớp {className}
            </div>
          </div>

          {/* Survey Progress */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>Đã thực hiện khảo sát</span>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950">
              {completedAnyCount} <span className="text-xs font-semibold text-emerald-700">/ {totalStudents} HS</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800">
              <span>Tỷ lệ: {completionRate}%</span>
              <div className="flex-1 h-1.5 rounded-full bg-emerald-200 overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Not Started */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800">
              <span>Chưa làm khảo sát</span>
              <UserX className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-950">
              {notStartedCount} <span className="text-xs font-semibold text-rose-700">học sinh</span>
            </div>
            <div className="text-[11px] text-rose-700">
              {totalStudents > 0 ? Math.round((notStartedCount / totalStudents) * 100) : 0}% cần đôn đốc làm khảo sát
            </div>
          </div>

          {/* Prominent RIASEC Trait */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span>Nhóm nghề nổi trội nhất</span>
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            {prominentRIASECCategory ? (
              <>
                <div className="text-lg font-black text-amber-950 truncate">
                  {prominentRIASECCategory.info.name} ({prominentRIASECCategory.category})
                </div>
                <div className="text-[11px] text-amber-800 font-medium">
                  Chiếm {prominentRIASECCategory.count} HS ({prominentRIASECCategory.percentage}% nhóm đã khảo sát)
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-slate-500 italic">Chưa đủ dữ liệu</div>
                <div className="text-[11px] text-slate-400">Cần học sinh hoàn thành bài làm</div>
              </>
            )}
          </div>
        </div>

        {/* 3 Survey Tools Completion Breakdown Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 mb-2">
            Chi tiết tỷ lệ hoàn thành theo từng công cụ trắc nghiệm:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">1. Holland RIASEC:</span>
              </div>
              <span className="text-xs font-black text-amber-700">
                {hollandCompletedCount}/{totalStudents} ({totalStudents > 0 ? Math.round((hollandCompletedCount / totalStudents) * 100) : 0}%)
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">2. Khung MBTI:</span>
              </div>
              <span className="text-xs font-black text-indigo-700">
                {mbtiCompletedCount}/{totalStudents} ({totalStudents > 0 ? Math.round((mbtiCompletedCount / totalStudents) * 100) : 0}%)
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">3. Giá trị nghề nghiệp:</span>
              </div>
              <span className="text-xs font-black text-teal-700">
                {wvCompletedCount}/{totalStudents} ({totalStudents > 0 ? Math.round((wvCompletedCount / totalStudents) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* When NO DATA is available yet for the whole class */}
      {!hasAnyData && (
        <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50/50 p-8 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-amber-950">Chưa đủ dữ liệu để thống kê hướng nghiệp</h3>
          <p className="max-w-md mx-auto text-xs text-amber-800 leading-relaxed">
            Hiện tại các học sinh trong lớp chưa thực hiện các bài trắc nghiệm Holland RIASEC, MBTI hoặc Giá trị nghề nghiệp.
            Khi học sinh làm bài khảo sát trong mục <strong>Khám phá bản thân</strong>, biểu đồ và số liệu phân tích tập thể sẽ tự động cập nhật ngay tại đây.
          </p>
        </div>
      )}

      {/* Main Analytics Sections (shown when data is present) */}
      {hasAnyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 1: HOLLAND RIASEC DISTRIBUTION */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Phân bố Nhóm sở thích nghề nghiệp (Holland RIASEC)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dựa trên {hollandCompletedCount} học sinh đã hoàn thành trắc nghiệm Holland
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {riasecDistribution.map(item => {
                return (
                  <div
                    key={item.category}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 hover:bg-slate-100/80 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-white font-black text-xs shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.info.color }}
                        >
                          {item.category}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.info.name} ({item.info.vietnameseName})</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[240px]">{item.info.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">{item.count} HS</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-semibold">({item.percentage}%)</span>
                        </div>
                        {item.count > 0 && (
                          <button
                            type="button"
                            onClick={() => setDrillDownModal({
                              title: `Học sinh nhóm ${item.category} - ${item.info.name}`,
                              subtitle: `Có ${item.count} học sinh mang đặc trưng sở thích ${item.info.name} (${item.info.description})`,
                              categoryType: 'riasec',
                              categoryKey: item.category,
                              studentsList: item.students
                            })}
                            className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Xem danh sách học sinh thuộc nhóm này"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Xem danh sách</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.info.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: MBTI & WORK VALUES DISTRIBUTION */}
          <div className="space-y-6">
            {/* MBTI Groups */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Phân bố Xu hướng Tính cách MBTI
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Thống kê các kiểu tính cách phổ biến của lớp ({mbtiCompletedCount} HS đã làm)
                    </p>
                  </div>
                </div>
              </div>

              {mbtiDistribution.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {mbtiDistribution.map(item => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setDrillDownModal({
                        title: `Học sinh nhóm tính cách MBTI: ${item.code}`,
                        subtitle: `Tổng cộng có ${item.count} học sinh mang mã tính cách ${item.code}`,
                        categoryType: 'mbti',
                        categoryKey: item.code,
                        studentsList: item.students
                      })}
                      className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 text-left hover:bg-indigo-100/60 transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-950 group-hover:text-indigo-700">{item.code}</span>
                        <Eye className="h-3 w-3 text-indigo-400 group-hover:text-indigo-700" />
                      </div>
                      <div className="text-base font-black text-indigo-900 mt-1">{item.count} <span className="text-[10px] font-normal text-slate-500">HS</span></div>
                      <div className="text-[10px] text-indigo-700 font-semibold">{item.percentage}% lớp khảo sát</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                  Chưa có học sinh nào hoàn thành bài trắc nghiệm MBTI.
                </div>
              )}
            </div>

            {/* Work Values & Preferred Environments */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Giá trị & Môi trường làm việc ưu tiên
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Nhu cầu về điều kiện làm việc, văn hóa và động lực phát triển ({wvCompletedCount} HS đã làm)
                    </p>
                  </div>
                </div>
              </div>

              {workValuesDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {workValuesDistribution.slice(0, 4).map(item => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-teal-100 bg-teal-50/50 p-2.5 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-teal-950 truncate max-w-[200px]">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-teal-900">{item.count} HS ({item.percentage}%)</span>
                        <button
                          type="button"
                          onClick={() => setDrillDownModal({
                            title: `Học sinh ưu tiên giá trị: ${item.name}`,
                            subtitle: `Có ${item.count} học sinh đặt giá trị "${item.name}" lên hàng đầu`,
                            categoryType: 'work_value',
                            categoryKey: item.name,
                            studentsList: item.students
                          })}
                          className="rounded-md bg-white border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                        >
                          Xem
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                  Chưa có học sinh nào hoàn thành khảo sát Giá trị nghề nghiệp.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: TOP TARGET MAJORS & EXAM COMBINATIONS */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Nhóm Ngành học được quan tâm nhiều nhất
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Thống kê các nguyện vọng ngành học và nghề nghiệp đề xuất của lớp
                  </p>
                </div>
              </div>
            </div>

            {topMajorsDistribution.length > 0 ? (
              <div className="space-y-2.5">
                {topMajorsDistribution.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[220px]">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-800">{item.count} HS</span>
                      <span className="text-[10px] text-slate-500">({item.percentage}%)</span>
                      <button
                        type="button"
                        onClick={() => setDrillDownModal({
                          title: `Học sinh quan tâm ngành: ${item.name}`,
                          subtitle: `Có ${item.count} học sinh có định hướng hoặc nguyện vọng ngành ${item.name}`,
                          categoryType: 'major',
                          categoryKey: item.name,
                          studentsList: item.students
                        })}
                        className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                Chưa có dữ liệu định hướng ngành học của học sinh.
              </div>
            )}
          </div>

          {/* SECTION 4: EXAM COMBINATIONS (KHỐI XÉT TUYỂN THPT) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Phân bố Tổ hợp môn / Khối xét tuyển THPT
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cơ sở để GVCN tư vấn định hướng ôn tập và phân luồng học tập
                  </p>
                </div>
              </div>
            </div>

            {examGroupsDistribution.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {examGroupsDistribution.map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setDrillDownModal({
                      title: `Học sinh lựa chọn khối thi: ${item.code}`,
                      subtitle: `Có ${item.count} học sinh định hướng dự thi theo tổ hợp ${item.code}`,
                      categoryType: 'exam_group',
                      categoryKey: item.code,
                      studentsList: item.students
                    })}
                    className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-left hover:bg-blue-100/60 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-950 group-hover:text-blue-700">{item.code}</span>
                      <Eye className="h-3 w-3 text-blue-400 group-hover:text-blue-700" />
                    </div>
                    <div className="text-base font-black text-blue-900 mt-1">{item.count} <span className="text-[10px] font-normal text-slate-500">HS</span></div>
                    <div className="text-[10px] text-blue-700 font-semibold">{item.percentage}% lớp khảo sát</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                Chưa có dữ liệu tổ hợp xét tuyển của học sinh.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: ROSTER & INDIVIDUAL STUDENT STATUS MONITOR */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Danh sách Tiến độ Khảo sát & Hồ sơ Hướng nghiệp từng Học sinh
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi chi tiết số lần trắc nghiệm, kết quả gần nhất và hồ sơ của toàn bộ {students.length} học sinh
            </p>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên, mã HS, ngành..."
                className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44"
              />
            </div>

            {/* Group Filter */}
            <select
              value={selectedGroupFilter}
              onChange={(e) => {
                setSelectedGroupFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">Tất cả tổ</option>
              <option value="1">Tổ 1</option>
              <option value="2">Tổ 2</option>
              <option value="3">Tổ 3</option>
              <option value="4">Tổ 4</option>
            </select>

            {/* Status Filter */}
            <select
              value={surveyStatusFilter}
              onChange={(e) => {
                setSurveyStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã làm khảo sát</option>
              <option value="not_started">Chưa làm khảo sát</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 scrollbar-thin w-full max-w-full min-w-0">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3">Học sinh</th>
                <th className="p-3 text-center">Tổ</th>
                <th className="p-3">Tiến độ khảo sát</th>
                <th className="p-3">Mã Holland</th>
                <th className="p-3">Mã MBTI</th>
                <th className="p-3">Giá trị nghề nghiệp</th>
                <th className="p-3">Ngành định hướng</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length > 0 ? (
                paginatedList.map(item => {
                  return (
                    <tr key={item.student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.student.avatar}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{item.student.fullName}</div>
                            <div className="text-[10px] text-slate-400">{item.student.code}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          Tổ {item.student.group}
                        </span>
                      </td>

                      <td className="p-3">
                        {item.hasAnySurvey ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Hoàn thành {item.completedSurveysCount}/3 bài</span>
                            </span>
                            <div className="text-[10px] text-slate-500">
                              Holland: {item.hollandAttemptsCount}L • MBTI: {item.mbtiAttemptsCount}L • Giá trị: {item.wvAttemptsCount}L
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                            Chưa làm khảo sát
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {item.hasHolland ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
                            {item.primaryCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        {item.hasMBTI ? (
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-900 border border-indigo-200">
                            {item.mbtiCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="p-3 text-slate-700 font-medium">
                        {item.topWorkValue || <span className="text-slate-400 text-[11px]">—</span>}
                      </td>

                      <td className="p-3 text-slate-800 font-semibold">
                        {item.targetMajor || <span className="text-slate-400 text-[11px]">Chưa chọn</span>}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectStudentProfile) {
                              onSelectStudentProfile(item.student.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <span>Xem hồ sơ</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-xs text-slate-500">
                    Không tìm thấy học sinh phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredStudents.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="học sinh"
        />
      </div>

      {/* Drill-down Modal for Inspecting specific group */}
      {drillDownModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{drillDownModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{drillDownModal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrillDownModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Student List */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
              {drillDownModal.studentsList.length > 0 ? (
                drillDownModal.studentsList.map(s => {
                  const prof = careerService.getProfile(s.id);
                  const holland = careerService.getHollandHistory(s.id)[0] || careerService.getLatestAssessmentForStudent(s.id);

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={s.avatar}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-200"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{s.fullName}</div>
                          <div className="text-[10px] text-slate-500">
                            Mã: {s.code} • Tổ {s.group} • {s.gender}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="font-bold text-amber-900 rounded bg-amber-50 px-2 py-0.5 border border-amber-200">
                            {holland?.primaryCode || prof.primaryCode || 'RIASEC'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const sid = s.id;
                            setDrillDownModal(null);
                            if (onSelectStudentProfile) {
                              onSelectStudentProfile(sid);
                            }
                          }}
                          className="rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Xem hồ sơ
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Không có học sinh nào trong nhóm này.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
              <span className="text-xs font-semibold text-slate-600">
                Tổng cộng: <strong>{drillDownModal.studentsList.length}</strong> học sinh
              </span>
              <button
                type="button"
                onClick={() => setDrillDownModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
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
