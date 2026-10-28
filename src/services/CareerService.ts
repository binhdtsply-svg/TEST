/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CareerProfile,
  HollandScore,
  CareerAssessment,
  ParentCareerFeedback,
  AICareerAnalysis,
  RIASECCategory,
  CareerAIConversation,
  CareerAIMessage,
  MBTIResult,
  WorkValuesResult,
  CareerOccupation,
  CareerInstitution,
  CareerAdmissionUpdate,
  CareerSavedItem,
  SavedItemType,
  SavedItemStatus
} from '../types';
import { initialCareerProfiles } from '../data/demoData';
import { ONET_MINI_QUESTIONS, RIASEC_INFO } from '../data/onetQuestions';
import {
  OCCUPATIONS_DATABASE,
  INSTITUTIONS_DATABASE,
  ADMISSION_UPDATES_DATABASE
} from '../data/occupationsAndAdmissionsData';
import { careerRepositoryClient } from './CareerRepositoryClient';
import { getAIProviderInstance } from './AIProvider';
import { studentService } from './StudentService';
import { academicService } from './AcademicService';
import { classService } from './ClassService';
import { aiService } from './AIService';
import { tenantService } from './TenantService';

export interface HollandQuestion {
  id: number;
  type: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
  text: string;
}

export const hollandQuestions: HollandQuestion[] = [
  { id: 1, type: 'R', text: 'Thích lắp ráp máy móc, sửa chữa thiết bị điện tử hoặc đồ cơ khí.' },
  { id: 2, type: 'I', text: 'Thích tìm tòi nghiên cứu khoa học, giải các bài toán logic phức tạp.' },
  { id: 3, type: 'A', text: 'Có năng khiếu vẽ, viết lách, sáng tạo nội dung nghệ thuật hoặc chơi nhạc cụ.' },
  { id: 4, type: 'S', text: 'Thích lắng nghe, tư vấn, giúp đỡ bạn bè vượt qua khó khăn trong cuộc sống.' },
  { id: 5, type: 'E', text: 'Thích làm thủ lĩnh, thuyết phục người khác và lập kế hoạch kinh doanh/dự án.' },
  { id: 6, type: 'C', text: 'Thích sự ngăn nắp, làm việc cẩn thận với bảng số liệu, tài liệu quy củ.' },
  { id: 7, type: 'R', text: 'Thích hoạt động ngoài trời, thể thao vận động hoặc lập trình phần cứng robot.' },
  { id: 8, type: 'I', text: 'Thích phân tích dữ liệu, đọc sách chuyên khảo và làm thí nghiệm.' },
  { id: 9, type: 'A', text: 'Thích thiết kế đồ họa, quay dựng video và tự do thể hiện phong cách riêng.' },
  { id: 10, type: 'S', text: 'Thích tham gia các hoạt động tình nguyện, giảng dạy hoặc chăm sóc cộng đồng.' },
  { id: 11, type: 'E', text: 'Có khả năng đàm phán, tự tin nói trước đám đông và thích bán hàng.' },
  { id: 12, type: 'C', text: 'Rất cẩn trọng với thời hạn, thích lập thời gian biểu chi tiết và tuân thủ kỷ luật.' }
];

