/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  Award,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react';
import { Student, SubjectConfig, AcademicPeriod, StudentAcademicRecord } from '../../types';
import { academicService, PERIOD_NAMES, isSameSubject } from '../../services/AcademicService';
import { exportService } from '../../services/ExportService';
import { classService } from '../../services/ClassService';

interface AcademicClassStatsTabProps {
  students: Student[];
  subjects: SubjectConfig[];
  period: AcademicPeriod;
  onSelectPeriod: (p: AcademicPeriod) => void;
}

export const AcademicClassStatsTab: React.FC<AcademicClassStatsTabProps> = ({
  students,
  subjects,
  period,
  onSelectPeriod
}) => {
  const appliedSubjects = subjects.filter(s => s.selected !== false && s.active !== false);
  const classSettings = classService.getSettings();

  // Selected drill-down filter
  const [activeStatView, setActiveStatView] = useState<'overview' | 'academic' | 'conduct' | 'subjects' | 'attendance'>('overview');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    academicService.syncWithBackendServer().catch(() => {});
    const unsub = academicService.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Compute academic records for all students for the given period
  const records = useMemo(() => {
    return students.map(s => {
      const rec = academicService.getStudentAcademicRecord(s.id, period);
      return {
        student: s,
        record: rec
      };
    });
  }, [students, period, dataVersion]);

  // Determine Academic Tier for TT 43/2021/TT-BGDĐT
  const computeAcademicTier = (rec: StudentAcademicRecord) => {
    const evalRes = academicService.evaluateStudentTT43(rec, appliedSubjects);
    if (!evalRes.hasFullData) return 'Chưa đủ dữ liệu';
    return evalRes.label;
  };

  // Aggregated Academic Stats
  const academicDistribution = useMemo(() => {
    const counts = {
      'Mức Tốt': 0,
      'Mức Khá': 0,
      'Mức Đạt': 0,
      'Mức Chưa đạt': 0,
      'Chưa đủ dữ liệu': 0
    };
    const studentListByTier: Record<string, Student[]> = {
      'Mức Tốt': [],
      'Mức Khá': [],
      'Mức Đạt': [],
      'Mức Chưa đạt': [],
      'Chưa đủ dữ liệu': []
    };

    records.forEach(item => {
      const tier = computeAcademicTier(item.record);
      counts[tier as keyof typeof counts] = (counts[tier as keyof typeof counts] || 0) + 1;
      if (!studentListByTier[tier]) studentListByTier[tier] = [];
      studentListByTier[tier].push(item.student);
    });

    return { counts, studentListByTier };
  }, [records]);

  // Aggregated Conduct Stats (Kết quả rèn luyện)
  const conductDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      'Tốt': 0,
      'Khá': 0,
      'Đạt': 0,
      'Chưa đạt': 0,
      'Chưa đánh giá': 0
    };
    const studentListByConduct: Record<string, Student[]> = {
      'Tốt': [],
      'Khá': [],
      'Đạt': [],
      'Chưa đạt': [],
      'Chưa đánh giá': []
    };

    records.forEach(item => {
      const conduct = item.record.conductResult || 'Chưa đánh giá';
      counts[conduct] = (counts[conduct] || 0) + 1;
      if (!studentListByConduct[conduct]) studentListByConduct[conduct] = [];
      studentListByConduct[conduct].push(item.student);
    });

    return { counts, studentListByConduct };
  }, [records]);

  // Subject Stats
  const subjectStats = useMemo(() => {
    return appliedSubjects.map(sub => {
      if (sub.assessmentMode === 'COMMENT_ONLY') {
        let pass = 0;
        let fail = 0;
        records.forEach(item => {
          const g = item.record.grades.find(x => isSameSubject(x, sub));
          if (g?.qualitativeResult === 'Đạt') pass++;
          else if (g?.qualitativeResult === 'Chưa đạt') fail++;
        });
        return {
          name: sub.name,
          mode: 'COMMENT_ONLY' as const,
          passCount: pass,
          failCount: fail,
          passRate: students.length > 0 ? ((pass / students.length) * 100).toFixed(1) : '100'
        };
      }

      const scoreList: number[] = [];
      records.forEach(item => {
        const g = item.record.grades.find(x => isSameSubject(x, sub));
        const val = period === 'full_year' ? (g?.tbCaNam ?? g?.average) : g?.average;
        if (typeof val === 'number') {
          scoreList.push(val);
        }
      });

      const count = scoreList.length;
      const avg = count > 0 ? (scoreList.reduce((a, b) => a + b, 0) / count).toFixed(2) : '-';
      const max = count > 0 ? Math.max(...scoreList).toFixed(1) : '-';
      const min = count > 0 ? Math.min(...scoreList).toFixed(1) : '-';

      const above8 = scoreList.filter(s => s >= 8.0).length;
      const above65 = scoreList.filter(s => s >= 6.5 && s < 8.0).length;
      const above50 = scoreList.filter(s => s >= 5.0 && s < 6.5).length;
      const below50 = scoreList.filter(s => s < 5.0).length;

      return {
        name: sub.name,
        mode: 'SCORE' as const,
        count,
        avg,
        max,
        min,
        above8,
        above65,
        above50,
        below50,
        rateAbove5: count > 0 ? (((count - below50) / count) * 100).toFixed(1) : '0'
      };
    });
  }, [appliedSubjects, records, students.length, period]);

  // Attendance Stats
  const attendanceStats = useMemo(() => {
    let totalExcused = 0;
    let totalUnexcused = 0;
    const topAbsences: { student: Student; excused: number; unexcused: number; total: number }[] = [];

    records.forEach(item => {
      const exc = item.record.excusedAbsences || 0;
      const unexc = item.record.unexcusedAbsences || 0;
      totalExcused += exc;
      totalUnexcused += unexc;

      if (exc + unexc > 0) {
        topAbsences.push({
          student: item.student,
          excused: exc,
          unexcused: unexc,
          total: exc + unexc
        });
      }
    });

    topAbsences.sort((a, b) => b.total - a.total);

    return {
      totalExcused,
      totalUnexcused,
      totalAbsences: totalExcused + totalUnexcused,
      topAbsences
    };
  }, [records]);

  // Export Full Stats Excel
  const handleExportStats = async () => {
    const synced = await academicService.syncWithBackendServer(undefined, true);
    if (!synced) {
      return;
    }

    const freshStudents = students;
    const freshRecords = freshStudents.map(s => ({
      student: s,
      record: academicService.getStudentAcademicRecord(s.id, period)
    }));

    const freshAcadCounts: Record<string, number> = {
      'Mức Tốt': 0,
      'Mức Khá': 0,
      'Mức Đạt': 0,
      'Mức Chưa đạt': 0,
      'Chưa đủ dữ liệu': 0
    };
    const freshCondCounts: Record<string, number> = {
      'Tốt': 0,
      'Khá': 0,
      'Đạt': 0,
      'Chưa đạt': 0,
      'Chưa đánh giá': 0
    };

    freshRecords.forEach(item => {
      const tier = computeAcademicTier(item.record);
      freshAcadCounts[tier] = (freshAcadCounts[tier] || 0) + 1;
      const conduct = item.record.conductResult || 'Chưa đánh giá';
      freshCondCounts[conduct] = (freshCondCounts[conduct] || 0) + 1;
    });

    const n = freshStudents.length;
    const academicRows = [
      { 'Phân loại': 'KẾT QUẢ HỌC TẬP (TT 43)', 'Số lượng': '', 'Tỷ lệ %': '' },
      {
        'Phân loại': 'Mức Tốt',
        'Số lượng': freshAcadCounts['Mức Tốt'],
        'Tỷ lệ %': n > 0 ? `${((freshAcadCounts['Mức Tốt'] / n) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Phân loại': 'Mức Khá',
        'Số lượng': freshAcadCounts['Mức Khá'],
        'Tỷ lệ %': n > 0 ? `${((freshAcadCounts['Mức Khá'] / n) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Phân loại': 'Mức Đạt',
        'Số lượng': freshAcadCounts['Mức Đạt'],
        'Tỷ lệ %': n > 0 ? `${((freshAcadCounts['Mức Đạt'] / n) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Phân loại': 'Mức Chưa đạt',
        'Số lượng': freshAcadCounts['Mức Chưa đạt'],
        'Tỷ lệ %': n > 0 ? `${((freshAcadCounts['Mức Chưa đạt'] / n) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Phân loại': 'Chưa đủ dữ liệu',
        'Số lượng': freshAcadCounts['Chưa đủ dữ liệu'],
        'Tỷ lệ %': n > 0 ? `${((freshAcadCounts['Chưa đủ dữ liệu'] / n) * 100).toFixed(1)}%` : '0%'
      },
      { 'Phân loại': '', 'Số lượng': '', 'Tỷ lệ %': '' },
      { 'Phân loại': 'KẾT QUẢ RÈN LUYỆN', 'Số lượng': '', 'Tỷ lệ %': '' },
      {
        'Phân loại': 'Mức Tốt',
        'Số lượng': freshCondCounts['Tốt'],
        'Tỷ lệ %': n > 0 ? `${((freshCondCounts['Tốt'] / n) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Phân loại': 'Mức Khá',
        'Số lượng': freshCondCounts['Khá'],
        'Tỷ lệ %': n > 0 ? `${((freshCondCounts['Khá'] / n) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Phân loại': 'Mức Đạt',
        'Số lượng': freshCondCounts['Đạt'],
        'Tỷ lệ %': n > 0 ? `${((freshCondCounts['Đạt'] / n) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Phân loại': 'Mức Chưa đạt',
        'Số lượng': freshCondCounts['Chưa đạt'],
        'Tỷ lệ %': n > 0 ? `${((freshCondCounts['Chưa đạt'] / n) * 100).toFixed(1)}%` : '0%'
      }
    ];

    const studentDetailRows = freshRecords.map((item, idx) => {
      const evalRes = academicService.evaluateStudentTT43(item.record, appliedSubjects);
      const row: Record<string, any> = {
        STT: idx + 1,
        'Mã học viên': item.student.code,
        'Họ và tên': item.student.fullName,
        'Tổ': `Tổ ${item.student.group}`
      };

      // Từng môn độc lập
      appliedSubjects.forEach(sub => {
        const g = item.record.grades.find(x => isSameSubject(x, sub));
        if (sub.assessmentMode === 'COMMENT_ONLY') {
          row[sub.name] = (g?.qualitativeResult === 'Đạt' || g?.qualitativeResult === 'Chưa đạt') ? g.qualitativeResult : '-';
        } else {
          const val = period === 'full_year' ? (g?.tbCaNam ?? g?.average) : g?.average;
          row[sub.name] = typeof val === 'number' ? val : '-';
        }
      });

      row['Kết quả học tập (TT43)'] = evalRes.label;
      row['Kết quả rèn luyện'] = item.record.conductResult || 'Chưa đánh giá';
      row['Ghi chú đánh giá'] = evalRes.hasFullData ? 'Đủ điều kiện xếp loại' : (evalRes.reason || 'Chưa đủ dữ liệu');

      return row;
    });

    const cName = classSettings.className || '12A1';
    exportService.exportMultiSheetExcel(
      [
        { name: `Thống kê ${PERIOD_NAMES[period]}`, data: academicRows },
        { name: 'Chi tiết từng học sinh', data: studentDetailRows }
      ],
      `Bao_Cao_Thong_Ke_Toan_Lop_${period}_${cName}`
    );
  };

  const totalCount = students.length || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <span>BÁO CÁO THỐNG KÊ TOÀN LỚP - {PERIOD_NAMES[period].toUpperCase()}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân tích tổng hợp chất lượng học tập và rèn luyện theo Thông tư 43/2021/TT-BGDĐT
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span>Kỳ:</span>
            <select
              value={period}
              onChange={e => onSelectPeriod(e.target.value as AcademicPeriod)}
              className="bg-transparent font-black text-indigo-900 focus:outline-hidden cursor-pointer"
            >
              <option value="midterm_hk1">Giữa Học kỳ 1</option>
              <option value="final_hk1">Cuối Học kỳ 1</option>
              <option value="midterm_hk2">Giữa Học kỳ 2</option>
              <option value="final_hk2">Cuối Học kỳ 2</option>
              <option value="full_year">Điểm cuối năm học</option>
            </select>
          </div>

          <button
            onClick={handleExportStats}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span>Xuất báo cáo Excel</span>
          </button>
        </div>
      </div>

      {/* Sub-view Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'overview', label: '📊 Tổng quan chung' },
          { id: 'academic', label: '🎓 Kết quả học tập (TT43)' },
          { id: 'conduct', label: '🎖️ Kết quả rèn luyện' },
          { id: 'subjects', label: '📚 Phân tích từng môn học' },
          { id: 'attendance', label: '📋 Thống kê chuyên cần' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveStatView(tab.id as any)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeStatView === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW: OVERVIEW */}
      {activeStatView === 'overview' && (
        <div className="space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Sĩ số lớp</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{students.length} học sinh</div>
              <div className="text-[11px] text-slate-500 mt-0.5">100% học sinh chính quy</div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Học tập: Mức Tốt & Khá</span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {academicDistribution.counts['Mức Tốt'] + academicDistribution.counts['Mức Khá']} HS
              </div>
              <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                {(((academicDistribution.counts['Mức Tốt'] + academicDistribution.counts['Mức Khá']) / totalCount) * 100).toFixed(1)}% toàn lớp
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-blue-800 uppercase block">Rèn luyện: Mức Tốt</span>
              <div className="text-2xl font-black text-blue-950 mt-1">
                {conductDistribution.counts['Tốt']} HS
              </div>
              <div className="text-[11px] text-blue-700 font-bold mt-0.5">
                {((conductDistribution.counts['Tốt'] / totalCount) * 100).toFixed(1)}% toàn lớp
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">Cần phụ đạo / Cải thiện</span>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {academicDistribution.counts['Mức Chưa đạt']} HS
              </div>
              <div className="text-[11px] text-amber-700 font-bold mt-0.5">
                {((academicDistribution.counts['Mức Chưa đạt'] / totalCount) * 100).toFixed(1)}% chưa đạt chuẩn
              </div>
            </div>
          </div>

          {/* Side-by-side Distribution Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Academic Panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <span>Xếp loại Kết quả Học tập (TT 43/2021)</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">Tổng: {students.length}</span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Mức Tốt', count: academicDistribution.counts['Mức Tốt'], color: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-50' },
                  { label: 'Mức Khá', count: academicDistribution.counts['Mức Khá'], color: 'bg-blue-600', text: 'text-blue-800', bg: 'bg-blue-50' },
                  { label: 'Mức Đạt', count: academicDistribution.counts['Mức Đạt'], color: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50' },
                  { label: 'Mức Chưa đạt', count: academicDistribution.counts['Mức Chưa đạt'], color: 'bg-rose-500', text: 'text-rose-800', bg: 'bg-rose-50' },
                  { label: 'Chưa đủ dữ liệu', count: academicDistribution.counts['Chưa đủ dữ liệu'], color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50' }
                ].map(item => {
                  const pct = ((item.count / totalCount) * 100).toFixed(1);
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className={item.text}>{item.label}</span>
                        <span className="text-slate-700">{item.count} HS ({pct}%)</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conduct Panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Xếp loại Kết quả Rèn luyện</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">Tổng: {students.length}</span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Mức Tốt', count: conductDistribution.counts['Tốt'] || 0, color: 'bg-emerald-600', text: 'text-emerald-800' },
                  { label: 'Mức Khá', count: conductDistribution.counts['Khá'] || 0, color: 'bg-blue-600', text: 'text-blue-800' },
                  { label: 'Mức Đạt', count: conductDistribution.counts['Đạt'] || 0, color: 'bg-amber-500', text: 'text-amber-800' },
                  { label: 'Mức Chưa đạt', count: conductDistribution.counts['Chưa đạt'] || 0, color: 'bg-rose-500', text: 'text-rose-800' },
                  { label: 'Chưa đánh giá', count: conductDistribution.counts['Chưa đánh giá'] || 0, color: 'bg-slate-400', text: 'text-slate-700' }
                ].filter(item => item.label !== 'Chưa đánh giá' || item.count > 0).map(item => {
                  const pct = ((item.count / totalCount) * 100).toFixed(1);
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className={item.text}>{item.label}</span>
                        <span className="text-slate-700">{item.count} HS ({pct}%)</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ACADEMIC TIER DETAILS */}
      {activeStatView === 'academic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { tier: 'Mức Tốt', bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', badge: 'bg-emerald-600 text-white' },
              { tier: 'Mức Khá', bg: 'bg-blue-50 border-blue-200 text-blue-900', badge: 'bg-blue-600 text-white' },
              { tier: 'Mức Đạt', bg: 'bg-amber-50 border-amber-200 text-amber-900', badge: 'bg-amber-500 text-white' },
              { tier: 'Mức Chưa đạt', bg: 'bg-rose-50 border-rose-200 text-rose-900', badge: 'bg-rose-600 text-white' },
              { tier: 'Chưa đủ dữ liệu', bg: 'bg-slate-50 border-slate-200 text-slate-800', badge: 'bg-slate-500 text-white' }
            ].map(col => {
              const list = academicDistribution.studentListByTier[col.tier] || [];
              const pct = ((list.length / totalCount) * 100).toFixed(1);

              return (
                <div key={col.tier} className={`rounded-2xl border p-4 shadow-xs space-y-3 ${col.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase text-xs">{col.tier}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${col.badge}`}>
                      {list.length} HS ({pct}%)
                    </span>
                  </div>

                  <div className="divide-y divide-black/5 max-h-80 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {list.length === 0 ? (
                      <div className="py-6 text-center text-xs opacity-60 italic">Không có học sinh</div>
                    ) : (
                      list.map((st, idx) => (
                        <div key={st.id} className="pt-1.5 flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] opacity-60">{idx + 1}.</span>
                            <span className="truncate">{st.fullName}</span>
                          </div>
                          <span className="text-[10px] opacity-70 font-mono shrink-0">Tổ {st.group}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: CONDUCT DETAILS */}
      {activeStatView === 'conduct' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { cond: 'Tốt', label: 'Kết quả: Tốt', bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', badge: 'bg-emerald-600 text-white' },
              { cond: 'Khá', label: 'Kết quả: Khá', bg: 'bg-blue-50 border-blue-200 text-blue-900', badge: 'bg-blue-600 text-white' },
              { cond: 'Đạt', label: 'Kết quả: Đạt', bg: 'bg-amber-50 border-amber-200 text-amber-900', badge: 'bg-amber-500 text-white' },
              { cond: 'Chưa đạt', label: 'Kết quả: Chưa đạt', bg: 'bg-rose-50 border-rose-200 text-rose-900', badge: 'bg-rose-600 text-white' },
              ...(conductDistribution.counts['Chưa đánh giá'] ? [{ cond: 'Chưa đánh giá', label: 'Chưa đánh giá', bg: 'bg-slate-50 border-slate-200 text-slate-800', badge: 'bg-slate-500 text-white' }] : [])
            ].map(col => {
              const list = conductDistribution.studentListByConduct[col.cond] || [];
              const pct = ((list.length / totalCount) * 100).toFixed(1);

              return (
                <div key={col.cond} className={`rounded-2xl border p-4 shadow-xs space-y-3 ${col.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase text-xs">{col.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${col.badge}`}>
                      {list.length} HS ({pct}%)
                    </span>
                  </div>

                  <div className="divide-y divide-black/5 max-h-80 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {list.length === 0 ? (
                      <div className="py-6 text-center text-xs opacity-60 italic">Không có học sinh</div>
                    ) : (
                      list.map((st, idx) => (
                        <div key={st.id} className="pt-1.5 flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] opacity-60">{idx + 1}.</span>
                            <span className="truncate">{st.fullName}</span>
                          </div>
                          <span className="text-[10px] opacity-70 font-mono shrink-0">Tổ {st.group}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: SUBJECTS BREAKDOWN */}
      {activeStatView === 'subjects' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px]">
              <tr>
                <th className="p-3.5">Môn học</th>
                <th className="p-3.5 text-center">ĐTB Môn</th>
                <th className="p-3.5 text-center">Điểm cao nhất</th>
                <th className="p-3.5 text-center">Điểm thấp nhất</th>
                <th className="p-3.5 text-center">≥ 8.0 (Giỏi)</th>
                <th className="p-3.5 text-center">6.5 - 7.9 (Khá)</th>
                <th className="p-3.5 text-center">5.0 - 6.4 (Đạt)</th>
                <th className="p-3.5 text-center">&lt; 5.0 (Chưa đạt)</th>
                <th className="p-3.5 text-center">Tỷ lệ Đạt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {subjectStats.map(s => {
                if (s.mode === 'COMMENT_ONLY') {
                  return (
                    <tr key={s.name} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-800">{s.name}</td>
                      <td colSpan={7} className="p-3.5 text-slate-500 italic">
                        Đánh giá bằng nhận xét: <strong className="text-emerald-700">{s.passCount} Đạt</strong> · <strong className="text-rose-700">{s.failCount} Chưa đạt</strong>
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">{s.passRate}%</td>
                    </tr>
                  );
                }

                return (
                  <tr key={s.name} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-800">{s.name}</td>
                    <td className="p-3.5 text-center font-black text-indigo-700 bg-indigo-50/40">{s.avg}</td>
                    <td className="p-3.5 text-center font-bold text-emerald-700">{s.max}</td>
                    <td className="p-3.5 text-center font-bold text-rose-600">{s.min}</td>
                    <td className="p-3.5 text-center text-emerald-800 font-semibold">{s.above8}</td>
                    <td className="p-3.5 text-center text-blue-800 font-semibold">{s.above65}</td>
                    <td className="p-3.5 text-center text-amber-800 font-semibold">{s.above50}</td>
                    <td className="p-3.5 text-center text-rose-700 font-semibold">{s.below50}</td>
                    <td className="p-3.5 text-center font-black text-slate-900">{s.rateAbove5}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: ATTENDANCE BREAKDOWN */}
      {activeStatView === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Tổng lượt nghỉ</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{attendanceStats.totalAbsences} buổi</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Trong toàn bộ kỳ {PERIOD_NAMES[period]}</div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-blue-800 uppercase block">Nghỉ có phép</span>
              <div className="text-2xl font-black text-blue-950 mt-1">{attendanceStats.totalExcused} buổi</div>
              <div className="text-[11px] text-blue-700 font-bold mt-0.5">
                {attendanceStats.totalAbsences > 0 ? ((attendanceStats.totalExcused / attendanceStats.totalAbsences) * 100).toFixed(1) : '100'}% có đơn xin phép
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase block">Nghỉ không phép</span>
              <div className="text-2xl font-black text-rose-950 mt-1">{attendanceStats.totalUnexcused} buổi</div>
              <div className="text-[11px] text-rose-700 font-bold mt-0.5">
                {attendanceStats.totalAbsences > 0 ? ((attendanceStats.totalUnexcused / attendanceStats.totalAbsences) * 100).toFixed(1) : '0'}% cần nhắc nhở
              </div>
            </div>
          </div>

          {/* Top Absences Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Danh sách học sinh có số buổi nghỉ nhiều nhất
            </h3>

            {attendanceStats.topAbsences.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                Tuyệt vời! Không có học sinh nào vắng buổi học nào trong kỳ này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Học sinh</th>
                      <th className="p-3">Mã HS</th>
                      <th className="p-3">Tổ</th>
                      <th className="p-3 text-center">Nghỉ có phép</th>
                      <th className="p-3 text-center">Nghỉ không phép</th>
                      <th className="p-3 text-center font-black">Tổng số buổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceStats.topAbsences.map((item, idx) => (
                      <tr key={`${item.student.id}-${idx}`} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{item.student.fullName}</td>
                        <td className="p-3 font-mono text-slate-600">{item.student.code}</td>
                        <td className="p-3">Tổ {item.student.group}</td>
                        <td className="p-3 text-center text-blue-700 font-bold">{item.excused}</td>
                        <td className="p-3 text-center text-rose-600 font-bold">{item.unexcused}</td>
                        <td className="p-3 text-center font-black text-slate-900 bg-slate-50">{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
