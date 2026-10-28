/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { studentService } from './StudentService';
import { academicService } from './AcademicService';
import { trainingService } from './TrainingService';
import { careerService } from './CareerService';
import { classService } from './ClassService';
import { Student, StudentAcademicRecord, CareerAssessment, LaurelTree } from '../types';

export interface StudentContextOptions {
  includePersonalInfo?: boolean;
  includeAcademicGrades?: boolean;
  includeConductAndDiscipline?: boolean;
  includeLaurelGarden?: boolean;
  includeCareerRiasec?: boolean;
  selectedPeriod?: 'midterm_hk1' | 'final_hk1' | 'midterm_hk2' | 'final_hk2' | 'full_year';
}

export interface StudentFullContext {
  student: Student;
  academicRecord?: StudentAcademicRecord;
  trainingSummary?: {
    totalPoints: number;
    conductRank: string;
    goodDeedsCount: number;
    violationsCount: number;
    excusedAbsences: number;
    unexcusedAbsences: number;
    tardinessCount: number;
    recentTransactions: Array<{ date: string; category: string; reason: string; points: number }>;
  };
  laurelTree?: {
    completedTrees: number;
    currentFlowers: number;
    lastWatered: string;
  };
  careerAssessment?: CareerAssessment | null;
  classContext: {
    className: string;
    academicYear: string;
    homeroomTeacher: string;
  };
}

class AIStudentContextService {
  /**
   * Build full context object for a specific student with real data from services
   */
  public buildStudentContext(studentId: string, options?: StudentContextOptions): StudentFullContext | null {
    const student = studentService.getById(studentId) || studentService.getAll(true).find(s => s.id === studentId);
    if (!student) return null;

    const classSettings = classService.getSettings();
    const period = options?.selectedPeriod || 'midterm_hk1';

    // 1. Academic Record
    const academicRecord = academicService.getStudentAcademicRecord(studentId, period);

    // 2. Training & Discipline
    const transactions = trainingService.getTransactions().filter(t => t.studentId === studentId && t.status === 'approved');
    const trees = trainingService.getTrees();
    const studentTree = trees.find(t => t.studentId === studentId);

    const goodDeeds = transactions.filter(t => t.points > 0);
    const violations = transactions.filter(t => t.points < 0);
    const tardy = transactions.filter(t => t.category === 'Đi trễ');
    const excused = transactions.filter(t => t.category === 'Nghỉ có phép');
    const unexcused = transactions.filter(t => t.category === 'Nghỉ không phép');

    const totalPoints = transactions.reduce((sum, t) => sum + t.points, 100);

    let conductRank = 'Tốt';
    if (totalPoints >= 90) conductRank = 'Tốt';
    else if (totalPoints >= 75) conductRank = 'Khá';
    else if (totalPoints >= 50) conductRank = 'Đạt';
    else conductRank = 'Chưa đạt';

    // 3. Career RIASEC
    const careerAssessment = careerService.getLatestAssessmentForStudent(studentId);

    return {
      student,
      academicRecord,
      trainingSummary: {
        totalPoints,
        conductRank,
        goodDeedsCount: goodDeeds.length,
        violationsCount: violations.length,
        excusedAbsences: excused.length,
        unexcusedAbsences: unexcused.length,
        tardinessCount: tardy.length,
        recentTransactions: transactions.slice(0, 8).map(t => ({
          date: t.eventDate || t.createdAt,
          category: t.category,
          reason: t.reason,
          points: t.points
        }))
      },
      laurelTree: studentTree ? {
        completedTrees: studentTree.completedTrees || 0,
        currentFlowers: Math.floor((studentTree.currentPoints || studentTree.currentCyclePoints || 0) / 10),
        lastWatered: new Date().toLocaleDateString('vi-VN')
      } : undefined,
      careerAssessment,
      classContext: {
        className: classSettings.className,
        academicYear: classSettings.academicYear,
        homeroomTeacher: classSettings.homeroomTeacherName || classSettings.teacherName || 'GVCN'
      }
    };
  }

