/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserX,
  Award,
  AlertTriangle,
  Calendar,
  X,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { studentService } from '../../services/StudentService';
import { trainingService } from '../../services/TrainingService';
import { classAnalyticsAndAlertService } from '../../services/ClassAnalyticsAndAlertService';
import { violationAnalyticsService, getTransactionISODate } from '../../services/ViolationAnalyticsService';
import { fullYearReportService } from '../../services/FullYearReportService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { academicService } from '../../services/AcademicService';
import { PointTransaction } from '../../types';

interface QuickStatsCardsProps {
  onNavigate?: (module: string) => void;
}

type Period = 'day' | 'week' | 'month' | 'semester' | 'year';

export const QuickStatsCards: React.FC<QuickStatsCardsProps> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<Period>('week');
  const [activeModal, setActiveModal] = useState<'absence' | 'reward' | 'violation' | 'roster' | null>(null);
  const [students, setStudents] = useState(studentService.getAll());
  const [allTx, setAllTx] = useState(trainingService.getAllTransactions());
  const [classSettings, setClassSettings] = useState(classService.getSettings());

  React.useEffect(() => {
    const unsubStu = studentService.subscribe(() => setStudents(studentService.getAll()));
    const unsubTrain = trainingService.subscribe(() => setAllTx(trainingService.getAllTransactions()));
    const unsubViol = violationAnalyticsService.subscribe(() => setAllTx(trainingService.getAllTransactions()));
    const unsubClass = classService.subscribe(() => setClassSettings(classService.getSettings()));
    const unsubAcad = academicService.subscribe(() => setStudents([...studentService.getAll()]));
    return () => {
      unsubStu();
      unsubTrain();
      unsubViol();
      unsubClass();
      unsubAcad();
    };
  }, []);

  const currentUser = authService.getCurrentUser();
  const isTeacherOrAdmin = currentUser.role === 'TEACHER' || (currentUser.role as any) === 'SUPER_ADMIN';
  const allStudents = studentService.getStudents();
  const myStudentId = currentUser.studentId || 
    (currentUser as any).childStudentId || 
    (currentUser.id?.startsWith('usr_stu_') ? currentUser.id.replace('usr_stu_', '') : '') ||
    (allStudents.find(s => s.code?.toLowerCase() === currentUser.id?.toLowerCase() || s.code?.toLowerCase() === (currentUser as any).username?.toLowerCase() || s.email === currentUser.email)?.id || '');

  const getStudentInfo = (tx: PointTransaction) => {
    const s = allStudents.find(stu => stu.id === tx.studentId || stu.code === tx.studentId);
    const fullName = s?.fullName || (tx.studentName && tx.studentName !== 'Học sinh' ? tx.studentName : 'Học viên');
    const group = s?.group ?? (tx.studentGroup && tx.studentGroup !== 1 ? tx.studentGroup : undefined) ?? 1;
    return { fullName, group };
  };

  // Real-time calculated summaries
  const weeklySummary = classAnalyticsAndAlertService.getWeeklyClassSummary();
  const monthlySummary = classAnalyticsAndAlertService.getMonthlyClassSummary();

  // Filter approved, deduplicated transactions belonging to active students in current class
  const approvedTx = useMemo(() => {
    const activeIds = new Set(students.map(s => s.id));
    const activeCodes = new Set(
      students.map(s => (s.code ? s.code.trim().toLowerCase() : '')).filter(Boolean)
    );
    const seenIds = new Set<string>();

    return allTx.filter(t => {
      if (!fullYearReportService.isApprovedTransaction(t)) return false;
      if (students.length > 0) {
        const matchId = activeIds.has(t.studentId);
        const matchCode = activeCodes.has(String(t.studentId || '').trim().toLowerCase());
        if (!matchId && !matchCode) return false;
      }
      if (t.id) {
        if (seenIds.has(t.id)) return false;
        seenIds.add(t.id);
      }
      return true;
    });
  }, [allTx, students]);

  // Violations - Unified single source of truth via violationAnalyticsService
  const violationStats = useMemo(() => {
    return violationAnalyticsService.getOverviewViolations(period);
  }, [period, allTx]);

  const currentSemesterKey = useMemo(() => {
    const sem = String(classSettings?.semester || '').trim();
    return sem.includes('II') || sem.toUpperCase().includes('HK2') ? 'hk2' : 'hk1';
  }, [classSettings?.semester]);

  // Unified period filtering for transactions using getTransactionISODate and semester bounds
  const periodTx = useMemo(() => {
    return approvedTx.filter(t => {
      if (period === 'year') {
        return true;
      }
      if (period === 'semester') {
        return fullYearReportService.resolveTransactionSemester(t, classSettings) === currentSemesterKey;
      }
      const iso = getTransactionISODate(t);
      if (!iso) return true;
      if (violationStats.startDate && violationStats.endDate) {
        return iso >= violationStats.startDate && iso <= violationStats.endDate;
      }
      return true;
    });
  }, [approvedTx, period, currentSemesterKey, classSettings, violationStats.startDate, violationStats.endDate]);

  // Direct transaction absence counts
  const excusedAbsences = useMemo(
    () => periodTx.filter(t => fullYearReportService.classifyAbsenceTransaction(t) === 'excused'),
    [periodTx]
  );
  const unexcusedAbsences = useMemo(
    () => periodTx.filter(t => fullYearReportService.classifyAbsenceTransaction(t) === 'unexcused'),
    [periodTx]
  );

  const myExcused = useMemo(() => excusedAbsences.filter(t => t.studentId === myStudentId), [excusedAbsences, myStudentId]);
  const myUnexcused = useMemo(() => unexcusedAbsences.filter(t => t.studentId === myStudentId), [unexcusedAbsences, myStudentId]);

  // Reconcile semester and year statistics with academic records (Math.max source of truth)
  const semesterOrYearAbsences = useMemo(() => {
    if (period !== 'semester' && period !== 'year') return null;
    const isHk1 = currentSemesterKey === 'hk1';
    let totalEx = 0;
    let totalUnex = 0;
    let myEx = 0;
    let myUnex = 0;

    students.forEach(s => {
      const recHk1 = academicService.getStudentAcademicRecord(s.id, 'final_hk1') || academicService.getStudentAcademicRecord(s.id, 'midterm_hk1');
      const recHk2 = academicService.getStudentAcademicRecord(s.id, 'final_hk2') || academicService.getStudentAcademicRecord(s.id, 'midterm_hk2');
      const abs = fullYearReportService.getStudentAbsencesBySemester(s.id, recHk1, recHk2);
      const studentAbs = period === 'semester' ? (isHk1 ? abs.hk1 : abs.hk2) : abs.fullYear;

      totalEx += studentAbs.excused;
      totalUnex += studentAbs.unexcused;
      if (s.id === myStudentId) {
        myEx = studentAbs.excused;
        myUnex = studentAbs.unexcused;
      }
    });

    return { totalEx, totalUnex, myEx, myUnex };
  }, [period, currentSemesterKey, students, myStudentId, allTx]);

  const displayExcusedCount = semesterOrYearAbsences
    ? (isTeacherOrAdmin ? semesterOrYearAbsences.totalEx : semesterOrYearAbsences.myEx)
    : (isTeacherOrAdmin ? excusedAbsences.length : myExcused.length);

  const displayUnexcusedCount = semesterOrYearAbsences
    ? (isTeacherOrAdmin ? semesterOrYearAbsences.totalUnex : semesterOrYearAbsences.myUnex)
    : (isTeacherOrAdmin ? unexcusedAbsences.length : myUnexcused.length);

  const displayTotalAbsences = displayExcusedCount + displayUnexcusedCount;
  const classTotalAbsences = isTeacherOrAdmin ? displayTotalAbsences : (excusedAbsences.length + unexcusedAbsences.length);

  // Rewards based on selected period
  const rewardTx = periodTx.filter(t =>
    t.points > 0 || t.category === 'Việc tốt' || t.category === 'Tiến bộ' || t.category === 'Khen thưởng'
  );
  const classRewardPoints = rewardTx.reduce((sum, t) => sum + (t.points > 0 ? t.points : 0), 0);

  const myRewardTx = rewardTx.filter(t => t.studentId === myStudentId);
  const myRewardPoints = myRewardTx.reduce((sum, t) => sum + (t.points > 0 ? t.points : 0), 0);

  const displayRewardPoints = isTeacherOrAdmin ? classRewardPoints : myRewardPoints;
  const displayRewardCount = isTeacherOrAdmin ? rewardTx.length : myRewardTx.length;

  const violationTx = violationStats.records;
  const myViolationTx = violationTx.filter(t => t.studentId === myStudentId);
  const displayViolationCount = isTeacherOrAdmin ? violationStats.totalCount : myViolationTx.length;

  const violationTrendText = isTeacherOrAdmin
    ? (period === 'week'
        ? weeklySummary.violations.trendText
        : period === 'month'
        ? monthlySummary.violations.trendText
        : undefined)
    : undefined;
  const violationPoints = isTeacherOrAdmin
    ? violationStats.totalPenaltyPoints
    : myViolationTx.reduce((s, t) => s + (t.points < 0 ? Math.abs(t.points) : 0), 0);

  const attendanceRate = useMemo(() => {
    if (period === 'week') return weeklySummary.attendance.attendanceRate;
    if (period === 'month') return monthlySummary.attendance.attendanceRate;
    if (period === 'day') {
      const totalPossible = Math.max(students.length, 1);
      const missed = classTotalAbsences;
      return Math.max(0, Math.min(100, Math.round(((totalPossible - missed) / totalPossible) * 1000) / 10));
    }
    const semesterSummary = classAnalyticsAndAlertService.getSemesterClassSummary();
    if (semesterSummary?.attendance?.attendanceRate) {
      return semesterSummary.attendance.attendanceRate;
    }
    const daysInPeriod = period === 'semester' ? 90 : 180;
    const totalPossible = Math.max(students.length * daysInPeriod, 1);
    const missed = classTotalAbsences;
    return Math.max(0, Math.min(100, Math.round(((totalPossible - missed) / totalPossible) * 1000) / 10));
  }, [period, weeklySummary, monthlySummary, students.length, classTotalAbsences]);

  return (
    <div className="space-y-3">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {isTeacherOrAdmin ? 'Thống kê Rèn luyện & Nề nếp Lớp học' : 'Thống kê Rèn luyện & Nề nếp của Em'}
          </h3>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs border border-slate-200/60">
          <button
            onClick={() => setPeriod('day')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
              period === 'day' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
              period === 'week' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tuần này
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
              period === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setPeriod('semester')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
              period === 'semester' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {classSettings?.semester || 'Học kỳ I'}
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
              period === 'year' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cả năm
          </button>
        </div>
      </div>

      {/* 4 Primary Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: NGHỈ HỌC */}
        <div
          onClick={() => setActiveModal('absence')}
          className="group relative flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-linear-to-br from-white to-amber-50/40 p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Nghỉ học & Chuyên cần</span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <UserX className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-slate-900">
                {displayTotalAbsences} <span className="text-xs font-semibold text-slate-500">{isTeacherOrAdmin ? 'lượt nghỉ toàn lớp' : 'lượt nghỉ của em'}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Có phép: <span className="font-bold text-amber-700">{displayExcusedCount}</span> • Không phép: <span className="font-bold text-rose-700">{displayUnexcusedCount}</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-amber-200/40 flex items-center justify-between text-[11px] font-semibold text-amber-700 group-hover:text-amber-800">
            <span>Xem chi tiết vắng</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Card 2: KHEN THƯỞNG */}
        <div
          onClick={() => setActiveModal('reward')}
          className="group relative flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-linear-to-br from-white to-emerald-50/40 p-4 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Khen thưởng đã duyệt</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-emerald-600">
                +{displayRewardPoints} <span className="text-xs font-semibold text-emerald-700">điểm</span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                <span className="font-bold text-emerald-700">{displayRewardCount} lượt</span> {isTeacherOrAdmin ? 'việc tốt & tiến bộ (toàn lớp)' : 'việc tốt & tiến bộ của em'}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-200/40 flex items-center justify-between text-[11px] font-semibold text-emerald-700 group-hover:text-emerald-800">
            <span>Xem danh sách khen thưởng</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Card 3: VI PHẠM */}
        <div
          onClick={() => setActiveModal('violation')}
          className="group relative flex flex-col justify-between rounded-2xl border border-rose-200/80 bg-linear-to-br from-white to-rose-50/40 p-4 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Vi phạm nề nếp</span>
              <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-rose-600">
                {displayViolationCount} <span className="text-xs font-semibold text-rose-700">lượt</span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 line-clamp-1">
                {violationTrendText ? (
                  <span>{violationTrendText}</span>
                ) : (
                  <span><span className="font-bold text-rose-700">{displayViolationCount} lượt</span> {isTeacherOrAdmin ? `vi phạm nề nếp (${violationStats.studentsWithViolationCount} học viên)` : 'vi phạm nề nếp của em'}</span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-200/40 flex items-center justify-between text-[11px] font-semibold text-rose-700 group-hover:text-rose-800">
            <span>{isTeacherOrAdmin ? 'Xem chi tiết vi phạm' : 'Xem thống kê vi phạm'}</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Card 4: SĨ SỐ */}
        <div
          onClick={() => setActiveModal('roster')}
          className="group relative flex flex-col justify-between rounded-2xl border border-blue-200/80 bg-linear-to-br from-white to-blue-50/40 p-4 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Sĩ số & Chuyên cần</span>
              <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-2xl font-black text-slate-900">
                {students.length} <span className="text-xs font-semibold text-slate-500">học viên</span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Tỷ lệ chuyên cần: <span className="font-bold text-emerald-600">{attendanceRate}%</span>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-200/40 flex items-center justify-between text-[11px] font-semibold text-blue-700 group-hover:text-blue-800">
            <span>Danh sách lớp</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Drill-down Detail Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {activeModal === 'absence' && <><UserX className="h-5 w-5 text-amber-600" /> Chi tiết Nghỉ học & Chuyên cần</>}
                {activeModal === 'reward' && <><Award className="h-5 w-5 text-emerald-600" /> Danh sách Khen thưởng đã duyệt</>}
                {activeModal === 'violation' && <><AlertTriangle className="h-5 w-5 text-rose-600" /> Danh sách Vi phạm nề nếp đã duyệt</>}
                {activeModal === 'roster' && <><Users className="h-5 w-5 text-blue-600" /> Danh sách Sĩ số Học viên ({students.length})</>}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {!isTeacherOrAdmin && (
                <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-800 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Chi tiết vi phạm và chuyên cần của học sinh khác được bảo mật theo quy định. Bạn chỉ xem dữ liệu thuộc tài khoản của mình.</span>
                </div>
              )}

              {activeModal === 'absence' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 font-medium">
                    <span>{isTeacherOrAdmin ? `Tổng lượt nghỉ ghi nhận toàn lớp: ${displayTotalAbsences}` : `Tổng lượt nghỉ của em: ${displayTotalAbsences}`}</span>
                    <span>Có phép: {displayExcusedCount} | Không phép: {displayUnexcusedCount}</span>
                  </div>
                  {(() => {
                    const list = isTeacherOrAdmin
                      ? [...excusedAbsences, ...unexcusedAbsences]
                      : [...excusedAbsences, ...unexcusedAbsences].filter(t => t.studentId === myStudentId);

                    return list.length > 0 ? (
                      list.map((tx) => {
                        const { fullName, group } = getStudentInfo(tx);
                        const kind = fullYearReportService.classifyAbsenceTransaction(tx);
                        const isExcused = kind === 'excused';
                        return (
                          <div key={tx.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start justify-between">
                            <div>
                              <div className="font-bold text-slate-900">{fullName} (Tổ {group})</div>
                              <div className="text-slate-600 mt-0.5">{tx.reason}</div>
                              <div className="text-[11px] text-slate-400 mt-1">Ngày: {tx.eventDate || tx.timestamp || tx.createdAt}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isExcused ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isExcused ? 'Nghỉ có phép' : 'Nghỉ không phép'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-slate-400 italic">
                        {isTeacherOrAdmin ? 'Không có học sinh vắng trong giai đoạn này.' : 'Em không có lượt vắng nào trong giai đoạn này.'}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeModal === 'reward' && (
                <div className="space-y-2">
                  {(() => {
                    const list = isTeacherOrAdmin ? rewardTx : myRewardTx;
                    return list.length > 0 ? (
                      list.map((tx) => {
                        const { fullName, group } = getStudentInfo(tx);
                        return (
                          <div key={tx.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 flex items-start justify-between">
                            <div>
                              <div className="font-bold text-slate-900">{fullName} (Tổ {group})</div>
                              <div className="text-slate-600 mt-0.5">{tx.reason}</div>
                              <div className="text-[11px] text-slate-400 mt-1">Duyệt bởi GVCN · {tx.timestamp || tx.createdAt}</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800">
                              +{tx.points} điểm
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-slate-400 italic">
                        {isTeacherOrAdmin ? 'Chưa có khen thưởng nào được duyệt.' : 'Em chưa có điểm thưởng nào trong giai đoạn này.'}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeModal === 'violation' && (
                <div className="space-y-2">
                  {(() => {
                    const list = isTeacherOrAdmin
                      ? violationTx
                      : violationTx.filter(t => t.studentId === myStudentId);

                    return list.length > 0 ? (
                      list.map((tx) => {
                        const { fullName, group } = getStudentInfo(tx);
                        return (
                          <div key={tx.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 flex items-start justify-between">
                            <div>
                              <div className="font-bold text-slate-900">{fullName} (Tổ {group})</div>
                              <div className="text-slate-600 mt-0.5">{tx.reason}</div>
                              <div className="text-[11px] text-slate-400 mt-1">Duyệt bởi GVCN · {tx.timestamp || tx.createdAt}</div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800">
                              {tx.points} điểm
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-slate-400 italic">
                        {isTeacherOrAdmin ? 'Không có vi phạm nào được ghi nhận.' : 'Em không có vi phạm nào trong giai đoạn này.'}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeModal === 'roster' && (
                <div className="space-y-2">
                  {students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/70">
                      <div className="flex items-center gap-3">
                        <img src={s.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" />
                        <div>
                          <div className="font-bold text-slate-900">{s.fullName}</div>
                          <div className="text-[11px] text-slate-500">Mã: {s.code} · Tổ {s.group} {s.officerRole ? `· ${s.officerRole}` : ''}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Đang học
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              {onNavigate && (
                <button
                  onClick={() => {
                    const target = activeModal === 'absence' || activeModal === 'reward' || activeModal === 'violation' ? 'training' : 'students';
                    setActiveModal(null);
                    onNavigate(target);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Mở toàn bộ module {activeModal === 'roster' ? 'Học viên' : 'Rèn luyện'} →
                </button>
              )}
              <button
                onClick={() => setActiveModal(null)}
                className="ml-auto rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
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

