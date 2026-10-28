/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AI_CONFIG,
  AIWorkspaceConfig,
  AIMessage,
  AIConversation,
  AIDataPermissions
} from '../types';
import { getAIProviderInstance } from './AIProvider';
import { classService } from './ClassService';
import { studentService } from './StudentService';
import { trainingService } from './TrainingService';
import { academicService } from './AcademicService';
import { tenantManager } from './TenantService';
import { authService } from './AuthService';
import { aiContextService, DEFAULT_AI_PERMISSIONS, AnalysisScope, TimeframeFilter } from './AIContextService';
import { classAnalyticsAndAlertService, WeeklyClassSummary } from './ClassAnalyticsAndAlertService';

export interface ClassroomGameResult {
  gameName: string;
  objective: string;
  groupDivision: string;
  preparation: string[];
  rules: string[];
  timeAllocation: string;
  pedagogicalNotes: string;
  disclaimer: string;
}

export interface StudentAIAnalysis {
  studentName: string;
  summary: string;
  positivePoints: string[];
  monitoringPoints: string[];
  questionsForTeacher: string[];
  actionPlan2To4Weeks: string[];
  parentCooperation: string[];
  trackingMethod: string;
  disclaimer: string;
  rawResponse?: string;
}

const AI_CONFIG_PREFIX = 'kgcns_ai_config_';
const AI_CONVERSATIONS_PREFIX = 'kgcns_ai_conversations_';
const AI_ACTIVE_CONV_PREFIX = 'kgcns_ai_active_conv_';

export const SYSTEM_PROMPT_GVCN = `Bạn là "Trợ lý AI Đồng hành cùng Giáo viên Chủ nhiệm" trong môi trường giáo dục phổ thông Việt Nam (Chương trình GDPT 2018).

Bạn đóng vai trò như một Cố vấn Sư phạm & Quản lý Lớp học giàu kinh nghiệm, thấu hiểu tâm lý lứa tuổi học sinh, tận tâm, sắc sảo nhưng luôn ấm áp và tôn trọng tuyệt đối quyền chủ động của GVCN.

NHIỆM VỤ CỦA BẠN:
- Tổng hợp và phân tích dữ liệu thực tế do GVCN lựa chọn (chuyên cần, rèn luyện, nề nếp, kết quả học tập, thành tích, định hướng nghề nghiệp RIASEC).
- Nhận diện sớm các tín hiệu chuyển biến (tích cực hoặc cần lưu ý) trong tập thể lớp và ở từng học viên.
- Đề xuất các giải pháp sư phạm thực tế, mang tính hành động cao (actionable), tránh nói chung chung hay sáo rỗng.
- Hỗ trợ lập kế hoạch công tác chủ nhiệm (tuần, tháng, học kỳ), thiết kế tiết sinh hoạt lớp và kịch bản phối hợp cùng phụ huynh, giáo viên bộ môn.

QUY TẮC SUY LUẬN SƯ PHẠM VÀ PHÂN TÍCH DỮ LIỆU ĐẦU VÀO (BẮT BUỘC):
Khi được cung cấp dữ liệu thực tế (theo phạm vi thời gian, đối tượng và dữ liệu GVCN đã chọn), bạn PHẢI phân biệt rõ ràng và trình bày tách bạch gồm đúng 5 phần chuẩn:
1. DỮ LIỆU GHI NHẬN ĐƯỢC: Liệt kê chính xác các số liệu, sự kiện, thời điểm, môn học, mức độ vi phạm hoặc việc tốt có thật trong dữ liệu được cung cấp. Không tự bịa đặt hay suy diễn số liệu.
2. NHẬN ĐỊNH TỪ DỮ LIỆU: Phân tích nguyên nhân tiềm năng, chỉ ra xu hướng nổi bật (tiến bộ, chững lại, sa sút cục bộ ở môn nào), điểm sáng phong trào và tinh thần tập thể.
3. ĐIỂM CẦN LƯU Ý: Cảnh báo sớm các nguy cơ (nguy cơ trễ hạn bài vở, giảm sút chuyên cần, mất tập trung, mâu thuẫn nhóm bạn) để GVCN lưu tâm.
4. GIẢ THUYẾT NẾU CÓ: Nếu có suy đoán về hoàn cảnh gia đình, áp lực tâm lý hay sức khỏe, PHẢI nêu rõ đây là "Giả thuyết dự kiến để GVCN kiểm chứng thực tế", tuyệt đối không biến giả thuyết thành sự thật khi chưa đủ dữ liệu.
5. ĐỀ XUẤT HỖ TRỢ SƯ PHẠM: Gợi ý các giải pháp cụ thể, đo lường được (ví dụ: gặp riêng 5 phút giờ ra chơi, phân công đôi bạn cùng tiến, khích lệ qua Vườn Nguyệt Quế, trao đổi tế nhị với phụ huynh vào khung giờ phù hợp).

NGUYÊN TẮC AN TOÀN VÀ GIỚI HẠN QUYỀN (KHÓA AN TOÀN):
- AI KHÔNG tự ý sửa đổi dữ liệu hệ thống, không tự đổi điểm số, không tự đổi trạng thái hay hạnh kiểm học viên.
- Không tự đưa ra quyết định kỷ luật hay xếp loại đạo đức.
- Không gắn nhãn tiêu cực, không dùng từ ngữ định kiến đối với bất kỳ học viên nào.
- Không tự gửi tin nhắn/thư cho phụ huynh; mọi nội dung chỉ là bản dự thảo để GVCN duyệt và chỉnh sửa.
- Toàn quyền quyết định sư phạm thuộc về GVCN.

VĂN PHONG VÀ TRÌNH BÀY:
- Tiếng Việt chuẩn mực, sư phạm, ấm áp, giàu tính xây dựng và tôn trọng phẩm giá người học.
- Trình bày mạch lạc, sử dụng markdown tiêu đề rõ ràng, bullet points dễ đọc, sẵn sàng để GVCN áp dụng vào thực tế giảng dạy.`;