  /**
   * Convert student context into a comprehensive, highly readable prompt for AI
   */
  public generatePedagogicalPrompt(context: StudentFullContext, queryOrGoal?: string): string {
    const s = context.student;
    const cls = context.classContext;
    const ac = context.academicRecord;
    const tr = context.trainingSummary;
    const cr = context.careerAssessment;

    let text = `DỮ LIỆU THỰC TẾ HỌC SINH TẠI LỚP ${cls.className} (NĂM HỌC ${cls.academicYear}):\n`;
    text += `1. THÔNG TIN HỌC SINH:\n`;
    text += `- Họ và tên: ${s.fullName} (Mã HS: ${s.code})\n`;
    text += `- Giới tính: ${s.gender} | Ngày sinh: ${s.dob || 'Chưa rõ'}\n`;
    text += `- Tổ: Tổ ${s.group} ${s.officerRole ? `| Chức vụ: ${s.officerRole}` : ''}\n`;
    if (s.needsSpecialAttention) {
      text += `- ⚠️ Đang nằm trong diện GVCN theo dõi sát: Lý do: ${s.attentionNote || 'Chưa ghi chú'}\n`;
    }
    if (s.phone) text += `- SĐT học sinh: ${s.phone}\n`;
    if (s.fatherName || s.motherName) {
      text += `- Thông tin gia đình: Cha: ${s.fatherName || '—'} (${s.fatherPhone || '—'}) | Mẹ: ${s.motherName || '—'} (${s.motherPhone || '—'})\n`;
    }

    if (ac && ac.grades && ac.grades.length > 0) {
      text += `\n2. KẾT QUẢ HỌC TẬP (${ac.period === 'midterm_hk1' ? 'Giữa Học kỳ I' : ac.period === 'final_hk1' ? 'Cuối Học kỳ I' : ac.period === 'midterm_hk2' ? 'Giữa Học kỳ II' : ac.period === 'final_hk2' ? 'Cuối Học kỳ II' : 'Cả năm'}):\n`;
      ac.grades.forEach(g => {
        if (g.assessmentMode === 'COMMENT_ONLY') {
          text += `  • ${g.subjectName}: Đánh giá nhận xét [${g.qualitativeResult || 'Đạt'}] ${g.comment ? `- Ghi chú: ${g.comment}` : ''}\n`;
        } else {
          const scores: string[] = [];
          if (g.tx1 !== undefined) scores.push(`TX1: ${g.tx1}`);
          if (g.tx2 !== undefined) scores.push(`TX2: ${g.tx2}`);
          if (g.tx3 !== undefined) scores.push(`TX3: ${g.tx3}`);
          if (g.midterm !== undefined) scores.push(`GK: ${g.midterm}`);
          if (g.finalExam !== undefined) scores.push(`CK: ${g.finalExam}`);
          if (g.average !== undefined) scores.push(`TB Môn: ${g.average}`);
          text += `  • ${g.subjectName}: ${scores.length > 0 ? scores.join(' | ') : 'Chưa nhập điểm'} ${g.comment ? `(${g.comment})` : ''}\n`;
        }
      });
      if (ac.highestSubject) text += `  => Môn thế mạnh: ${ac.highestSubject.name} (${ac.highestSubject.score} đ)\n`;
      if (ac.lowestSubject) text += `  => Môn cần củng cố: ${ac.lowestSubject.name} (${ac.lowestSubject.score} đ)\n`;
      if (ac.teacherComment || ac.academicSummary) text += `  => Nhận xét học tập của GVCN: "${ac.academicSummary || ac.teacherComment}"\n`;
    }

    if (tr) {
      text += `\n3. KẾT QUẢ RÈN LUYỆN & NỀ NẾP:\n`;
      text += `- Điểm rèn luyện hiện tại: ${tr.totalPoints}/100 đ (Xếp loại tạm tính: ${tr.conductRank})\n`;
      text += `- Chuyên cần: Đi trễ ${tr.tardinessCount} lần | Nghỉ có phép: ${tr.excusedAbsences} buổi | Nghỉ không phép: ${tr.unexcusedAbsences} buổi\n`;
      text += `- Số lượt việc tốt / khen thưởng: ${tr.goodDeedsCount} | Số lượt vi phạm: ${tr.violationsCount}\n`;
      if (tr.recentTransactions.length > 0) {
        text += `- Các sự kiện nề nếp gần nhất:\n`;
        tr.recentTransactions.forEach(t => {
          text += `  + Ngày ${t.date}: [${t.category}] ${t.reason} (${t.points > 0 ? `+${t.points}` : t.points} đ)\n`;
        });
      }
    }

    if (context.laurelTree) {
      text += `\n4. TIẾN TRÌNH CÂY NGUYỆT QUẾ:\n`;
      text += `- Đã trổ hoàn thành ${context.laurelTree.completedTrees} cây Nguyệt Quế | Hoa hiện tại: ${context.laurelTree.currentFlowers}/10 hoa\n`;
    }

    if (cr) {
      text += `\n5. TRẮC NGHIỆM HƯỚNG NGHIỆP O*NET RIASEC:\n`;
      text += `- Mã Holland nổi trội: ${cr.primaryCode} (${cr.codeMeaning})\n`;
      text += `- Điểm 6 nhóm: R=${cr.riasec.R}/25, I=${cr.riasec.I}/25, A=${cr.riasec.A}/25, S=${cr.riasec.S}/25, E=${cr.riasec.E}/25, C=${cr.riasec.C}/25\n`;
      text += `- Nguyện vọng / Ngành gợi ý: ${cr.suggestedMajors.join(', ')}\n`;
      text += `- Tổ hợp môn dự kiến: ${(cr.expectedExamCombinations || []).join(', ')}\n`;
    }

    text += `\nYÊU CẦU ĐỐI VỚI TRỢ LÝ AI SƯ PHẠM:\n`;
    if (queryOrGoal) {
      text += `Mục tiêu tư vấn cụ thể của GVCN: "${queryOrGoal}"\n`;
    } else {
      text += `Dựa trên toàn bộ dữ liệu thực tế trên, hãy lập báo cáo phân tích sư phạm toàn diện cho Giáo viên Chủ nhiệm gồm:\n`;
      text += `1. Tóm tắt đặc điểm tổng quan của học sinh (thế mạnh, tiềm năng, phong cách rèn luyện)\n`;
      text += `2. Các điểm tích cực nổi bật đáng khen ngợi\n`;
      text += `3. Các điểm cần lưu ý và hỗ trợ kịp thời (về môn học, nề nếp hoặc tâm lý)\n`;
      text += `4. Gợi ý 3 câu hỏi gợi mở để GVCN trao đổi riêng một cách ấm áp với học sinh\n`;
      text += `5. Kế hoạch hành động 2 - 4 tuần tới cho GVCN (biện pháp sư phạm tích cực, không gây áp lực)\n`;
      text += `6. Đề xuất cách thức phối hợp ấm áp, hiệu quả với Cha/Mẹ học sinh\n`;
    }

    text += `\n*LƯU Ý QUAN TRỌNG: Mọi phân tích chỉ là đề xuất tham vấn sư phạm. Quyền quyết định thuộc về GVCN. Không gắn nhãn tiêu cực.*`;

    return text;
  }
}

export const aiStudentContextService = new AIStudentContextService();
