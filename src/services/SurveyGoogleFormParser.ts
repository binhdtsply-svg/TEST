/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SurveySection, SurveyQuestion, SurveyQuestionType } from '../types';
import { GoogleFormsService, ParsedGoogleFormInput } from './GoogleFormsService';

export interface GoogleFormParseResult {
  title: string;
  description: string;
  sections: SurveySection[];
  warnings: string[];
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
    needsReviewCount: number;
  };
}

export class SurveyGoogleFormParser {
  /**
   * Main entry point for plain text question parsing (NO HTML scraping).
   */
  public static parse(input: string): GoogleFormParseResult {
    const trimmed = (input || '').trim();

    // Check if input was an iframe or URL accidentally sent to text parse
    const detected = GoogleFormsService.parseGoogleFormInput(trimmed);
    if (
      detected.inputType === 'EDITOR_URL' ||
      detected.inputType === 'RESPONDER_URL' ||
      detected.inputType === 'IFRAME_EDITOR_URL' ||
      detected.inputType === 'IFRAME_RESPONDER_URL'
    ) {
      return {
        title: 'Google Form',
        description: '',
        sections: [],
        warnings: ['Nội dung là liên kết hoặc mã nhúng iframe Google Form. Vui lòng sử dụng tính năng nạp qua Google Forms API.'],
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
          needsReviewCount: 0
        }
      };
    }

