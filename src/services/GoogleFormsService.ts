/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SurveySection, SurveyQuestion, SurveyQuestionType, SurveyTemplate } from '../types';
import { GoogleAuthService, GoogleAuthErrorCode } from './GoogleAuthService';

export type GoogleFormInputType =
  | 'EDITOR_URL'
  | 'RESPONDER_URL'
  | 'IFRAME_EDITOR_URL'
  | 'IFRAME_RESPONDER_URL'
  | 'PLAIN_TEXT'
  | 'INVALID';

export interface ParsedGoogleFormInput {
  inputType: GoogleFormInputType;
  editorFormId?: string;
  responderUrl?: string;
  normalizedUrl?: string;
  rawSrc?: string;
  errorMessage?: string;
}

export interface GoogleFormFetchResult {
  success: boolean;
  title?: string;
  description?: string;
  sections?: SurveySection[];
  warnings?: string[];
  errorCode?: GoogleAuthErrorCode;
  errorMessage?: string;
  formId?: string;
  responderUri?: string;
  revisionId?: string;
  url?: string;
  stats?: {
    totalSections: number;
    totalQuestions: number;
    singleChoiceCount: number;
    multiChoiceCount: number;
    shortTextCount: number;
    longTextCount: number;
    scaleCount: number;
    dropdownCount: number;
    gridCount: number;
    needsReviewCount: number;
  };
}

export interface GoogleFormDiffResult {
  added: Array<{ title: string; type: SurveyQuestionType }>;
  modified: Array<{ title: string; oldType: SurveyQuestionType; newType: SurveyQuestionType }>;
  removed: Array<{ title: string; type: SurveyQuestionType }>;
  hasChanges: boolean;
  unchanged?: boolean;
}

export class GoogleFormsService {
  /**
   * Parse Google Form Input: Extracts FORM_ID and distinguishes between Editor URL, Responder URL, Iframe, and Plain Text.
   */
  public static parseGoogleFormInput(input: string): ParsedGoogleFormInput {
    const trimmed = (input || '').trim();

    if (!trimmed) {
      return {
        inputType: 'INVALID',
        errorMessage: 'Vui lòng cung cấp đường dẫn hoặc mã nhúng Google Form.'
      };
    }

    // 1. Check if input is an <iframe> embed code
    const iframeSrcMatch = trimmed.match(/<iframe[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
    if (iframeSrcMatch && iframeSrcMatch[1]) {
      const rawSrc = iframeSrcMatch[1].trim();

      // Check if iframe contains public responder /d/e/ token
      if (rawSrc.includes('/forms/d/e/') || rawSrc.includes('forms.gle/')) {
        return {
          inputType: 'IFRAME_RESPONDER_URL',
          responderUrl: rawSrc,
          normalizedUrl: rawSrc,
          rawSrc,
          errorMessage: 'Đường dẫn bạn nhập là link dành cho người trả lời (/d/e/...). Google Forms API yêu cầu link chỉnh sửa dạng https://docs.google.com/forms/d/FORM_ID/edit.'
        };
      }

      // Check if iframe contains direct editor /forms/d/{FORM_ID}
      const editorMatch = rawSrc.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_\-]+)/i);
      if (editorMatch && editorMatch[1] && editorMatch[1] !== 'e') {
        const editorFormId = editorMatch[1];
        return {
          inputType: 'IFRAME_EDITOR_URL',
          editorFormId,
          normalizedUrl: `https://docs.google.com/forms/d/${editorFormId}/edit`,
          rawSrc
        };
      }

      return {
        inputType: 'IFRAME_RESPONDER_URL',
        responderUrl: rawSrc,
        normalizedUrl: rawSrc,
        rawSrc
      };
    }

