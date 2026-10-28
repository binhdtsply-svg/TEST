/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Student,
  AIDataPermissions,
  AcademicPeriod,
  PointTransaction,
  ViolationHandlingRecord
} from '../types';
import { studentService } from './StudentService';
import { classService } from './ClassService';
import { trainingService } from './TrainingService';
import { academicService } from './AcademicService';
import { activityService } from './ActivityService';
import { careerService } from './CareerService';
import { graduationService } from './GraduationService';
import { classAnalyticsAndAlertService } from './ClassAnalyticsAndAlertService';
import { schoolWeekService } from './SchoolWeekService';

export type AnalysisScope = 'none' | 'class' | 'single_student' | 'multi_student';

export interface TimeframeFilter {
  type: 'all' | 'week' | 'month' | 'semester';
  weekNumber?: number; // 1 -> 35
  month?: number; // 1 -> 12
  semester?: 'HK1' | 'HK2';
}

export interface ClassAnalysisContextOptions {
  timeframe: TimeframeFilter | 'this_week' | 'this_month' | 'hk1' | 'hk2' | 'custom' | string;
  permissions: AIDataPermissions;
  period?: AcademicPeriod;
}

export interface StudentAnalysisContextOptions {
  timeframe?: TimeframeFilter | 'this_week' | 'this_month' | 'hk1' | 'hk2' | 'custom' | string;
  permissions: AIDataPermissions;
  period?: AcademicPeriod;
}

export const DEFAULT_AI_PERMISSIONS: AIDataPermissions = {
  academicGrades: true,
  conductResults: true,
  pointsPlusMinus: true,
  attendance: true,
  violations: true,
  rewards: true,
  schoolYearGoals: true,
  journeyMilestones: true,
  activities: true,
  laurelGarden: true,
  careerRiasec: true,
  graduationExam: true,
  includeSensitiveInternalInfo: false // Default FALSE for child data privacy
};

class AIContextService {
  /**
   * Remove Vietnamese diacritics for flexible fuzzy searching (e.g., "gia huy" -> "Nguyen Gia Huy")
   */
  public removeVietnameseDiacritics(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  /**
   * Search students with unaccented matching support
   */
  public searchStudents(query: string): Student[] {
    const all = studentService.getAll();
    if (!query || !query.trim()) return all;

    const cleanQ = this.removeVietnameseDiacritics(query);
    return all.filter((s) => {
      const cleanName = this.removeVietnameseDiacritics(s.fullName);
      const cleanCode = this.removeVietnameseDiacritics(s.code);
      const cleanGroup = `to ${s.group}`;
      return (
        cleanName.includes(cleanQ) ||
        cleanCode.includes(cleanQ) ||
        cleanGroup.includes(cleanQ) ||
        (s.officerRole && this.removeVietnameseDiacritics(s.officerRole).includes(cleanQ))
      );
    });
  }

  /**
   * Normalize timeframe option into standard TimeframeFilter
   */
  public normalizeTimeframe(tf?: TimeframeFilter | string): {
    filter: TimeframeFilter;
    label: string;
  } {
    if (!tf || tf === 'all') {
      return {
        filter: { type: 'all' },
        label: 'Toàn bộ năm học hiện tại'
      };
    }

    if (typeof tf === 'object') {
      if (tf.type === 'week' && tf.weekNumber) {
        return {
          filter: tf,
          label: `Tuần ${tf.weekNumber}`
        };
      }
      if (tf.type === 'month' && tf.month) {
        return {
          filter: tf,
          label: `Tháng ${tf.month}`
        };
      }
      if (tf.type === 'semester' && tf.semester) {
        return {
          filter: tf,
          label: tf.semester === 'HK1' ? 'Học kỳ I' : 'Học kỳ II'
        };
      }
      return {
        filter: { type: 'all' },
        label: 'Toàn bộ năm học'
      };
    }

    const str = String(tf).toLowerCase();
    if (str === 'this_week') {
      const curr = schoolWeekService.getCurrentStudyPeriod();
      const w = curr.weekNumber || 1;
      return {
        filter: { type: 'week', weekNumber: w },
        label: `Tuần ${w} (Tuần học hiện tại)`
      };
    }
    if (str === 'this_month') {
      const currMonth = new Date().getMonth() + 1;
      return {
        filter: { type: 'month', month: currMonth },
        label: `Tháng ${currMonth} (Tháng hiện tại)`
      };
    }
    if (str === 'hk1') {
      return {
        filter: { type: 'semester', semester: 'HK1' },
        label: 'Học kỳ I'
      };
    }
    if (str === 'hk2') {
      return {
        filter: { type: 'semester', semester: 'HK2' },
        label: 'Học kỳ II'
      };
    }

    return {
      filter: { type: 'all' },
      label: 'Toàn bộ năm học'
    };
  }

  /**
   * Check if a date string falls inside the given timeframe filter
   */
  private matchesTimeframe(
    dateStr?: string,
    weekNum?: number,
    filter?: TimeframeFilter
  ): boolean {
    if (!filter || filter.type === 'all') return true;

    // Check week filter
    if (filter.type === 'week' && filter.weekNumber) {
      if (weekNum !== undefined && weekNum === filter.weekNumber) {
        return true;
      }
      if (dateStr) {
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const period = schoolWeekService.getCurrentStudyPeriod(undefined, d);
            if (period && period.weekNumber === filter.weekNumber) {
              return true;
            }
          }
        } catch {
          // ignore
        }
      }
      return false;
    }