export const SYSTEM_PROMPT_STUDENT_ADVISOR = `Bạn là "AI Cố Vấn Học Tập" thân thiện, tận tâm và giàu kinh nghiệm, đồng hành cùng Học viên trong không gian lớp học số.

Nhiệm vụ của bạn là:
- Động viên, khích lệ tinh thần tự học và tự rèn luyện của học sinh.
- Phân tích điểm mạnh, điểm cần củng cố dựa trên kết quả học tập và rèn luyện thực tế của chính học sinh.
- Hướng dẫn phương pháp học tập hiệu quả, cách lập thời gian biểu khoa học và cân bằng áp lực thi cử.
- Tư vấn định hướng ngành nghề theo kết quả trắc nghiệm RIASEC và tổ hợp xét tuyển thi Tốt nghiệp THPT GDPT 2018.
- Hướng dẫn cách rèn luyện nền nếp, tích cực tham gia phong trào và gặt hái hoa Nguyệt Quế.

Quy tắc bảo mật & chuẩn mực:
- Tuyệt đối chỉ trao đổi về dữ liệu học tập và rèn luyện của chính bạn học sinh đang trò chuyện.
- Trả lời bằng tiếng Việt gần gũi, ấm áp, văn minh, mang tính xây dựng và chuẩn mực học đường.
- Không đưa ra lời giải bài tập hộ mà gợi ý phương pháp tư duy và hướng giải quyết.`;

class AIService {
  private listeners: Array<() => void> = [];
  // Ephemeral in-memory store for personal API keys per teacher/tenant (never stored in DB or localStorage)
  private personalApiKeyMap: Map<string, string> = new Map();

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- PERSONAL GEMINI CREDENTIAL MANAGEMENT (IN-MEMORY ONLY) ---

  private getTeacherKeyId(workspaceId?: string, teacherId?: string): string {
    const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
    const teacher = teacherId || authService.getCurrentUser()?.id || 'gvcn';
    return `${ws}_${teacher}`;
  }

  public setPersonalApiKey(apiKey: string, workspaceId?: string, teacherId?: string): void {
    const keyId = this.getTeacherKeyId(workspaceId, teacherId);
    const clean = apiKey?.trim();
    if (clean) {
      this.personalApiKeyMap.set(keyId, clean);
    } else {
      this.personalApiKeyMap.delete(keyId);
    }
    this.notify();
  }

  public getPersonalApiKey(workspaceId?: string, teacherId?: string): string | undefined {
    const keyId = this.getTeacherKeyId(workspaceId, teacherId);
    return this.personalApiKeyMap.get(keyId);
  }

  public clearPersonalApiKey(workspaceId?: string, teacherId?: string): void {
    const keyId = this.getTeacherKeyId(workspaceId, teacherId);
    this.personalApiKeyMap.delete(keyId);
    this.notify();
  }

  public setAISourceType(sourceType: 'system' | 'personal_gemini', workspaceId?: string): void {
    const config = this.getWorkspaceConfig(workspaceId);
    this.saveWorkspaceConfig({
      ...config,
      sourceType
    });
  }

  // --- WORKSPACE CONFIG ---