    // 2. Check if input is a direct URL
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('docs.google.com/forms') ||
      trimmed.includes('forms.gle')
    ) {
      // 2.A: Responder URL with /d/e/
      if (trimmed.includes('/forms/d/e/')) {
        const responderUrl = trimmed.split('?')[0];
        return {
          inputType: 'RESPONDER_URL',
          responderUrl,
          normalizedUrl: responderUrl,
          errorMessage: 'Đường dẫn bạn nhập là link dành cho người trả lời (/d/e/...). Google Forms API yêu cầu link chỉnh sửa dạng https://docs.google.com/forms/d/FORM_ID/edit.'
        };
      }

      // 2.B: Shortened URL forms.gle
      if (trimmed.includes('forms.gle/')) {
        return {
          inputType: 'RESPONDER_URL',
          responderUrl: trimmed,
          normalizedUrl: trimmed,
          errorMessage: 'Đường dẫn rút gọn forms.gle là link dành cho người trả lời. Vui lòng mở biểu mẫu bằng tài khoản của bạn và sao chép link chỉnh sửa trên thanh địa chỉ.'
        };
      }

      // 2.C: Standard Form URL: docs.google.com/forms/d/{FORM_ID} (with /edit or /viewform or bare)
      const directMatch = trimmed.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_\-]+)/i);
      if (directMatch && directMatch[1] && directMatch[1] !== 'e') {
        const editorFormId = directMatch[1];
        return {
          inputType: 'EDITOR_URL',
          editorFormId,
          normalizedUrl: `https://docs.google.com/forms/d/${editorFormId}/edit`
        };
      }

      return {
        inputType: 'INVALID',
        normalizedUrl: trimmed,
        errorMessage: 'Đường dẫn Google Form không hợp lệ. Vui lòng kiểm tra lại URL.'
      };
    }

    // 3. Direct bare Form ID (e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)
    if (/^[a-zA-Z0-9_\-]{20,100}$/.test(trimmed) && !trimmed.includes(' ')) {
      return {
        inputType: 'EDITOR_URL',
        editorFormId: trimmed,
        normalizedUrl: `https://docs.google.com/forms/d/${trimmed}/edit`
      };
    }

    // 4. Check if input contains question list indicators (for plain text paste tab)
    const hasQuestionIndicators =
      /^(\d+[\.\:\)]|\bCâu\s*\d+|\bQ\d+)/im.test(trimmed) ||
      /\n\s*(\[\s*\]|\(\s*\)|○|□|[\-\*\+]\s+)/.test(trimmed) ||
      trimmed.includes('Câu trả lời của bạn') ||
      trimmed.includes('Mục nhiều lựa chọn') ||
      trimmed.includes('Mục 1 lựa chọn');

    if (hasQuestionIndicators) {
      return {
        inputType: 'PLAIN_TEXT'
      };
    }

    return {
      inputType: 'INVALID',
      errorMessage: 'Đường dẫn Google Form không hợp lệ. Vui lòng kiểm tra lại URL.'
    };
  }

  /**
   * Fetch form via official Google Forms API (forms.get)
   * GET https://forms.googleapis.com/v1/forms/{editorFormId}
   * Calls application backend proxy first with client OAuth token in header, with direct client fallback.
   */
  public static async fetchFormViaApi(editorFormId: string): Promise<GoogleFormFetchResult> {
    const token = GoogleAuthService.getAccessToken();

    if (!token) {
      return {
        success: false,
        errorCode: 'GOOGLE_CONFIG_MISSING',
        errorMessage: 'Vui lòng kết nối tài khoản Google trước khi nạp cấu trúc Form.'
      };
    }

    const appAuthToken =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('auth_token') || ''
        : '';

    // Step 1: Call Backend Proxy route
    try {
      const backendRes = await fetch('/api/v1/surveys/fetch-google-form-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Google-Access-Token': token,
          ...(appAuthToken ? { Authorization: `Bearer ${appAuthToken}` } : {})
        },
        body: JSON.stringify({
          formId: editorFormId,
          accessToken: token
        })
      });

      if (backendRes.status === 401) {
        GoogleAuthService.handleTokenExpired();
        return {
          success: false,
          errorCode: 'GOOGLE_TOKEN_EXPIRED',
          errorMessage: 'Phiên kết nối Google đã hết hạn. Vui lòng kết nối lại.'
        };
      }

      if (backendRes.status === 403) {
        GoogleAuthService.handlePermissionDenied();
        return {
          success: false,
          errorCode: 'GOOGLE_PERMISSION_DENIED',
          errorMessage: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
        };
      }

      if (backendRes.status === 404) {
        return {
          success: false,
          errorCode: 'GOOGLE_FORM_NOT_FOUND',
          errorMessage: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
        };
      }

      if (backendRes.ok) {
        const json = await backendRes.json();
        if (json.success && json.data) {
          return this.mapGoogleFormApiResponse(json.data, editorFormId);
        }
      }
    } catch {
      // Backend proxy fallback to direct Google API call
    }

    // Step 2: Direct Google Forms API call (Client-side token per Workspace Integration Skill)
    try {
      const response = await fetch(
        `https://forms.googleapis.com/v1/forms/${encodeURIComponent(editorFormId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        }
      );

      if (response.status === 401) {
        GoogleAuthService.handleTokenExpired();
        return {
          success: false,
          errorCode: 'GOOGLE_TOKEN_EXPIRED',
          errorMessage: 'Phiên kết nối Google đã hết hạn. Vui lòng kết nối lại.'
        };
      }

      if (response.status === 403) {
        GoogleAuthService.handlePermissionDenied();
        return {
          success: false,
          errorCode: 'GOOGLE_PERMISSION_DENIED',
          errorMessage: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          errorCode: 'GOOGLE_FORM_NOT_FOUND',
          errorMessage: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
        };
      }

      if (!response.ok) {
        return {
          success: false,
          errorCode: 'GOOGLE_API_FAILED',
          errorMessage: 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
        };
      }

      const formData = await response.json();
      return this.mapGoogleFormApiResponse(formData, editorFormId);
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'GOOGLE_API_FAILED',
        errorMessage: err?.message || 'Không thể kết nối đến máy chủ Google Forms API.'
      };
    }
  }

  /**
   * Universal fetch: If connected to Google, uses official Forms API.
   * If not connected, attempts public parse or prompts for Google Connection.
   */
  public static async fetchFormDirectOrApi(urlOrFormId: string): Promise<GoogleFormFetchResult> {
    const rawInput = (urlOrFormId || '').trim();
    const parsed = this.parseGoogleFormInput(rawInput);

    if (parsed.inputType === 'INVALID') {
      return {
        success: false,
        errorCode: 'GOOGLE_EDITOR_FORM_ID_REQUIRED',
        errorMessage: parsed.errorMessage || 'Đường dẫn Google Form không hợp lệ. Vui lòng kiểm tra lại URL.'
      };
    }

    if (parsed.inputType === 'RESPONDER_URL' || parsed.inputType === 'IFRAME_RESPONDER_URL') {
      return {
        success: false,
        errorCode: 'GOOGLE_EDITOR_FORM_ID_REQUIRED',
        errorMessage:
          parsed.errorMessage ||
          'Đường dẫn bạn nhập là link dành cho người trả lời (/d/e/...). Google Forms API yêu cầu link chỉnh sửa dạng https://docs.google.com/forms/d/FORM_ID/edit.'
      };
    }

    // If editorFormId is available, call Google Forms API
    if (parsed.editorFormId) {
      const token = GoogleAuthService.getAccessToken();
      if (token) {
        return this.fetchFormViaApi(parsed.editorFormId);
      }
      return {
        success: false,
        errorCode: 'GOOGLE_CONFIG_MISSING',
        errorMessage: 'Vui lòng kết nối tài khoản Google trước khi nạp cấu trúc Form.'
      };
    }

    return {
      success: false,
      errorCode: 'GOOGLE_API_FAILED',
      errorMessage: 'Đường dẫn Google Form không hợp lệ. Vui lòng kiểm tra lại URL.'
    };
  }

  /**
   * Map official Google Forms API response to SurveyTemplate format.
   * Fully supports All Question Types including MULTIPLE CHOICE GRID and CHECKBOX GRID.
   */
  public static mapGoogleFormApiResponse(formData: any, editorFormId?: string): GoogleFormFetchResult {
    const title = formData.info?.title || 'Biểu mẫu Google Form';
    const description = formData.info?.description || '';
    const rawItems = formData.items || [];
    const revisionId = formData.revisionId;
    const responderUri = formData.responderUri;

    const sections: SurveySection[] = [];
    const warnings: string[] = [];

    let currentSection: SurveySection = {
      id: `sec-gf-${Date.now()}-1`,
      title: 'Phần 1: Thông tin khảo sát',
      order: 1,
      questions: []
    };

    let qIndex = 1;

    let singleChoiceCount = 0;
    let multiChoiceCount = 0;
    let shortTextCount = 0;
    let longTextCount = 0;
    let scaleCount = 0;
    let dropdownCount = 0;
    let gridCount = 0;
    let needsReviewCount = 0;

    rawItems.forEach((item: any) => {
      // 1. Page Break / Section Break
      if (item.pageBreakItem) {
        if (currentSection.questions.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          id: `sec-gf-${Date.now()}-${sections.length + 1}`,
          title: item.title || `Phần ${sections.length + 1}`,
          description: item.description || '',
          order: sections.length + 1,
          questions: []
        };
        return;
      }

      // 2. Question Item (Single questions)
      if (item.questionItem && item.questionItem.question) {
        const qData = item.questionItem.question;
        const qTitle = (item.title || 'Câu hỏi').trim();
        const qDesc = item.description || '';
        const isRequired = Boolean(qData.required);
        const externalSourceId = item.itemId || qData.questionId;

        let type: SurveyQuestionType = 'SHORT_TEXT';
        let options: string[] | undefined = undefined;
        let allowOther = false;
        let scaleMin: number | undefined = undefined;
        let scaleMax: number | undefined = undefined;
        let scaleMinLabel: string | undefined = undefined;
        let scaleMaxLabel: string | undefined = undefined;
        let needsReview = false;
        let reviewReason = '';

        if (qData.textQuestion) {
          if (qData.textQuestion.paragraph) {
            type = 'LONG_TEXT';
            longTextCount++;
          } else {
            type = 'SHORT_TEXT';
            shortTextCount++;
          }
        } else if (qData.choiceQuestion) {
          const choiceType = qData.choiceQuestion.type;
          const rawOpts = qData.choiceQuestion.options || [];

          const cleanOpts: string[] = [];
          rawOpts.forEach((opt: any) => {
            if (opt.isOther) {
              allowOther = true;
            } else if (opt.value) {
              cleanOpts.push(opt.value);
            }
          });

          options = cleanOpts.length > 0 ? cleanOpts : undefined;

          if (choiceType === 'CHECKBOX') {
            type = 'MULTI_CHOICE';
            multiChoiceCount++;
          } else if (choiceType === 'DROP_DOWN') {
            type = 'DROPDOWN';
            dropdownCount++;
          } else {
            type = 'SINGLE_CHOICE';
            singleChoiceCount++;
          }
        } else if (qData.scaleQuestion) {
          type = 'SCALE';
          scaleCount++;
          scaleMin = qData.scaleQuestion.low ?? 1;
          scaleMax = qData.scaleQuestion.high ?? 5;
          scaleMinLabel = qData.scaleQuestion.lowLabel || undefined;
          scaleMaxLabel = qData.scaleQuestion.highLabel || undefined;
        } else if (qData.dateQuestion) {
          type = 'DATE';
        } else if (qData.timeQuestion) {
          type = qData.timeQuestion.duration ? 'DURATION' : 'TIME';
        } else if (qData.fileUploadQuestion) {
          type = 'SHORT_TEXT';
          shortTextCount++;
          needsReview = true;
          needsReviewCount++;
          reviewReason = `Câu hỏi số ${qIndex} (Tải lên tệp) chưa được hỗ trợ tự động. Vui lòng kiểm tra và chỉnh sửa trong bản nháp.`;
          warnings.push(`Câu hỏi số ${qIndex} ("${qTitle}"): Tải tệp lên đã được chuyển thành văn bản kiểm tra.`);
        } else {
          // Unsupported question type: do NOT crash! Convert to SHORT_TEXT and continue
          type = 'SHORT_TEXT';
          shortTextCount++;
          needsReview = true;
          needsReviewCount++;
          reviewReason = `Câu hỏi số ${qIndex} chưa được hỗ trợ tự động. Vui lòng kiểm tra và chỉnh sửa trong bản nháp.`;
          warnings.push(`Câu hỏi số ${qIndex} ("${qTitle}"): Chưa được hỗ trợ tự động.`);
        }

        const surveyQuestion: SurveyQuestion = {
          id: `q-gf-${Date.now()}-${qIndex}`,
          key: `q_gf_${qIndex}_${Date.now().toString(36)}`,
          title: qTitle,
          description: qDesc,
          type,
          required: isRequired,
          options,
          allowOther: allowOther || undefined,
          scaleMin,
          scaleMax,
          scaleMinLabel,
          scaleMaxLabel,
          dateIncludeYear: type === 'DATE' ? true : undefined,
          visibility: 'NORMAL',
          needsReview: needsReview || undefined,
          reviewReason: reviewReason || undefined,
          externalSourceId,
          order: qIndex
        };

        currentSection.questions.push(surveyQuestion);
        qIndex++;
        return;
      }

      // 3. Question Group (Multiple Choice Grid or Checkbox Grid)
      if (item.questionGroupItem) {
        const qGroup = item.questionGroupItem;
        const grid = qGroup.grid || {};
        const gridColumnsObj = grid.columns || {};
        const isCheckboxGrid = gridColumnsObj.type === 'CHECKBOX';

        // Extract Columns (options for each row)
        const columns: string[] = [];
        if (Array.isArray(gridColumnsObj.options)) {
          gridColumnsObj.options.forEach((opt: any) => {
            if (opt && typeof opt.value === 'string' && opt.value.trim()) {
              columns.push(opt.value.trim());
            }
          });
        }

        // Extract Rows (row questions in the grid)
        const rows: string[] = [];
        let isAnyRowRequired = false;
        const subQuestions = qGroup.questions || [];
        if (Array.isArray(subQuestions)) {
          subQuestions.forEach((sq: any) => {
            const rowTitle = sq.rowQuestion?.title || sq.title || '';
            if (rowTitle && rowTitle.trim()) {
              rows.push(rowTitle.trim());
            }
            if (sq.required) {
              isAnyRowRequired = true;
            }
          });
        }

        gridCount++;
        const groupTitle = (item.title || 'Câu hỏi dạng lưới').trim();
        const groupDesc = item.description || '';

        const surveyQuestion: SurveyQuestion = {
          id: `q-gf-${Date.now()}-${qIndex}`,
          key: `q_gf_${qIndex}_${Date.now().toString(36)}`,
          title: groupTitle,
          description: groupDesc,
          type: isCheckboxGrid ? 'GRID_MULTI' : 'GRID',
          required: isAnyRowRequired,
          rows: rows.length > 0 ? rows : undefined,
          gridRows: rows.length > 0 ? rows : undefined,
          columns: columns.length > 0 ? columns : undefined,
          gridColumns: columns.length > 0 ? columns : undefined,
          options: columns.length > 0 ? columns : undefined,
          visibility: 'NORMAL',
          externalSourceId: item.itemId,
          order: qIndex
        };

        currentSection.questions.push(surveyQuestion);
        qIndex++;
        return;
      }
    });

    if (currentSection.questions.length > 0) {
      sections.push(currentSection);
    }

    const totalQuestions = qIndex - 1;

    return {
      success: true,
      title,
      description,
      sections,
      warnings,
      formId: editorFormId || formData.formId,
      responderUri,
      revisionId,
      url: editorFormId ? `https://docs.google.com/forms/d/${editorFormId}/edit` : undefined,
      stats: {
        totalSections: sections.length,
        totalQuestions,
        singleChoiceCount,
        multiChoiceCount,
        shortTextCount,
        longTextCount,
        scaleCount,
        dropdownCount,
        gridCount,
        needsReviewCount
      }
    };
  }

  /**
   * Diff comparison between an existing SurveyTemplate and newly fetched Google Form sections
   */
  public static diffGoogleForms(
    existingTemplate: SurveyTemplate,
    newSections: SurveySection[],
    newRevisionId?: string
  ): GoogleFormDiffResult {
    if (
      newRevisionId &&
      existingTemplate.externalSource?.revisionId &&
      existingTemplate.externalSource.revisionId === newRevisionId
    ) {
      return {
        added: [],
        modified: [],
        removed: [],
        hasChanges: false,
        unchanged: true
      };
    }

    const existingById: Map<string, SurveyQuestion> = new Map();
    const existingByTitle: Map<string, SurveyQuestion> = new Map();

    (existingTemplate.sections || []).forEach((sec) => {
      (sec.questions || []).forEach((q) => {
        if (q.externalSourceId) {
          existingById.set(q.externalSourceId, q);
        }
        existingByTitle.set(q.title.trim().toLowerCase(), q);
      });
    });

    const newById: Map<string, SurveyQuestion> = new Map();
    const newByTitle: Map<string, SurveyQuestion> = new Map();

    newSections.forEach((sec) => {
      (sec.questions || []).forEach((q) => {
        if (q.externalSourceId) {
          newById.set(q.externalSourceId, q);
        }
        newByTitle.set(q.title.trim().toLowerCase(), q);
      });
    });

    const added: Array<{ title: string; type: SurveyQuestionType }> = [];
    const modified: Array<{ title: string; oldType: SurveyQuestionType; newType: SurveyQuestionType }> = [];
    const removed: Array<{ title: string; type: SurveyQuestionType }> = [];

    newSections.forEach((sec) => {
      sec.questions.forEach((newQ) => {
        let matchedOld: SurveyQuestion | undefined = undefined;

        if (newQ.externalSourceId && existingById.has(newQ.externalSourceId)) {
          matchedOld = existingById.get(newQ.externalSourceId);
        } else {
          matchedOld = existingByTitle.get(newQ.title.trim().toLowerCase());
        }

        if (!matchedOld) {
          added.push({ title: newQ.title, type: newQ.type });
        } else {
          const typeChanged = matchedOld.type !== newQ.type;
          const optionsChanged = (matchedOld.options?.length || 0) !== (newQ.options?.length || 0);
          const titleChanged = matchedOld.title.trim() !== newQ.title.trim();
          if (typeChanged || optionsChanged || titleChanged) {
            modified.push({ title: newQ.title, oldType: matchedOld.type, newType: newQ.type });
          }
        }
      });
    });

    (existingTemplate.sections || []).forEach((sec) => {
      sec.questions.forEach((oldQ) => {
        let stillExists = false;
        if (oldQ.externalSourceId && newById.has(oldQ.externalSourceId)) {
          stillExists = true;
        } else if (newByTitle.has(oldQ.title.trim().toLowerCase())) {
          stillExists = true;
        }

        if (!stillExists) {
          removed.push({ title: oldQ.title, type: oldQ.type });
        }
      });
    });

    return {
      added,
      modified,
      removed,
      hasChanges: added.length > 0 || modified.length > 0 || removed.length > 0,
      unchanged: false
    };
  }
}
