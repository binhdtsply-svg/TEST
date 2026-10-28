/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  Packer,
  convertInchesToTwip
} from 'docx';
import { classService } from './ClassService';

export interface DocumentMetadata {
  title: string;
  subtitle?: string;
  documentType?: 'plan' | 'report' | 'parent_letter' | 'situation' | 'game' | 'general' | 'analysis';
  schoolName?: string;
  className?: string;
  teacherName?: string;
  academicYear?: string;
  semester?: string;
  date?: string;
}

export interface StructuredSection {
  heading?: string;
  subheading?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface StructuredDocument {
  metadata: DocumentMetadata;
  sections: StructuredSection[];
}

export class WordExportService {
  /**
   * Helper to trigger client download of a generated Blob
   */
  private triggerDownload(blob: Blob, filename: string): void {
    const safeFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /**
   * Format document header with administrative National Header (Quốc hiệu & Tiêu ngữ) or general metadata
   */
  private createHeaderParagraphs(meta: DocumentMetadata): Array<Paragraph | Table> {
    const settings = classService.getSettings();
    const school = meta.schoolName || settings.schoolName || 'TRƯỜNG THPT';
    const className = meta.className || settings.className || 'LỚP CHỦ NHIỆM';
    const teacher = meta.teacherName || settings.homeroomTeacherName || settings.teacherName || 'GVCN';
    const year = meta.academicYear || settings.academicYear || '2025 - 2026';

    const isAdministrative = meta.documentType === 'report' || meta.documentType === 'plan';

    if (isAdministrative) {
      const noBorder = {
        style: BorderStyle.NONE,
        size: 0,
        color: 'auto'
      };

      const adminHeaderTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder,
          bottom: noBorder,
          left: noBorder,
          right: noBorder,
          insideHorizontal: noBorder,
          insideVertical: noBorder
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 45, type: WidthType.PERCENTAGE },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 30 },
                    children: [
                      new TextRun({
                        text: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
                        font: 'Times New Roman',
                        size: 22 // 11pt
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 30 },
                    children: [
                      new TextRun({
                        text: school.toUpperCase(),
                        font: 'Times New Roman',
                        size: 22, // 11pt
                        bold: true
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: `Lớp: ${className}`,
                        font: 'Times New Roman',
                        size: 22,
                        italics: true,
                        bold: true
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({
                        text: '-------------------',
                        font: 'Times New Roman',
                        size: 18,
                        color: '555555'
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 55, type: WidthType.PERCENTAGE },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 30 },
                    children: [
                      new TextRun({
                        text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                        font: 'Times New Roman',
                        size: 22, // 11pt
                        bold: true
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({
                        text: 'Độc lập - Tự do - Hạnh phúc',
                        font: 'Times New Roman',
                        size: 22, // 11pt
                        bold: true
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({
                        text: '-----------------------',
                        font: 'Times New Roman',
                        size: 18,
                        bold: true
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      return [adminHeaderTable];
    }

    return [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `TRƯỜNG/ĐƠN VỊ: ${school.toUpperCase()}`,
            font: 'Times New Roman',
            size: 24, // 12pt
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `LỚP: ${className}   |   GVCN: ${teacher}   |   NĂM HỌC: ${year}`,
            font: 'Times New Roman',
            size: 22, // 11pt
            italics: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 180, after: 120 },
        children: [
          new TextRun({
            text: '--------------------------------------------------',
            font: 'Times New Roman',
            size: 18,
            color: '666666'
          })
        ]
      })
    ];
  }

  /**
   * Convert markdown text into structured paragraphs, headings, bullets, and tables
   */
  private parseMarkdownToDocxElements(content: string): Array<Paragraph | Table> {
    const lines = content.split('\n');
    const elements: Array<Paragraph | Table> = [];
    let currentTableRows: string[][] = [];

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        const table = this.createDocxTableFromRows(currentTableRows);
        if (table) elements.push(table);
        currentTableRows = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for Markdown table line e.g. | Col 1 | Col 2 |
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        // Ignore separator line e.g. |---|---|
        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          continue;
        }
        currentTableRows.push(cells);
        continue;
      } else {
        flushTable();
      }

      if (!line) {
        // Empty line spacing
        elements.push(
          new Paragraph({
            spacing: { after: 100 },
            children: []
          })
        );
        continue;
      }

      // Check Heading 1 (# or ###)
      if (line.startsWith('# ')) {
        elements.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: line.replace(/^#\s+/, '').replace(/\*\*/g, ''),
                font: 'Times New Roman',
                size: 28, // 14pt
                bold: true
              })
            ]
          })
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: line.replace(/^##\s+/, '').replace(/\*\*/g, ''),
                font: 'Times New Roman',
                size: 26, // 13pt
                bold: true
              })
            ]
          })
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 },
            children: [
              new TextRun({
                text: line.replace(/^###\s+/, '').replace(/\*\*/g, ''),
                font: 'Times New Roman',
                size: 26, // 13pt
                bold: true
              })
            ]
          })
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: line.replace(/^####\s+/, '').replace(/\*\*/g, ''),
                font: 'Times New Roman',
                size: 26,
                bold: true
              })
            ]
          })
        );
      } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
        // Bullet list item
        const text = line.replace(/^[-*•]\s+/, '');
        elements.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60, line: 280 },
            children: this.parseInlineFormatting(text)
          })
        );
      } else if (/^\d+[\.\)]\s+/.test(line)) {
        // Numbered list item
        const numMatch = line.match(/^(\d+[\.\)])\s+(.*)$/);
        const prefix = numMatch ? numMatch[1] : '';
        const text = numMatch ? numMatch[2] : line;
        elements.push(
          new Paragraph({
            spacing: { after: 80, line: 280 },
            children: [
              new TextRun({
                text: `${prefix} `,
                font: 'Times New Roman',
                size: 26,
                bold: true
              }),
              ...this.parseInlineFormatting(text)
            ]
          })
        );
      } else {
        // Regular paragraph
        elements.push(
          new Paragraph({
            spacing: { after: 120, line: 300 }, // 1.25x line spacing
            alignment: AlignmentType.BOTH, // Justified
            children: this.parseInlineFormatting(line)
          })
        );
      }
    }

    flushTable();
    return elements;
  }

  /**
   * Parse **bold** and *italic* inside text lines
   */
  private parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        runs.push(
          new TextRun({
            text: text.slice(lastIndex, match.index),
            font: 'Times New Roman',
            size: 26 // 13pt
          })
        );
      }

      const matchText = match[0];
      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        runs.push(
          new TextRun({
            text: matchText.slice(2, -2),
            font: 'Times New Roman',
            size: 26,
            bold: true
          })
        );
      } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
        runs.push(
          new TextRun({
            text: matchText.slice(1, -1),
            font: 'Times New Roman',
            size: 26,
            italics: true
          })
        );
      } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        runs.push(
          new TextRun({
            text: matchText.slice(1, -1),
            font: 'Times New Roman',
            size: 24,
            bold: true,
            color: '1E40AF'
          })
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex),
          font: 'Times New Roman',
          size: 26
        })
      );
    }

    return runs.length > 0
      ? runs
      : [
          new TextRun({
            text,
            font: 'Times New Roman',
            size: 26
          })
        ];
  }

  /**
   * Create a native DOCX table with borders, padding, and styled header
   */
  private createDocxTableFromRows(rows: string[][]): Table | null {
    if (!rows || rows.length === 0) return null;

    const colCount = Math.max(...rows.map((r) => r.length));
    if (colCount === 0) return null;

    const tableRows: TableRow[] = [];

    rows.forEach((row, rowIdx) => {
      const isHeader = rowIdx === 0;
      const cells: TableCell[] = [];

      for (let c = 0; c < colCount; c++) {
        const text = row[c] || '';
        cells.push(
          new TableCell({
            width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
            shading: isHeader ? { fill: 'E2E8F0' } : rowIdx % 2 === 1 ? { fill: 'F8FAFC' } : undefined,
            margins: {
              top: 120,
              bottom: 120,
              left: 140,
              right: 140
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }
            },
            children: [
              new Paragraph({
                alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text,
                    font: 'Times New Roman',
                    size: 24, // 12pt
                    bold: isHeader
                  })
                ]
              })
            ]
          })
        );
      }

      tableRows.push(new TableRow({ children: cells }));
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows
    });
  }

  /**
   * Generate signature section for Vietnamese administrative format
   */
  private createSignatureSection(teacherName?: string): Paragraph[] {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    return [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 360, after: 60 },
        children: [
          new TextRun({
            text: `Ngày ${day} tháng ${month} năm ${year}`,
            font: 'Times New Roman',
            size: 26,
            italics: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 720 }, // space for signature
        children: [
          new TextRun({
            text: 'GIÁO VIÊN CHỦ NHIỆM',
            font: 'Times New Roman',
            size: 26,
            bold: true
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: teacherName || 'Giáo viên Chủ nhiệm',
            font: 'Times New Roman',
            size: 26,
            bold: true
          })
        ]
      })
    ];
  }

  /**
   * Main export method: Export raw or markdown AI text response to real .docx
   */
  public async exportAIResponseToWord(
    title: string,
    content: string,
    metadata?: Partial<DocumentMetadata>,
    customFilename?: string
  ): Promise<void> {
    const settings = classService.getSettings();
    const teacher = metadata?.teacherName || settings.homeroomTeacherName || settings.teacherName || 'GVCN';

    const fullMeta: DocumentMetadata = {
      title,
      subtitle: metadata?.subtitle,
      schoolName: metadata?.schoolName || settings.schoolName,
      className: metadata?.className || settings.className,
      teacherName: teacher,
      academicYear: metadata?.academicYear || settings.academicYear,
      semester: metadata?.semester || settings.semester
    };

    const headerParagraphs = this.createHeaderParagraphs(fullMeta);

    const titleParagraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 180 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          font: 'Times New Roman',
          size: 32, // 16pt
          bold: true
        })
      ]
    });

    const bodyElements = this.parseMarkdownToDocxElements(content);
    const signatureSection = this.createSignatureSection(teacher);

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8), // ~2cm
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(1.0), // ~2.5cm
                right: convertInchesToTwip(0.8)
              }
            }
          },
          children: [
            ...headerParagraphs,
            titleParagraph,
            ...bodyElements,
            ...signatureSection
          ]
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    const defaultFilename = `${title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '')}_${settings.className || 'Lop'}.docx`;
    this.triggerDownload(blob, customFilename || defaultFilename);
  }

  /**
   * Export Homeroom Plan to Word
   */
  public async exportHomeroomPlanToWord(
    planType: string,
    planTitle: string,
    content: string,
    customFilename?: string
  ): Promise<void> {
    const settings = classService.getSettings();
    const classNameClean = (settings.className || 'Lop').replace(/\s+/g, '_');
    const safeTitle = `Ke_hoach_chu_nhiem_${classNameClean}_${planType}`;
    await this.exportAIResponseToWord(planTitle, content, { documentType: 'plan' }, customFilename || `${safeTitle}.docx`);
  }

  /**
   * Export Homeroom Report to Word
   */
  public async exportReportToWord(
    period: string,
    reportTitle: string,
    content: string,
    customFilename?: string
  ): Promise<void> {
    const settings = classService.getSettings();
    const classNameClean = (settings.className || 'Lop').replace(/\s+/g, '_');
    const safeTitle = `Bao_cao_chu_nhiem_${classNameClean}_${period.replace(/\s+/g, '_')}`;
    await this.exportAIResponseToWord(reportTitle, content, { documentType: 'report' }, customFilename || `${safeTitle}.docx`);
  }

  /**
   * Export Parent Letter / Notice to Word
   */
  public async exportParentLetterToWord(
    letterTitle: string,
    content: string,
    customFilename?: string
  ): Promise<void> {
    const settings = classService.getSettings();
    const classNameClean = (settings.className || 'Lop').replace(/\s+/g, '_');
    const safeTitle = `Thu_gui_phu_huynh_${classNameClean}`;
    await this.exportAIResponseToWord(letterTitle, content, { documentType: 'parent_letter' }, customFilename || `${safeTitle}.docx`);
  }

  /**
   * Export Situation Consultation to Word
   */
  public async exportSituationConsultationToWord(
    situationTitle: string,
    content: string,
    customFilename?: string
  ): Promise<void> {
    const settings = classService.getSettings();
    const classNameClean = (settings.className || 'Lop').replace(/\s+/g, '_');
    const safeTitle = `Tu_van_tinh_huong_chu_nhiem_${classNameClean}`;
    await this.exportAIResponseToWord(situationTitle, content, { documentType: 'situation' }, customFilename || `${safeTitle}.docx`);
  }

  /**
   * Export Classroom Game to Word
   */
  public async exportClassroomGameToWord(
    gameTitle: string,
    content: string,
    customFilename?: string
  ): Promise<void> {
    const settings = classService.getSettings();
    const classNameClean = (settings.className || 'Lop').replace(/\s+/g, '_');
    const safeTitle = `Tro_choi_sinh_hoat_lop_${classNameClean}`;
    await this.exportAIResponseToWord(gameTitle, content, { documentType: 'game' }, customFilename || `${safeTitle}.docx`);
  }

  /**
   * Export Periodical Conduct Evaluation & Meeting Minutes to Word
   */
  public async exportConductMeetingMinutesWord(
    evaluation: any,
    customFilename?: string
  ): Promise<void> {
    const settings = classService.getSettings();
    const className = settings.className || '12A1';
    const schoolYear = evaluation.schoolYear || settings.academicYear || '2025 - 2026';
    const minutes = evaluation.meetingMinutes || {};

    const totalStudents = evaluation.evaluations?.length || 0;
    let countGood = 0;
    let countFair = 0;
    let countPass = 0;
    let countFail = 0;

    evaluation.evaluations?.forEach((e: any) => {
      const g = e.finalGrade;
      if (g === 'Tốt') countGood++;
      else if (g === 'Khá') countFair++;
      else if (g === 'Đạt') countPass++;
      else if (g === 'Chưa đạt') countFail++;
    });

    const pctGood = totalStudents > 0 ? ((countGood / totalStudents) * 100).toFixed(1) : '0';
    const pctFair = totalStudents > 0 ? ((countFair / totalStudents) * 100).toFixed(1) : '0';
    const pctPass = totalStudents > 0 ? ((countPass / totalStudents) * 100).toFixed(1) : '0';
    const pctFail = totalStudents > 0 ? ((countFail / totalStudents) * 100).toFixed(1) : '0';

    const mdContent = `
# BIÊN BẢN HỌP XÉT ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN HỌC SINH
## ${evaluation.periodTitle || 'Đánh giá xếp loại rèn luyện'}

### I. THỜI GIAN, ĐỊA ĐIỂM VÀ THÀNH PHẦN THAM DỰ
- **Thời gian**: ${minutes.meetingTime || '15:30'}, ngày ${minutes.meetingDate || '..../..../2025'}
- **Địa điểm**: ${minutes.meetingLocation || `Phòng học Lớp ${className}`}
- **Chủ tọa (Chủ trì)**: ${minutes.presidedBy || settings.homeroomTeacherName || 'GVCN Mai Lan'}
- **Thư ký cuộc họp**: ${minutes.secretary || 'Bùi Tâm Anh (Lớp trưởng)'}
- **Thành phần tham dự**: ${minutes.attendeesCount || totalStudents}/${totalStudents} học sinh có mặt.
- **Vắng mặt**: ${minutes.absentCount || 0} học sinh (${minutes.absentReason || 'Không'}).

### II. NỘI DUNG VÀ TIẾN TRÌNH CUỘC HỌP
${minutes.meetingAgenda || '1. Quán triệt quy chế đánh giá rèn luyện.\n2. Báo cáo nề nếp thi đua.\n3. Cá nhân và tổ đóng góp ý kiến.\n4. Biểu quyết và kết luận.'}

### III. BẢNG TỔNG HỢP THỐNG KÊ KẾT QUẢ XẾP LOẠI
| Mức xếp loại | Số lượng (học sinh) | Tỷ lệ (%) | Ghi chú |
| --- | --- | --- | --- |
| **Tốt** | ${countGood} | ${pctGood}% | Xuất sắc, chấp hành nghiêm nội quy, tích cực hoạt động |
| **Khá** | ${countFair} | ${pctFair}% | Đạt yêu cầu rèn luyện, còn một vài nhắc nhở nhỏ |
| **Đạt** | ${countPass} | ${pctPass}% | Cần cố gắng rèn luyện, nâng cao ý thức tự giác |
| **Chưa đạt** | ${countFail} | ${pctFail}% | Vi phạm nhiều lần hoặc chưa có sự chuyển biến tích cực |
| **TỔNG CỘNG** | **${totalStudents}** | **100%** | **Sĩ số toàn lớp** |

### IV. DANH SÁCH CHI TIẾT ĐÁNH GIÁ, XẾP LOẠI TỪNG HỌC SINH
| STT | Mã HS | Họ và tên học sinh | Tổ | Tự ĐG | Tập thể ĐG | GVCN ĐG | Kết quả | Ghi chú / Tóm tắt rèn luyện |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${evaluation.evaluations?.map((e: any, idx: number) => 
  `| ${idx + 1} | ${e.studentCode || ''} | ${e.studentName || ''} | Tổ ${e.group || 1} | ${e.selfAssessment || '-'} | ${e.collectiveAssessment || '-'} | ${e.teacherAssessment || '-'} | **${e.finalGrade || '-'}** | ${e.autoSummaryNote ? e.autoSummaryNote.replace(/\|/g, ';') : (e.teacherNote || '-')} |`
).join('\n')}

### V. Ý KIẾN ĐÓNG GÓP CỦA TẬP THỂ VÀ KẾT LUẬN
- **Ý kiến tập thể lớp**: ${minutes.collectiveOpinion || 'Tập thể lớp nhất trí 100% với kết quả đánh giá, không có khiếu nại hay thắc mắc.'}
- **Kết luận của Giáo viên chủ nhiệm**: ${minutes.teacherConclusion || 'Biểu dương các học sinh đạt thành tích tốt. Nhắc nhở các bạn còn hạn chế nhanh chóng rèn luyện, khắc phục.'}

Cuộc họp kết thúc vào lúc 17:00 cùng ngày. Biên bản đã được thông qua toàn thể cuộc họp và nhất trí lưu hồ sơ sổ chủ nhiệm số.

| THƯ KÝ CUỘC HỌP | CHỦ TỌA / GIÁO VIÊN CHỦ NHIỆM |
| --- | --- |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| **${minutes.secretary || 'Lớp trưởng'}** | **${minutes.presidedBy || settings.homeroomTeacherName || 'GVCN Mai Lan'}** |
`;

    const cleanName = (evaluation.periodTitle || 'Bien_ban_danh_gia_ren_luyen')
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    await this.exportAIResponseToWord(
      `BIÊN BẢN HỌP XÉT ĐÁNH GIÁ RÈN LUYỆN ${className}`,
      mdContent,
      {
        documentType: 'report',
        schoolName: settings.schoolName,
        className: className,
        academicYear: schoolYear,
        teacherName: minutes.presidedBy || settings.homeroomTeacherName
      },
      customFilename || `Bien_Ban_Danh_Gia_Ren_Luyen_${className}_${cleanName}.docx`
    );
  }
}

export const wordExportService = new WordExportService();