class CareerService {
  private activeTenantId: string = 'tenant-lan-nguyen';
  private profiles: Record<string, CareerProfile> = { ...initialCareerProfiles };
  private assessments: CareerAssessment[] = [];
  private conversations: Record<string, CareerAIConversation> = {};
  private listeners: Array<() => void> = [];

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.syncFromServer();

    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.loadFromStorage(nextTenantId);
        this.syncFromServer();
        this.notify();
      }
    });
  }

  public async syncFromServer(): Promise<void> {
    try {
      const res = await careerRepositoryClient.getCareerProfiles();
      if (res.success && res.data && Array.isArray(res.data)) {
        res.data.forEach((row: any) => {
          if (row.studentId) {
            const existing = this.profiles[row.studentId];
            if (existing) {
              if (row.mbtiResult && Object.keys(row.mbtiResult).length > 0) {
                existing.mbtiResult = row.mbtiResult;
              }
              if (row.workValuesResult && Object.keys(row.workValuesResult).length > 0) {
                existing.workValuesResult = row.workValuesResult;
              }
              this.profiles[row.studentId] = existing;
            }
          }
        });
        this.saveProfilesToStorage(this.activeTenantId);
      }
    } catch {
      // ignore
    }
  }

  private async syncToServer(studentId: string): Promise<void> {
    const prof = this.profiles[studentId];
    if (!prof) return;
    try {
      await careerRepositoryClient.saveCareerProfile({
        studentId,
        riasecScores: prof.hollandScores,
        primaryTraits: [prof.primaryCode],
        recommendedCareers: prof.suggestedMajors,
        studentAspirations: prof.targetCareerAndSchool || prof.notes,
        mbtiResult: prof.mbtiResult,
        workValuesResult: prof.workValuesResult
      });
    } catch {
      // offline or silent fail
    }
  }

  public reloadForActiveTenant(): void {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.loadFromStorage(this.activeTenantId);
    this.notify();
  }

  private loadFromStorage(tenantId: string) {
    const tId = tenantService.normalizeTenantId(tenantId);
    try {
      const profKey = tenantService.getTenantStorageKey('career_profiles', tId);
      const savedProfiles = localStorage.getItem(profKey);
      if (savedProfiles) {
        this.profiles = JSON.parse(savedProfiles);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacyProfiles = localStorage.getItem('kgcns_career_profiles');
          if (legacyProfiles) {
            this.profiles = JSON.parse(legacyProfiles);
            localStorage.setItem(profKey, legacyProfiles);
          } else {
            this.profiles = { ...initialCareerProfiles };
          }
        } else {
          this.profiles = {};
        }
      }

      const assessKey = tenantService.getTenantStorageKey('onet_assessments', tId);
      const savedAssessments = localStorage.getItem(assessKey);
      if (savedAssessments) {
        this.assessments = JSON.parse(savedAssessments);
      } else {
        if (tId === 'tenant-lan-nguyen') {
          const legacyAssessments = localStorage.getItem('kgcns_onet_assessments');
          if (legacyAssessments) {
            this.assessments = JSON.parse(legacyAssessments);
            localStorage.setItem(assessKey, legacyAssessments);
          } else {
            this.seedInitialAssessments();
          }
        } else {
          this.assessments = [];
        }
      }

      const convsKey = tenantService.getTenantStorageKey('career_conversations', tId);
      const savedConvs = localStorage.getItem(convsKey);
      if (savedConvs) {
        this.conversations = JSON.parse(savedConvs);
      } else {
        this.conversations = {};
      }
    } catch {
      // ignore
    }
  }

  private seedInitialAssessments() {
    const seedList: CareerAssessment[] = Object.keys(this.profiles).map((sId) => {
      const prof = this.profiles[sId];
      const scores = prof.hollandScores;
      const primaryCode = prof.primaryCode ? prof.primaryCode.split(' ')[0] : 'SEC';
      const topCodes = primaryCode.split('').filter(c => ['R', 'I', 'A', 'S', 'E', 'C'].includes(c));

      return {
        id: `onet-${sId}-1`,
        studentId: sId,
        studentName: `Học sinh ${sId.replace('hs-', '')}`,
        provider: 'ONET_MINI_INTEREST_PROFILER',
        assessmentType: 'mini_30',
        assessmentVersion: 'O*NET Mini v1.0',
        status: 'completed',
        startedAt: '2026-08-20T08:00:00.000Z',
        completedAt: '2026-08-20T08:25:00.000Z',
        rawAnswers: {},
        scores: { ...scores },
        riasec: {
          R: scores.realistic,
          I: scores.investigative,
          A: scores.artistic,
          S: scores.social,
          E: scores.enterprising,
          C: scores.conventional
        },
        topInterestCodes: topCodes.length >= 3 ? topCodes.slice(0, 3) : ['S', 'E', 'C'],
        primaryCode: primaryCode,
        codeMeaning: 'Xã hội - Quản lý - Nghiệp vụ',
        suggestedMajors: prof.suggestedMajors || ['Quản trị Kinh doanh', 'Sư phạm', 'Kinh tế Quốc tế'],
        suggestedCareers: ['Chuyên viên Marketing', 'Quản lý Dự án', 'Giáo viên'],
        targetUniversities: prof.targetUniversities || ['ĐH Quốc gia TP.HCM', 'ĐH Kinh tế TP.HCM'],
        expectedExamCombinations: prof.examGroups || ['D01 (Toán, Văn, Anh)', 'A01 (Toán, Lý, Anh)'],
        source: 'O*NET Interest Profiler Short Form - US Department of Labor',
        attemptNumber: 1,
        createdAt: '2026-08-20 08:30',
        updatedAt: '2026-08-20 08:30'
      };
    });

    this.assessments = seedList;
    this.saveAssessmentsToStorage();
  }

  private saveProfilesToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('career_profiles', tId), JSON.stringify(this.profiles));
    } catch {
      // ignore
    }
    this.notify();
  }

  private saveAssessmentsToStorage(tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('onet_assessments', tId), JSON.stringify(this.assessments));
    } catch {
      // ignore
    }
    this.notify();
  }

  private saveConversationsToStorage(notify = false, tenantId?: string) {
    const tId = tenantService.normalizeTenantId(tenantId || this.activeTenantId);
    try {
      localStorage.setItem(tenantService.getTenantStorageKey('career_conversations', tId), JSON.stringify(this.conversations));
    } catch {
      // ignore storage error
    }
    if (notify) {
      this.notify();
    }
  }

  // =========================================================================
  // MULTI-TURN CAREER AI CHAT CONVERSATION MANAGEMENT
  // =========================================================================

  public getConversation(studentId: string): CareerAIConversation {
    if (this.conversations[studentId]) {
      return this.conversations[studentId];
    }

    const student = studentService.getById(studentId);
    const latestAssessment = this.getLatestAssessmentForStudent(studentId);
    const initialGreeting = `Xin chào ${student ? student.fullName : 'bạn'}! Tôi là **Trợ lý AI Hướng nghiệp THPT** của Không Gian Chủ Nhiệm Số.

Tôi đã nắm được kết quả khảo sát trắc nghiệm Holland / RIASEC${latestAssessment ? ` (mã nổi trội **${latestAssessment.primaryCode}** - ${latestAssessment.codeMeaning})` : ''} và thông tin học tập của bạn.

Bạn có thể chọn một câu hỏi gợi ý nhanh bên dưới hoặc hỏi tôi bất kỳ điều gì:
- 🎓 *Gợi ý các ngành đào tạo và nhóm trường phù hợp với sở thích & năng lực của tôi?*
- 📚 *Tư vấn tổ hợp môn thi tốt nghiệp THPT (A00, A01, D01, D07...) tối ưu nhất?*
- 📈 *Phân tích mối tương quan giữa điểm số các môn trên lớp và xu hướng nghề nghiệp?*
- 🧭 *So sánh cơ hội việc làm giữa hai ngành tôi đang phân vân?*

*Tôi có thể hỗ trợ gì cho hành trình định hướng tương lai của bạn ngay bây giờ?*`;

    const conv: CareerAIConversation = {
      id: `conv-career-${studentId}`,
      studentId,
      studentName: student?.fullName || 'Học sinh',
      messages: [
        {
          id: `msg-welcome-${studentId}`,
          conversationId: `conv-career-${studentId}`,
          role: 'assistant',
          content: initialGreeting,
          createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.conversations[studentId] = conv;
    this.saveConversationsToStorage(false);
    return conv;
  }

  public clearConversation(studentId: string): void {
    delete this.conversations[studentId];
    this.saveConversationsToStorage(false);
  }

  public async sendMultiTurnChatMessage(
    studentId: string,
    userMessage: string,
    quickPromptUsed?: string
  ): Promise<CareerAIMessage> {
    const student = studentService.getById(studentId);
    const conv = this.getConversation(studentId);
    const allAssessments = this.getAssessmentsForStudent(studentId);
    const latestAssessment = allAssessments[0] || null;
    const profile = this.getProfile(studentId);
    const classSettings = classService.getSettings();

    // Get student academic performance context
    let academicSummary = 'Chưa có dữ liệu điểm chi tiết';
    try {
      const stRecord = academicService.getStudentAcademicRecord(studentId, 'midterm_hk1');
      if (stRecord && Array.isArray(stRecord.grades) && stRecord.grades.length > 0) {
        const topSubjects = [...stRecord.grades]
          .filter(sg => sg.average !== undefined && sg.average > 0)
          .sort((a, b) => (b.average || 0) - (a.average || 0))
          .slice(0, 5)
          .map(sg => `${sg.subjectName}: ${sg.average}đ`);
        
        academicSummary = `Điểm TB chung: ${stRecord.gpa || 'N/A'}đ, Rèn luyện: ${stRecord.conductResult || 'Chưa đánh giá'}. Các môn điểm cao nhất: ${topSubjects.join(', ')}`;
      }
    } catch {
      // ignore
    }

    // Append user message
    const userMsgId = `msg-u-${Date.now()}`;
    const userMsg: CareerAIMessage = {
      id: userMsgId,
      conversationId: conv.id,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      quickPromptUsed
    };

    conv.messages.push(userMsg);
    conv.updatedAt = new Date().toISOString();
    this.saveConversationsToStorage();

    // Format assessment history context for AI
    const assessmentHistorySummary = allAssessments.length > 0
      ? allAssessments.map((a, i) => `Lần ${allAssessments.length - i} (${a.createdAt || a.updatedAt}): Mã ${a.primaryCode} [R:${a.riasec.R}, I:${a.riasec.I}, A:${a.riasec.A}, S:${a.riasec.S}, E:${a.riasec.E}, C:${a.riasec.C}]`).join('\n')
      : `Mã Holland mặc định: ${profile.primaryCode}`;

    // System prompt & Context
    const systemPrompt = `Bạn là Chuyên gia Cố vấn Hướng nghiệp THPT Sư phạm Sâu sắc, tận tâm và thấu hiểu, đồng hành cùng học sinh trong nền tảng "Không Gian Chủ Nhiệm Số" (Lớp ${classSettings.className || '11A1'}, Trường ${classSettings.schoolName || 'THPT'}).
Nguyên tắc tư vấn:
1. Luôn đưa ra lời khuyên mang tính gợi mở, tích cực, không áp đặt, không phán xét. Dùng ngôn từ chuẩn mực sư phạm, ấm áp, thấu cảm.
2. Mọi đề xuất ngành nghề, trường học, tổ hợp môn (A00, A01, B00, C00, D01, D07...) phải bám sát chương trình GDPT 2018 và quy chế tuyển sinh Đại học tại Việt Nam.
3. Luôn phân tích kết hợp giữa: Sở thích theo mô hình Holland RIASEC, năng lực học tập thực tế (điểm số môn thế mạnh), và xu hướng phát triển thị trường lao động.
4. Nếu học sinh có nhiều lần làm khảo sát RIASEC, hãy lưu ý sự dịch chuyển sở thích qua các lần.
5. Luôn nhắc nhở học sinh rằng kết quả trắc nghiệm là kênh tham khảo sư phạm, cần đối chiếu với trải nghiệm thực tế và thảo luận thêm cùng GVCN và gia đình.
6. Tuyệt đối không tiết lộ thông tin bảo mật riêng tư của phụ huynh/học sinh. Trình bày rõ ràng bằng Markdown có bullet points, in đậm từ khóa quan trọng.`;

    const fullPrompt = `HỒ SƠ HỌC SINH ĐANG ĐƯỢC TƯ VẤN:
- Họ và tên: ${student?.fullName || 'Học sinh'} (Mã: ${student?.code || studentId})
- Lớp: ${classSettings.className || '11A1'} - Năm học: ${classSettings.schoolYearLabel || classSettings.academicYear || '2025 - 2026'}
- Lịch sử Trắc nghiệm Holland RIASEC:
${assessmentHistorySummary}
- Ngành đào tạo quan tâm: ${(latestAssessment?.suggestedMajors || profile.suggestedMajors || []).join(', ')}
- Tổ hợp môn dự kiến: ${(latestAssessment?.expectedExamCombinations || profile.examGroups || []).join(', ')}
- Tình hình học tập thực tế: ${academicSummary}

LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ:
${conv.messages.slice(-6).map(m => `${m.role === 'user' ? 'Học sinh' : 'Cố vấn AI'}: ${m.content}`).join('\n\n')}

CÂU HỎI MỚI NHẤT CỦA HỌC SINH:
"${userMessage}"

Hãy đưa ra phản hồi tư vấn cụ thể, có chiều sâu, kèm theo đề xuất hành động thực tiễn cho học sinh.`;

    try {
      const aiConfig = aiService.getWorkspaceConfig();
      const provider = getAIProviderInstance(aiConfig.provider || 'gemini');
      const responseText = await provider.generateText(fullPrompt, systemPrompt, aiConfig);

      const assistantMsg: CareerAIMessage = {
        id: `msg-a-${Date.now()}`,
        conversationId: conv.id,
        role: 'assistant',
        content: responseText,
        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      conv.messages.push(assistantMsg);
      conv.updatedAt = new Date().toISOString();
      this.saveConversationsToStorage();
      return assistantMsg;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isMissingKey = errMsg.includes('AI_KEY_MISSING') || errMsg.includes('Chưa nhập') || errMsg.includes('API_KEY');
      
      const errorContent = isMissingKey
        ? `⚠️ **Trợ lý AI chưa được cấu hình.**\n\nQuản trị viên hoặc Giáo viên chủ nhiệm vui lòng vào mục **Cài đặt & Cấu hình → Trợ lý AI Sư phạm** để cấu hình Gemini API Key hoặc Personal AI URL.`
        : `⚠️ **Không thể kết nối với Trợ lý AI Hướng nghiệp (${errMsg.substring(0, 100)}).**\n\nVui lòng kiểm tra lại kết nối mạng hoặc API Key trong phần Cài đặt và thử lại.`;

      const errorMsg: CareerAIMessage = {
        id: `msg-err-${Date.now()}`,
        conversationId: conv.id,
        role: 'assistant',
        content: errorContent,
        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };

      conv.messages.push(errorMsg);
      conv.updatedAt = new Date().toISOString();
      this.saveConversationsToStorage();
      return errorMsg;
    }
  }

  // =========================================================================
  // ASSESSMENTS MANAGEMENT (O*NET Interest Profiler Short Form / Radar Holland)
  // =========================================================================

  private sanitizeAssessment(a: CareerAssessment): CareerAssessment {
    return {
      ...a,
      suggestedMajors: Array.isArray(a.suggestedMajors) ? a.suggestedMajors : [],
      suggestedCareers: Array.isArray(a.suggestedCareers) ? a.suggestedCareers : [],
      topInterestCodes: Array.isArray(a.topInterestCodes) ? a.topInterestCodes : [],
      parentFeedbacks: Array.isArray(a.parentFeedbacks) ? a.parentFeedbacks : [],
      expectedExamCombinations: Array.isArray(a.expectedExamCombinations) ? a.expectedExamCombinations : ['A00', 'A01', 'D01'],
      targetUniversities: Array.isArray(a.targetUniversities) ? a.targetUniversities : [],
      aiAnalysis: a.aiAnalysis ? {
        ...a.aiAnalysis,
        recommendedWorkEnvironments: Array.isArray(a.aiAnalysis.recommendedWorkEnvironments) ? a.aiAnalysis.recommendedWorkEnvironments : [],
        selfExplorationQuestions: Array.isArray(a.aiAnalysis.selfExplorationQuestions) ? a.aiAnalysis.selfExplorationQuestions : [],
        roadmap1to3Months: Array.isArray(a.aiAnalysis.roadmap1to3Months) ? a.aiAnalysis.roadmap1to3Months : []
      } : undefined
    };
  }

  public getAllAssessments(): CareerAssessment[] {
    return this.assessments.map(a => this.sanitizeAssessment(a));
  }

  public getAssessmentsForStudent(studentId: string): CareerAssessment[] {
    return this.assessments
      .filter(a => a.studentId === studentId)
      .map(a => this.sanitizeAssessment(a))
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }

  public getLatestAssessmentForStudent(studentId: string): CareerAssessment | null {
    const list = this.getAssessmentsForStudent(studentId);
    return list.find(a => a.status === 'completed') || list[0] || null;
  }

  public getAssessmentById(id: string): CareerAssessment | undefined {
    const a = this.assessments.find(item => item.id === id);
    return a ? this.sanitizeAssessment(a) : undefined;
  }

  public deleteAssessment(id: string): boolean {
    const idx = this.assessments.findIndex(a => a.id === id);
    if (idx >= 0) {
      this.assessments.splice(idx, 1);
      this.saveAssessmentsToStorage();
      return true;
    }
    return false;
  }

  public calculateONetScores(rawAnswers: Record<number, number>): {
    scores: HollandScore;
    riasec: { R: number; I: number; A: number; S: number; E: number; C: number };
    topInterestCodes: string[];
    primaryCode: string;
    codeMeaning: string;
    suggestedMajors: string[];
    suggestedCareers: string[];
    suggestedExamCombinations: string[];
  } {
    const riasec = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

    ONET_MINI_QUESTIONS.forEach(q => {
      const val = rawAnswers[q.id] || 0;
      if (val > 0) {
        riasec[q.category] += val;
      }
    });

    const scores: HollandScore = {
      realistic: riasec.R,
      investigative: riasec.I,
      artistic: riasec.A,
      social: riasec.S,
      enterprising: riasec.E,
      conventional: riasec.C
    };

    // Sort categories descending
    const sortedCategories = (['R', 'I', 'A', 'S', 'E', 'C'] as RIASECCategory[])
      .map(cat => ({
        cat,
        score: riasec[cat],
        info: RIASEC_INFO[cat]
      }))
      .sort((a, b) => b.score - a.score);

    const topInterestCodes = sortedCategories.slice(0, 3).map(s => s.cat);
    const primaryCode = topInterestCodes.join('');
    const codeMeaning = topInterestCodes.map(c => RIASEC_INFO[c as RIASECCategory]?.name || c).join(' - ');

    // Aggregate unique recommendations from top categories
    const majorsSet = new Set<string>();
    const careersSet = new Set<string>();
    const examCombSet = new Set<string>();

    topInterestCodes.forEach(cat => {
      const info = RIASEC_INFO[cat as RIASECCategory];
      if (info) {
        info.typicalMajors?.forEach(m => majorsSet.add(m));
        info.typicalCareers?.forEach(c => careersSet.add(c));
        info.suggestedExamCombinations?.forEach(e => examCombSet.add(e));
      }
    });

    return {
      scores,
      riasec,
      topInterestCodes,
      primaryCode,
      codeMeaning,
      suggestedMajors: Array.from(majorsSet).slice(0, 6),
      suggestedCareers: Array.from(careersSet).slice(0, 6),
      suggestedExamCombinations: Array.from(examCombSet).slice(0, 4)
    };
  }

  public createManualAssessment(
    studentId: string,
    riasecScores: { R: number; I: number; A: number; S: number; E: number; C: number },
    source: string = 'Radar Holland / John Holland Test'
  ): CareerAssessment {
    const student = studentService.getById(studentId);
    
    // Sort categories descending
    const sortedCategories = (['R', 'I', 'A', 'S', 'E', 'C'] as RIASECCategory[])
      .map(cat => ({
        cat,
        score: riasecScores[cat] || 0,
        info: RIASEC_INFO[cat]
      }))
      .sort((a, b) => b.score - a.score);

    const topInterestCodes = sortedCategories.slice(0, 3).map(s => s.cat);
    const primaryCode = topInterestCodes.join('');
    const codeMeaning = topInterestCodes.map(c => RIASEC_INFO[c as RIASECCategory]?.name || c).join(' - ');

    const majorsSet = new Set<string>();
    const careersSet = new Set<string>();
    const examCombSet = new Set<string>();

    topInterestCodes.forEach(cat => {
      const info = RIASEC_INFO[cat as RIASECCategory];
      if (info) {
        info.typicalMajors?.forEach(m => majorsSet.add(m));
        info.typicalCareers?.forEach(c => careersSet.add(c));
        info.suggestedExamCombinations?.forEach(e => examCombSet.add(e));
      }
    });

    const newAssessment: Omit<CareerAssessment, 'id' | 'createdAt' | 'updatedAt' | 'attemptNumber'> = {
      studentId,
      studentName: student?.fullName || 'Học sinh',
      studentCode: student?.code || '',
      studentAvatar: student?.avatar,
      provider: 'RADAR_HOLLAND_DIRECT',
      assessmentType: 'standard_holland',
      assessmentVersion: 'Holland RIASEC v2.0',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rawAnswers: {},
      scores: {
        realistic: riasecScores.R,
        investigative: riasecScores.I,
        artistic: riasecScores.A,
        social: riasecScores.S,
        enterprising: riasecScores.E,
        conventional: riasecScores.C
      },
      riasec: { ...riasecScores },
      topInterestCodes,
      primaryCode,
      codeMeaning,
      suggestedMajors: Array.from(majorsSet).slice(0, 6),
      suggestedCareers: Array.from(careersSet).slice(0, 6),
      expectedExamCombinations: Array.from(examCombSet).slice(0, 4),
      source
    };

    return this.saveAssessment(newAssessment);
  }

  public saveAssessment(assessment: Omit<CareerAssessment, 'id' | 'createdAt' | 'updatedAt' | 'attemptNumber'> & { id?: string }): CareerAssessment {
    const existingIndex = assessment.id ? this.assessments.findIndex(a => a.id === assessment.id) : -1;
    const formattedDate = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');

    const previousAttempts = this.assessments.filter(a => a.studentId === assessment.studentId && a.status === 'completed');
    const maxAttempt = previousAttempts.reduce((max, a) => Math.max(max, a.attemptNumber || 0), 0);
    const attemptNumber = existingIndex >= 0
      ? (this.assessments[existingIndex].attemptNumber || maxAttempt || 1)
      : maxAttempt + 1;

    // Standardized scores & normalized percentages (0..100)
    const rawScores = {
      R: assessment.scores.realistic,
      I: assessment.scores.investigative,
      A: assessment.scores.artistic,
      S: assessment.scores.social,
      E: assessment.scores.enterprising,
      C: assessment.scores.conventional
    };
    const normalizedScores = {
      R: Math.round(((assessment.scores.realistic || 0) / 25) * 100),
      I: Math.round(((assessment.scores.investigative || 0) / 25) * 100),
      A: Math.round(((assessment.scores.artistic || 0) / 25) * 100),
      S: Math.round(((assessment.scores.social || 0) / 25) * 100),
      E: Math.round(((assessment.scores.enterprising || 0) / 25) * 100),
      C: Math.round(((assessment.scores.conventional || 0) / 25) * 100)
    };

    let savedAssessment: CareerAssessment;

    if (existingIndex >= 0) {
      savedAssessment = {
        ...this.assessments[existingIndex],
        ...assessment,
        answers: assessment.rawAnswers,
        rawScores,
        normalizedScores,
        resultSummary: `Mã RIASEC: ${assessment.primaryCode} (${assessment.codeMeaning || ''})`,
        topResults: assessment.topInterestCodes || [],
        updatedAt: formattedDate
      } as CareerAssessment;
      this.assessments[existingIndex] = savedAssessment;
    } else {
      savedAssessment = {
        ...assessment,
        id: assessment.id || `onet-${assessment.studentId}-${Date.now()}`,
        assessmentType: assessment.assessmentType || 'mini_30',
        attemptNumber,
        startedAt: assessment.startedAt || new Date().toISOString(),
        completedAt: assessment.completedAt || new Date().toISOString(),
        answers: assessment.rawAnswers,
        rawScores,
        normalizedScores,
        resultSummary: `Mã RIASEC: ${assessment.primaryCode} (${assessment.codeMeaning || ''})`,
        topResults: assessment.topInterestCodes || [],
        createdAt: formattedDate,
        updatedAt: formattedDate
      } as CareerAssessment;
      this.assessments.unshift(savedAssessment);
    }

    // Sync latest result to CareerProfile (preserving MBTI, Work Values, and Saved Items)
    if (savedAssessment.status === 'completed') {
      const currentProf = this.getProfile(savedAssessment.studentId);
      this.profiles[savedAssessment.studentId] = {
        ...currentProf,
        studentId: savedAssessment.studentId,
        hollandScores: savedAssessment.scores,
        primaryCode: `${savedAssessment.primaryCode} (${savedAssessment.codeMeaning})`,
        suggestedMajors: savedAssessment.suggestedMajors,
        targetUniversities: savedAssessment.targetUniversities || currentProf.targetUniversities || [
          'Đại học Quốc gia TP.HCM',
          'Đại học Bách Khoa',
          'Đại học Kinh tế TP.HCM'
        ],
        examGroups: savedAssessment.expectedExamCombinations || currentProf.examGroups || [
          'A00 (Toán, Lý, Hóa)',
          'A01 (Toán, Lý, Anh)',
          'D01 (Toán, Văn, Anh)'
        ],
        latestAssessmentId: savedAssessment.id,
        assessmentsCount: previousAttempts.length + (existingIndex >= 0 ? 0 : 1),
        hollandHistory: this.getHollandHistory(savedAssessment.studentId)
      };
      this.saveProfilesToStorage();
      this.syncToServer(savedAssessment.studentId);
    }

    this.saveAssessmentsToStorage();
    return savedAssessment;
  }

  public addParentFeedback(assessmentId: string, feedback: Omit<ParentCareerFeedback, 'id' | 'createdAt'>): boolean {
    const assessment = this.assessments.find(a => a.id === assessmentId);
    if (!assessment) return false;

    if (!assessment.parentFeedbacks) {
      assessment.parentFeedbacks = [];
    }

    const newFeedback: ParentCareerFeedback = {
      ...feedback,
      id: `pf-${Date.now()}`,
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN')
    };

    assessment.parentFeedbacks.push(newFeedback);
    this.saveAssessmentsToStorage();
    return true;
  }

  public async generateAICareerAnalysis(assessmentId: string): Promise<AICareerAnalysis> {
    const assessment = this.assessments.find(a => a.id === assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy bài khảo sát hướng nghiệp.');
    }

    const topCodes = assessment.topInterestCodes || ['S', 'E', 'C'];
    const codeDesc = topCodes.map(c => RIASEC_INFO[c as RIASECCategory]?.name || c).join(', ');

    const prompt = `Bạn là Chuyên gia Tư vấn Hướng nghiệp THPT theo chuẩn quốc tế O*NET và Bộ Giáo dục & Đào tạo Việt Nam.
Hãy phân tích kết quả trắc nghiệm O*NET Mini Interest Profiler của học sinh:
- Tên học sinh: ${assessment.studentName}
- Mã Holland / RIASEC nổi trội: ${assessment.primaryCode} (${codeDesc})
- Điểm chi tiết: R: ${assessment.riasec.R}/25, I: ${assessment.riasec.I}/25, A: ${assessment.riasec.A}/25, S: ${assessment.riasec.S}/25, E: ${assessment.riasec.E}/25, C: ${assessment.riasec.C}/25.
- Ngành học quan tâm: ${assessment.suggestedMajors.join(', ')}
- Tổ hợp môn dự kiến: ${(assessment.expectedExamCombinations || []).join(', ')}

Hãy trả về phản hồi theo định dạng sau (phù hợp học sinh THPT chọn ngành và ôn thi tốt nghiệp):
1. Tóm tắt thế mạnh tính cách và phong cách làm việc
2. 3-4 Môi trường làm việc lý tưởng
3. 3-4 Nhóm ngành nghề triển vọng phù hợp tại Việt Nam
4. Các môn học ở trường cần tập trung bồi dưỡng
5. 3 câu hỏi tự phản tư cho học sinh
6. Lộ trình hành động 1-3 tháng tới`;

    let aiText = '';
    try {
      const aiConfig = aiService.getWorkspaceConfig();
      const provider = getAIProviderInstance(aiConfig.provider || 'gemini');
      aiText = await provider.generateText(prompt, 'Bạn là Chuyên gia Tư vấn Hướng nghiệp THPT tận tâm.', aiConfig);
    } catch {
      aiText = `### Phân tích Hướng nghiệp Toàn diện O*NET RIASEC: ${assessment.primaryCode}
**Thế mạnh nổi trội:** Học sinh có sự kết hợp đặc biệt giữa nhóm ${codeDesc}. Tư duy năng động, có khả năng tương tác tốt và tinh thần trách nhiệm cao.
**Môi trường làm việc phù hợp:** Môi trường doanh nghiệp hiện đại, tổ chức giáo dục - đào tạo, viện nghiên cứu ứng dụng hoặc các cơ quan truyền thông/dịch vụ chuyên nghiệp.
**Môn học cần tập trung:** Các môn trong tổ hợp xét tuyển ${assessment.expectedExamCombinations?.[0] || 'D01 (Toán, Văn, Anh)'}, đồng thời rèn luyện thêm kỹ năng tiếng Anh giao tiếp và tin học ứng dụng.
**Lộ trình 1-3 tháng tới:**
1. Tra cứu kỹ đề án tuyển sinh các trường ĐH có nhóm ngành ${assessment.suggestedMajors[0] || 'mục tiêu'}.
2. Tham gia các buổi trải nghiệm hướng nghiệp (HĐTN, HN) hoặc Open Day của các trường Đại học.
3. Lập kế hoạch học tập chi tiết từng tuần để nâng cao điểm trung bình các môn thế mạnh.`;
    }

    const aiAnalysis: AICareerAnalysis = {
      strengthsSummary: `Học sinh thể hiện đặc trưng vượt trội ở nhóm ${codeDesc}, có xu hướng hòa hợp giữa khả năng làm việc với con người và tư duy tổ chức logic.`,
      recommendedWorkEnvironments: [
        'Môi trường năng động, có sự kết nối và tương tác giữa các đội nhóm',
        'Cơ quan nghiên cứu, phân tích dữ liệu hoặc phát triển giải pháp sáng tạo',
        'Tổ chức dịch vụ giáo dục, truyền thông, chăm sóc sức khỏe hoặc kinh doanh'
      ],
      recommendedCareerClusters: assessment.suggestedMajors,
      focusSchoolSubjects: assessment.expectedExamCombinations || ['Toán học', 'Ngữ văn', 'Tiếng Anh'],
      selfExplorationQuestions: [
        'Môi trường làm việc nào khiến em cảm thấy hào hứng và tràn đầy năng lượng nhất?',
        'Em mong muốn dùng thế mạnh nổi trội của mình để giải quyết vấn đề gì cho xã hội trong tương lai?',
        'Tổ hợp môn hiện tại của em đã thật sự tối ưu cho các ngành nghề mục tiêu chưa?'
      ],
      roadmap1to3Months: [
        'Tháng 1: Tìm hiểu sâu chương trình đào tạo của 3 trường Đại học mục tiêu.',
        'Tháng 2: Lập thời gian biểu ôn luyện các môn thi tốt nghiệp theo tổ hợp đã chọn.',
        'Tháng 3: Tham vấn thêm ý kiến từ GVCN, giáo viên bộ môn và gia đình để chốt định hướng.'
      ],
      fullAiText: aiText,
      analyzedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
      disclaimer: 'Nội dung do AI đề xuất dựa trên mô hình O*NET Interest Profiler. GVCN và học sinh cần kết hợp năng lực thực tế để đưa ra quyết định phù hợp.'
    };

    assessment.aiAnalysis = aiAnalysis;
    this.saveAssessmentsToStorage();
    return aiAnalysis;
  }

  // =========================================================================
  // LEGACY PROFILE METHODS (Backward Compatible)
  // =========================================================================

  public getProfile(studentId: string): CareerProfile {
    const defaultProfile: CareerProfile = {
      studentId,
      hollandScores: {
        realistic: 10,
        investigative: 15,
        artistic: 12,
        social: 20,
        enterprising: 18,
        conventional: 14
      },
      primaryCode: 'SEC (Xã hội - Quản lý - Nghiệp vụ)',
      suggestedMajors: ['Công nghệ Thông tin', 'Quản trị Kinh doanh', 'Sư phạm Khoa học Tự nhiên'],
      targetUniversities: ['ĐH Quốc gia TP.HCM', 'ĐH Sư phạm TP.HCM', 'ĐH Bách Khoa'],
      examGroups: ['A00 (Toán, Lý, Hóa)', 'A01 (Toán, Lý, Tiếng Anh)'],
      savedItems: []
    };

    if (this.profiles[studentId]) {
      const p = this.profiles[studentId];
      return {
        ...defaultProfile,
        ...p,
        hollandScores: p.hollandScores || defaultProfile.hollandScores,
        suggestedMajors: Array.isArray(p.suggestedMajors) ? p.suggestedMajors : defaultProfile.suggestedMajors,
        targetUniversities: Array.isArray(p.targetUniversities) ? p.targetUniversities : defaultProfile.targetUniversities,
        examGroups: Array.isArray(p.examGroups) ? p.examGroups : defaultProfile.examGroups,
        savedItems: Array.isArray(p.savedItems) ? p.savedItems : []
      };
    }
    return defaultProfile;
  }

  public getHollandHistory(studentId: string): CareerAssessment[] {
    return this.assessments
      .filter(a => a && a.studentId === studentId && a.status === 'completed')
      .map(a => this.sanitizeAssessment(a))
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }

  public getHollandAttemptById(id: string): CareerAssessment | undefined {
    return this.assessments.find(a => a.id === id);
  }

  public saveProfile(profile: CareerProfile) {
    this.profiles[profile.studentId] = profile;
    this.saveProfilesToStorage();
    this.syncToServer(profile.studentId);
  }

  // =========================================================================
  // MBTI ASSESSMENT MANAGEMENT (PERSISTENT & VERSIONED MULTI-ATTEMPT)
  // =========================================================================

  public saveMBTIResult(studentId: string, result: MBTIResult): MBTIResult {
    const prof = this.getProfile(studentId);
    const history = prof.mbtiHistory ? [...prof.mbtiHistory] : (prof.mbtiResult ? [{ ...prof.mbtiResult }] : []);
    
    // Check duplicate within 3 seconds to avoid accidental double clicks
    const lastAttempt = history[0];
    const isRapidDuplicate = lastAttempt && 
      lastAttempt.code === result.code && 
      (new Date(result.testedAt || '').getTime() - new Date(lastAttempt.testedAt || '').getTime() < 3000);

    const maxAttempt = history.reduce((max, h) => Math.max(max, h.attemptNumber || 0), 0);
    const attemptNumber = isRapidDuplicate && lastAttempt?.attemptNumber
      ? lastAttempt.attemptNumber
      : maxAttempt + 1;

    const formattedDate = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
    const versionedResult: MBTIResult = {
      ...result,
      id: result.id || `mbti-${studentId}-${Date.now()}`,
      studentId,
      assessmentType: result.assessmentType || 'mbti_20',
      attemptNumber,
      version: result.version || 'Khảo sát xu hướng MBTI v1.0',
      startedAt: result.startedAt || result.testedAt || new Date().toISOString(),
      completedAt: result.completedAt || result.testedAt || new Date().toISOString(),
      answers: result.rawAnswers || result.answers || {},
      rawAnswers: result.rawAnswers || result.answers || {},
      rawScores: result.dimensionScores,
      normalizedScores: {
        EI: result.percentages?.EI?.percent || 50,
        SN: result.percentages?.SN?.percent || 50,
        TF: result.percentages?.TF?.percent || 50,
        JP: result.percentages?.JP?.percent || 50
      },
      resultSummary: `Mã MBTI: ${result.code} – ${result.title}`,
      topResults: [result.code, result.title],
      createdAt: result.createdAt || formattedDate,
      testedAt: result.testedAt || formattedDate
    };

    if (!isRapidDuplicate) {
      history.unshift(versionedResult);
    } else if (history.length > 0) {
      history[0] = versionedResult;
    }

    prof.mbtiResult = versionedResult;
    prof.mbtiHistory = history;
    this.saveProfile(prof);
    return versionedResult;
  }

  public getMBTIResult(studentId: string): MBTIResult | null {
    const prof = this.getProfile(studentId);
    if (!prof.mbtiResult) return null;
    return {
      ...prof.mbtiResult,
      strengths: prof.mbtiResult.strengths || [],
      learningWorkEnvironments: prof.mbtiResult.learningWorkEnvironments || [],
      recommendedCareers: prof.mbtiResult.recommendedCareers || [],
      recommendedMajors: prof.mbtiResult.recommendedMajors || [],
      notesForGrowth: prof.mbtiResult.notesForGrowth || []
    };
  }

  public getMBTIHistory(studentId: string): MBTIResult[] {
    const prof = this.getProfile(studentId);
    if (prof.mbtiHistory && prof.mbtiHistory.length > 0) {
      return prof.mbtiHistory;
    }
    return prof.mbtiResult ? [prof.mbtiResult] : [];
  }

  public getMBTIAttemptById(studentId: string, attemptId: string): MBTIResult | undefined {
    const history = this.getMBTIHistory(studentId);
    return history.find(item => item.id === attemptId);
  }

  // =========================================================================
  // WORK VALUES ASSESSMENT MANAGEMENT (PERSISTENT & VERSIONED MULTI-ATTEMPT)
  // =========================================================================

  public saveWorkValuesResult(studentId: string, result: WorkValuesResult): WorkValuesResult {
    const prof = this.getProfile(studentId);
    const history = prof.workValuesHistory ? [...prof.workValuesHistory] : (prof.workValuesResult ? [{ ...prof.workValuesResult }] : []);
    
    // Check duplicate within 3 seconds
    const lastAttempt = history[0];
    const isRapidDuplicate = lastAttempt && 
      (new Date(result.testedAt || '').getTime() - new Date(lastAttempt.testedAt || '').getTime() < 3000);

    const maxAttempt = history.reduce((max, h) => Math.max(max, h.attemptNumber || 0), 0);
    const attemptNumber = isRapidDuplicate && lastAttempt?.attemptNumber
      ? lastAttempt.attemptNumber
      : maxAttempt + 1;

    const formattedDate = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
    const versionedResult: WorkValuesResult = {
      ...result,
      id: result.id || `wv-${studentId}-${Date.now()}`,
      studentId,
      assessmentType: result.assessmentType || 'work_values_18',
      attemptNumber,
      version: result.version || 'Khảo sát Giá trị Nghề nghiệp v2.0 (6 Nhóm)',
      startedAt: result.startedAt || result.testedAt || new Date().toISOString(),
      completedAt: result.completedAt || result.testedAt || new Date().toISOString(),
      answers: result.rawAnswers || result.answers || {},
      rawAnswers: result.rawAnswers || result.answers || {},
      scores: result.scores,
      rawScores: result.scores,
      normalizedScores: Object.fromEntries(
        Object.entries(result.scores || {}).map(([k, v]) => [k, Math.round(((Number(v) || 0) / 15) * 100)])
      ),
      resultSummary: `Giá trị hàng đầu: ${result.topValues?.[0]?.name || 'Ổn định & An toàn'}`,
      topResults: result.topValues?.slice(0, 3).map(v => v.name) || [],
      createdAt: result.createdAt || formattedDate,
      testedAt: result.testedAt || formattedDate
    };

    if (!isRapidDuplicate) {
      history.unshift(versionedResult);
    } else if (history.length > 0) {
      history[0] = versionedResult;
    }

    prof.workValuesResult = versionedResult;
    prof.workValuesHistory = history;
    this.saveProfile(prof);
    return versionedResult;
  }

  public getWorkValuesResult(studentId: string): WorkValuesResult | null {
    const prof = this.getProfile(studentId);
    if (!prof.workValuesResult) return null;
    return {
      ...prof.workValuesResult,
      topValues: prof.workValuesResult.topValues || [],
      topInterests: prof.workValuesResult.topInterests || [],
      recommendedWorkStyles: prof.workValuesResult.recommendedWorkStyles || [],
      recommendedCareers: prof.workValuesResult.recommendedCareers || [],
      recommendedMajors: prof.workValuesResult.recommendedMajors || []
    };
  }

  public getWorkValuesHistory(studentId: string): WorkValuesResult[] {
    const prof = this.getProfile(studentId);
    if (prof.workValuesHistory && prof.workValuesHistory.length > 0) {
      return prof.workValuesHistory;
    }
    return prof.workValuesResult ? [prof.workValuesResult] : [];
  }

  public getWorkValuesAttemptById(studentId: string, attemptId: string): WorkValuesResult | undefined {
    const history = this.getWorkValuesHistory(studentId);
    return history.find(item => item.id === attemptId);
  }

  // =========================================================================
  // SAVED ITEMS MANAGEMENT (CAREER CHOICES: OCCUPATION, MAJOR, INSTITUTION)
  // =========================================================================

  public getSavedItems(studentId: string): CareerSavedItem[] {
    const prof = this.getProfile(studentId);
    return prof.savedItems || [];
  }

  public saveItem(
    studentId: string,
    item: Omit<CareerSavedItem, 'id' | 'savedAt' | 'studentId'>
  ): CareerSavedItem {
    const prof = this.getProfile(studentId);
    const saved = prof.savedItems ? [...prof.savedItems] : [];
    
    // Check if already saved
    const existingIndex = saved.findIndex(
      s => s.itemType === item.itemType && s.itemId === item.itemId
    );

    const savedAt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');

    let newItem: CareerSavedItem;
    if (existingIndex >= 0) {
      newItem = {
        ...saved[existingIndex],
        ...item,
        status: item.status || saved[existingIndex].status,
        savedAt
      };
      saved[existingIndex] = newItem;
    } else {
      newItem = {
        ...item,
        id: `save-${studentId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId,
        savedAt
      };
      saved.unshift(newItem);
    }

    prof.savedItems = saved;
    this.saveProfile(prof);
    return newItem;
  }

  public removeSavedItem(studentId: string, savedId: string): boolean {
    const prof = this.getProfile(studentId);
    if (!prof.savedItems) return false;
    const initialLen = prof.savedItems.length;
    prof.savedItems = prof.savedItems.filter(s => s.id !== savedId && s.itemId !== savedId);
    if (prof.savedItems.length !== initialLen) {
      this.saveProfile(prof);
      return true;
    }
    return false;
  }

  public updateSavedItemStatus(
    studentId: string,
    savedId: string,
    status: SavedItemStatus,
    notes?: string
  ): boolean {
    const prof = this.getProfile(studentId);
    if (!prof.savedItems) return false;
    const item = prof.savedItems.find(s => s.id === savedId || s.itemId === savedId);
    if (item) {
      item.status = status;
      if (notes !== undefined) item.notes = notes;
      this.saveProfile(prof);
      return true;
    }
    return false;
  }

  public isItemSaved(studentId: string, itemType: SavedItemType, itemId: string): boolean {
    const list = this.getSavedItems(studentId);
    return list.some(i => i.itemType === itemType && i.itemId === itemId);
  }

  // =========================================================================
  // OCCUPATIONS, INSTITUTIONS & ADMISSION UPDATES DATABASE
  // =========================================================================

  public getOccupations(): CareerOccupation[] {
    return OCCUPATIONS_DATABASE;
  }

  public getOccupationById(id: string): CareerOccupation | undefined {
    return OCCUPATIONS_DATABASE.find(o => o.id === id);
  }

  public getInstitutions(): CareerInstitution[] {
    return INSTITUTIONS_DATABASE;
  }

  public getInstitutionById(id: string): CareerInstitution | undefined {
    return INSTITUTIONS_DATABASE.find(i => i.id === id);
  }

  public getAdmissionUpdates(): CareerAdmissionUpdate[] {
    try {
      const storageKey = tenantService.getTenantStorageKey('career_admission_updates', this.activeTenantId);
      const customUpdatesStr = localStorage.getItem(storageKey);
      if (customUpdatesStr) {
        const customUpdates = JSON.parse(customUpdatesStr);
        if (Array.isArray(customUpdates)) {
          return [...customUpdates, ...ADMISSION_UPDATES_DATABASE];
        }
      }
    } catch {
      // ignore
    }
    return ADMISSION_UPDATES_DATABASE;
  }

  public addAdmissionUpdate(update: Omit<CareerAdmissionUpdate, 'id' | 'checkedAt'>): CareerAdmissionUpdate {
    const formattedDate = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN');
    const newUpdate: CareerAdmissionUpdate = {
      ...update,
      id: `ad-${Date.now()}`,
      checkedAt: new Date().toISOString().slice(0, 10),
      publishedDate: update.publishedDate || new Date().toISOString().slice(0, 10)
    };

    try {
      const storageKey = tenantService.getTenantStorageKey('career_admission_updates', this.activeTenantId);
      const existing = localStorage.getItem(storageKey);
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(newUpdate);
      localStorage.setItem(storageKey, JSON.stringify(list));
      this.notify();
    } catch {
      // ignore
    }

    return newUpdate;
  }

  /**
   * Safe selective patch of CareerProfile from survey response.
   * Only merges non-empty fields and sets selfReportedHollandCode (does NOT create fake ONET test).
   */
  public patchProfileFromSurvey(
    studentId: string,
    data: {
      postHighSchoolPlan?: string;
      careerClarity?: string;
      interestFields?: string[];
      targetCareerAndSchool?: string;
      careerConcerns?: string[];
      selfReportedHollandCode?: string;
      sourceSurveyId?: string;
    }
  ): CareerProfile {
    const current = this.getProfile(studentId);
    const updated: CareerProfile = {
      ...current,
      postHighSchoolPlan: data.postHighSchoolPlan || current.postHighSchoolPlan,
      careerClarity: data.careerClarity || current.careerClarity,
      interestFields: (data.interestFields && data.interestFields.length > 0) ? data.interestFields : current.interestFields,
      targetCareerAndSchool: data.targetCareerAndSchool || current.targetCareerAndSchool,
      careerConcerns: (data.careerConcerns && data.careerConcerns.length > 0) ? data.careerConcerns : current.careerConcerns,
      selfReportedHollandCode: data.selfReportedHollandCode || current.selfReportedHollandCode,
      sourceSurveyId: data.sourceSurveyId || current.sourceSurveyId,
    };
    this.saveProfile(updated);
    return updated;
  }

  public calculateHollandScores(answers: Record<number, number>): HollandScore {
    const scores: HollandScore = {
      realistic: 0,
      investigative: 0,
      artistic: 0,
      social: 0,
      enterprising: 0,
      conventional: 0
    };

    hollandQuestions.forEach(q => {
      const val = answers[q.id] || 0;
      switch (q.type) {
        case 'R': scores.realistic += val * 5; break;
        case 'I': scores.investigative += val * 5; break;
        case 'A': scores.artistic += val * 5; break;
        case 'S': scores.social += val * 5; break;
        case 'E': scores.enterprising += val * 5; break;
        case 'C': scores.conventional += val * 5; break;
      }
    });

    return scores;
  }

  public deriveHollandCode(score: HollandScore): { code: string; label: string; majors: string[] } {
    const map = [
      { key: 'R', name: 'Kỹ thuật - Thực tế (Realistic)', score: score.realistic },
      { key: 'I', name: 'Nghiên cứu - Khám phá (Investigative)', score: score.investigative },
      { key: 'A', name: 'Nghệ thuật - Sáng tạo (Artistic)', score: score.artistic },
      { key: 'S', name: 'Xã hội - Giao tiếp (Social)', score: score.social },
      { key: 'E', name: 'Quản lý - Lãnh đạo (Enterprising)', score: score.enterprising },
      { key: 'C', name: 'Quy củ - Nghiệp vụ (Conventional)', score: score.conventional }
    ].sort((a, b) => b.score - a.score);

    const top3 = map.slice(0, 3);
    const code = top3.map(t => t.key).join('');
    const label = top3.map(t => t.name.split(' (')[0]).join(' - ');

    let majors = [
      'Khoa học Máy tính & Trí tuệ Nhân tạo (AI)',
      'Công nghệ Dữ liệu & Hệ thống Thông tin',
      'Quản trị Kinh doanh & Khởi nghiệp',
      'Kỹ thuật Điện tử - Viễn thông'
    ];

    if (code.includes('I') && code.includes('R')) {
      majors = ['Kỹ thuật Phần mềm', 'Khoa học Máy tính', 'Vi mạch Bán dẫn', 'Tự động hóa & Robot'];
    } else if (code.includes('E') && code.includes('S')) {
      majors = ['Quản trị Doanh nghiệp', 'Marketing Số & Truyền thông', 'Quản lý Nguồn nhân lực', 'Luật Kinh tế'];
    } else if (code.includes('A')) {
      majors = ['Thiết kế Đồ họa & Game', 'Kiến trúc & Thiết kế Nội thất', 'Truyền thông Đa phương tiện'];
    }

    return { code, label, majors };
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const careerService = new CareerService();
