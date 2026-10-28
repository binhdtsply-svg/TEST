/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, SubjectConfig, ClassSettings, AcademicPeriod, PointTransaction } from '../types';
import { studentService } from './StudentService';
import { classService } from './ClassService';
import { academicService, isSameSubject } from './AcademicService';
import { conductEvaluationService } from './ConductEvaluationService';
import { trainingService } from './TrainingService';
import { calculateSubjectAverage, isEnteredValidScore } from './AcademicCalculationService';
import { SchoolYearDateNormalizer } from './SchoolYearDateNormalizer';

export type ReportPeriod = 'hk1' | 'hk2' | 'full_year';

export interface StudentFullYearSubjectRow {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  assessmentMode: 'SCORE_AND_COMMENT' | 'COMMENT_ONLY';
  txColumnCount: number;
  txScores: (number | undefined)[];
  txScoresHk1?: (number | undefined)[];
  txScoresHk2?: (number | undefined)[];
  midtermHk1?: number;
  finalExamHk1?: number;
  midtermHk2?: number;
  finalExamHk2?: number;
  tbHk1?: number;
  tbHk2?: number;
  tbCaNam?: number;
  qualitativeHk1?: string;
  qualitativeHk2?: string;
  qualitativeCaNam?: string;
  comment?: string;
  commentHk1?: string;
  commentHk2?: string;
}

export interface StudentFullYearReportData {
  student: Student;
  classSettings: ClassSettings;
  schoolYear: string;
  className: string;
  teacherName: string;
  subjectRows: StudentFullYearSubjectRow[];
  conductHk1: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string;
  conductHk2: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string;
  conductCaNam: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string;
  excusedAbsences: number;
  unexcusedAbsences: number;
  excusedAbsencesHk1?: number;
  unexcusedAbsencesHk1?: number;
  excusedAbsencesHk2?: number;
  unexcusedAbsencesHk2?: number;
  academicResult: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại';
  academicResultHk1?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại';
  academicResultHk2?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại';
  honorTitle: 'Học viên Xuất sắc' | 'Học viên Giỏi' | '';
  honorTitleHk1?: 'Học viên Xuất sắc' | 'Học viên Giỏi' | '';
  honorTitleHk2?: 'Học viên Xuất sắc' | 'Học viên Giỏi' | '';
  autoSummaryNote: string;
  autoSummaryNoteHk1?: string;
  autoSummaryNoteHk2?: string;
  teacherComment: string;
  teacherCommentHk1?: string;
  teacherCommentHk2?: string;
}

export interface ClassFullYearStudentRow {
  stt: number;
  studentId: string;
  studentCode: string;
  studentName: string;
  group: number;
  gender: 'Nam' | 'Nữ';
  dob: string;
  // Subject scores map: key is subjectName or subjectId
  subjectScores: Record<string, {
    tbHk1?: number | string;
    tbHk2?: number | string;
    tbCaNam?: number | string;
  }>;
  excusedAbsences: number;
  unexcusedAbsences: number;
  excusedAbsencesHk1?: number;
  unexcusedAbsencesHk1?: number;
  excusedAbsencesHk2?: number;
  unexcusedAbsencesHk2?: number;
  academicResult: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại';
  academicResultHk1?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại';
  academicResultHk2?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại';
  conductHk1: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string;
  conductHk2: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string;
  conductCaNam: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string;
  honorTitle: 'Học viên Xuất sắc' | 'Học viên Giỏi' | '';
  honorTitleHk1?: 'Học viên Xuất sắc' | 'Học viên Giỏi' | '';
  honorTitleHk2?: 'Học viên Xuất sắc' | 'Học viên Giỏi' | '';
  autoSummaryNote: string;
  autoSummaryNoteHk1?: string;
  autoSummaryNoteHk2?: string;
  teacherComment: string;
  teacherCommentHk1?: string;
  teacherCommentHk2?: string;
}

export interface ReportSummaryStats {
  totalStudents: number;
  totCount: number;
  totPercent: number;
  khaCount: number;
  khaPercent: number;
  datCount: number;
  datPercent: number;
  chuaDatCount: number;
  chuaDatPercent: number;
  xuatSacCount: number;
  gioiCount: number;
  conductTotCount: number;
  conductKhaCount: number;
  conductDatCount: number;
  conductChuaDatCount: number;
  totalExcusedAbsences: number;
  totalUnexcusedAbsences: number;
}

export interface ClassFullYearReportData {
  classSettings: ClassSettings;
  schoolYear: string;
  className: string;
  teacherName: string;
  appliedSubjects: SubjectConfig[];
  rows: ClassFullYearStudentRow[];
  summary: ReportSummaryStats;
  summaryHk1?: ReportSummaryStats;
  summaryHk2?: ReportSummaryStats;
}

class FullYearReportService {
  /**
   * Determine TT43 Academic Result (Tốt / Khá / Đạt / Chưa đạt)
   */
  public evaluateTT43AcademicResult(
    subjectRows: StudentFullYearSubjectRow[],
    period: ReportPeriod = 'full_year'
  ): 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại' {
    const scoredSubs = subjectRows.filter(s => s.assessmentMode === 'SCORE_AND_COMMENT');
    const commentSubs = subjectRows.filter(s => s.assessmentMode === 'COMMENT_ONLY');

    const enteredAverages = scoredSubs
      .map(s => {
        if (period === 'hk1') return s.tbHk1;
        if (period === 'hk2') return s.tbHk2;
        return s.tbCaNam;
      })
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    // Nếu còn môn tính điểm chưa có điểm trung bình tương ứng -> Chưa xếp loại
    if (subjectRows.length === 0 || enteredAverages.length < scoredSubs.length) {
      return 'Chưa xếp loại';
    }

    // Qualitative assessments check
    const commentResults = commentSubs.map(s => {
      if (period === 'hk1') return s.qualitativeHk1;
      if (period === 'hk2') return s.qualitativeHk2;
      return s.qualitativeCaNam;
    });