    // Check month filter
    if (filter.type === 'month' && filter.month && dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.getMonth() + 1 === filter.month;
      }
      // Also try DD/MM/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        return m === filter.month;
      }
    }

    // Check semester filter
    if (filter.type === 'semester' && filter.semester && dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const period = schoolWeekService.getCurrentStudyPeriod(undefined, d);
          if (period) {
            const sem = period.semester === 'HKI' ? 'HK1' : period.semester === 'HKII' ? 'HK2' : '';
            return sem === filter.semester;
          }
        }
      } catch {
        // ignore
      }
    }

    return true;
  }

  /**
   * Build class-wide context respecting permissions and timeframe
   */
  public buildClassContext(options: ClassAnalysisContextOptions): string {
    const settings = classService.getSettings();
    const students = studentService.getAll();
    const permissions = options.permissions;
    const period: AcademicPeriod = options.period || 'midterm_hk1';
    const { filter: tfFilter, label: tfLabel } = this.normalizeTimeframe(options.timeframe);

    // List selected categories explicitly
    const activeCategories: string[] = [];
    if (permissions.attendance) activeCategories.push('Chuyên cần (Đi trễ, Nghỉ phép)');
    if (permissions.violations) activeCategories.push('Vi phạm quy chế/nề nếp');
    if (permissions.pointsPlusMinus || permissions.rewards) activeCategories.push('Việc tốt & Điểm thưởng (+/-)');
    if (permissions.conductResults) activeCategories.push('Tổng hợp điểm rèn luyện');
    if (permissions.academicGrades) activeCategories.push('Kết quả học tập & Bảng điểm');
    if (permissions.laurelGarden) activeCategories.push('Cây Nguyệt Quế');
    if (permissions.activities) activeCategories.push('Hoạt động & Phong trào');
    if (permissions.careerRiasec) activeCategories.push('Định hướng nghề nghiệp RIASEC');
    if (permissions.graduationExam) activeCategories.push('Đăng ký & dự thi tốt nghiệp');
    if (permissions.includeSensitiveInternalInfo) activeCategories.push('Thông tin diện lưu ý đặc biệt (GVCN)');

    let text = `=== PHẠM VI DỮ LIỆU ĐƯỢC CHỌN CHO PHÂN TÍCH ===\n`;
    text += `- Đối tượng: TOÀN BỘ LỚP HỌC (${students.length} học sinh)\n`;
    text += `- Đơn vị: ${settings.schoolName} | Lớp: ${settings.className} | Khối: ${settings.grade || '11'}\n`;
    text += `- Giáo viên chủ nhiệm: ${settings.homeroomTeacherName || settings.teacherName || 'GVCN'}\n`;
    text += `- Khung thời gian được chọn: ${tfLabel}\n`;
    text += `- Các nhóm dữ liệu được phép đọc: ${activeCategories.join('; ') || 'Không có mục nào'}\n`;
    text += `==================================================\n\n`;

    // 1. Rèn luyện & Nề nếp chung (lọc theo timeframe)
    if (permissions.conductResults || permissions.attendance || permissions.pointsPlusMinus || permissions.violations || permissions.rewards) {
      const allTx = trainingService.getTransactions().filter((t) => t.status === 'approved');
      const filteredTx = allTx.filter((t) => this.matchesTimeframe(t.eventDate || t.createdAt, (t as any).weekNumber, tfFilter));

      const goodDeeds = filteredTx.filter((t) => t.points > 0);
      const violations = filteredTx.filter((t) => t.points < 0);
      const tardy = filteredTx.filter((t) => t.category === 'Đi trễ');
      const excused = filteredTx.filter((t) => t.category === 'Nghỉ có phép');
      const unexcused = filteredTx.filter((t) => t.category === 'Nghỉ không phép');

      text += `--- 1. NỀ NẾP & RÈN LUYỆN (Trong ${tfLabel}) ---\n`;
      if (permissions.rewards || permissions.pointsPlusMinus) {
        text += `• Việc tốt / Khen thưởng ghi nhận: ${goodDeeds.length} lượt\n`;
      }
      if (permissions.violations) {
        text += `• Vi phạm nề nếp ghi nhận: ${violations.length} lượt\n`;
      }
      if (permissions.attendance) {
        text += `• Chuyên cần: Đi trễ ${tardy.length} lượt | Nghỉ có phép ${excused.length} lượt | Nghỉ không phép ${unexcused.length} lượt\n`;
      }

      // Liệt kê chi tiết vi phạm nếu có
      if (permissions.violations && violations.length > 0) {
        text += `• Chi tiết các sự việc vi phạm:\n`;
        violations.slice(0, 10).forEach((v) => {
          text += `  - [${v.eventDate || v.createdAt || 'N/A'}] Học sinh: ${v.studentName || 'HS'} (Tổ ${v.studentGroup || '—'}): ${v.reason} (${v.points}đ)\n`;
        });
        if (violations.length > 10) {
          text += `  ... và ${violations.length - 10} lượt vi phạm khác.\n`;
        }
      }
      text += `\n`;
    }

    // 2. Vườn Nguyệt Quế
    if (permissions.laurelGarden) {
      const trees = trainingService.getTrees();
      const completedTrees = trees.reduce((sum, t) => sum + (t.completedTrees || 0), 0);
      const totalPoints = trees.reduce((sum, t) => sum + (t.currentPoints || 0), 0);
      text += `--- 2. TIẾN ĐỘ CÂY NGUYỆT QUẾ TOÀN LỚP ---\n`;
      text += `• Đã hoàn thành nở hoa: ${completedTrees} cây Nguyệt Quế.\n`;
      text += `• Tổng điểm tích lũy thi đua hiện tại: ${totalPoints} điểm.\n\n`;
    }

    // 3. Học tập
    if (permissions.academicGrades) {
      let totalScored = 0;
      let sumAverages = 0;
      let excellentCount = 0;
      let goodCount = 0;
      let avgCount = 0;
      let weakCount = 0;

      students.forEach((s) => {
        const rec = academicService.getStudentAcademicRecord(s.id, period);
        if (rec && rec.grades && rec.grades.length > 0) {
          const scored = rec.grades.filter((g) => typeof g.average === 'number');
          if (scored.length > 0) {
            const avg = scored.reduce((sum, g) => sum + (g.average || 0), 0) / scored.length;
            totalScored++;
            sumAverages += avg;
            if (avg >= 8.0) excellentCount++;
            else if (avg >= 6.5) goodCount++;
            else if (avg >= 5.0) avgCount++;
            else weakCount++;
          }
        }
      });

      text += `--- 3. KẾT QUẢ HỌC TẬP (${period === 'midterm_hk1' ? 'Giữa HK1' : period === 'final_hk1' ? 'Cuối HK1' : period === 'midterm_hk2' ? 'Giữa HK2' : 'Cả năm'}) ---\n`;
      if (totalScored > 0) {
        const classAvg = (sumAverages / totalScored).toFixed(2);
        text += `• Số học sinh đã có bảng điểm: ${totalScored}/${students.length}\n`;
        text += `• Điểm TB ước tính toàn lớp: ${classAvg}đ\n`;
        text += `• Phân loại: Tốt/Giỏi: ${excellentCount} em | Khá: ${goodCount} em | Đạt: ${avgCount} em | Cần cố gắng: ${weakCount} em\n\n`;
      } else {
        text += `• Bảng điểm đang trong giai đoạn cập nhật theo tiến độ học kỳ.\n\n`;
      }
    }

    // 4. Hoạt động phong trào
    if (permissions.activities) {
      const activities = activityService.getAll();
      text += `--- 4. HOẠT ĐỘNG & PHONG TRÀO ---\n`;
      text += `• Tổng số hoạt động đã ghi nhận: ${activities.length}\n`;
      if (activities.length > 0) {
        const recent = activities.slice(0, 3).map((a) => a.title).join(', ');
        text += `• Hoạt động gần nhất: ${recent}\n`;
      }
      text += `\n`;
    }

    // 5. Hướng nghiệp & Thi TN
    if (permissions.careerRiasec) {
      const assessments = careerService.getAllAssessments();
      text += `--- 5. ĐỊNH HƯỚNG NGHỀ NGHIỆP RIASEC ---\n`;
      text += `• Số học sinh đã làm khảo sát RIASEC: ${assessments.length}/${students.length} em.\n\n`;
    }

    // 6. Thông tin nội bộ nhạy cảm (CHỈ KHI ĐƯỢC GVCN BẬT RÕ RÀNG)
    if (permissions.includeSensitiveInternalInfo) {
      const attentionStudents = students.filter((s) => s.needsSpecialAttention);
      if (attentionStudents.length > 0) {
        text += `--- 6. [NỘI BỘ] DANH SÁCH HỌC SINH CẦN QUAN TÂM ĐẶC BIỆT ---\n`;
        text += `⚠️ (Thông tin bảo mật nội bộ GVCN - Tuyệt đối không tiết lộ ra ngoài)\n`;
        attentionStudents.forEach((s) => {
          text += `  • ${s.fullName} (Mã: ${s.code}, Tổ ${s.group}): ${s.attentionNote || 'Đang theo dõi'}\n`;
        });
        text += `\n`;
      }
    }

    // 7. Cảnh báo khách quan từ hệ thống
    text += classAnalyticsAndAlertService.buildAlertsContextForAI();
    text += `\n* Dữ liệu trích xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;

    return text;
  }

  /**
   * Build student-specific context for one student with exact filters
   */
  public buildStudentContext(studentId: string, options: StudentAnalysisContextOptions): string {
    const student = studentService.getById(studentId) || studentService.getAll(true).find((s) => s.id === studentId);
    if (!student) {
      return `Hiện chưa tìm thấy dữ liệu cho học sinh đã chọn.`;
    }

    const settings = classService.getSettings();
    const permissions = options.permissions;
    const period: AcademicPeriod = options.period || 'midterm_hk1';
    const { filter: tfFilter, label: tfLabel } = this.normalizeTimeframe(options.timeframe);

    // List selected categories explicitly
    const activeCategories: string[] = [];
    if (permissions.attendance) activeCategories.push('Chuyên cần');
    if (permissions.violations) activeCategories.push('Vi phạm nề nếp');
    if (permissions.pointsPlusMinus || permissions.rewards) activeCategories.push('Điểm cộng/trừ & Khen thưởng');
    if (permissions.conductResults) activeCategories.push('Điểm rèn luyện');
    if (permissions.academicGrades) activeCategories.push('Kết quả học tập');
    if (permissions.laurelGarden) activeCategories.push('Cây Nguyệt Quế');
    if (permissions.careerRiasec) activeCategories.push('Hướng nghiệp RIASEC');
    if (permissions.graduationExam) activeCategories.push('Dự thi tốt nghiệp THPT');
    if (permissions.includeSensitiveInternalInfo) activeCategories.push('Ghi chú nội bộ');

    let text = `=== PHẠM VI DỮ LIỆU ĐƯỢC CHỌN (1 HỌC VIÊN) ===\n`;
    text += `- Học viên: ${student.fullName} (Mã HS: ${student.code})\n`;
    text += `- Giới tính: ${student.gender} | Ngày sinh: ${student.dob || 'Chưa cập nhật'}\n`;
    text += `- Lớp: ${settings.className} | Tổ: Tổ ${student.group} ${student.officerRole ? `| Chức vụ: ${student.officerRole}` : ''}\n`;
    text += `- Khung thời gian phân tích: ${tfLabel}\n`;
    text += `- Dữ liệu được phép đọc: ${activeCategories.join('; ') || 'Không có mục nào'}\n`;
    text += `==================================================\n\n`;

    // Sensitive info strictly protected
    if (permissions.includeSensitiveInternalInfo) {
      if (student.needsSpecialAttention) {
        text += `• ⚠️ [Nội bộ GVCN] Diện lưu ý đặc biệt: ${student.attentionNote || 'Đang theo dõi'}\n`;
      }
      if (student.fatherName || student.motherName) {
        text += `• Gia đình: Cha: ${student.fatherName || '—'} | Mẹ: ${student.motherName || '—'}\n`;
      }
    }

    // 1. Học tập
    if (permissions.academicGrades) {
      const record = academicService.getStudentAcademicRecord(studentId, period);
      text += `--- KẾT QUẢ HỌC TẬP ---\n`;
      if (record && record.grades && record.grades.length > 0) {
        record.grades.forEach((g) => {
          if (g.assessmentMode === 'COMMENT_ONLY') {
            text += `  • ${g.subjectName}: Nhận xét [${g.qualitativeResult || 'Đạt'}] ${g.comment ? `(${g.comment})` : ''}\n`;
          } else {
            text += `  • ${g.subjectName}: Điểm TB môn ${g.average !== undefined ? g.average : 'Chưa có'} ${g.comment ? `(${g.comment})` : ''}\n`;
          }
        });
        if (record.highestSubject) {
          text += `  => Môn thế mạnh: ${record.highestSubject.name} (${record.highestSubject.score}đ)\n`;
        }
        if (record.lowestSubject) {
          text += `  => Môn cần củng cố: ${record.lowestSubject.name} (${record.lowestSubject.score}đ)\n`;
        }
      } else {
        text += `  (Chưa có dữ liệu bảng điểm chính thức cho giai đoạn này)\n`;
      }
      text += `\n`;
    }

    // 2. Rèn luyện, Nề nếp & Lịch sử xử lý vi phạm
    if (permissions.conductResults || permissions.attendance || permissions.pointsPlusMinus || permissions.violations || permissions.rewards) {
      const allTx = trainingService.getTransactions().filter((t) => t.studentId === studentId && t.status === 'approved');
      const filteredTx = allTx.filter((t) => this.matchesTimeframe(t.eventDate || t.createdAt, (t as any).weekNumber, tfFilter));

      const goodDeeds = filteredTx.filter((t) => t.points > 0);
      const violations = filteredTx.filter((t) => t.points < 0);
      const tardy = filteredTx.filter((t) => t.category === 'Đi trễ');
      const excused = filteredTx.filter((t) => t.category === 'Nghỉ có phép');
      const unexcused = filteredTx.filter((t) => t.category === 'Nghỉ không phép');
      const totalPoints = allTx.reduce((sum, t) => sum + t.points, 100);

      text += `--- KẾT QUẢ RÈN LUYỆN & NỀ NẾP (${tfLabel}) ---\n`;
      if (permissions.conductResults) {
        text += `• Điểm rèn luyện tích lũy hiện tại: ${totalPoints}/100 đ\n`;
      }
      if (permissions.attendance) {
        text += `• Chuyên cần (${tfLabel}): Đi trễ ${tardy.length} lần | Nghỉ có phép ${excused.length} buổi | Nghỉ không phép ${unexcused.length} buổi.\n`;
      }
      if (permissions.rewards || permissions.pointsPlusMinus) {
        text += `• Việc tốt / Khen thưởng (${tfLabel}): ${goodDeeds.length} lượt ghi nhận.\n`;
      }
      if (permissions.violations) {
        text += `• Vi phạm ghi nhận (${tfLabel}): ${violations.length} lượt.\n`;
      }

      if (filteredTx.length > 0) {
        text += `• Các sự kiện nề nếp cụ thể trong thời gian này:\n`;
        filteredTx.slice(0, 8).forEach((t) => {
          text += `  + [${t.eventDate || t.createdAt || 'N/A'}] [${t.category}] ${t.reason} (${t.points > 0 ? `+${t.points}` : t.points}đ)\n`;
        });
      }

      // Lịch sử biên bản xử lý vi phạm của GVCN (nếu có và được chọn)
      if (permissions.violations && student.violationHandlingRecords && student.violationHandlingRecords.length > 0) {
        const filteredViolations = student.violationHandlingRecords.filter((vr) =>
          this.matchesTimeframe(vr.date, vr.weekNumber, tfFilter)
        );
        if (filteredViolations.length > 0) {
          text += `• Lịch sử xử lý vi phạm của GVCN:\n`;
          filteredViolations.forEach((vr) => {
            text += `  - Ngày ${vr.date}: [${vr.category}] ${vr.content} | Mức độ: ${vr.severity} | Trạng thái: ${vr.status}\n`;
            if (vr.educationalMeasure) text += `    + Biện pháp giáo dục đã áp dụng: ${vr.educationalMeasure}\n`;
            if (vr.studentExchangeNotes) text += `    + Trao đổi với học sinh: ${vr.studentExchangeNotes}\n`;
            if (vr.parentCoordinationNotes) text += `    + Phối hợp với phụ huynh: ${vr.parentCoordinationNotes}\n`;
          });
        }
      }
      text += `\n`;
    }

    // 3. Vườn Nguyệt Quế
    if (permissions.laurelGarden) {
      const trees = trainingService.getTrees();
      const studentTree = trees.find((t) => t.studentId === studentId);
      if (studentTree) {
        text += `--- CÂY NGUYỆT QUẾ ---\n`;
        text += `• Đã hoàn thành: ${studentTree.completedTrees || 0} cây Nguyệt Quế | Hoa hiện tại: ${Math.floor((studentTree.currentPoints || 0) / 10)}/10 hoa\n\n`;
      }
    }

    // 4. Hướng nghiệp RIASEC
    if (permissions.careerRiasec) {
      const career = careerService.getLatestAssessmentForStudent(studentId);
      if (career) {
        text += `--- HƯỚNG NGHIỆP RIASEC ---\n`;
        text += `• Mã Holland nổi trội: ${career.primaryCode} (${career.codeMeaning || 'Chưa rõ'})\n`;
        text += `• Ngành nghề phù hợp gợi ý: ${career.suggestedMajors?.join(', ') || 'Chưa cập nhật'}\n\n`;
      }
    }

    // 5. Thi tốt nghiệp THPT
    if (permissions.graduationExam) {
      const reg = graduationService.getByStudentId(studentId);
      if (reg) {
        text += `--- ĐĂNG KÝ & DỰ THI TỐT NGHIỆP THPT ---\n`;
        text += `• Môn tự chọn: ${reg.electiveSubject1 || 'Chưa chọn'} & ${reg.electiveSubject2 || 'Chưa chọn'}\n`;
        if (reg.scores) {
          text += `• Điểm dự kiến: Toán: ${reg.scores.math ?? '—'} | Văn: ${reg.scores.literature ?? '—'} | ${reg.electiveSubject1 || 'Môn 1'}: ${reg.scores.elective1 ?? '—'} | ${reg.electiveSubject2 || 'Môn 2'}: ${reg.scores.elective2 ?? '—'}\n`;
          text += `• ĐXTN ước tính: ${reg.calculatedScore || '—'}đ\n`;
        }
        if (reg.isFlagged) {
          text += `• [Lưu ý thi tốt nghiệp] Đang gắn cờ cần chú ý: ${reg.flagReasons?.join(', ') || 'Cần hỗ trợ'}\n`;
          if (reg.teacherNote) {
            text += `• Ghi chú của GVCN: ${reg.teacherNote}\n`;
          }
        }
        text += `\n`;
      }
    }

    // Cảnh báo khách quan từ hệ thống
    text += classAnalyticsAndAlertService.buildAlertsContextForAI(studentId);
    text += `\n* Dữ liệu trích xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;

    return text;
  }

  /**
   * Build multi-student comparison context for selected students
   */
  public buildMultiStudentContext(
    studentIds: string[],
    options: { permissions: AIDataPermissions; timeframe?: TimeframeFilter | string }
  ): string {
    const { label: tfLabel } = this.normalizeTimeframe(options.timeframe);
    const list = studentIds
      .map((id) => this.buildStudentContext(id, { permissions: options.permissions, timeframe: options.timeframe }))
      .join('\n========================================\n');

    return `=== DỮ LIỆU NHÓM HỌC SINH ĐƯỢC CHỌN (${studentIds.length} HỌC VIÊN - KHUNG THỜI GIAN: ${tfLabel}) ===\n\n${list}`;
  }
}

export const aiContextService = new AIContextService();