    return this.parseTextStructure(trimmed);
  }

  /**
   * Parse from copied text content of Google Form questions (Plain-text fallback)
   */
  public static parseTextStructure(rawText: string): GoogleFormParseResult {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const sections: SurveySection[] = [];
    const warnings: string[] = [];

    let formTitle = 'Phiếu khảo sát từ nội dung văn bản';
    let formDescription = '';

    let currentSection: SurveySection = {
      id: `sec-gf-${Date.now()}-1`,
      title: 'Phần 1: Thông tin khảo sát',
      order: 1,
      questions: []
    };

    let currentQuestion: Partial<SurveyQuestion> | null = null;
    let questionIndex = 1;
    let isHeaderProcessed = false;

    // Helper to push current question
    const flushCurrentQuestion = () => {
      if (!currentQuestion || !currentQuestion.title || currentQuestion.title.trim() === '') {
        return;
      }

      let type: SurveyQuestionType = currentQuestion.type || 'SHORT_TEXT';
      const options = currentQuestion.options || [];
      let allowOther = currentQuestion.allowOther || false;

      const cleanedOptions: string[] = [];
      for (const opt of options) {
        if (/^(khác|lựa chọn khác|mục khác|other)(\s*(\.{2,}|…|\:|\(.*\)))?$/i.test(opt.trim())) {
          allowOther = true;
        } else {
          cleanedOptions.push(opt);
        }
      }

      // Infer type if options exist
      if (!currentQuestion.type) {
        if (cleanedOptions.length > 0 || allowOther) {
          type = 'SINGLE_CHOICE';
        } else {
          type = 'SHORT_TEXT';
        }
      }

      const q: SurveyQuestion = {
        id: currentQuestion.id || `q-gf-${Date.now()}-${questionIndex}`,
        key: currentQuestion.key || `q_gf_${questionIndex}_${Date.now().toString(36)}`,
        title: currentQuestion.title.replace(/\s*\*$/, ''),
        description: currentQuestion.description || '',
        type,
        required: currentQuestion.required ?? false,
        options: cleanedOptions.length > 0 ? cleanedOptions : undefined,
        allowOther: allowOther || undefined,
        visibility: currentQuestion.visibility || 'NORMAL',
        needsReview: currentQuestion.needsReview,
        reviewReason: currentQuestion.reviewReason,
        order: questionIndex
      };

      currentSection.questions.push(q);
      questionIndex++;
      currentQuestion = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip common Google Form UI artifacts
      if (/^(\* Bắt buộc|\* Required|Câu trả lời của bạn|Your answer|Xóa lựa chọn|Clear selection|Mục 1 lựa chọn|Mục nhiều lựa chọn|Đoạn văn)$/i.test(line)) {
        continue;
      }

      // First few lines may be form title / description
      if (!isHeaderProcessed && i === 0 && !/^(\d+[\.\:\)]|câu\s*\d+|phần\s*\d+|section\s*\d+)/i.test(line)) {
        formTitle = line;
        if (lines[1] && !/^(\d+[\.\:\)]|câu\s*\d+|phần\s*\d+|\*)/i.test(lines[1])) {
          formDescription = lines[1];
          i++;
        }
        isHeaderProcessed = true;
        continue;
      }
      isHeaderProcessed = true;

      // Section Break Detection
      const sectionMatch = line.match(/^(phần|section|mục)\s*(\d+)?[\:\.\-]\s*(.*)$/i);
      if (sectionMatch) {
        flushCurrentQuestion();
        if (currentSection.questions.length > 0) {
          sections.push(currentSection);
        }
        const secTitle = sectionMatch[3] ? line : `Phần ${sections.length + 1}: ${line}`;
        currentSection = {
          id: `sec-gf-${Date.now()}-${sections.length + 1}`,
          title: secTitle,
          order: sections.length + 1,
          questions: []
        };
        continue;
      }

      // Question Numbering Detection
      const qMatch = line.match(/^(\d+[\.\:\)]|\bCâu\s*\d+[\.\:\)]|\bQ\d+[\.\:\)])\s*(.+)$/i);
      const isGoogleFormUnnumberedQuestion = !qMatch && (
        lines[i + 1] === 'Câu trả lời của bạn' ||
        lines[i + 1] === 'Your answer' ||
        lines[i + 1]?.startsWith('( )') ||
        lines[i + 1]?.startsWith('[ ]') ||
        lines[i + 1]?.startsWith('○') ||
        lines[i + 1]?.startsWith('□')
      );

      if (qMatch || isGoogleFormUnnumberedQuestion) {
        flushCurrentQuestion();

        const rawTitle = qMatch ? qMatch[2].trim() : line;
        const isRequired = rawTitle.endsWith('*') || line.includes('*');

        currentQuestion = {
          id: `q-gf-${Date.now()}-${questionIndex}`,
          key: `q_gf_${questionIndex}_${Date.now().toString(36)}`,
          title: rawTitle.replace(/\s*\*$/, ''),
          required: isRequired,
          options: []
        };
        continue;
      }

      // If we are currently tracking a question, check for its properties/options
      if (currentQuestion) {
        // Detect Question Type hint
        const typeHintMatch = line.match(/^(loại|dạng|kiểu|type)\s*[\:\=]\s*(.+)$/i);
        if (typeHintMatch) {
          const typeStr = typeHintMatch[2].toLowerCase();
          if (typeStr.includes('nhiều') || typeStr.includes('checkbox') || typeStr.includes('hộp kiểm')) {
            currentQuestion.type = 'MULTI_CHOICE';
          } else if (typeStr.includes('một') || typeStr.includes('trắc nghiệm') || typeStr.includes('radio')) {
            currentQuestion.type = 'SINGLE_CHOICE';
          } else if (typeStr.includes('ngắn') || typeStr.includes('short')) {
            currentQuestion.type = 'SHORT_TEXT';
          } else if (typeStr.includes('dài') || typeStr.includes('đoạn') || typeStr.includes('paragraph')) {
            currentQuestion.type = 'LONG_TEXT';
          } else if (typeStr.includes('thang') || typeStr.includes('scale') || typeStr.includes('đánh giá')) {
            currentQuestion.type = 'SCALE';
          } else if (typeStr.includes('thả') || typeStr.includes('dropdown')) {
            currentQuestion.type = 'DROPDOWN';
          }
          continue;
        }

        // Detect Multi Choice (Checkboxes)
        const multiChoiceOptMatch = line.match(/^(\[\s*\]|□|☑|■)\s*(.+)$/);
        if (multiChoiceOptMatch) {
          currentQuestion.type = 'MULTI_CHOICE';
          currentQuestion.options = currentQuestion.options || [];
          currentQuestion.options.push(multiChoiceOptMatch[2].trim());
          continue;
        }

        // Detect Single Choice (Radio)
        const singleChoiceOptMatch = line.match(/^(\(\s*\)|○|●|◯)\s*(.+)$/);
        if (singleChoiceOptMatch) {
          currentQuestion.type = 'SINGLE_CHOICE';
          currentQuestion.options = currentQuestion.options || [];
          currentQuestion.options.push(singleChoiceOptMatch[2].trim());
          continue;
        }

        // Detect Standard Bullet Options (- / * / + / a. / b.)
        const bulletOptMatch = line.match(/^([\-\*\+]\s+|[a-zA-Z]\.|\d+\.)\s*(.+)$/);
        if (bulletOptMatch) {
          currentQuestion.options = currentQuestion.options || [];
          currentQuestion.options.push(bulletOptMatch[2].trim());
          continue;
        }

        // Detect "Mục khác:" / "Khác..."
        if (/^(khác|mục khác|other)(\s*(\.{2,}|…|\:))?$/i.test(line)) {
          currentQuestion.allowOther = true;
          continue;
        }

        // Fallback: If line is short plain text, treat as option if previous lines had options
        if (currentQuestion.options && currentQuestion.options.length > 0 && line.length < 120) {
          currentQuestion.options.push(line);
          continue;
        }
      }
    }

    flushCurrentQuestion();

    if (currentSection.questions.length > 0) {
      sections.push(currentSection);
    }

    return this.computeResultStats(formTitle, formDescription, sections);
  }

  /**
   * Helper to calculate aggregate stats and warnings
   */
  private static computeResultStats(title: string, description: string, sections: SurveySection[]): GoogleFormParseResult {
    let singleChoiceCount = 0;
    let multiChoiceCount = 0;
    let shortTextCount = 0;
    let longTextCount = 0;
    let scaleCount = 0;
    let dropdownCount = 0;
    let gridCount = 0;
    let needsReviewCount = 0;
    let totalQuestions = 0;

    const warnings: string[] = [];

    sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        totalQuestions++;
        switch (q.type) {
          case 'SINGLE_CHOICE':
            singleChoiceCount++;
            break;
          case 'MULTI_CHOICE':
            multiChoiceCount++;
            break;
          case 'SHORT_TEXT':
            shortTextCount++;
            break;
          case 'LONG_TEXT':
            longTextCount++;
            break;
          case 'SCALE':
            scaleCount++;
            break;
          case 'DROPDOWN':
            dropdownCount++;
            break;
          case 'GRID':
            gridCount++;
            break;
        }
        if (q.needsReview) {
          needsReviewCount++;
        }
      });
    });

    if (totalQuestions === 0) {
      warnings.push('Chưa tìm thấy câu hỏi hợp lệ trong nội dung đã cung cấp.');
    }

    return {
      title,
      description,
      sections,
      warnings,
      unresolvedCount: needsReviewCount,
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
}