    // Nếu còn môn nhận xét chưa có kết quả -> Chưa xếp loại
    if (commentResults.some(q => !q || (q !== 'Đạt' && q !== 'Chưa đạt'))) {
      return 'Chưa xếp loại';
    }

    const allGte65 = enteredAverages.every(sc => sc >= 6.5);
    const countGte8 = enteredAverages.filter(sc => sc >= 8.0).length;

    const allGte5 = enteredAverages.every(sc => sc >= 5.0);
    const countGte65 = enteredAverages.filter(sc => sc >= 6.5).length;

    const countGte5 = enteredAverages.filter(sc => sc >= 5.0).length;
    const countLt35 = enteredAverages.filter(sc => sc < 3.5).length;

    const commentsFailedCount = commentResults.filter(q => q === 'Chưa đạt').length;

    // 4.1. Xác định mức đánh giá ban đầu theo Khoản 2 Điều 9 Thông tư 43/2021/TT-BGDĐT
    let baseTier: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' = 'Chưa đạt';

    // TT43 - Mức Tốt:
    // Tất cả môn nhận xét Đạt; Tất cả môn tính điểm ĐTB >= 6.5, ít nhất 05 môn >= 8.0
    if (commentsFailedCount === 0 && allGte65 && countGte8 >= 5) {
      baseTier = 'Tốt';
    } else if (commentsFailedCount === 0 && allGte5 && countGte65 >= 5) {
      // TT43 - Mức Khá:
      // Tất cả môn nhận xét Đạt; Tất cả môn tính điểm ĐTB >= 5.0, ít nhất 05 môn >= 6.5
      baseTier = 'Khá';
    } else if (commentsFailedCount <= 1 && countGte5 >= 5 && countLt35 === 0) {
      // TT43 - Mức Đạt:
      // Nhiều nhất 01 môn nhận xét Chưa đạt; Ít nhất 05 môn tính điểm ĐTB >= 5.0; không có môn nào < 3.5
      baseTier = 'Đạt';
    } else {
      baseTier = 'Chưa đạt';
    }

    // Nếu đã đạt Mức Tốt hoặc Mức Khá: không bị hạ từ 2 mức trở lên -> Giữ nguyên kết quả Khoản 2
    if (baseTier === 'Tốt' || baseTier === 'Khá') {
      return baseTier;
    }

    // 4.2. Quy tắc điều chỉnh mức đánh giá theo Khoản 3 Điều 9 Thông tư 43/2021/TT-BGDĐT:
    // "Nếu mức đánh giá kết quả học tập của học kì, cả năm học bị thấp xuống từ 02 (hai) mức trở lên
    // so với mức đánh giá quy định tại điểm a, điểm b khoản 2 Điều này chỉ do kết quả đánh giá của
    // duy nhất 01 (một) môn học thì mức đánh giá kết quả học tập của học kì đó, cả năm học đó
    // được điều chỉnh lên mức liền kề."

    // A. Kiểm tra điều chỉnh so với điểm a (Mức Tốt):
    const failedCommentsA = commentResults.filter(q => q === 'Chưa đạt').length;
    const failedScoredA = enteredAverages.filter(sc => sc < 6.5).length;
    const totalViolationsA = failedCommentsA + failedScoredA;

    if (totalViolationsA === 1) {
      if (countGte8 >= 5) {
        if (baseTier === 'Đạt') {
          // Bị hạ 2 mức: từ Tốt xuống Đạt chỉ do duy nhất 1 môn -> Nâng lên mức liền kề: Mức Khá!
          return 'Khá';
        } else if (baseTier === 'Chưa đạt') {
          // Bị hạ 3 mức: từ Tốt xuống Chưa đạt chỉ do duy nhất 1 môn -> Nâng lên mức liền kề: Mức Đạt!
          return 'Đạt';
        }
      }
    }

    // B. Kiểm tra điều chỉnh so với điểm b (Mức Khá):
    if (baseTier === 'Chưa đạt') {
      const failedCommentsB = commentResults.filter(q => q === 'Chưa đạt').length;
      const failedScoredB = enteredAverages.filter(sc => sc < 5.0).length;
      const totalViolationsB = failedCommentsB + failedScoredB;

      if (totalViolationsB === 1) {
        if (countGte65 >= 5) {
          // Bị hạ 2 mức: từ Khá xuống Chưa đạt chỉ do duy nhất 1 môn -> Nâng lên mức liền kề: Mức Đạt!
          return 'Đạt';
        }
      }
    }

