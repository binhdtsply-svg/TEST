/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SurveySection, SurveyQuestion, SurveyQuestionType } from '../types';

export interface ParseResult {
  title?: string;
  description?: string;
  sections: SurveySection[];
  warnings: string[];
  errors: string[];
  unresolvedCount: number;
  stats: {
    totalSections: number;
    totalQuestions: number;
    singleChoiceCount: number;
    multiChoiceCount: number;
    shortTextCount: number;
    longTextCount: number;
    scaleCount: number;
    dropdownCount: number;
    gridCount: number;
    dateCount: number;
    timeCount: number;
    durationCount: number;
    needsReviewCount: number;
  };
  validation: {
    isValid: boolean;
    inputQuestionCount: number;
    parsedQuestionCount: number;
    issues: string[];
  };
}

export class SurveyTextParser {
  /**
   * Helper to clean markdown artifacts (like **bold**, *italic*, `code`, # headers)
   */
  public static cleanMarkdown(text: string): string {
    if (!text) return '';
    return text
      .replace(/^#{1,6}\s*/, '') // Leading headers ###
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold**
      .replace(/\*([^*]+)\*/g, '$1') // *italic*
      .replace(/__([^_]+)__/g, '$1') // __bold__
      .replace(/_([^_]+)_/g, '$1') // _italic_
      .replace(/`([^`]+)`/g, '$1') // `code`
      .trim();
  }

  /**
   * Clean leading prefix from option/row/column lines (A., B., 1., 1), •, -, etc.) while preserving raw text
   */
  public static cleanOptionLine(line: string): string {
    if (!line) return '';
    let cleaned = this.cleanMarkdown(line.trim());
    // Strip leading choice prefixes: "A.", "A)", "a.", "a)", "1.", "1)", "•", "-", "+", "○", "□", "🔘", "[ ]", etc.
    cleaned = cleaned.replace(
      /^(\-|\•|\+|\*|○|o|□|▪|\[\s*\]|\(\s*\)|\[x\]|\(x\)|🔘|⚪|⚫|⬜|⬛|▫️|⁃|–|—|✦|➤|➢|✓|[A-Za-z0-9]+[\.\:\)])\s*/,
      ''
    );
    return cleaned.trim() || line.trim();
  }

  /**
   * Parse type string into standard SurveyQuestionType
   */
  public static parseTypeFromString(val: string): SurveyQuestionType | null {
    if (!val) return null;
    const lower = val.toLowerCase().trim();

    // 1. Grid Types Check FIRST to prevent substring matching conflict with Single/Multi choice
    if (
      lower.includes('lưới nhiều') ||
      lower.includes('lưới checkbox') ||
      lower.includes('checkbox grid') ||
      lower.includes('multi-select grid') ||
      lower.includes('ma trận nhiều') ||
      lower.includes('grid_multi') ||
      (lower.includes('lưới') && lower.includes('nhiều'))
    ) {
      return 'GRID_MULTI';
    }
    if (
      lower.includes('lưới một') ||
      lower.includes('lưới 1') ||
      lower.includes('lưới trắc nghiệm') ||
      lower.includes('multiple choice grid') ||
      lower.includes('ma trận một') ||
      lower.includes('ma trận 1') ||
      lower.includes('lưới đánh giá') ||
      lower.includes('grid_single') ||
      lower.includes('radio grid') ||
      lower === 'lưới' ||
      lower === 'grid' ||
      lower === 'ma trận'
    ) {
      return 'GRID_SINGLE';
    }

    // 2. Choice types
    if (
      lower.includes('nhiều lựa chọn') ||
      lower.includes('nhiều đáp án') ||
      lower.includes('multi_choice') ||
      lower.includes('multi') ||
      lower.includes('checkbox') ||
      lower.includes('hộp kiểm')
    ) {
      return 'MULTI_CHOICE';
    }
    if (
      lower.includes('một lựa chọn') ||
      lower.includes('1 lựa chọn') ||
      lower.includes('single_choice') ||
      lower.includes('single') ||
      lower.includes('radio') ||
      lower.includes('trắc nghiệm')
    ) {
      return 'SINGLE_CHOICE';
    }
    if (
      lower.includes('đoạn văn') ||
      lower.includes('văn bản dài') ||
      lower.includes('paragraph') ||
      lower.includes('tự luận') ||
      lower.includes('long_text') ||
      lower.includes('long text')
    ) {
      return 'LONG_TEXT';
    }
    if (
      lower.includes('trả lời ngắn') ||
      lower.includes('văn bản ngắn') ||
      lower.includes('short_text') ||
      lower.includes('short text') ||
      lower === 'ngắn' ||
      lower === 'short'
    ) {
      return 'SHORT_TEXT';
    }
    if (lower.includes('ngày tháng') || lower.includes('ngày') || lower.includes('date')) {
      return 'DATE';
    }
    if (lower.includes('thời gian') || lower.includes('giờ') || lower.includes('time')) {
      return 'TIME';
    }
    if (lower.includes('thời lượng') || lower.includes('duration')) {
      return 'DURATION';
    }
    if (
      lower.includes('thang điểm') ||
      lower.includes('thang đo') ||
      lower.includes('mức độ') ||
      lower.includes('scale')
    ) {
      return 'SCALE';
    }
    if (lower.includes('thả xuống') || lower.includes('dropdown') || lower.includes('menu')) {
      return 'DROPDOWN';
    }
    return null;
  }

  /**
   * Main parsing method supporting Canonical Tagged Format and Free-form AI/Word/Markdown format
   */
  public static parse(rawText: string): ParseResult {
    if (!rawText || rawText.trim().length === 0) {
      return {
        sections: [],
        warnings: [],
        errors: ['Văn bản rỗng. Vui lòng dán nội dung khảo sát.'],
        unresolvedCount: 0,
        stats: {
          totalSections: 0,
          totalQuestions: 0,
          singleChoiceCount: 0,
          multiChoiceCount: 0,
          shortTextCount: 0,
          longTextCount: 0,
          scaleCount: 0,
          dropdownCount: 0,
          gridCount: 0,
          dateCount: 0,
          timeCount: 0,
          durationCount: 0,
          needsReviewCount: 0
        },
        validation: {
          isValid: false,
          inputQuestionCount: 0,
          parsedQuestionCount: 0,
          issues: ['Văn bản rỗng. Vui lòng dán nội dung khảo sát.']
        }
      };
    }

    // Check if input uses Canonical Tagged Format:
    // [LOAI_CAU_HOI], [CAU_HOI], [DONG], [LUACHON], [HET], [QUESTION], [TYPE], [SECTION], etc.
    const hasCanonicalTags = /\[(QUESTION|CÂU_HỎI|CAU_HOI|CAU HOI|CÂU HỎI|TITLE|TIEU_DE|TIÊU_ĐỀ|SECTION|PHAN|PHẦN|TYPE|LOAI_CAU_HOI|LOẠI_CÂU_HỎI|LOAI CAU HOI|LOẠI CÂU HỎI|DANG_CAU_HOI|DONG|DÒNG|HANG|HÀNG|ROWS|LUACHON|LỰA_CHỌN|LUA_CHON|COT|CỘT|MUC_DANH_GIA|MỨC_ĐÁNH_GIÁ|OPTIONS|COLUMNS|HET|HẾT|END)\]/i.test(
      rawText
    );

    if (hasCanonicalTags) {
      return this.parseCanonicalFormat(rawText);
    } else {
      return this.parseFreeformFormat(rawText);
    }
  }

  /**
   * CANONICAL FORMAT PARSER
   * Supports:
   * - [LOAI_CAU_HOI] / [LOẠI_CÂU_HỎI] / [TYPE]
   * - [CAU_HOI] / [CÂU_HỎI] / [QUESTION]
   * - [DONG] / [DÒNG] / [HANG] / [HÀNG] / [ROWS]
   * - [LUACHON] / [LỰA_CHỌN] / [COT] / [CỘT] / [MUC_DANH_GIA] / [OPTIONS] / [COLUMNS]
   * - [HET] / [HẾT] / [END]
   * - [TITLE] / [TIEU_DE], [DESCRIPTION] / [MO_TA]
   * - [SECTION] / [PHAN], [REQUIRED] / [BAT_BUOC]
   */
  private static parseCanonicalFormat(rawText: string): ParseResult {
    const lines = rawText.split(/\r?\n/);
    const warnings: string[] = [];
    const errors: string[] = [];
    const sections: SurveySection[] = [];

    let surveyTitle: string | undefined;
    let surveyDescription: string | undefined;

    let currentSection: SurveySection = {
      id: `sec-canonical-${Date.now()}-1`,
      title: 'Phần 1: Thông tin khảo sát',
      order: 1,
      questions: []
    };

    interface DraftQuestion {
      title: string;
      description?: string;
      type: SurveyQuestionType;
      required: boolean;
      options: string[];
      allowOther?: boolean;
      maxSelections?: number;
      scaleMin?: number;
      scaleMax?: number;
      scaleMinLabel?: string;
      scaleMaxLabel?: string;
      gridRows?: string[];
      gridColumns?: string[];
      dateIncludeYear?: boolean;
    }

    let currentQuestion: DraftQuestion | null = null;
    let currentMode:
      | 'NONE'
      | 'TITLE'
      | 'DESCRIPTION'
      | 'SECTION'
      | 'QUESTION'
      | 'TYPE'
      | 'REQUIRED'
      | 'OPTIONS'
      | 'OTHER'
      | 'DATE_INCLUDE_YEAR'
      | 'SCALE_MIN'
      | 'SCALE_MAX'
      | 'SCALE_MIN_LABEL'
      | 'SCALE_MAX_LABEL'
      | 'ROWS'
      | 'COLUMNS'
      | 'MAX_SELECTIONS' = 'NONE';

    let sectionIndex = 1;
    let questionIndex = 1;
    let matchedQuestionsCount = 0;

    const flushCurrentQuestion = () => {
      if (!currentQuestion) return;

      const trimmedTitle = (currentQuestion.title || '').trim();
      if (!trimmedTitle) {
        currentQuestion = null;
        return;
      }

      const isGrid =
        currentQuestion.type === 'GRID' ||
        currentQuestion.type === 'GRID_SINGLE' ||
        currentQuestion.type === 'GRID_MULTI' ||
        ((currentQuestion.gridRows?.length || 0) > 0 && (currentQuestion.gridColumns?.length || 0) > 0);

      if (isGrid && !['GRID', 'GRID_SINGLE', 'GRID_MULTI'].includes(currentQuestion.type)) {
        currentQuestion.type = 'GRID_MULTI';
      }

      // Check grid validation
      if (isGrid) {
        if (!currentQuestion.gridRows || currentQuestion.gridRows.length === 0) {
          errors.push(
            `Câu hỏi dạng lưới "${trimmedTitle.substring(0, 40)}..." thiếu danh sách các dòng [DONG].`
          );
        }
        if (!currentQuestion.gridColumns || currentQuestion.gridColumns.length === 0) {
          errors.push(
            `Câu hỏi dạng lưới "${trimmedTitle.substring(0, 40)}..." thiếu danh sách các cột [LUACHON].`
          );
        }
      }

      // Validate choice types
      if (
        (currentQuestion.type === 'SINGLE_CHOICE' ||
          currentQuestion.type === 'MULTI_CHOICE' ||
          currentQuestion.type === 'DROPDOWN') &&
        (!currentQuestion.options || currentQuestion.options.length === 0) &&
        !currentQuestion.allowOther
      ) {
        errors.push(
          `Câu hỏi "${trimmedTitle.substring(0, 40)}..." (${currentQuestion.type}) thiếu danh sách đáp án [LUACHON].`
        );
      }

      // Check if "Khác" exists in options, set allowOther if found
      const finalOptions: string[] = [];
      for (const opt of currentQuestion.options || []) {
        if (/^(khác|lựa chọn khác|ý kiến khác|mục khác|other)(\s*(\.{2,}|…|\:|\(.*\)|_+))?$/i.test(opt)) {
          currentQuestion.allowOther = true;
          finalOptions.push(opt);
        } else {
          finalOptions.push(opt);
        }
      }

      const q: SurveyQuestion = {
        id: `q-canonical-${Date.now()}-${sectionIndex}-${questionIndex}`,
        key: `q_canonical_${sectionIndex}_${questionIndex}`,
        title: trimmedTitle,
        description: currentQuestion.description?.trim() || undefined,
        type: currentQuestion.type,
        required: currentQuestion.required,
        options: !isGrid && finalOptions.length > 0 ? finalOptions : undefined,
        allowOther: currentQuestion.allowOther,
        maxSelections: currentQuestion.maxSelections,
        scaleMin: currentQuestion.scaleMin ?? (currentQuestion.type === 'SCALE' ? 1 : undefined),
        scaleMax: currentQuestion.scaleMax ?? (currentQuestion.type === 'SCALE' ? 5 : undefined),
        scaleMinLabel: currentQuestion.scaleMinLabel,
        scaleMaxLabel: currentQuestion.scaleMaxLabel,
        gridRows: currentQuestion.gridRows,
        gridColumns: currentQuestion.gridColumns,
        rows: currentQuestion.gridRows,
        columns: currentQuestion.gridColumns,
        dateIncludeYear: currentQuestion.dateIncludeYear,
        visibility: 'NORMAL',
        order: questionIndex,
        needsReview: false
      };

      currentSection.questions.push(q);
      questionIndex++;
      matchedQuestionsCount++;
      currentQuestion = null;
    };

    const flushCurrentSection = () => {
      flushCurrentQuestion();
      if (currentSection.questions.length > 0 || (currentSection.title && currentSection.title.trim() !== '')) {
        currentSection.order = sections.length + 1;
        sections.push(currentSection);
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for tag header: e.g. [LOAI_CAU_HOI], [CAU_HOI], [DONG], [LUACHON], [HET], [QUESTION], etc.
      const tagMatch = line.match(/^\[([A-Z0-9_À-Ỹà-ỹ\s]+)\]\s*(.*)$/i);
      if (tagMatch) {
        const rawTagName = tagMatch[1].toUpperCase().replace(/\s+/g, '_');
        const inlineValue = tagMatch[2].trim();

        // Normalize tag names
        let normalizedTag = rawTagName;
        if (/^(TITLE|TIEU_DE|TIÊU_ĐỀ|TEN_KHAO_SAT)$/i.test(rawTagName)) normalizedTag = 'TITLE';
        else if (/^(DESCRIPTION|MO_TA|MÔ_TẢ|HUONG_DAN|HƯỚNG_DẪN)$/i.test(rawTagName)) normalizedTag = 'DESCRIPTION';
        else if (/^(SECTION|PHAN|PHẦN|SECTION_TITLE|CHU_DE|CHỦ_ĐỀ)$/i.test(rawTagName)) normalizedTag = 'SECTION';
        else if (/^(QUESTION|CAU_HOI|CÂU_HỎI|NOI_DUNG_CAU_HOI|NỘI_DUNG_CÂU_HỎI)$/i.test(rawTagName)) normalizedTag = 'QUESTION';
        else if (/^(TYPE|LOAI_CAU_HOI|LOẠI_CÂU_HỎI|DANG_CAU_HOI|DẠNG_CÂU_HỎI|KIEU_CAU_HOI)$/i.test(rawTagName)) normalizedTag = 'TYPE';
        else if (/^(REQUIRED|BAT_BUOC|BẮT_BUỘC)$/i.test(rawTagName)) normalizedTag = 'REQUIRED';
        else if (/^(ROWS|DONG|DÒNG|HANG|HÀNG|TIEU_CHI|TIÊU_CHÍ|CAC_DONG|CÁC_DÒNG|CAC_HANG|CÁC_HÀNG)$/i.test(rawTagName)) normalizedTag = 'ROWS';
        else if (/^(COLUMNS|COT|CỘT|MUC_DANH_GIA|MỨC_ĐÁNH_GIÁ|THANG_DO|THANG_ĐO|CAC_COT|CÁC_CỘT)$/i.test(rawTagName)) normalizedTag = 'COLUMNS';
        else if (/^(OPTIONS|LUACHON|LỰA_CHỌN|LUA_CHON|DAP_AN|ĐÁP_ÁN|CAC_LUA_CHON|CÁC_LỰA_CHỌN)$/i.test(rawTagName)) normalizedTag = 'OPTIONS';
        else if (/^(HET|HẾT|END)$/i.test(rawTagName)) normalizedTag = 'HET';

        switch (normalizedTag) {
          case 'TITLE':
            currentMode = 'TITLE';
            if (inlineValue) surveyTitle = inlineValue;
            continue;

          case 'DESCRIPTION':
            currentMode = 'DESCRIPTION';
            if (inlineValue) surveyDescription = inlineValue;
            continue;

          case 'SECTION':
            flushCurrentSection();
            sectionIndex++;
            questionIndex = 1;
            currentMode = 'SECTION';
            currentSection = {
              id: `sec-canonical-${Date.now()}-${sectionIndex}`,
              title: inlineValue || `Phần ${sectionIndex}`,
              order: sectionIndex,
              questions: []
            };
            continue;

          case 'TYPE':
            currentMode = 'TYPE';
            // If question doesn't exist, start one
            if (!currentQuestion) {
              currentQuestion = {
                title: '',
                type: 'GRID_MULTI',
                required: false,
                options: []
              };
            }
            if (inlineValue) {
              const detected = this.parseTypeFromString(inlineValue);
              if (detected) {
                currentQuestion.type = detected;
              }
            }
            continue;

          case 'QUESTION':
            // If previous question already had title and options/rows, flush it
            if (currentQuestion && currentQuestion.title && (currentQuestion.options.length > 0 || (currentQuestion.gridRows?.length || 0) > 0)) {
              flushCurrentQuestion();
            }
            currentMode = 'QUESTION';
            if (!currentQuestion) {
              currentQuestion = {
                title: inlineValue || '',
                type: 'SHORT_TEXT',
                required: false,
                options: []
              };
            } else {
              currentQuestion.title = inlineValue || currentQuestion.title || '';
            }
            continue;

          case 'REQUIRED':
            currentMode = 'REQUIRED';
            if (currentQuestion && inlineValue) {
              const reqVal = inlineValue.toUpperCase().trim();
              currentQuestion.required = reqVal === 'YES' || reqVal === 'TRUE' || reqVal === 'CÓ' || reqVal === '1';
            }
            continue;

          case 'ROWS':
            currentMode = 'ROWS';
            if (!currentQuestion) {
              currentQuestion = {
                title: '',
                type: 'GRID_MULTI',
                required: false,
                options: []
              };
            }
            currentQuestion.gridRows = currentQuestion.gridRows || [];
            if (inlineValue) {
              const cleaned = this.cleanOptionLine(inlineValue);
              if (cleaned) currentQuestion.gridRows.push(cleaned);
            }
            continue;

          case 'COLUMNS':
            currentMode = 'COLUMNS';
            if (!currentQuestion) {
              currentQuestion = {
                title: '',
                type: 'GRID_MULTI',
                required: false,
                options: []
              };
            }
            currentQuestion.gridColumns = currentQuestion.gridColumns || [];
            if (inlineValue) {
              const cleaned = this.cleanOptionLine(inlineValue);
              if (cleaned) currentQuestion.gridColumns.push(cleaned);
            }
            continue;

          case 'OPTIONS':
            currentMode = 'OPTIONS';
            if (!currentQuestion) {
              currentQuestion = {
                title: '',
                type: 'SINGLE_CHOICE',
                required: false,
                options: []
              };
            }
            if (inlineValue) {
              const cleaned = this.cleanOptionLine(inlineValue);
              if (cleaned) {
                if (currentQuestion.type === 'GRID_MULTI' || currentQuestion.type === 'GRID_SINGLE' || currentQuestion.type === 'GRID') {
                  currentQuestion.gridColumns = currentQuestion.gridColumns || [];
                  currentQuestion.gridColumns.push(cleaned);
                } else {
                  currentQuestion.options.push(cleaned);
                }
              }
            }
            continue;

          case 'HET':
            flushCurrentQuestion();
            currentMode = 'NONE';
            continue;

          case 'OTHER':
            currentMode = 'OTHER';
            if (currentQuestion && inlineValue) {
              const othVal = inlineValue.toUpperCase().trim();
              currentQuestion.allowOther = othVal === 'YES' || othVal === 'TRUE' || othVal === 'CÓ' || othVal === '1';
            }
            continue;

          case 'SCALE_MIN':
            currentMode = 'SCALE_MIN';
            if (currentQuestion && inlineValue) {
              currentQuestion.scaleMin = parseInt(inlineValue, 10);
            }
            continue;

          case 'SCALE_MAX':
            currentMode = 'SCALE_MAX';
            if (currentQuestion && inlineValue) {
              currentQuestion.scaleMax = parseInt(inlineValue, 10);
            }
            continue;

          case 'SCALE_MIN_LABEL':
            currentMode = 'SCALE_MIN_LABEL';
            if (currentQuestion && inlineValue) {
              currentQuestion.scaleMinLabel = inlineValue;
            }
            continue;

          case 'SCALE_MAX_LABEL':
            currentMode = 'SCALE_MAX_LABEL';
            if (currentQuestion && inlineValue) {
              currentQuestion.scaleMaxLabel = inlineValue;
            }
            continue;

          default:
            warnings.push(`Bỏ qua thẻ không nhận diện: [${rawTagName}]`);
            currentMode = 'NONE';
            continue;
        }
      }

      // Line is content under current mode
      switch (currentMode) {
        case 'TITLE':
          surveyTitle = surveyTitle ? `${surveyTitle} ${line}` : line;
          break;

        case 'DESCRIPTION':
          surveyDescription = surveyDescription ? `${surveyDescription}\n${line}` : line;
          break;

        case 'SECTION':
          if (currentSection) {
            currentSection.title = currentSection.title === `Phần ${sectionIndex}` ? line : `${currentSection.title} - ${line}`;
          }
          break;

        case 'QUESTION':
          if (currentQuestion) {
            currentQuestion.title = currentQuestion.title ? `${currentQuestion.title} ${line}` : line;
          }
          break;

        case 'TYPE':
          if (currentQuestion) {
            const detected = this.parseTypeFromString(line);
            if (detected) {
              currentQuestion.type = detected;
            }
          }
          break;

        case 'REQUIRED':
          if (currentQuestion) {
            const reqVal = line.toUpperCase().trim();
            currentQuestion.required = reqVal === 'YES' || reqVal === 'TRUE' || reqVal === 'CÓ' || reqVal === '1';
          }
          break;

        case 'ROWS':
          if (currentQuestion) {
            currentQuestion.gridRows = currentQuestion.gridRows || [];
            const cleaned = this.cleanOptionLine(line);
            if (cleaned) currentQuestion.gridRows.push(cleaned);
          }
          break;

        case 'COLUMNS':
          if (currentQuestion) {
            currentQuestion.gridColumns = currentQuestion.gridColumns || [];
            const cleaned = this.cleanOptionLine(line);
            if (cleaned) currentQuestion.gridColumns.push(cleaned);
          }
          break;

        case 'OPTIONS':
          if (currentQuestion) {
            const cleaned = this.cleanOptionLine(line);
            if (cleaned) {
              // If current question is a GRID type, options act as gridColumns
              if (
                currentQuestion.type === 'GRID_MULTI' ||
                currentQuestion.type === 'GRID_SINGLE' ||
                currentQuestion.type === 'GRID' ||
                (currentQuestion.gridRows && currentQuestion.gridRows.length > 0)
              ) {
                if (currentQuestion.type === 'SINGLE_CHOICE' || currentQuestion.type === 'SHORT_TEXT') {
                  currentQuestion.type = 'GRID_MULTI';
                }
                currentQuestion.gridColumns = currentQuestion.gridColumns || [];
                currentQuestion.gridColumns.push(cleaned);
              } else {
                currentQuestion.options.push(cleaned);
              }
            }
          }
          break;

        case 'SCALE_MIN':
          if (currentQuestion) currentQuestion.scaleMin = parseInt(line, 10);
          break;

        case 'SCALE_MAX':
          if (currentQuestion) currentQuestion.scaleMax = parseInt(line, 10);
          break;

        case 'SCALE_MIN_LABEL':
          if (currentQuestion) currentQuestion.scaleMinLabel = line;
          break;

        case 'SCALE_MAX_LABEL':
          if (currentQuestion) currentQuestion.scaleMaxLabel = line;
          break;
      }
    }

    flushCurrentSection();

    // Statistics Calculation
    const stats = this.calculateStats(sections);
    const activeSections = sections.filter((s) => s.questions && s.questions.length > 0);

    const isValid = errors.length === 0 && stats.totalQuestions > 0;
    if (!isValid && stats.totalQuestions === 0) {
      errors.push('Không tìm thấy câu hỏi hợp lệ trong định dạng mẫu.');
    }

    return {
      title: surveyTitle,
      description: surveyDescription,
      sections: activeSections,
      warnings,
      errors,
      unresolvedCount: stats.needsReviewCount,
      stats,
      validation: {
        isValid,
        inputQuestionCount: matchedQuestionsCount || stats.totalQuestions,
        parsedQuestionCount: stats.totalQuestions,
        issues: [...errors]
      }
    };
  }

  /**
   * FREE-FORM / MARKDOWN / AI / WORD PARSER
   * Recognizes:
   * 1. Standard question starts ("Câu hỏi: ...", "Câu 1: ...", "1. ...")
   * 2. Matrix Row headers ("Các dòng:", "Dòng:", "Các hàng:", "Hàng:", "Các tiêu chí:", "Tiêu chí:", "Rows:")
   * 3. Matrix Column headers ("Các mức đánh giá:", "Mức đánh giá:", "Các cột:", "Cột:", "Các mức lựa chọn:", "Columns:")
   * 4. Markdown tables (| Tiêu chí | Mức 1 | Mức 2 |)
   * 5. Date, Time, Duration, Scale, Choice questions
   */
  private static parseFreeformFormat(rawText: string): ParseResult {
    const rawLines = rawText.split(/\r?\n/);
    const sections: SurveySection[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    let surveyTitle: string | undefined;
    let surveyDescription: string | undefined;

    let currentSection: SurveySection = {
      id: `sec-freeform-${Date.now()}-1`,
      title: 'Phần 1: Thông tin chung',
      order: 1,
      questions: []
    };

    interface FreeformDraftQuestion {
      title: string;
      description?: string;
      type?: SurveyQuestionType;
      required: boolean;
      options: string[];
      allowOther?: boolean;
      maxSelections?: number;
      scaleMin?: number;
      scaleMax?: number;
      scaleMinLabel?: string;
      scaleMaxLabel?: string;
      scaleMode?: 'NUMERIC' | 'CUSTOM';
      gridRows?: string[];
      gridColumns?: string[];
      dateIncludeYear?: boolean;
      waitingForTitle?: boolean;
      collectMode?: 'OPTIONS' | 'ROWS' | 'COLUMNS';
    }

    let currentQuestion: FreeformDraftQuestion | null = null;
    let questionIndex = 1;
    let sectionIndex = 1;
    let detectedInputQuestions = 0;
    let isHeaderProcessed = false;

    const flushCurrentQuestion = () => {
      if (!currentQuestion) return;

      const rawTitle = (currentQuestion.title || '').trim();
      if (!rawTitle) {
        currentQuestion = null;
        return;
      }

      const options = currentQuestion.options || [];
      let allowOther = currentQuestion.allowOther || false;

      // Clean options and detect "Khác"
      const cleanedOptions: string[] = [];
      for (const opt of options) {
        const cleanedOpt = opt.trim();
        if (!cleanedOpt) continue;

        if (/^(khác|lựa chọn khác|ý kiến khác|mục khác|other)(\s*(\.{2,}|…|\:|\(.*\)|_+))?$/i.test(cleanedOpt)) {
          allowOther = true;
          cleanedOptions.push(cleanedOpt);
        } else {
          cleanedOptions.push(cleanedOpt);
        }
      }

      // Check if grid rows and columns exist
      const hasGridRows = (currentQuestion.gridRows?.length || 0) > 0;
      const hasGridCols = (currentQuestion.gridColumns?.length || 0) > 0;

      if (hasGridRows && hasGridCols) {
        if (!currentQuestion.type || !['GRID_SINGLE', 'GRID_MULTI', 'GRID'].includes(currentQuestion.type)) {
          // Default to GRID_MULTI as required by user prompt
          currentQuestion.type = 'GRID_MULTI';
        }
      }

      // Determine final Question Type
      let type: SurveyQuestionType = currentQuestion.type || 'SHORT_TEXT';
      let needsReview = false;
      let reviewReason = '';

      if (!currentQuestion.type) {
        const lowerTitle = rawTitle.toLowerCase();

        // Check date/time/duration keywords
        if (
          lowerTitle.includes('ngày sinh') ||
          lowerTitle.includes('ngày đăng ký') ||
          lowerTitle.includes('ngày thực hiện') ||
          lowerTitle.includes('ngày cấp') ||
          lowerTitle.includes('ngày tháng') ||
          lowerTitle.includes('ngày làm bài')
        ) {
          type = 'DATE';
        } else if (
          lowerTitle.includes('thời gian hoàn thành') ||
          lowerTitle.includes('thời gian bắt đầu') ||
          lowerTitle.includes('thời gian kết thúc') ||
          lowerTitle.includes('giờ làm bài') ||
          lowerTitle.includes('khung giờ')
        ) {
          type = 'TIME';
        } else if (
          lowerTitle.includes('thời lượng') ||
          lowerTitle.includes('thời gian tự học mỗi ngày') ||
          lowerTitle.includes('khoảng thời gian')
        ) {
          type = 'DURATION';
        } else if (cleanedOptions.length > 0 || allowOther) {
          if (
            lowerTitle.includes('nhiều lựa chọn') ||
            lowerTitle.includes('nhiều đáp án') ||
            lowerTitle.includes('chọn các') ||
            lowerTitle.includes('những môn') ||
            lowerTitle.includes('những khó khăn') ||
            lowerTitle.includes('những kỹ năng') ||
            lowerTitle.includes('tối đa') ||
            lowerTitle.includes('có thể chọn nhiều') ||
            lowerTitle.includes('hộp kiểm') ||
            lowerTitle.includes('checkbox')
          ) {
            type = 'MULTI_CHOICE';
          } else {
            type = 'SINGLE_CHOICE';
          }
        } else {
          if (
            lowerTitle.includes('đoạn văn') ||
            lowerTitle.includes('chi tiết') ||
            lowerTitle.includes('chia sẻ') ||
            lowerTitle.includes('ý kiến') ||
            lowerTitle.includes('lời nhắn') ||
            lowerTitle.includes('kế hoạch') ||
            lowerTitle.includes('mô tả') ||
            lowerTitle.includes('tại sao') ||
            lowerTitle.includes('nhận xét') ||
            lowerTitle.includes('cảm nghĩ') ||
            lowerTitle.includes('tự luận')
          ) {
            type = 'LONG_TEXT';
          } else if (
            lowerTitle.includes('thang điểm') ||
            lowerTitle.includes('đánh giá từ 1') ||
            lowerTitle.includes('mức độ') ||
            lowerTitle.includes('thang đo')
          ) {
            type = 'SCALE';
          } else {
            type = 'SHORT_TEXT';
          }
        }
      }

      // If choice type but no options found
      if (
        (type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE' || type === 'DROPDOWN') &&
        cleanedOptions.length === 0 &&
        !allowOther
      ) {
        needsReview = true;
        reviewReason = 'Câu hỏi trắc nghiệm chưa có danh sách lựa chọn trả lời.';
        warnings.push(`Câu hỏi "${rawTitle.substring(0, 45)}..." thiếu danh sách lựa chọn.`);
        cleanedOptions.push('Lựa chọn 1', 'Lựa chọn 2');
      }

      // Clean title from trailing required markers
      let finalTitle = rawTitle;
      if (/\s*(\(bắt buộc\)|\(\*\)|\*)$/i.test(finalTitle)) {
        finalTitle = finalTitle.replace(/\s*(\(bắt buộc\)|\(\*\)|\*)$/i, '').trim();
      }

      const isScaleWithCustomOptions = type === 'SCALE' && cleanedOptions.length > 0;
      const scaleMode: 'NUMERIC' | 'CUSTOM' | undefined =
        type === 'SCALE'
          ? isScaleWithCustomOptions || currentQuestion.scaleMode === 'CUSTOM'
            ? 'CUSTOM'
            : 'NUMERIC'
          : undefined;

      const finalized: SurveyQuestion = {
        id: `q-freeform-${Date.now()}-${sectionIndex}-${questionIndex}`,
        key: `q_freeform_${sectionIndex}_${questionIndex}`,
        title: finalTitle,
        description: currentQuestion.description?.trim() || undefined,
        type,
        required: currentQuestion.required ?? false,
        options:
          type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE' || type === 'DROPDOWN' || isScaleWithCustomOptions
            ? cleanedOptions.length > 0
              ? cleanedOptions
              : undefined
            : undefined,
        allowOther: type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE' ? allowOther || undefined : undefined,
        maxSelections: type === 'MULTI_CHOICE' ? currentQuestion.maxSelections : undefined,
        scaleMin: type === 'SCALE' && !isScaleWithCustomOptions ? (currentQuestion.scaleMin ?? 1) : undefined,
        scaleMax: type === 'SCALE' && !isScaleWithCustomOptions ? (currentQuestion.scaleMax ?? 5) : undefined,
        scaleMinLabel: type === 'SCALE' && !isScaleWithCustomOptions ? currentQuestion.scaleMinLabel : undefined,
        scaleMaxLabel: type === 'SCALE' && !isScaleWithCustomOptions ? currentQuestion.scaleMaxLabel : undefined,
        scaleMode,
        gridRows: currentQuestion.gridRows,
        gridColumns: currentQuestion.gridColumns,
        rows: currentQuestion.gridRows,
        columns: currentQuestion.gridColumns,
        dateIncludeYear: type === 'DATE' ? true : undefined,
        visibility: 'NORMAL',
        order: questionIndex,
        needsReview,
        reviewReason: needsReview ? reviewReason : undefined
      };

      currentSection.questions.push(finalized);
      questionIndex++;
      currentQuestion = null;
    };

    const flushCurrentSection = () => {
      flushCurrentQuestion();
      if (currentSection.questions.length > 0 || (currentSection.title && currentSection.title.trim() !== '')) {
        currentSection.order = sections.length + 1;
        sections.push(currentSection);
      }
    };

    // First, inspect if there is any Markdown Table in the input
    // Markdown table pattern: lines with | ... | ... |
    const isMarkdownTableLine = (l: string) => /^\s*\|(.+)\|\s*$/.test(l);
    const isMarkdownDelimiterLine = (l: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(l);

    let idx = 0;
    while (idx < rawLines.length) {
      const originalLine = rawLines[idx];
      const trimmedLine = originalLine.trim();
      if (!trimmedLine) {
        idx++;
        continue;
      }

      const line = this.cleanMarkdown(trimmedLine);

      // Check for Markdown Table Block
      if (isMarkdownTableLine(originalLine) && idx + 1 < rawLines.length && isMarkdownDelimiterLine(rawLines[idx + 1])) {
        // Table detected!
        // Header line:
        const headerCells = originalLine
          .split('|')
          .map((c) => c.trim())
          .filter((_, colI, arr) => colI > 0 && colI < arr.length - 1);

        // Columns are header cells from index 1 onward (index 0 is Row Header e.g. "Tiêu chí" or empty)
        const colLabels = headerCells.slice(1);

        // Advance past header and delimiter:
        idx += 2;
        const rowLabels: string[] = [];

        while (idx < rawLines.length && isMarkdownTableLine(rawLines[idx])) {
          const rowCells = rawLines[idx]
            .split('|')
            .map((c) => c.trim())
            .filter((_, colI, arr) => colI > 0 && colI < arr.length - 1);

          if (rowCells.length > 0 && rowCells[0]) {
            rowLabels.push(rowCells[0]);
          }
          idx++;
        }

        if (rowLabels.length > 0 && colLabels.length > 0) {
          // Found valid Markdown Matrix Table!
          // Use previous question's title if waiting, or default
          const qTitle =
            currentQuestion && currentQuestion.title
              ? currentQuestion.title
              : 'Em hãy tự đánh giá theo các tiêu chí và mức lựa chọn dưới đây:';

          currentQuestion = {
            title: qTitle,
            type: 'GRID_MULTI',
            required: false,
            options: [],
            gridRows: rowLabels,
            gridColumns: colLabels
          };
          detectedInputQuestions++;
          flushCurrentQuestion();
          continue;
        }
      }

      // 0. Detect Global Title/Description before any section or question
      if (!isHeaderProcessed && !currentQuestion && sections.length === 0 && detectedInputQuestions === 0) {
        if (/^(tiêu\s*đề|tên\s*khảo\s*sát|title)[\:\-]\s*(.*)$/i.test(line)) {
          surveyTitle = line.replace(/^(tiêu\s*đề|tên\s*khảo\s*sát|title)[\:\-]\s*/i, '').trim();
          idx++;
          continue;
        }
        if (/^(mô\s*tả|hướng\s*dẫn|description)[\:\-]\s*(.*)$/i.test(line)) {
          surveyDescription = line.replace(/^(mô\s*tả|hướng\s*dẫn|description)[\:\-]\s*/i, '').trim();
          idx++;
          continue;
        }
      }

      // 1. Detect Section Headers
      const sectionMatch = line.match(
        /^(phần\s+([0-9ivxLCDM]+|[A-Za-z])[\.\:\/\-]?\s*(.*)|^([IVXLCDM]{1,6})[\.\:\/\-]\s+(.+)|^section\s+([0-9]+)[\.\:\/\-]?\s*(.*)|^chủ\s*đề\s+([0-9ivxLCDM]+)[\.\:\/\-]?\s*(.*))/i
      );

      const isRomanSection =
        sectionMatch &&
        (/^([IVXLCDM]{1,6})[\.\:\/\-]\s+(.+)$/i.test(line)
          ? !/^(câu|q[0-9]|bài)/i.test(sectionMatch[5] || '')
          : true);

      if (sectionMatch && isRomanSection) {
        isHeaderProcessed = true;
        flushCurrentSection();
        sectionIndex++;
        questionIndex = 1;
        currentSection = {
          id: `sec-freeform-${Date.now()}-${sectionIndex}`,
          title: line,
          order: sectionIndex,
          questions: []
        };
        idx++;
        continue;
      }

      // 2. Detect Grid Row Header: "Các dòng:", "Dòng:", "Các hàng:", "Hàng:", "Các tiêu chí:", "Tiêu chí:", "Rows:"
      const isGridRowsHeader = /^(các\s*)?(dòng|hàng|tiêu\s*chí|nội\s*dung|danh\s*sách\s*dòng|danh\s*sách\s*tiêu\s*chí|rows?)[\:\-]?\s*$/i.test(
        line
      );
      if (isGridRowsHeader) {
        if (!currentQuestion) {
          currentQuestion = {
            title: 'Khảo sát ma trận',
            type: 'GRID_MULTI',
            required: false,
            options: []
          };
          detectedInputQuestions++;
        }
        currentQuestion.collectMode = 'ROWS';
        currentQuestion.gridRows = currentQuestion.gridRows || [];
        if (!currentQuestion.type) currentQuestion.type = 'GRID_MULTI';
        idx++;
        continue;
      }

      // 3. Detect Grid Column Header: "Các mức đánh giá:", "Mức đánh giá:", "Các mức lựa chọn:", "Các cột:", "Cột:", "Mức:", "Columns:", "Thang đo:"
      const isGridColsHeader = /^(các\s*)?(mức(\s*đánh\s*giá|\s*lựa\s*chọn|\s*đo)?|cột|thang\s*đo|phương\s*án\s*đánh\s*giá|danh\s*sách\s*cột|columns?|levels?|ratings?|scales?)[\:\-]?\s*$/i.test(
        line
      );
      if (isGridColsHeader) {
        if (!currentQuestion) {
          currentQuestion = {
            title: 'Khảo sát ma trận',
            type: 'GRID_MULTI',
            required: false,
            options: []
          };
          detectedInputQuestions++;
        }
        currentQuestion.collectMode = 'COLUMNS';
        currentQuestion.gridColumns = currentQuestion.gridColumns || [];
        if (!currentQuestion.type) currentQuestion.type = 'GRID_MULTI';
        idx++;
        continue;
      }

      // 4. If currentQuestion is currently collecting ROWS or COLUMNS:
      // Numbered lines "1. ...", bullets "- ...", or raw lines belong to the grid row/column list!
      // Do NOT break into a new question!
      if (currentQuestion && (currentQuestion.collectMode === 'ROWS' || currentQuestion.collectMode === 'COLUMNS')) {
        // Only break out if the line is an explicit new question or section
        const isExplicitNewQuestion = /^(câu\s*hỏi\s+[0-9]+|câu\s+[0-9]+|bài\s+[0-9]+|q[0-9]+)[\.\:\/\)\-]/i.test(
          line
        );
        const isExplicitNewSection = /^(phần\s+[0-9]+|section\s+[0-9]+)/i.test(line);

        if (!isExplicitNewQuestion && !isExplicitNewSection) {
          // Check if line is switching mode to COLUMNS or ROWS
          if (isGridColsHeader) {
            currentQuestion.collectMode = 'COLUMNS';
            currentQuestion.gridColumns = currentQuestion.gridColumns || [];
            idx++;
            continue;
          }
          if (isGridRowsHeader) {
            currentQuestion.collectMode = 'ROWS';
            currentQuestion.gridRows = currentQuestion.gridRows || [];
            idx++;
            continue;
          }

          // Otherwise, it's an item (row or column)
          const itemText = this.cleanOptionLine(line);
          if (itemText) {
            if (currentQuestion.collectMode === 'ROWS') {
              currentQuestion.gridRows = currentQuestion.gridRows || [];
              currentQuestion.gridRows.push(itemText);
            } else {
              currentQuestion.gridColumns = currentQuestion.gridColumns || [];
              currentQuestion.gridColumns.push(itemText);
            }
          }
          idx++;
          continue;
        }
      }

      // 5. Detect Question Starts
      // Formats:
      // "Câu 1: ...", "Câu 1. ...", "Câu hỏi 1: ...", "Câu hỏi:", "Câu hỏi", "1. ...", "1/ ...", "1) ..."
      const questionMatch = line.match(
        /^(câu\s*hỏi(\s+[0-9]+)?|câu\s+[0-9]+|bài\s+[0-9]+|q[0-9]+|q\.[0-9]+|[0-9]+)[\.\:\/\)\-]\s*(.*)$/i
      );

      // Check if line itself is "Câu hỏi:" or "Câu hỏi" with title on same or next line
      const isPlainQuestionHeader = /^(câu\s*hỏi|nội\s*dung\s*câu\s*hỏi)[\:\-]?\s*(.*)$/i.test(line);

      if (questionMatch || (isPlainQuestionHeader && !currentQuestion)) {
        isHeaderProcessed = true;
        flushCurrentQuestion();
        detectedInputQuestions++;

        let rawTitle = '';
        if (questionMatch) {
          rawTitle = questionMatch[3] ? questionMatch[3].trim() : '';
        } else {
          const matchPlain = line.match(/^(câu\s*hỏi|nội\s*dung\s*câu\s*hỏi)[\:\-]?\s*(.*)$/i);
          rawTitle = matchPlain && matchPlain[2] ? matchPlain[2].trim() : '';
        }

        const isBlankTitle = !rawTitle;

        currentQuestion = {
          title: rawTitle,
          options: [],
          required: /(\(bắt buộc\)|\(\*\)|\*)$/i.test(line),
          allowOther: false,
          waitingForTitle: isBlankTitle
        };

        // Check inline type hints in the question line itself e.g. "Câu 1: Ngày sinh (Loại: Ngày)"
        const inlineTypeMatch = line.match(/loại\s*(câu\s*hỏi)?\s*[\:\-]\s*([^\)\,\;]+)/i);
        if (inlineTypeMatch) {
          const detectedType = this.parseTypeFromString(inlineTypeMatch[2]);
          if (detectedType) {
            currentQuestion.type = detectedType;
          }
        }

        idx++;
        continue;
      }

      // 6. Handle Question Content & Attributes
      if (currentQuestion) {
        // A. If waiting for title on the next line
        if (currentQuestion.waitingForTitle) {
          const isAttr = /^(loại\s*(câu\s*hỏi)?|type|dạng|kiểu|hình\s*thức|bắt\s*buộc|required|chọn\s*tối\s*đa|mô\s*tả|description|cho\s*phép|allow)[\:\-]/i.test(
            line
          );
          const isOpt = /^(\-|\•|\+|\*|○|o|□|▪|\[\s*\]|\(\s*\)|\[x\]|\(x\)|🔘|⚪|⚫|⬜|⬛|▫️|⁃|–|—|✦|➤|➢|✓|[A-Za-z][\.\:\)]|[0-9]+[\)])\s*(.*)$/.test(
            line
          );

          if (!isAttr && !isOpt && !isGridRowsHeader && !isGridColsHeader) {
            currentQuestion.title = line;
            currentQuestion.waitingForTitle = false;
            if (/(\(bắt buộc\)|\(\*\)|\*)$/i.test(line)) {
              currentQuestion.required = true;
            }
            idx++;
            continue;
          } else {
            currentQuestion.waitingForTitle = false;
          }
        }

        // B. Type hint line (e.g. "Loại: Lưới nhiều lựa chọn mỗi dòng", "Loại: Đoạn văn", "Loại: Một lựa chọn")
        const typeMatch = line.match(
          /^(loại\s*(câu\s*hỏi)?|type|dạng\s*(câu\s*hỏi)?|hình\s*thức|kiểu\s*(câu\s*hỏi)?)[\:\-]\s*(.*)$/i
        );
        if (typeMatch) {
          const rawTypeVal = typeMatch[typeMatch.length - 1];
          const detectedType = this.parseTypeFromString(rawTypeVal);
          if (detectedType) {
            currentQuestion.type = detectedType;
          }
          idx++;
          continue;
        }

        // C. Required hint line (e.g. "Bắt buộc: Có", "Required: Yes")
        const requiredMatch = line.match(/^(bắt\s*buộc|required|tính\s*chất)[\:\-]\s*(.*)$/i);
        if (requiredMatch) {
          const reqStr = requiredMatch[2].toLowerCase();
          currentQuestion.required =
            reqStr.includes('có') ||
            reqStr.includes('yes') ||
            reqStr.includes('true') ||
            reqStr.includes('1') ||
            reqStr.includes('bắt buộc') ||
            reqStr.includes('đúng');
          idx++;
          continue;
        }

        // D. Max selections hint line
        const maxMatch = line.match(/^(chọn\s*tối\s*đa|tối\s*đa|max\s*selections?)[\:\-]\s*([0-9]+)/i);
        if (maxMatch) {
          currentQuestion.maxSelections = parseInt(maxMatch[2], 10);
          currentQuestion.type = 'MULTI_CHOICE';
          idx++;
          continue;
        }

        // E. Description hint line
        const descMatch = line.match(
          /^(mô\s*tả(\s*\(.*\))?|hướng\s*dẫn|gợi\s*ý|giải\s*thích|lưu\s*ý|description|note)[\:\-]\s*(.*)$/i
        );
        if (descMatch) {
          currentQuestion.description = descMatch[descMatch.length - 1].trim();
          idx++;
          continue;
        }

        // F. Detect Choice Options (A., B., •, -, *, 1), a), etc.)
        const optionMatch = line.match(
          /^(\-|\•|\+|\*|○|o|□|▪|\[\s*\]|\(\s*\)|\[x\]|\(x\)|🔘|⚪|⚫|⬜|⬛|▫️|⁃|–|—|✦|➤|➢|✓|[A-Za-z][\.\:\)]|[0-9]+[\.\)])\s*(.*)$/
        );

        if (optionMatch) {
          const optText = this.cleanOptionLine(line);
          if (optText.length > 0) {
            currentQuestion.options = currentQuestion.options || [];
            if (/^(khác|lựa chọn khác|ý kiến khác|mục khác|other)(\s*(\.{2,}|…|\:|\(.*\)|_+))?$/i.test(optText)) {
              currentQuestion.allowOther = true;
              currentQuestion.options.push(optText);
            } else {
              currentQuestion.options.push(optText);
            }
            idx++;
            continue;
          }
        }

        // G. Fallback for continuous multi-line question title (if no options and no type yet)
        if (
          currentQuestion.title &&
          !currentQuestion.type &&
          currentQuestion.options.length === 0 &&
          line.length < 200 &&
          !/^(câu|phần|bài|q[0-9])/i.test(line)
        ) {
          currentQuestion.title = `${currentQuestion.title} ${line}`;
          idx++;
          continue;
        }
      }

      idx++;
    }

    flushCurrentSection();

    const stats = this.calculateStats(sections);
    const activeSections = sections.filter((s) => s.questions && s.questions.length > 0);

    const isValid = errors.length === 0 && stats.totalQuestions > 0;
    if (!isValid && stats.totalQuestions === 0) {
      errors.push('Không xác định được cấu trúc. Vui lòng sử dụng định dạng mẫu.');
    }

    return {
      title: surveyTitle,
      description: surveyDescription,
      sections: activeSections,
      warnings,
      errors,
      unresolvedCount: stats.needsReviewCount,
      stats,
      validation: {
        isValid,
        inputQuestionCount: detectedInputQuestions || stats.totalQuestions,
        parsedQuestionCount: stats.totalQuestions,
        issues: [...errors]
      }
    };
  }

  /**
   * Helper to calculate aggregate statistics across sections
   */
  private static calculateStats(sections: SurveySection[]) {
    let singleChoiceCount = 0;
    let multiChoiceCount = 0;
    let shortTextCount = 0;
    let longTextCount = 0;
    let scaleCount = 0;
    let dropdownCount = 0;
    let gridCount = 0;
    let dateCount = 0;
    let timeCount = 0;
    let durationCount = 0;
    let needsReviewCount = 0;
    let totalQuestions = 0;

    sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        totalQuestions++;
        if (q.type === 'SINGLE_CHOICE') singleChoiceCount++;
        else if (q.type === 'MULTI_CHOICE') multiChoiceCount++;
        else if (q.type === 'SHORT_TEXT') shortTextCount++;
        else if (q.type === 'LONG_TEXT') longTextCount++;
        else if (q.type === 'SCALE') scaleCount++;
        else if (q.type === 'DROPDOWN') dropdownCount++;
        else if (q.type === 'GRID' || q.type === 'GRID_SINGLE' || q.type === 'GRID_MULTI') gridCount++;
        else if (q.type === 'DATE') dateCount++;
        else if (q.type === 'TIME') timeCount++;
        else if (q.type === 'DURATION') durationCount++;

        if (q.needsReview) needsReviewCount++;
      });
    });

    const activeSections = sections.filter((s) => s.questions && s.questions.length > 0);

    return {
      totalSections: activeSections.length,
      totalQuestions,
      singleChoiceCount,
      multiChoiceCount,
      shortTextCount,
      longTextCount,
      scaleCount,
      dropdownCount,
      gridCount,
      dateCount,
      timeCount,
      durationCount,
      needsReviewCount
    };
  }
}