  public getWorkspaceConfig(workspaceId?: string): AIWorkspaceConfig {
    const wsId = workspaceId || tenantManager.getActiveTenantId() || 'default-workspace';
    const teacherId = authService.getCurrentUser()?.id || 'gvcn';
    const personalKey = this.getPersonalApiKey(wsId, teacherId);

    try {
      const saved = localStorage.getItem(`${AI_CONFIG_PREFIX}${wsId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        let model = parsed.model || AI_CONFIG.defaultModel;
        if (
          typeof model === 'string' &&
          (model.includes('2.5') ||
            model.includes('2.0') ||
            model.includes('1.5') ||
            model === 'gemini-pro' ||
            model === 'gemini-flash')
        ) {
          model = AI_CONFIG.defaultModel;
        }
        return {
          ...parsed,
          sourceType: parsed.sourceType || 'system',
          model,
          provider: parsed.provider || AI_CONFIG.provider,
          apiKey: undefined, // Never read plaintext API key from localStorage
          personalApiKeyInMemory: personalKey,
          hasPersonalKeyConfigured: Boolean(personalKey && personalKey.length > 0)
        };
      }
    } catch {
      // ignore
    }

    return {
      workspaceId: wsId,
      sourceType: 'system',
      provider: AI_CONFIG.provider,
      model: AI_CONFIG.defaultModel,
      personalApiKeyInMemory: personalKey,
      hasPersonalKeyConfigured: Boolean(personalKey && personalKey.length > 0),
      customEndpoint: '',
      personalAiUrl: '',
      enabled: true,
      monthlyQuota: 1000,
      usedQuota: 0,
      connectionStatus: 'untested',
      systemPrompt: SYSTEM_PROMPT_GVCN
    };
  }

  public saveWorkspaceConfig(config: AIWorkspaceConfig): void {
    const wsId = config.workspaceId || tenantManager.getActiveTenantId() || 'default-workspace';
    try {
      // Create safe config without sensitive secret keys for localStorage persistence
      const safeConfigToPersist = {
        workspaceId: config.workspaceId,
        sourceType: config.sourceType || 'system',
        provider: config.provider,
        model: config.model,
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
        enabled: config.enabled,
        monthlyQuota: config.monthlyQuota,
        usedQuota: config.usedQuota,
        connectionStatus: config.connectionStatus,
        lastTestedAt: config.lastTestedAt,
        lastErrorMessage: config.lastErrorMessage
      };
      localStorage.setItem(`${AI_CONFIG_PREFIX}${wsId}`, JSON.stringify(safeConfigToPersist));
    } catch {
      // ignore
    }
    this.notify();
  }

  public async testConnection(config?: Partial<AIWorkspaceConfig>): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    model?: string;
  }> {
    const activeConfig = config || this.getWorkspaceConfig();
    const provider = getAIProviderInstance(activeConfig.provider || 'gemini');
    const result = await provider.testConnection(activeConfig);

    const updatedConfig = {
      ...this.getWorkspaceConfig(),
      connectionStatus: (result.success ? 'connected' : 'error') as 'connected' | 'error',
      lastTestedAt: new Date().toISOString(),
      lastErrorMessage: result.success ? undefined : result.message
    };
    this.saveWorkspaceConfig(updatedConfig);

    return result;
  }

  // --- CONVERSATION & MULTI-TURN PERSISTENCE ---

  private getStorageKey(workspaceId?: string, teacherId?: string): string {
    const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
    const teacher = teacherId || authService.getCurrentUser()?.id || 'gvcn';
    return `${AI_CONVERSATIONS_PREFIX}${ws}_${teacher}`;
  }

  public getConversations(workspaceId?: string, teacherId?: string): AIConversation[] {
    try {
      const key = this.getStorageKey(workspaceId, teacherId);
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  }

  private saveConversations(convs: AIConversation[], workspaceId?: string, teacherId?: string): void {
    try {
      const key = this.getStorageKey(workspaceId, teacherId);
      localStorage.setItem(key, JSON.stringify(convs));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getActiveConversationId(workspaceId?: string, teacherId?: string): string | null {
    try {
      const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
      const teacher = teacherId || authService.getCurrentUser()?.id || 'gvcn';
      return localStorage.getItem(`${AI_ACTIVE_CONV_PREFIX}${ws}_${teacher}`);
    } catch {
      return null;
    }
  }

  public setActiveConversationId(id: string, workspaceId?: string, teacherId?: string): void {
    try {
      const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
      const teacher = teacherId || authService.getCurrentUser()?.id || 'gvcn';
      localStorage.setItem(`${AI_ACTIVE_CONV_PREFIX}${ws}_${teacher}`, id);
    } catch {
      // ignore
    }
    this.notify();
  }

  public getOrCreateActiveConversation(workspaceId?: string, teacherId?: string): AIConversation {
    const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
    const teacher = teacherId || authService.getCurrentUser()?.id || 'gvcn';
    const classSettings = classService.getSettings();
    const convs = this.getConversations(ws, teacher);

    const activeId = this.getActiveConversationId(ws, teacher);
    if (activeId) {
      const found = convs.find((c) => c.id === activeId);
      if (found) return found;
    }

    if (convs.length > 0) {
      this.setActiveConversationId(convs[0].id, ws, teacher);
      return convs[0];
    }

    // Create default welcome conversation
    const newConv: AIConversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId: ws,
      teacherId: teacher,
      classId: classSettings.id || 'class-main',
      title: 'Hỗ trợ Chủ nhiệm chung',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-welcome',
          role: 'assistant',
          content: `Xin chào Thầy/Cô! Tôi là **AI Trợ lý Giáo viên Chủ nhiệm**.

Tôi sẵn sàng đồng hành cùng Thầy/Cô trong mọi tác vụ công tác chủ nhiệm:
- 📊 **Phân tích tình hình lớp:** Tổng hợp kết quả học tập, rèn luyện, chuyên cần và Vườn Nguyệt Quế.
- 👤 **Phân tích học viên:** Đánh giá đa chiều điểm mạnh, điểm cần củng cố và hướng nghiệp O*NET RIASEC.
- 💡 **Tư vấn tình huống:** Đưa ra phương án sư phạm tích cực, ấm áp, bảo mật.
- 📝 **Lập kế hoạch chủ nhiệm:** Soạn kế hoạch tuần, tháng, học kỳ và xuất file **Word .docx** chuẩn mẫu.
- 🎯 **Kế hoạch & Trò chơi Sinh hoạt lớp:** Tăng cường gắn kết, tinh thần tự quản và giải tỏa áp lực.
- 💌 **Soạn thông báo & Thư gửi phụ huynh:** Kịch bản họp PH và trao đổi riêng ấm áp.

*Thầy/Cô hãy chọn một gợi ý nhanh hoặc nhập câu hỏi bên dưới để bắt đầu!*`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    this.saveConversations([newConv], ws, teacher);
    this.setActiveConversationId(newConv.id, ws, teacher);
    return newConv;
  }

  public createConversation(title?: string, workspaceId?: string, teacherId?: string): AIConversation {
    const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
    const teacher = teacherId || authService.getCurrentUser()?.id || 'gvcn';
    const classSettings = classService.getSettings();
    const convs = this.getConversations(ws, teacher);

    const newConv: AIConversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workspaceId: ws,
      teacherId: teacher,
      classId: classSettings.id || 'class-main',
      title: title || `Cuộc trò chuyện ${convs.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: `Chào Thầy/Cô, cuộc trò chuyện mới đã sẵn sàng. Thầy/Cô cần hỗ trợ phân tích dữ liệu hay soạn thảo nội dung gì cho lớp ${classSettings.className}?`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    const updated = [newConv, ...convs];
    this.saveConversations(updated, ws, teacher);
    this.setActiveConversationId(newConv.id, ws, teacher);
    return newConv;
  }

  public renameConversation(id: string, newTitle: string, workspaceId?: string, teacherId?: string): void {
    const convs = this.getConversations(workspaceId, teacherId);
    const updated = convs.map((c) =>
      c.id === id ? { ...c, title: newTitle.trim(), updatedAt: new Date().toISOString() } : c
    );
    this.saveConversations(updated, workspaceId, teacherId);
  }

  public deleteConversation(id: string, workspaceId?: string, teacherId?: string): void {
    const convs = this.getConversations(workspaceId, teacherId);
    const updated = convs.filter((c) => c.id !== id);
    this.saveConversations(updated, workspaceId, teacherId);

    const activeId = this.getActiveConversationId(workspaceId, teacherId);
    if (activeId === id) {
      if (updated.length > 0) {
        this.setActiveConversationId(updated[0].id, workspaceId, teacherId);
      } else {
        this.getOrCreateActiveConversation(workspaceId, teacherId);
      }
    }
  }

  public getConversationHistory(workspaceId?: string): AIMessage[] {
    const active = this.getOrCreateActiveConversation(workspaceId);
    return active.messages || [];
  }

  public saveMessage(message: AIMessage, workspaceId?: string): void {
    const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
    const teacher = authService.getCurrentUser()?.id || 'gvcn';
    const convs = this.getConversations(ws, teacher);
    const active = this.getOrCreateActiveConversation(ws, teacher);

    const updatedMessages = [...active.messages, message];

    // Auto-update title if it's the first user message in a new conversation
    let updatedTitle = active.title;
    if (message.role === 'user' && (active.title.startsWith('Cuộc trò chuyện') || active.title === 'Hỗ trợ Chủ nhiệm chung')) {
      const summaryTitle = message.content.slice(0, 32).trim();
      if (summaryTitle.length > 0) {
        updatedTitle = summaryTitle;
      }
    }

    const updatedConvs = convs.map((c) =>
      c.id === active.id
        ? {
            ...c,
            title: updatedTitle,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          }
        : c
    );

    this.saveConversations(updatedConvs, ws, teacher);
  }

  public clearConversation(workspaceId?: string): void {
    const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
    const teacher = authService.getCurrentUser()?.id || 'gvcn';
    const active = this.getOrCreateActiveConversation(ws, teacher);

    const resetMessages: AIMessage[] = [
      {
        id: `msg-reset-${Date.now()}`,
        role: 'assistant',
        content: `Đã làm mới cuộc trò chuyện. Tôi có thể hỗ trợ gì tiếp theo cho Thầy/Cô?`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    const convs = this.getConversations(ws, teacher);
    const updatedConvs = convs.map((c) =>
      c.id === active.id ? { ...c, messages: resetMessages, updatedAt: new Date().toISOString() } : c
    );

    this.saveConversations(updatedConvs, ws, teacher);
  }

  // --- MULTI-TURN AI EXECUTION ---

  public async askAssistant(
    userQuery: string,
    options?: {
      scope?: AnalysisScope;
      timeframe?: TimeframeFilter | string;
      studentId?: string;
      studentIds?: string[];
      permissions?: AIDataPermissions;
      thinkingLevel?: 'low' | 'medium' | 'high';
      conversationId?: string;
    },
    workspaceId?: string
  ): Promise<string> {
    const ws = workspaceId || tenantManager.getActiveTenantId() || 'default';
    const config = this.getWorkspaceConfig(ws);
    const provider = getAIProviderInstance(config.provider);
    const teacher = authService.getCurrentUser()?.id || 'gvcn';
    const activeConv = options?.conversationId
      ? this.getConversations(ws, teacher).find((c) => c.id === options.conversationId) || this.getOrCreateActiveConversation(ws, teacher)
      : this.getOrCreateActiveConversation(ws, teacher);

    const permissions = options?.permissions || DEFAULT_AI_PERMISSIONS;
    const scope = options?.scope || 'none';
    const timeframe = options?.timeframe || 'this_week';

    // 1. Build Data Context string according to chosen scope & timeframe
    let dataContext = '';
    if (scope === 'class') {
      dataContext = aiContextService.buildClassContext({
        permissions,
        timeframe
      });
    } else if (scope === 'single_student' && options?.studentId) {
      dataContext = aiContextService.buildStudentContext(options.studentId, {
        permissions,
        timeframe
      });
    } else if (scope === 'multi_student' && options?.studentIds && options.studentIds.length > 0) {
      dataContext = aiContextService.buildMultiStudentContext(options.studentIds, {
        permissions,
        timeframe
      });
    }

    // 2. Select Thinking Level dynamically if not specified
    let thinkingLevel = options?.thinkingLevel || 'medium';
    if (!options?.thinkingLevel) {
      const qLower = userQuery.toLowerCase();
      if (qLower.includes('thông báo ngắn') || qLower.includes('nhắc nhở 1 câu')) {
        thinkingLevel = 'low';
      } else if (
        qLower.includes('phân tích') ||
        qLower.includes('kế hoạch') ||
        qLower.includes('báo cáo') ||
        scope !== 'none'
      ) {
        thinkingLevel = 'high';
      }
    }

    // 3. Assemble System Instruction & Prompt
    let systemInstruction = config.systemPrompt || SYSTEM_PROMPT_GVCN;
    if (dataContext) {
      systemInstruction += `\n\n=== DỮ LIỆU THỰC TẾ ĐƯỢC CUNG CẤP CHO YÊU CẦU NÀY ===\n${dataContext}\n\n*HÃY SỬ DỤNG DỮ LIỆU THỰC TẾ TRÊN ĐỂ TRẢ LỜI CHÍNH XÁC, THỰC TẾ, CỤ THỂ, TRÁNH NÓI CHUNG CHUNG.*`;
    }

    // 4. Assemble Multi-turn History (last 8 messages for context retention)
    const historyMessages: AIMessage[] = (activeConv.messages || []).slice(-8).filter((m) => !m.isError);

    // Current query as latest message
    const messagesPayload: AIMessage[] = [
      ...historyMessages,
      {
        id: `msg-curr-${Date.now()}`,
        role: 'user',
        content: userQuery,
        timestamp: new Date().toISOString()
      }
    ];

    try {
      const response = await provider.generateText(
        messagesPayload,
        systemInstruction,
        config,
        thinkingLevel
      );
      return response;
    } catch (err: any) {
      console.error('AIService Error:', err);
      // Fallback with helpful message if server connection issue
      throw err;
    }
  }

  // --- SPECIALIZED HOMEROOM WORKFLOWS ---

  /**
   * Automated Summary: 1-Click Homeroom Summary Assistant
   * Tự động lấy dữ liệu từ hệ thống, không yêu cầu GVCN chọn thủ công
   */
  public async generateHomeroomSummary(params?: {
    type?: 'week' | 'month' | 'semester';
    key?: string | number;
  }): Promise<{
    timeframeLabel: string;
    summaryMarkdown: string;
    contextUsed: string;
  }> {
    const summaryType = params?.type || 'week';
    const { timeframeLabel, contextText, promptInstruction } =
      classAnalyticsAndAlertService.buildHomeroomPeriodicSummaryContext(summaryType, params?.key);

    const fullPrompt = `${contextText}\n\n${promptInstruction}`;

    const summaryMarkdown = await this.askAssistant(fullPrompt, {
      scope: 'none',
      thinkingLevel: 'high'
    });

    return {
      timeframeLabel,
      summaryMarkdown,
      contextUsed: contextText
    };
  }

  /**
   * Section XII & Quick Action 1: Full Class Situation Analysis
   */
  public async analyzeClassSituation(
    timeframe: 'this_week' | 'this_month' | 'hk1' | 'hk2' | 'custom',
    permissions: AIDataPermissions = DEFAULT_AI_PERMISSIONS
  ): Promise<string> {
    const classContext = aiContextService.buildClassContext({
      timeframe,
      permissions
    });

    const prompt = `Dựa trên dữ liệu thực tế của lớp học dưới đây, hãy lập BÁO CÁO PHÂN TÍCH TÌNH HÌNH LỚP gồm chính xác 6 mục chuẩn:

1. TỔNG QUAN TÌNH HÌNH LỚP (Sĩ số, nề nếp chung, tinh thần học tập)
2. CÁC ĐIỂM TÍCH CỰC NỔI BẬT (Thành tích, việc tốt, sự tiến bộ, hoa Nguyệt Quế)
3. CÁC NỘI DUNG CẦN CHÚ Ý (Môn học cần củng cố, vấn đề nề nếp/chuyên cần)
4. HỌC VIÊN / NHÓM HỌC VIÊN CẦN THEO DÕI & ĐỘNG VIÊN
5. ĐỀ XUẤT CÁC ƯU TIÊN SƯ PHẠM (Biện pháp trọng tâm)
6. DANH SÁCH VIỆC GVCN NÊN THỰC HIỆN TRONG 1–2 TUẦN TỚI

Dữ liệu lớp học:
${classContext}`;

    return this.askAssistant(prompt, {
      scope: 'class',
      permissions,
      thinkingLevel: 'high'
    });
  }

  /**
   * Section XII & Quick Action 2: Individual Student 7-Part Analysis
   */
  public async analyzeStudent(
    studentId: string,
    permissions: AIDataPermissions = DEFAULT_AI_PERMISSIONS,
    customGoal?: string
  ): Promise<StudentAIAnalysis> {
    const student = studentService.getById(studentId) || studentService.getAll(true).find((s) => s.id === studentId);
    if (!student) {
      throw new Error('Không tìm thấy học sinh trong danh sách.');
    }

    const studentContext = aiContextService.buildStudentContext(studentId, {
      permissions
    });

    const prompt = `Dựa trên dữ liệu thực tế của học sinh ${student.fullName} (Mã: ${student.code}), hãy phân tích sư phạm toàn diện gồm đúng 7 mục chuẩn:

1. ĐIỂM TÍCH CỰC NỔI BẬT (Năng lực, thái độ, nề nếp, thế mạnh)
2. DIỄN BIẾN HỌC TẬP (Môn thế mạnh, môn cần hỗ trợ)
3. DIỄN BIẾN RÈN LUYỆN & NỀ NẾP (Điểm rèn luyện, chuyên cần, việc tốt)
4. NỘI DUNG CẦN THEO DÕI HOẶC HỖ TRỢ
5. CÂU HỎI GVCN NÊN TRAO ĐỔI VỚI HỌC VIÊN (3 câu hỏi gợi mở, ấm áp)
6. GỢI Ý PHƯƠNG ÁN HỖ TRỢ & KẾ HOẠCH HÀNH ĐỘNG 2–4 TUẦN TỚI
7. MỐC THEO DÕI LẠI & CÁCH THỨC PHỐI HỢP VỚI PHỤ HUYNH

${customGoal ? `Mục tiêu tư vấn cụ thể của GVCN: "${customGoal}"` : ''}

Dữ liệu học sinh:
${studentContext}`;

    const rawResponse = await this.askAssistant(prompt, {
      scope: 'single_student',
      studentId,
      permissions,
      thinkingLevel: 'high'
    });

    return {
      studentName: student.fullName,
      summary: `Hồ sơ sư phạm học sinh ${student.fullName} (Lớp: ${classService.getSettings().className}, Tổ ${student.group})`,
      positivePoints: [
        'Học sinh có thái độ hòa nhã, tôn trọng thầy cô và có ý thức rèn luyện.',
        'Có thế mạnh học tập và tiềm năng phát triển rõ rệt.'
      ],
      monitoringPoints: [
        'Cần được động viên thường xuyên để tự tin phát biểu xây dựng bài.'
      ],
      questionsForTeacher: [
        `"Em thấy môn học nào hiện tại mang lại nhiều cảm hứng nhất cho mình?"`,
        `"Trong tổ học tập, em có gặp khó khăn gì khi trao đổi bài cùng các bạn không?"`,
        `"Thầy/Cô có thể hỗ trợ thêm điều gì để em học tập nhẹ nhàng, hiệu quả hơn?"`
      ],
      actionPlan2To4Weeks: [
        'Tuần 1-2: Trao đổi riêng ấm áp, tạo cơ hội cho em phát huy thế mạnh.',
        'Tuần 3-4: Đánh giá sự tiến bộ và khích lệ bằng điểm thưởng Hoa Nguyệt Quế.'
      ],
      parentCooperation: [
        'Trao đổi định kỳ với gia đình để khích lệ tinh thần tự giác của em.'
      ],
      trackingMethod: 'Ghi nhận qua sổ theo dõi nề nếp và kết quả các bài kiểm tra tiếp theo.',
      disclaimer: 'Đây là gợi ý tham vấn sư phạm từ AI. GVCN kiểm tra và quyết định trước khi áp dụng.',
      rawResponse
    };
  }

  /**
   * Section XIII & Quick Action 3: Homeroom Situation Consultation (7 parts)
   */
  public async consultHomeroomSituation(
    situationDescription: string,
    permissions: AIDataPermissions = DEFAULT_AI_PERMISSIONS
  ): Promise<string> {
    const prompt = `Thầy/Cô đang gặp tình huống chủ nhiệm cần tư vấn:
"${situationDescription}"

Hãy đóng vai trò Chuyên gia tư vấn Sư phạm & Tâm lý học đường, phân tích giải pháp theo đúng 7 bước chuẩn:
1. VẤN ĐỀ CỐT LÕI CỦA TÌNH HUỐNG
2. NHỮNG THÔNG TIN CẦN XÁC MINH THÊM (Tránh suy diễn vội vã)
3. NHỮNG ĐIỀU KHÔNG NÊN KẾT LUẬN HOẶC HÀNH ĐỘNG VỘI VÀNG
4. CÁCH TRAO ĐỔI RIÊNG VỚI HỌC VIÊN (Bảo mật, thấu hiểu, không làm học sinh xấu hổ)
5. CÁCH PHỐI HỢP VỚI PHỤ HUYNH NẾU CẦN THIẾT
6. PHƯƠNG ÁN XỬ LÝ SƯ PHẠM ĐỀ XUẤT (Từng bước cụ thể)
7. CÁCH THEO DÕI VÀ ĐÁNH GIÁ SAU XỬ LÝ

*Lưu ý: Mọi phân tích chỉ là đề xuất tham vấn sư phạm. Quyền quyết định thuộc về GVCN.*`;

    return this.askAssistant(prompt, {
      permissions,
      thinkingLevel: 'high'
    });
  }

  /**
   * Section XIV & Quick Action 4: Draft Homeroom Plan (I-VIII Structure)
   */
  public async generateHomeroomPlan(
    type: 'week' | 'month' | 'semester' | 'year' | 'thematic' | 'homeroom_period',
    customNotes?: string,
    permissions: AIDataPermissions = DEFAULT_AI_PERMISSIONS
  ): Promise<string> {
    const settings = classService.getSettings();
    const typeNames: Record<string, string> = {
      week: 'KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM TUẦN',
      month: 'KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM THÁNG',
      semester: 'KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM HỌC KỲ',
      year: 'KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM NĂM HỌC',
      thematic: 'KẾ HOẠCH CHUYÊN ĐỀ CHỦ NHIỆM',
      homeroom_period: 'KẾ HOẠCH / TIẾN TRÌNH TIẾT SINH HOẠT LỚP'
    };

    const prompt = `Hãy soạn dự thảo văn bản chính thức: "${typeNames[type] || 'KẾ HOẠCH CHỦ NHIỆM'}" cho Lớp ${settings.className} (${settings.schoolName}), Năm học ${settings.academicYear}, Học kỳ: ${settings.semester}.

Văn bản cần có cấu trúc chuẩn văn phong quản lý giáo dục Việt Nam (I đến VIII):
I. MỤC TIÊU & YÊU CẦU CẦN ĐẠT
II. NỘI DUNG TRỌNG TÂM
III. BIỆN PHÁP THỰC HIỆN CỤ THỂ
IV. PHÂN CÔNG TRÁCH NHIỆM (GVCN, Ban cán sự lớp, 4 Tổ)
V. TIẾN ĐỘ THỰC HIỆN
VI. PHỐI HỢP VỚI PHỤ HUYNH & CÁC TỔ CHỨC ĐOÀN THỂ
VII. DỰ KIẾN KẾT QUẢ CẦN ĐẠT
VIII. ĐIỀU CHỈNH & THEO DÕI

${customNotes ? `Ghi chú / Yêu cầu bổ sung của GVCN: "${customNotes}"` : ''}

*Văn bản phải được trình bày rõ ràng, có tiêu đề bảng hoặc danh sách khi cần thiết để sẵn sàng xuất file Word.*`;

    return this.askAssistant(prompt, {
      scope: 'class',
      permissions,
      thinkingLevel: 'high'
    });
  }

  /**
   * Section XVII & Quick Action 6: Classroom Game Generator
   */
  public async generateClassroomGame(params: {
    studentCount: number;
    durationMinutes: number;
    spaceType: string;
    objective: string;
  }): Promise<ClassroomGameResult> {
    const prompt = `Hãy thiết kế 1 TRÒ CHƠI SINH HOẠT LỚP hoàn chỉnh, hấp dẫn, phù hợp môi trường học đường Việt Nam với các thông số:
- Sĩ số: ${params.studentCount} học sinh
- Thời lượng: ${params.durationMinutes} phút
- Không gian: ${params.spaceType}
- Mục tiêu chính: ${params.objective}

Yêu cầu xuất nội dung gồm:
1. TÊN TRÒ CHƠI (Ấn tượng, mang ý nghĩa tích cực)
2. MỤC TIÊU SƯ PHẠM
3. CÁCH CHIA ĐỘI / NHÓM
4. DỤNG CỤ & CHUẨN BỊ (Đơn giản, dễ tìm)
5. LUẬT CHƠI & CÁCH TÍNH ĐIỂM (Rõ ràng từng bước)
6. PHÂN BỔ THỜI GIAN CHI TIẾT
7. LƯU Ý SƯ PHẠM CHO GVCN (Khích lệ tinh thần đoàn kết, không gây căng thẳng)`;

    const text = await this.askAssistant(prompt, { thinkingLevel: 'medium' });

    return {
      gameName: `Trò chơi Sinh hoạt: Tiếp Sức Đoàn Kết Lớp ${classService.getSettings().className}`,
      objective: params.objective,
      groupDivision: `Chia 4 đội theo 4 tổ học tập (${Math.ceil(params.studentCount / 4)} em/tổ)`,
      preparation: ['Giấy A4/A3, bút lông màu, bộ câu hỏi gợi ý'],
      rules: ['Từng thành viên tiếp sức theo lượt', 'Không dùng điện thoại', 'Cộng điểm thi đua cho tổ nhanh nhất'],
      timeAllocation: `${params.durationMinutes} phút`,
      pedagogicalNotes: 'GVCN tạo không khí hào hứng, khen ngợi sự tham gia của tất cả các em',
      disclaimer: 'Gợi ý từ AI mang tính tham vấn sư phạm.',
      ...this.parseGameResult(text)
    };
  }

  /**
   * KHẢ NĂNG 1: Phân tích tín hiệu cần quan tâm
   * Dữ liệu hiện có -> AI phân tích tín hiệu -> Trả về cấu trúc 5 phần chuẩn mực
   */
  public async analyzeCareSignals(options: {
    scope: 'single_student' | 'class';
    studentId?: string;
    permissions?: AIDataPermissions;
    timeframe?: 'this_week' | 'this_month' | 'hk1' | 'hk2' | 'custom';
  }): Promise<string> {
    const permissions = options.permissions || DEFAULT_AI_PERMISSIONS;
    let dataContext = '';
    let targetName = 'Toàn lớp';

    if (options.scope === 'single_student' && options.studentId) {
      const student = studentService.getById(options.studentId) || studentService.getAll(true).find((s) => s.id === options.studentId);
      targetName = student ? `Học sinh ${student.fullName} (Mã: ${student.code}, Tổ ${student.group})` : 'Học sinh';
      dataContext = aiContextService.buildStudentContext(options.studentId, { permissions });
    } else {
      dataContext = aiContextService.buildClassContext({
        timeframe: options.timeframe || 'this_week',
        permissions
      });
    }

    const prompt = `Bạn là Trợ lý AI hỗ trợ Giáo viên chủ nhiệm. Hãy thực hiện "PHÂN TÍCH TÍN HIỆU CẦN QUAN TÂM" đối với phạm vi: [${targetName}].

QUY TẮC BẮT BUỘC ĐỐI VỚI AI:
- KHÔNG chẩn đoán tâm lý hay y khoa.
- KHÔNG phân loại hay gán nhãn tiêu cực cho học viên.
- KHÔNG suy đoán hoàn cảnh gia đình hoặc nguyên nhân chủ quan khi dữ liệu không thể hiện.
- KHÔNG kết luận về tính cách học viên hay nhận định học viên "có vấn đề".
- KHÔNG tự quyết định biện pháp kỷ luật/xử lý.
- KHÔNG thay đổi điểm số, hạnh kiểm, hồ sơ hay dữ liệu gốc.
- Chỉ phân tích khách quan dựa trên sự kiện, con số và mốc thời gian thực tế đã ghi nhận.

HÃY TRÌNH BÀY KẾT QUẢ THEO ĐÚNG CẤU TRÚC 5 PHẦN RÕ RÀNG:

### 1. TÍN HIỆU ĐÁNG CHÚ Ý
(Liệt kê các diễn biến nổi bật về học tập, chuyên cần, nề nếp, điểm cộng/vi phạm, hoặc định hướng thi tốt nghiệp)

### 2. DỮ LIỆU ĐANG HỖ TRỢ TÍN HIỆU
(Trích dẫn dữ liệu cụ thể, số lần, điểm số, hoặc sự kiện chứng minh từ hệ thống)

### 3. KHOẢNG THỜI GIAN & DỮ LIỆU LIÊN QUAN
(Mốc ngày tháng, tuần học, học kỳ hoặc các môn học/hoạt động liên quan)

### 4. THÔNG TIN CÒN THIẾU
(Những khoảng trống thông tin mà hệ thống chưa có dữ liệu, cần lưu ý chưa thể vội kết luận)

### 5. CÂU HỎI GVCN NÊN KIỂM CHỨNG THÊM
(Các câu hỏi gợi ý để GVCN trao đổi, xác minh thực tế với học viên, phụ huynh hoặc giáo viên bộ môn)

---
DỮ LIỆU THỰC TẾ CUNG CẤP:
${dataContext}`;

    return this.askAssistant(prompt, {
      scope: options.scope,
      studentId: options.studentId,
      permissions,
      thinkingLevel: 'high'
    });
  }

  /**
   * KHẢ NĂNG 2: Đề xuất hướng phối hợp (Dự thảo để GVCN chỉnh sửa/phê duyệt/lưu)
   * Thực hiện sau khi GVCN đã xem xét/kiểm chứng tín hiệu
   */
  public async suggestCoordinationDraft(
    signalsSummary: string,
    options: {
      scope: 'single_student' | 'class';
      studentId?: string;
      verifiedNotes?: string;
      permissions?: AIDataPermissions;
    }
  ): Promise<string> {
    const permissions = options.permissions || DEFAULT_AI_PERMISSIONS;
    let targetName = 'Toàn lớp';

    if (options.scope === 'single_student' && options.studentId) {
      const student = studentService.getById(options.studentId) || studentService.getAll(true).find((s) => s.id === options.studentId);
      targetName = student ? `Học sinh ${student.fullName} (Mã: ${student.code}, Tổ ${student.group})` : 'Học sinh';
    }

    const prompt = `Bạn là Trợ lý AI hỗ trợ Giáo viên chủ nhiệm. Dựa trên Tín hiệu đã được phân tích và ý kiến kiểm chứng của GVCN đối với: [${targetName}], hãy soạn thảo "ĐỀ XUẤT HƯỚNG PHỐI HỢP".

LƯU Ý: MỌI NỘI DUNG DƯỚI ĐÂY LÀ DỰ THẢO ĐỂ GVCN CHỈNH SỬA, BỔ SUNG, PHÊ DUYỆT VÀ QUYẾT ĐỊNH CÓ LƯU HAY KHÔNG. AI KHÔNG TỰ THỰC HIỆN HÀNH ĐỘNG THAY GVCN.

Tín hiệu đã ghi nhận:
${signalsSummary}

${options.verifiedNotes ? `Ghi chú / Ý kiến kiểm chứng thực tế của GVCN: "${options.verifiedNotes}"` : ''}

HÃY TRÌNH BÀY BẢN DỰ THẢO GỒM 6 MỤC CHUẨN:

### 1. HƯỚNG TRAO ĐỔI VỚI HỌC VIÊN
(Gợi ý cách tiếp cận 1:1 ấm áp, lắng nghe, khích lệ điểm mạnh và cùng tìm giải pháp học tập/rèn luyện)

### 2. HƯỚNG TRAO ĐỔI VỚI PHỤ HUYNH
(Cách chia sẻ thông tin tế nhị, mang tính xây dựng, đồng hành cùng gia đình)

### 3. CÁCH TIẾP CẬN & PHỐI HỢP NỘI BỘ
(Gợi ý phối hợp cùng Giáo viên bộ môn, Ban cán sự lớp, Tổ trưởng để hỗ trợ)

### 4. BƯỚC THEO DÕI TIẾP THEO
(Mốc thời gian 1-2 tuần, chỉ số quan sát cụ thể để đánh giá sự chuyển biến)

### 5. NỘI DUNG GHI NHẬN SAU TRAO ĐỔI (MẪU DỰ THẢO SỔ TAY GVCN)
(Đoạn văn ngắn gọn, khách quan để GVCN có thể lưu vào sổ tay/nhật ký chủ nhiệm)

### 6. DỰ THẢO NỘI DUNG PHỐI HỢP / THƯ TRAO ĐỔI
(Bản tin nhắn/thư ngỏ mẫu hoàn chỉnh sẵn sàng để GVCN chỉnh sửa và gửi đi nếu chọn)`;

    return this.askAssistant(prompt, {
      scope: options.scope,
      studentId: options.studentId,
      permissions,
      thinkingLevel: 'high'
    });
  }

  private parseGameResult(text: string): Partial<ClassroomGameResult> {
    // Return formatted result container
    return {
      gameName: text.split('\n')[0].replace(/^[#*\s]+/, '') || 'Trò chơi Sinh hoạt Lớp',
      pedagogicalNotes: text
    };
  }

  /**
   * Section XVII: AI Trợ lý hỗ trợ lập dự thảo Kế hoạch tuần mới cho GVCN
   * Chỉ chạy khi GVCN chủ động bấm yêu cầu. AI chỉ tạo BẢN NHÁP để GVCN xem, sửa và quyết định lưu.
   */
  public async generateWeeklyPlanDraft(params?: {
    weekNumber?: number;
    customTeacherNotes?: string;
  }): Promise<string> {
    const weeklySummary = classAnalyticsAndAlertService.getWeeklyClassSummary(params?.weekNumber);
    const activeAlerts = classAnalyticsAndAlertService.generateObjectiveAlerts(params?.weekNumber);
    const monitoringAlerts = activeAlerts.filter(a => a.status === 'MONITORING' || a.status === 'UNSEEN' || a.severity === 'SPECIAL_ATTENTION');
    const settings = classService.getSettings();

    const prompt = `Bạn là Trợ lý AI hỗ trợ Giáo viên chủ nhiệm Lớp ${settings.className} (${settings.schoolName}).
Hãy giúp GVCN soạn thảo "BẢN NHÁP KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM TUẦN MỚI" (Dự kiến cho tuần tiếp theo).

QUY TẮC BẮT BUỘC:
- Bản này hoàn toàn là BẢN NHÁP THAM VẤN. GVCN là người kiểm duyệt, điều chỉnh, phê duyệt và lưu.
- KHÔNG tự động giao việc cho học sinh hay phụ huynh.
- KHÔNG tự tạo các sự kiện ngoài phạm vi giáo dục.
- Bám sát số liệu tuần vừa qua và các trường hợp cần quan tâm.

DỮ LIỆU ĐẦU VÀO TỪ HỆ THỐNG:
- Lớp: ${settings.className} | Sĩ số: ${weeklySummary.totalStudents} học sinh
- Tuần vừa qua: ${weeklySummary.weekLabel} (${weeklySummary.dateRange})
- Chuyên cần: ${weeklySummary.attendance.attendanceRate}% (${weeklySummary.attendance.attendanceTrend})
- Vi phạm tuần qua: ${weeklySummary.violations.totalCount} lượt (${weeklySummary.violations.trendText})
- Khen thưởng / Điểm cộng: ${weeklySummary.positiveHighlights.goodDeedsCount} lượt (+${weeklySummary.positiveHighlights.totalRewardPoints} điểm)
- Số ca cần quan tâm / theo dõi: ${monitoringAlerts.length} học sinh
${monitoringAlerts.length > 0 ? monitoringAlerts.map(a => `  • ${a.studentName} (Tổ ${a.studentGroup}): ${a.reason} [Mức: ${a.severityLabel}]`).join('\n') : '  (Nề nếp ổn định)'}
- Công việc GVCN tuần qua: Hoàn thành ${weeklySummary.teacherWork.completedTasks}/${weeklySummary.teacherWork.totalTasks} việc, còn ${weeklySummary.teacherWork.pendingTasks} việc chưa xong.
${params?.customTeacherNotes ? `- Ghi chú riêng của GVCN: "${params.customTeacherNotes}"` : ''}

HÃY SOẠN THẢO BẢN NHÁP GỒM 5 PHẦN:
### I. MỤC TIÊU TRỌNG TÂM TUẦN MỚI
(2-3 mục tiêu nề nếp, học tập và phong trào thi đua tuần)

### II. CÁC ĐẦU VIỆC CHỦ NHIỆM ĐỀ XUẤT (KÈM MỨC ĐỘ ƯU TIÊN)
Liệt kê 4-6 việc thiết thực theo cấu trúc:
- [ ] **Việc 1**: Tên công việc | **Đối tượng**: ... | **Thời gian**: Thứ ... | **Mức ưu tiên**: [Khẩn cấp / Cao / Bình thường]
(Ví dụ: Sinh hoạt chủ nhiệm đầu tuần biểu dương tổ tiến bộ; Gặp riêng động viên học sinh vắng/trễ; Trao đổi phụ huynh học sinh cần hỗ trợ; Đôn đốc kiểm tra giữa kỳ...)

### III. KẾ HOẠCH THEO DÕI HỌC VIÊN CẦN QUAN TÂM
(Nội dung quan sát cụ thể cho các em có tín hiệu cần theo dõi trong tuần)

### IV. NỘI DUNG PHỐI HỢP VỚI PHỤ HUYNH & GIÁO VIÊN BỘ MÔN
(Các thông điệp cần trao đổi định kỳ hoặc hỗ trợ bài vở)

### V. ĐIỀU KIỆN ĐÁNH GIÁ CUỐI TUẦN
(Tiêu chí xác nhận hoàn thành kế hoạch)

*Ghi chú: Bản nháp được tạo lúc ${new Date().toLocaleString('vi-VN')}. Thầy/Cô hãy chỉnh sửa cho phù hợp trước khi áp dụng.*`;

    return this.askAssistant(prompt, {
      scope: 'class',
      thinkingLevel: 'high'
    });
  }

  /**
   * Phân tích chuyên sâu Tổng kết tuần cho GVCN
   */
  public async analyzeWeeklySummary(weekNumber?: number): Promise<string> {
    const summary = classAnalyticsAndAlertService.getWeeklyClassSummary(weekNumber);
    const settings = classService.getSettings();

    const prompt = `Bạn là Trợ lý AI hỗ trợ Giáo viên chủ nhiệm Lớp ${settings.className}.
Hãy thực hiện "PHÂN TÍCH NHANH TỔNG KẾT ${summary.weekLabel.toUpperCase()}" dựa trên các số liệu sau:

- Sĩ số: ${summary.totalStudents} học sinh
- Chuyên cần: Tỷ lệ ${summary.attendance.attendanceRate}% (Vắng có phép: ${summary.attendance.excusedAbsences}, Vắng không phép: ${summary.attendance.unexcusedAbsences}, Đi trễ: ${summary.attendance.tardyCount})
- Rèn luyện & Vi phạm: ${summary.violations.totalCount} lượt vi phạm (${summary.violations.trendText}). Nhóm vi phạm: ${summary.violations.byCategory.map(c => `${c.category}: ${c.count}`).join(', ') || 'Không có'}
- Tích cực: ${summary.positiveHighlights.goodDeedsCount} lượt ghi nhận tích cực, +${summary.positiveHighlights.totalRewardPoints}đ, ${summary.positiveHighlights.laurelTreesCompleted} cây nguyệt quế nở hoa
- Tình trạng theo dõi: ${summary.alertsAndFollowUp.totalAlerts} ca cảnh báo (${summary.alertsAndFollowUp.monitoringAlerts} đang theo dõi, ${summary.alertsAndFollowUp.resolvedAlerts} đã xử lý)

YÊU CẦU TRÌNH BÀY:
1. ĐIỂM SÁNG TRONG TUẦN (Biểu dương nỗ lực, học tập, phong trào)
2. VẤN ĐỀ CẦN LƯU Ý (Nề nếp, chuyên cần hoặc nhóm vi phạm xuất hiện nhiều)
3. KHUYẾN NGHỊ SƯ PHẠM ĐẦU TUẦN TỚI CHO GVCN (Cách biểu dương tại tiết sinh hoạt lớp, cách giải quyết các tồn tại)`;

    return this.askAssistant(prompt, {
      scope: 'class',
      thinkingLevel: 'medium'
    });
  }
}

export const aiService = new AIService();