    return baseTier;
  }

  /**
   * Determine TT43 Honor Title
   * - "Học viên Xuất sắc": Rèn luyện Tốt + Học tập Tốt + ít nhất 6 môn ĐTB >= 9.0
   * - "Học viên Giỏi": Rèn luyện Tốt + Học tập Tốt (chưa đạt Xuất sắc)
   * - Else: '' (Tuyệt đối không ghi Tốt/Khá/Đạt vào danh hiệu)
   */
  public evaluateTT43HonorTitle(
    academicResult: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chưa xếp loại',
    conductGrade: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string,
    subjectRows: StudentFullYearSubjectRow[],
    period: ReportPeriod = 'full_year'
  ): 'Học viên Xuất sắc' | 'Học viên Giỏi' | '' {
    if (conductGrade !== 'Tốt' || academicResult !== 'Tốt') {
      return '';
    }

    const scoredSubs = subjectRows.filter(s => s.assessmentMode === 'SCORE_AND_COMMENT');
    const countGte9 = scoredSubs.filter(s => {
      const v = period === 'hk1' ? s.tbHk1 : period === 'hk2' ? s.tbHk2 : s.tbCaNam;
      return typeof v === 'number' && v >= 9.0;
    }).length;

    if (countGte9 >= 6) {
      return 'Học viên Xuất sắc';
    }

    return 'Học viên Giỏi';
  }

  /**
   * Determine Full-Year Conduct Grade
   */
  public resolveFullYearConduct(
    conductHk1: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string,
    conductHk2: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string,
    customFullYearEval?: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string
  ): 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string {
    if (customFullYearEval && customFullYearEval !== 'Chưa đánh giá') {
      return customFullYearEval;
    }
    if ((!conductHk1 || conductHk1 === 'Chưa đánh giá') && (!conductHk2 || conductHk2 === 'Chưa đánh giá')) {
      return 'Chưa đánh giá';
    }
    // GDTX Conduct Rules:
    // If HK2 is Tốt and HK1 is Tốt or Khá -> Tốt
    if (conductHk2 === 'Tốt') {
      return 'Tốt';
    }
    if (conductHk2 === 'Khá') {
      return conductHk1 === 'Chưa đạt' ? 'Đạt' : 'Khá';
    }
    if (conductHk2 === 'Đạt') {
      return 'Đạt';
    }
    if (conductHk2 === 'Chưa đạt') {
      return 'Chưa đạt';
    }
    return conductHk1 || 'Chưa đánh giá';
  }

  /**
   * Check whether a point transaction is approved and active (not reversed).
   */
  public isApprovedTransaction(tx: PointTransaction): boolean {
    if (!tx || tx.isReversed) return false;
    const status = String(tx.status || '').trim().toLowerCase();
    const reviewStatus = String(tx.reviewStatus || '').trim().toLowerCase();
    return status === 'approved' || reviewStatus === 'approved';
  }

  /**
   * Classify a transaction into excused ('excused' - CP), unexcused ('unexcused' - KP),
   * 'ambiguous_absence' (absence record missing clear CP/KP status - never auto-assigned),
   * or null (not an absence transaction).
   */
  public classifyAbsenceTransaction(tx: PointTransaction): 'excused' | 'unexcused' | 'ambiguous_absence' | null {
    if (!tx) return null;
    const catLower = String(tx.category || '').trim().toLowerCase();
    const reasonLower = String(tx.reason || (tx as any).title || '').trim().toLowerCase();

    const isUnexcused =
      catLower === 'nghỉ không phép' ||
      catLower.includes('nghỉ không phép') ||
      reasonLower.includes('nghỉ không phép') ||
      reasonLower.includes('nghỉ học không phép') ||
      reasonLower.includes('vắng không phép');

    const isExcused =
      catLower === 'nghỉ có phép' ||
      catLower.includes('nghỉ có phép') ||
      reasonLower.includes('nghỉ có phép') ||
      reasonLower.includes('nghỉ học có phép') ||
      reasonLower.includes('vắng có phép') ||
      reasonLower.includes('ốm có phép');

    if (isUnexcused && !isExcused) return 'unexcused';
    if (isExcused && !isUnexcused) return 'excused';

    // If a record mentions absence ("nghỉ học" / "vắng học") without specifying CP/KP or with conflicting tags,
    // do not auto-assign CP/KP and warn explicitly.
    if (
      (isUnexcused && isExcused) ||
      catLower === 'nghỉ học' ||
      catLower === 'vắng học' ||
      reasonLower === 'nghỉ học' ||
      reasonLower === 'vắng học'
    ) {
      console.warn(
        `[FullYearReportService] Bản ghi nghỉ học thiếu hoặc không xác định rõ trạng thái CP/KP (id=${tx.id}, studentId=${tx.studentId}, category="${tx.category || ''}", reason="${tx.reason || ''}")`
      );
      return 'ambiguous_absence';
    }

    return null;
  }

  /**
   * Determine whether a transaction belongs to Semester 1 ('hk1') or Semester 2 ('hk2')
   * based on the active class's schoolYearTimeline and normalized Vietnamese/ISO timestamps.
   */
  public resolveTransactionSemester(tx: PointTransaction, classSettingsOverride?: ClassSettings): 'hk1' | 'hk2' {
    const explicitSem = String((tx as any)?.semester || '').trim().toUpperCase();
    if (explicitSem === 'HK1' || explicitSem === 'HỌC KỲ I' || explicitSem === 'SEMESTER_1') {
      return 'hk1';
    }
    if (explicitSem === 'HK2' || explicitSem === 'HỌC KỲ II' || explicitSem === 'SEMESTER_2') {
      return 'hk2';
    }

    const settings = classSettingsOverride || classService.getSettings();
    const rawDate = tx.eventDate || tx.createdAt || tx.date || tx.timestamp || (tx as any).approvedAt || '';
    const parts = SchoolYearDateNormalizer.parseDateParts(rawDate);

    if (parts) {
      const { month, day } = parts;
      // Trong chu kỳ năm học Việt Nam: Tháng 8, 9, 10, 11, 12 luôn thuộc Học kỳ I
      if (month >= 8 && month <= 12) {
        return 'hk1';
      }
      // Tháng 2, 3, 4, 5, 6, 7 luôn thuộc Học kỳ II
      if (month >= 2 && month <= 7) {
        return 'hk2';
      }
      // Tháng 1: giao thoa giữa HK1 và HK2
      if (month === 1) {
        const timeline = SchoolYearDateNormalizer.normalizeTimeline(
          settings.schoolYearTimeline,
          settings.academicYear || settings.schoolYearLabel || '2025 - 2026'
        );
        const hk2StartStr = timeline.startDateHK2 || timeline.semester2Start;
        const hk2Parts = SchoolYearDateNormalizer.parseDateParts(hk2StartStr);
        if (hk2Parts && hk2Parts.month === 1) {
          return day < hk2Parts.day ? 'hk1' : 'hk2';
        }
        return day < 15 ? 'hk1' : 'hk2';
      }
    }

    // Fallback: Nếu không parse được parts, so sánh theo timestamp timeline nếu có
    const timeline = SchoolYearDateNormalizer.normalizeTimeline(
      settings.schoolYearTimeline,
      settings.academicYear || settings.schoolYearLabel || '2025 - 2026'
    );
    const txTimestamp = SchoolYearDateNormalizer.parseDateToTimestamp(rawDate);
    const hk2StartStr = timeline.startDateHK2 || timeline.semester2Start;
    const hk2StartTimestamp = SchoolYearDateNormalizer.parseDateToTimestamp(hk2StartStr);
    const hk2EndStr = timeline.endDateHK2 || timeline.semester2End;
    const hk2EndTimestamp = SchoolYearDateNormalizer.parseDateToTimestamp(hk2EndStr);

    if (txTimestamp > 0 && hk2StartTimestamp > 0) {
      if (hk2EndTimestamp > 0 && txTimestamp > hk2EndTimestamp) {
        return 'hk1';
      }
      return txTimestamp < hk2StartTimestamp ? 'hk1' : 'hk2';
    }

    const currentSem = String(settings.semester || 'Học kỳ I').trim();
    if (currentSem === 'Học kỳ II' || currentSem.toUpperCase() === 'HK2') {
      return 'hk2';
    }
    return 'hk1';
  }

  /**
   * Retrieve deduplicated, approved transactions for a specific student within the active tenant/class.
   */
  public getValidStudentTransactions(studentId: string, studentCode?: string): PointTransaction[] {
    const seenIds = new Set<string>();
    const normCode = studentCode ? studentCode.trim().toLowerCase() : '';
    return trainingService.getAllTransactions().filter(t => {
      if (!this.isApprovedTransaction(t)) return false;
      const matchId = t.studentId === studentId;
      const matchCode = Boolean(normCode && String(t.studentId || '').trim().toLowerCase() === normCode);
      if (!matchId && !matchCode) return false;
      if (t.id) {
        if (seenIds.has(t.id)) return false;
        seenIds.add(t.id);
      }
      return true;
    });
  }

  /**
   * Build auto-summary note from student's actual transactions & records
   */
  public buildStudentAutoSummaryNote(studentId: string, period: ReportPeriod = 'full_year'): string {
    const student = studentService.getById(studentId);
    const settings = classService.getSettings();
    let allTxs = this.getValidStudentTransactions(studentId, student?.code);
    
    if (period === 'hk1') {
      allTxs = allTxs.filter(t => this.resolveTransactionSemester(t, settings) === 'hk1');
    } else if (period === 'hk2') {
      allTxs = allTxs.filter(t => this.resolveTransactionSemester(t, settings) === 'hk2');
    }
    
    let plusPoints = 0;
    let minusPoints = 0;
    const goodDeeds: string[] = [];
    const violations: string[] = [];
    let lateCount = 0;
    let excusedAbsences = 0;
    let unexcusedAbsences = 0;

    allTxs.forEach(t => {
      const reason = (t.reason || '').trim();
      const catLower = (t.category || '').toLowerCase();
      const reasonLower = reason.toLowerCase();
      const absenceKind = this.classifyAbsenceTransaction(t);

      if (absenceKind === 'unexcused') {
        unexcusedAbsences++;
      } else if (absenceKind === 'excused') {
        excusedAbsences++;
      } else if (reasonLower.includes('trễ') || reasonLower.includes('muộn') || catLower.includes('đi trễ')) {
        lateCount++;
      }

      if (t.points > 0) {
        plusPoints += t.points;
        if (reason && !goodDeeds.includes(reason)) {
          goodDeeds.push(reason);
        }
      } else if (t.points < 0) {
        minusPoints += Math.abs(t.points);
        if (reason && !violations.includes(reason)) {
          violations.push(reason);
        }
      }
    });

    const tree = trainingService.getStudentTree(studentId);
    const parts: string[] = [];

    if (plusPoints > 0) {
      const sampleDeeds = goodDeeds.slice(0, 2).join(', ');
      parts.push(`+${plusPoints}đ thưởng${sampleDeeds ? ` (${sampleDeeds})` : ''}`);
    }

    if (tree && tree.completedTrees > 0) {
      parts.push(`Đạt ${tree.completedTrees} Cây Nguyệt Quế`);
    }

    if (minusPoints > 0) {
      const sampleViolations = violations.slice(0, 2).join(', ');
      parts.push(`-${minusPoints}đ nhắc nhở${sampleViolations ? ` (${sampleViolations})` : ''}`);
    }

    if (lateCount > 0) {
      parts.push(`${lateCount} lần đi trễ`);
    }

    if (unexcusedAbsences > 0) {
      parts.push(`Nghỉ KP: ${unexcusedAbsences} buổi`);
    }

    return parts.join('; ');
  }

  /**
   * Calculate Absences for a Student across semesters
   */
  public getStudentAbsencesBySemester(studentId: string, recHk1?: any, recHk2?: any): {
    hk1: { excused: number; unexcused: number };
    hk2: { excused: number; unexcused: number };
    fullYear: { excused: number; unexcused: number };
  } {
    const student = studentService.getById(studentId);
    const settings = classService.getSettings();
    const allTxs = this.getValidStudentTransactions(studentId, student?.code);
    let txExcusedHk1 = 0;
    let txUnexcusedHk1 = 0;
    let txExcusedHk2 = 0;
    let txUnexcusedHk2 = 0;

    allTxs.forEach(t => {
      const absenceKind = this.classifyAbsenceTransaction(t);
      if (absenceKind !== 'excused' && absenceKind !== 'unexcused') {
        return;
      }
      const isHk1 = this.resolveTransactionSemester(t, settings) === 'hk1';

      if (absenceKind === 'unexcused') {
        if (isHk1) txUnexcusedHk1++;
        else txUnexcusedHk2++;
      } else if (absenceKind === 'excused') {
        if (isHk1) txExcusedHk1++;
        else txExcusedHk2++;
      }
    });

    const hk1Excused = Math.max(recHk1?.excusedAbsences || 0, txExcusedHk1);
    const hk1Unexcused = Math.max(recHk1?.unexcusedAbsences || 0, txUnexcusedHk1);
    const hk2Excused = Math.max(recHk2?.excusedAbsences || 0, txExcusedHk2);
    const hk2Unexcused = Math.max(recHk2?.unexcusedAbsences || 0, txUnexcusedHk2);

    return {
      hk1: { excused: hk1Excused, unexcused: hk1Unexcused },
      hk2: { excused: hk2Excused, unexcused: hk2Unexcused },
      fullYear: {
        excused: Math.max((recHk2?.excusedAbsences || 0) + (recHk1?.excusedAbsences || 0), hk1Excused + hk2Excused),
        unexcused: Math.max((recHk2?.unexcusedAbsences || 0) + (recHk1?.unexcusedAbsences || 0), hk1Unexcused + hk2Unexcused)
      }
    };
  }

  /**
   * Calculate Absences for a Student (Legacy method)
   */
  public getStudentAbsences(studentId: string, recHk1?: any, recHk2?: any): { excused: number; unexcused: number } {
    return this.getStudentAbsencesBySemester(studentId, recHk1, recHk2).fullYear;
  }

  /**
   * Get Full-Year Report for a Single Student
   */
  public getStudentFullYearReport(studentId: string): StudentFullYearReportData | null {
    const student = studentService.getById(studentId);
    if (!student) return null;

    const classSettings = classService.getSettings();
    const appliedSubjects = classService.getAppliedSubjects();

    // Retrieve records across milestones
    const recHk1 = academicService.getStudentAcademicRecord(studentId, 'final_hk1');
    const recMidtermHk1 = academicService.getStudentAcademicRecord(studentId, 'midterm_hk1');
    const recHk2 = academicService.getStudentAcademicRecord(studentId, 'final_hk2');
    const recMidtermHk2 = academicService.getStudentAcademicRecord(studentId, 'midterm_hk2');
    const recFullYear = academicService.getStudentAcademicRecord(studentId, 'full_year');

    // Retrieve Conduct evaluations
    const evalHk1 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_1');
    const evalHk2 = conductEvaluationService.getOrCreateEvaluation('SEMESTER_2');
    const evalFullYear = conductEvaluationService.getOrCreateEvaluation('FULL_YEAR');

    const stuEvalHk1 = evalHk1.evaluations.find(e => e.studentId === studentId);
    const stuEvalHk2 = evalHk2.evaluations.find(e => e.studentId === studentId);
    const stuEvalFullYear = evalFullYear.evaluations.find(e => e.studentId === studentId);

    const conductHk1: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string =
      (stuEvalHk1?.finalGrade as any) || recHk1.conductResult || recMidtermHk1.conductResult || 'Chưa đánh giá';
    const conductHk2: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | string =
      (stuEvalHk2?.finalGrade as any) || recHk2.conductResult || recMidtermHk2.conductResult || 'Chưa đánh giá';
    const conductCaNam = this.resolveFullYearConduct(
      conductHk1,
      conductHk2,
      stuEvalFullYear?.finalGrade as any || recFullYear.conductResult
    );

    // Subject breakdown
    const subjectRows: StudentFullYearSubjectRow[] = appliedSubjects.map(sub => {
      const subName = sub.name || (sub as any).subjectName || 'Môn học';
      const isComment = sub.assessmentMode === 'COMMENT_ONLY';
      const txCount = sub.txColumnCount !== undefined ? sub.txColumnCount : 3;

      // Match grades
      const gHk1 = recHk1.grades.find(g => isSameSubject(g, sub)) ||
        recMidtermHk1.grades.find(g => isSameSubject(g, sub));
      const gHk2 = recHk2.grades.find(g => isSameSubject(g, sub)) ||
        recMidtermHk2.grades.find(g => isSameSubject(g, sub));
      const gFull = recFullYear.grades.find(g => isSameSubject(g, sub));

      if (isComment) {
        const qHk1 = (gHk1?.qualitativeResult === 'Đạt' || gHk1?.qualitativeResult === 'Chưa đạt') ? gHk1.qualitativeResult : undefined;
        const qHk2 = (gHk2?.qualitativeResult === 'Đạt' || gHk2?.qualitativeResult === 'Chưa đạt') ? gHk2.qualitativeResult : undefined;
        const qFull = (gFull?.qualitativeResult === 'Đạt' || gFull?.qualitativeResult === 'Chưa đạt') ? gFull.qualitativeResult : undefined;
        const qCaNam = qFull || qHk2 || qHk1;

        return {
          subjectId: sub.id,
          subjectCode: sub.subjectCode || sub.code || 'SUB',
          subjectName: subName,
          assessmentMode: 'COMMENT_ONLY',
          txColumnCount: txCount,
          txScores: [],
          txScoresHk1: [],
          txScoresHk2: [],
          qualitativeHk1: qHk1,
          qualitativeHk2: qHk2,
          qualitativeCaNam: qCaNam,
          comment: gFull?.comment || gHk2?.comment || gHk1?.comment || '',
          commentHk1: gHk1?.comment || '',
          commentHk2: gHk2?.comment || ''
        };
      }

      // Scored subject
      // HKI TX scores
      const txListHk1: (number | undefined)[] = [];
      const rawTxHk1 = gHk1?.regularScores || [gHk1?.tx1, gHk1?.tx2, gHk1?.tx3, gHk1?.tx4, gHk1?.tx5, gHk1?.tx6];
      for (let i = 0; i < txCount; i++) {
        const val = rawTxHk1[i];
        txListHk1.push(isEnteredValidScore(val) ? Number(val) : undefined);
      }
      const midtermHk1 = isEnteredValidScore(gHk1?.midterm) ? Number(gHk1?.midterm) : undefined;
      const finalExamHk1 = isEnteredValidScore(gHk1?.finalExam) ? Number(gHk1?.finalExam) : undefined;

      // HKII TX scores (prioritize full_year gFull if entered, fallback to gHk2)
      const txListHk2: (number | undefined)[] = [];
      const rawTxFull = [gFull?.tx1, gFull?.tx2, gFull?.tx3, gFull?.tx4, gFull?.tx5, gFull?.tx6];
      const hasFullTx = rawTxFull.some(isEnteredValidScore) || (Array.isArray(gFull?.regularScores) && gFull!.regularScores.some(isEnteredValidScore));
      const rawTxHk2 = hasFullTx
        ? (rawTxFull.some(isEnteredValidScore) ? rawTxFull : (gFull?.regularScores || []))
        : (gHk2?.regularScores || [gHk2?.tx1, gHk2?.tx2, gHk2?.tx3, gHk2?.tx4, gHk2?.tx5, gHk2?.tx6]);
      for (let i = 0; i < txCount; i++) {
        const val = rawTxHk2[i];
        txListHk2.push(isEnteredValidScore(val) ? Number(val) : undefined);
      }
      const midtermHk2 = isEnteredValidScore(gFull?.midterm)
        ? Number(gFull?.midterm)
        : isEnteredValidScore(gHk2?.midterm)
        ? Number(gHk2?.midterm)
        : undefined;
      const finalExamHk2 = isEnteredValidScore(gFull?.finalExam)
        ? Number(gFull?.finalExam)
        : isEnteredValidScore(gHk2?.finalExam)
        ? Number(gHk2?.finalExam)
        : undefined;

      // TB HKI: Authoritative source is HKI final/midterm record (gHk1)
      const calculatedHk1Avg = calculateSubjectAverage({
        assessmentMode: 'SCORE_AND_COMMENT',
        tx1: gHk1?.tx1,
        tx2: gHk1?.tx2,
        tx3: gHk1?.tx3,
        tx4: gHk1?.tx4,
        tx5: gHk1?.tx5,
        tx6: gHk1?.tx6,
        regularScores: gHk1?.regularScores,
        midterm: gHk1?.midterm,
        finalExam: gHk1?.finalExam,
        period: 'final_hk1'
      });
      const tbHk1 = isEnteredValidScore(gHk1?.average)
        ? Number(gHk1?.average)
        : isEnteredValidScore(gHk1?.tbHk1)
        ? Number(gHk1?.tbHk1)
        : calculatedHk1Avg !== undefined
        ? calculatedHk1Avg
        : isEnteredValidScore(gFull?.tbHk1)
        ? Number(gFull?.tbHk1)
        : undefined;

      // TB HKII: Authoritative source is HKII final/midterm record (gHk2)
      const calculatedHk2Avg = calculateSubjectAverage({
        assessmentMode: 'SCORE_AND_COMMENT',
        tx1: txListHk2[0],
        tx2: txListHk2[1],
        tx3: txListHk2[2],
        tx4: txListHk2[3],
        tx5: txListHk2[4],
        tx6: txListHk2[5],
        regularScores: txListHk2.filter((v): v is number => v !== undefined),
        midterm: midtermHk2,
        finalExam: finalExamHk2,
        period: 'final_hk2'
      });
      const tbHk2 = isEnteredValidScore(gHk2?.average)
        ? Number(gHk2?.average)
        : isEnteredValidScore(gHk2?.tbHk2)
        ? Number(gHk2?.tbHk2)
        : calculatedHk2Avg !== undefined
        ? calculatedHk2Avg
        : isEnteredValidScore(gFull?.tbHk2)
        ? Number(gFull?.tbHk2)
        : undefined;

      // TB Cả năm = (tbHk2 * 2 + tbHk1) / 3 (theo quy định TT22 / TT43)
      let tbCaNam: number | undefined = calculateSubjectAverage({
        assessmentMode: 'SCORE_AND_COMMENT',
        period: 'full_year',
        tbHk1,
        tbHk2
      });
      if (tbCaNam === undefined) {
        if (isEnteredValidScore(gFull?.tbCaNam)) {
          tbCaNam = Number(gFull?.tbCaNam);
        } else if (isEnteredValidScore(gFull?.average)) {
          tbCaNam = Number(gFull?.average);
        }
      }

      return {
        subjectId: sub.id,
        subjectCode: sub.subjectCode || sub.code || 'SUB',
        subjectName: subName,
        assessmentMode: 'SCORE_AND_COMMENT',
        txColumnCount: txCount,
        txScores: txListHk2,
        txScoresHk1: txListHk1,
        txScoresHk2: txListHk2,
        midtermHk1,
        finalExamHk1,
        midtermHk2,
        finalExamHk2,
        tbHk1,
        tbHk2,
        tbCaNam,
        comment: gFull?.comment || gHk2?.comment || gHk1?.comment || '',
        commentHk1: gHk1?.comment || '',
        commentHk2: gHk2?.comment || ''
      };
    });

    const absencesData = this.getStudentAbsencesBySemester(studentId, recHk1, recHk2);
    
    // Evaluations
    const academicResult = this.evaluateTT43AcademicResult(subjectRows, 'full_year');
    const honorTitle = this.evaluateTT43HonorTitle(academicResult, conductCaNam, subjectRows, 'full_year');
    const autoSummaryNote = this.buildStudentAutoSummaryNote(studentId, 'full_year');

    const academicResultHk1 = this.evaluateTT43AcademicResult(subjectRows, 'hk1');
    const honorTitleHk1 = this.evaluateTT43HonorTitle(academicResultHk1, conductHk1, subjectRows, 'hk1');
    const autoSummaryNoteHk1 = this.buildStudentAutoSummaryNote(studentId, 'hk1');

    const academicResultHk2 = this.evaluateTT43AcademicResult(subjectRows, 'hk2');
    const honorTitleHk2 = this.evaluateTT43HonorTitle(academicResultHk2, conductHk2, subjectRows, 'hk2');
    const autoSummaryNoteHk2 = this.buildStudentAutoSummaryNote(studentId, 'hk2');

    const teacherComment = recFullYear.teacherComment || recHk2.teacherComment || recHk1.teacherComment || stuEvalHk2?.teacherNote || '';
    const teacherCommentHk1 = recHk1.teacherComment || stuEvalHk1?.teacherNote || '';
    const teacherCommentHk2 = recHk2.teacherComment || stuEvalHk2?.teacherNote || '';

    return {
      student,
      classSettings,
      schoolYear: classSettings.academicYear || '2025 - 2026',
      className: classSettings.className || '12A1',
      teacherName: classSettings.homeroomTeacherName || classSettings.teacherName || 'Cô Nguyễn Thị Mai Lan (GVCN)',
      subjectRows,
      conductHk1,
      conductHk2,
      conductCaNam,
      excusedAbsences: absencesData.fullYear.excused,
      unexcusedAbsences: absencesData.fullYear.unexcused,
      excusedAbsencesHk1: absencesData.hk1.excused,
      unexcusedAbsencesHk1: absencesData.hk1.unexcused,
      excusedAbsencesHk2: absencesData.hk2.excused,
      unexcusedAbsencesHk2: absencesData.hk2.unexcused,
      academicResult,
      academicResultHk1,
      academicResultHk2,
      honorTitle,
      honorTitleHk1,
      honorTitleHk2,
      autoSummaryNote,
      autoSummaryNoteHk1,
      autoSummaryNoteHk2,
      teacherComment,
      teacherCommentHk1,
      teacherCommentHk2
    };
  }

  /**
   * Get Full-Year Report for the Entire Class
   */
  public getClassFullYearReport(): ClassFullYearReportData {
    const students = studentService.getAll();
    const classSettings = classService.getSettings();
    const appliedSubjects = classService.getAppliedSubjects();

    const rows: ClassFullYearStudentRow[] = [];

    // Full-year summary counters
    let totCount = 0;
    let khaCount = 0;
    let datCount = 0;
    let chuaDatCount = 0;
    let xuatSacCount = 0;
    let gioiCount = 0;
    let conductTotCount = 0;
    let conductKhaCount = 0;
    let conductDatCount = 0;
    let conductChuaDatCount = 0;
    let totalExcusedAbsences = 0;
    let totalUnexcusedAbsences = 0;

    // HK1 summary counters
    let totCountHk1 = 0;
    let khaCountHk1 = 0;
    let datCountHk1 = 0;
    let chuaDatCountHk1 = 0;
    let xuatSacCountHk1 = 0;
    let gioiCountHk1 = 0;
    let conductTotCountHk1 = 0;
    let conductKhaCountHk1 = 0;
    let conductDatCountHk1 = 0;
    let conductChuaDatCountHk1 = 0;
    let totalExcusedAbsencesHk1 = 0;
    let totalUnexcusedAbsencesHk1 = 0;

    // HK2 summary counters
    let totCountHk2 = 0;
    let khaCountHk2 = 0;
    let datCountHk2 = 0;
    let chuaDatCountHk2 = 0;
    let xuatSacCountHk2 = 0;
    let gioiCountHk2 = 0;
    let conductTotCountHk2 = 0;
    let conductKhaCountHk2 = 0;
    let conductDatCountHk2 = 0;
    let conductChuaDatCountHk2 = 0;
    let totalExcusedAbsencesHk2 = 0;
    let totalUnexcusedAbsencesHk2 = 0;

    students.forEach((student, idx) => {
      const studentReport = this.getStudentFullYearReport(student.id);
      if (!studentReport) return;

      const subjectScores: Record<string, { tbHk1?: number | string; tbHk2?: number | string; tbCaNam?: number | string }> = {};

      studentReport.subjectRows.forEach(sr => {
        if (sr.assessmentMode === 'COMMENT_ONLY') {
          subjectScores[sr.subjectName] = {
            tbHk1: sr.qualitativeHk1 || '',
            tbHk2: sr.qualitativeHk2 || '',
            tbCaNam: sr.qualitativeCaNam || ''
          };
        } else {
          subjectScores[sr.subjectName] = {
            tbHk1: sr.tbHk1 !== undefined ? sr.tbHk1 : '',
            tbHk2: sr.tbHk2 !== undefined ? sr.tbHk2 : '',
            tbCaNam: sr.tbCaNam !== undefined ? sr.tbCaNam : ''
          };
        }
      });

      // Full-Year Aggregate
      if (studentReport.academicResult === 'Tốt') totCount++;
      else if (studentReport.academicResult === 'Khá') khaCount++;
      else if (studentReport.academicResult === 'Đạt') datCount++;
      else if (studentReport.academicResult === 'Chưa đạt') chuaDatCount++;

      if (studentReport.honorTitle === 'Học viên Xuất sắc') xuatSacCount++;
      else if (studentReport.honorTitle === 'Học viên Giỏi') gioiCount++;

      if (studentReport.conductCaNam === 'Tốt') conductTotCount++;
      else if (studentReport.conductCaNam === 'Khá') conductKhaCount++;
      else if (studentReport.conductCaNam === 'Đạt') conductDatCount++;
      else if (studentReport.conductCaNam === 'Chưa đạt') conductChuaDatCount++;

      totalExcusedAbsences += studentReport.excusedAbsences;
      totalUnexcusedAbsences += studentReport.unexcusedAbsences;

      // HK1 Aggregate
      if (studentReport.academicResultHk1 === 'Tốt') totCountHk1++;
      else if (studentReport.academicResultHk1 === 'Khá') khaCountHk1++;
      else if (studentReport.academicResultHk1 === 'Đạt') datCountHk1++;
      else if (studentReport.academicResultHk1 === 'Chưa đạt') chuaDatCountHk1++;

      if (studentReport.honorTitleHk1 === 'Học viên Xuất sắc') xuatSacCountHk1++;
      else if (studentReport.honorTitleHk1 === 'Học viên Giỏi') gioiCountHk1++;

      if (studentReport.conductHk1 === 'Tốt') conductTotCountHk1++;
      else if (studentReport.conductHk1 === 'Khá') conductKhaCountHk1++;
      else if (studentReport.conductHk1 === 'Đạt') conductDatCountHk1++;
      else if (studentReport.conductHk1 === 'Chưa đạt') conductChuaDatCountHk1++;

      totalExcusedAbsencesHk1 += (studentReport.excusedAbsencesHk1 || 0);
      totalUnexcusedAbsencesHk1 += (studentReport.unexcusedAbsencesHk1 || 0);

      // HK2 Aggregate
      if (studentReport.academicResultHk2 === 'Tốt') totCountHk2++;
      else if (studentReport.academicResultHk2 === 'Khá') khaCountHk2++;
      else if (studentReport.academicResultHk2 === 'Đạt') datCountHk2++;
      else if (studentReport.academicResultHk2 === 'Chưa đạt') chuaDatCountHk2++;

      if (studentReport.honorTitleHk2 === 'Học viên Xuất sắc') xuatSacCountHk2++;
      else if (studentReport.honorTitleHk2 === 'Học viên Giỏi') gioiCountHk2++;

      if (studentReport.conductHk2 === 'Tốt') conductTotCountHk2++;
      else if (studentReport.conductHk2 === 'Khá') conductKhaCountHk2++;
      else if (studentReport.conductHk2 === 'Đạt') conductDatCountHk2++;
      else if (studentReport.conductHk2 === 'Chưa đạt') conductChuaDatCountHk2++;

      totalExcusedAbsencesHk2 += (studentReport.excusedAbsencesHk2 || 0);
      totalUnexcusedAbsencesHk2 += (studentReport.unexcusedAbsencesHk2 || 0);

      rows.push({
        stt: idx + 1,
        studentId: student.id,
        studentCode: student.code,
        studentName: student.fullName,
        group: student.group,
        gender: student.gender,
        dob: student.dob,
        subjectScores,
        excusedAbsences: studentReport.excusedAbsences,
        unexcusedAbsences: studentReport.unexcusedAbsences,
        excusedAbsencesHk1: studentReport.excusedAbsencesHk1,
        unexcusedAbsencesHk1: studentReport.unexcusedAbsencesHk1,
        excusedAbsencesHk2: studentReport.excusedAbsencesHk2,
        unexcusedAbsencesHk2: studentReport.unexcusedAbsencesHk2,
        academicResult: studentReport.academicResult,
        academicResultHk1: studentReport.academicResultHk1,
        academicResultHk2: studentReport.academicResultHk2,
        conductHk1: studentReport.conductHk1,
        conductHk2: studentReport.conductHk2,
        conductCaNam: studentReport.conductCaNam,
        honorTitle: studentReport.honorTitle,
        honorTitleHk1: studentReport.honorTitleHk1,
        honorTitleHk2: studentReport.honorTitleHk2,
        autoSummaryNote: studentReport.autoSummaryNote,
        autoSummaryNoteHk1: studentReport.autoSummaryNoteHk1,
        autoSummaryNoteHk2: studentReport.autoSummaryNoteHk2,
        teacherComment: studentReport.teacherComment,
        teacherCommentHk1: studentReport.teacherCommentHk1,
        teacherCommentHk2: studentReport.teacherCommentHk2
      });
    });

    const totalStudents = Math.max(students.length, 1);

    return {
      classSettings,
      schoolYear: classSettings.academicYear || '2025 - 2026',
      className: classSettings.className || '12A1',
      teacherName: classSettings.homeroomTeacherName || classSettings.teacherName || 'Cô Nguyễn Thị Mai Lan (GVCN)',
      appliedSubjects,
      rows,
      summary: {
        totalStudents: students.length,
        totCount,
        totPercent: Number(((totCount / totalStudents) * 100).toFixed(1)),
        khaCount,
        khaPercent: Number(((khaCount / totalStudents) * 100).toFixed(1)),
        datCount,
        datPercent: Number(((datCount / totalStudents) * 100).toFixed(1)),
        chuaDatCount,
        chuaDatPercent: Number(((chuaDatCount / totalStudents) * 100).toFixed(1)),
        xuatSacCount,
        gioiCount,
        conductTotCount,
        conductKhaCount,
        conductDatCount,
        conductChuaDatCount,
        totalExcusedAbsences,
        totalUnexcusedAbsences
      },
      summaryHk1: {
        totalStudents: students.length,
        totCount: totCountHk1,
        totPercent: Number(((totCountHk1 / totalStudents) * 100).toFixed(1)),
        khaCount: khaCountHk1,
        khaPercent: Number(((khaCountHk1 / totalStudents) * 100).toFixed(1)),
        datCount: datCountHk1,
        datPercent: Number(((datCountHk1 / totalStudents) * 100).toFixed(1)),
        chuaDatCount: chuaDatCountHk1,
        chuaDatPercent: Number(((chuaDatCountHk1 / totalStudents) * 100).toFixed(1)),
        xuatSacCount: xuatSacCountHk1,
        gioiCount: gioiCountHk1,
        conductTotCount: conductTotCountHk1,
        conductKhaCount: conductKhaCountHk1,
        conductDatCount: conductDatCountHk1,
        conductChuaDatCount: conductChuaDatCountHk1,
        totalExcusedAbsences: totalExcusedAbsencesHk1,
        totalUnexcusedAbsences: totalUnexcusedAbsencesHk1
      },
      summaryHk2: {
        totalStudents: students.length,
        totCount: totCountHk2,
        totPercent: Number(((totCountHk2 / totalStudents) * 100).toFixed(1)),
        khaCount: khaCountHk2,
        khaPercent: Number(((khaCountHk2 / totalStudents) * 100).toFixed(1)),
        datCount: datCountHk2,
        datPercent: Number(((datCountHk2 / totalStudents) * 100).toFixed(1)),
        chuaDatCount: chuaDatCountHk2,
        chuaDatPercent: Number(((chuaDatCountHk2 / totalStudents) * 100).toFixed(1)),
        xuatSacCount: xuatSacCountHk2,
        gioiCount: gioiCountHk2,
        conductTotCount: conductTotCountHk2,
        conductKhaCount: conductKhaCountHk2,
        conductDatCount: conductDatCountHk2,
        conductChuaDatCount: conductChuaDatCountHk2,
        totalExcusedAbsences: totalExcusedAbsencesHk2,
        totalUnexcusedAbsences: totalUnexcusedAbsencesHk2
      }
    };
  }
}

export const fullYearReportService = new FullYearReportService();
