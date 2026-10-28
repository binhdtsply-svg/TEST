/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SurveyTextParser, ParseResult } from './SurveyTextParser';

export class DocxImportService {
  /**
   * Reads a .docx File object from browser input, extracts text, and parses into survey structure
   */
  public static async parseDocxFile(file: File): Promise<ParseResult> {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      throw new Error('Định dạng tệp không được hỗ trợ. Hệ thống chỉ hỗ trợ tệp Microsoft Word định dạng .docx.');
    }

    try {
      const mammothModule = await import('mammoth');
      const mammoth = (mammothModule as any).default || mammothModule;
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      if (!text || text.trim().length === 0) {
        throw new Error('Tệp Word rỗng hoặc không trích xuất được nội dung văn bản.');
      }

      return SurveyTextParser.parse(text);
    } catch (err: any) {
      console.error('Lỗi khi đọc file DOCX:', err);
      throw new Error(err.message || 'Không thể đọc nội dung file .docx. Vui lòng kiểm tra lại định dạng tệp.');
    }
  }
}
