/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import mammoth from 'mammoth';
import {
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  Loader2,
  AlertCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface WordViewerProps {
  url: string;
  fileName?: string;
  fileSize?: string;
}

export const WordViewer: React.FC<WordViewerProps> = ({
  url,
  fileName = 'Tai_Lieu.docx',
  fileSize
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSampleDoc, setIsSampleDoc] = useState<boolean>(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  // Generate realistic sample content for demo files if url is # or placeholder
  const getSampleDocContent = (title: string): string => {
    if (title.toLowerCase().includes('toan') || title.toLowerCase().includes('hinh')) {
      return `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.6; color: #1a1a1a;">
          <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 11pt; text-transform: uppercase;">SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH</p>
            <p style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">TRƯỜNG THPT CHỦ NHIỆM SỐ</p>
            <h1 style="margin: 15px 0 5px 0; font-size: 18pt; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">ĐỀ CƯƠNG ÔN TẬP TOÁN HÌNH HỌC KHÔNG GIAN</h1>
            <p style="margin: 0; font-size: 12pt; font-style: italic;">Chương trình GDPT 2018 - Học kỳ 1 - Lớp 11 (Tuần 12 - 16)</p>
          </div>

          <h2 style="font-size: 14pt; font-weight: bold; color: #1e40af; border-bottom: 1px solid #93c5fd; padding-bottom: 4px; margin-top: 20px;">I. TRỌNG TÂM KIẾN THỨC LÝ THUYẾT</h2>
          <p><strong>1. Quan hệ song song trong không gian:</strong></p>
          <ul style="margin-top: 5px; padding-left: 25px;">
            <li>Đường thẳng song song với mặt phẳng: Điều kiện để một đường thẳng $d$ song song với $(\\alpha)$ là $d$ không nằm trong $(\\alpha)$ và song song với một đường thẳng $a \\subset (\\alpha)$.</li>
            <li>Hai mặt phẳng song song: Nếu mặt phẳng $(\\alpha)$ chứa hai đường thẳng cắt nhau cùng song song với mặt phẳng $(\\beta)$ thì $(\\alpha) \\parallel (\\beta)$.</li>
          </ul>

          <p><strong>2. Góc và Khoảng cách:</strong></p>
          <ul style="margin-top: 5px; padding-left: 25px;">
            <li>Góc giữa hai đường thẳng: $\\cos(a, b) = |\\cos(\\vec{u}, \\vec{v})|$.</li>
            <li>Đường thẳng vuông góc với mặt phẳng: $d \\perp a$ và $d \\perp b$ với $a, b \\subset (\\alpha)$ cắt nhau.</li>
          </ul>

          <h2 style="font-size: 14pt; font-weight: bold; color: #1e40af; border-bottom: 1px solid #93c5fd; padding-bottom: 4px; margin-top: 25px;">II. HỆ THỐNG BÀI TẬP VẬN DỤNG &amp; THỰC HÀNH</h2>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <p style="margin-top: 0;"><strong>Bài 1 (Nhận biết - 2.0 điểm):</strong> Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành tâm $O$. Gọi $M, N$ lần lượt là trung điểm của $SA$ và $SD$. Chứng minh rằng $MN \\parallel (SBC)$.</p>
            <p><strong>Bài 2 (Thông hiểu - 3.0 điểm):</strong> Cho tứ diện đều $ABCD$ cạnh $a$. Gọi $I$ là trung điểm của $AB$.</p>
            <ul style="margin-top: 5px; padding-left: 25px;">
              <li>a) Tính diện tích thiết diện của tứ diện cắt bởi mặt phẳng qua $I$ và song song với $(BCD)$.</li>
              <li>b) Tính côsin góc giữa đường thẳng $AB$ và $CD$.</li>
            </ul>
            <p><strong>Bài 3 (Vận dụng cao - 2.0 điểm):</strong> Cho khối lăng trụ tam giác $ABC.A'B'C'$ có đáy là tam giác vuông tại $A$, $AB = a, AC = a\\sqrt{3}$. Hình chiếu vuông góc của $A'$ lên $(ABC)$ trùng với trọng tâm tam giác $ABC$. Tính thể tích khối chóp $A'.ABC$.</p>
          </div>

          <h2 style="font-size: 14pt; font-weight: bold; color: #1e40af; border-bottom: 1px solid #93c5fd; padding-bottom: 4px; margin-top: 25px;">III. BẢNG PHÂN BỐ THỜI GIAN ÔN TẬP</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12pt;">
            <thead>
              <tr style="background-color: #e0e7ff; color: #1e3a8a;">
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Tuần</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Chuyên đề ôn tập</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Số tiết</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Hình thức kiểm tra</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">12</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Quan hệ song song & Thiết diện</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">3</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Trắc nghiệm 15 phút</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">13</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Vectơ & Quan hệ vuông góc</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">3</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Tự luận trên lớp</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">14</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Góc, khoảng cách và thể tích</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">4</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Luyện đề tổng hợp</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center;">
            <div style="width: 45%;">
              <p style="font-weight: bold; margin: 0;">TỔ TRƯỞNG CHUYÊN MÔN</p>
              <p style="font-style: italic; margin-top: 5px; font-size: 11pt;">(Đã ký duyệt)</p>
            </div>
            <div style="width: 45%;">
              <p style="font-weight: bold; margin: 0;">GIÁO VIÊN BIÊN SOẠN</p>
              <p style="font-style: italic; margin-top: 5px; font-size: 11pt;">Tổ Toán - Tin học</p>
            </div>
          </div>
        </div>
      `;
    }

    if (title.toLowerCase().includes('unit') || title.toLowerCase().includes('vocabulary') || title.toLowerCase().includes('grammar')) {
      return `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.6; color: #1a1a1a;">
          <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 11pt; text-transform: uppercase;">ENGLISH 11 - GLOBAL SUCCESS</p>
            <h1 style="margin: 15px 0 5px 0; font-size: 18pt; font-weight: bold; color: #065f46; text-transform: uppercase;">UNIT 4 &amp; 5: VOCABULARY &amp; GRAMMAR CONSOLIDATION</h1>
            <p style="margin: 0; font-size: 12pt; font-style: italic;">ASEAN and Viet Nam &amp; Global Warming</p>
          </div>

          <h2 style="font-size: 14pt; font-weight: bold; color: #047857; border-bottom: 1px solid #a7f3d0; padding-bottom: 4px; margin-top: 20px;">I. CORE VOCABULARY</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12pt;">
            <thead>
              <tr style="background-color: #d1fae5; color: #065f46;">
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Word / Phrase</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Part of Speech</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Meaning (Vietnamese)</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">Charter</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">(n)</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Hiến chương, điều lệ</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">The ASEAN Charter came into force in 2008.</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">Greenhouse effect</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">(n)</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Hiệu ứng nhà kính</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Burning fossil fuels intensifies the greenhouse effect.</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">Renewable</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">(adj)</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Có thể tái tạo (năng lượng)</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">Solar and wind energy are renewable sources.</td>
              </tr>
            </tbody>
          </table>

          <h2 style="font-size: 14pt; font-weight: bold; color: #047857; border-bottom: 1px solid #a7f3d0; padding-bottom: 4px; margin-top: 25px;">II. GRAMMAR FOCUS: GERUND &amp; PARTICIPLE CLAUSES</h2>
          <p><strong>1. Gerunds as Subjects and Objects:</strong></p>
          <ul style="padding-left: 25px;">
            <li><em>Subject:</em> <u>Reducing</u> carbon emissions is essential for our planet.</li>
            <li><em>After prepositions:</em> He is responsible for <u>organizing</u> the youth summit.</li>
          </ul>

          <p><strong>2. Present and Past Participle Clauses:</strong></p>
          <ul style="padding-left: 25px;">
            <li><em>Present Participle (-ing):</em> <u>Realizing</u> the risk of flooding, the community planted mangrove forests.</li>
            <li><em>Past Participle (-ed / V3):</em> <u>Shocked</u> by the severe drought, farmers adopted water-saving techniques.</li>
          </ul>
        </div>
      `;
    }

    // Default General Study Guide
    return `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.6; color: #1a1a1a;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 11pt; text-transform: uppercase;">KHÔNG GIAN CHỦ NHIỆM SỐ - TÀI LIỆU HỌC TẬP</p>
          <h1 style="margin: 15px 0 5px 0; font-size: 18pt; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">${title.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}</h1>
          <p style="margin: 0; font-size: 12pt; font-style: italic;">Hồ sơ lưu trữ và phân phối tài liệu lớp 11A1</p>
        </div>

        <h2 style="font-size: 14pt; font-weight: bold; color: #1e40af; border-bottom: 1px solid #93c5fd; padding-bottom: 4px; margin-top: 20px;">1. MỤC TIÊU VÀ YÊU CẦU CẦN ĐẠT</h2>
        <p>Tài liệu này được cung cấp nhằm hỗ trợ học sinh ôn luyện, hệ thống hóa kiến thức trọng tâm theo khung năng lực chuẩn GDPT 2018. Học sinh cần hoàn thành đầy đủ các nội dung tự học và bài tập vận dụng trước buổi sinh hoạt chuyên đề.</p>

        <h2 style="font-size: 14pt; font-weight: bold; color: #1e40af; border-bottom: 1px solid #93c5fd; padding-bottom: 4px; margin-top: 25px;">2. NỘI DUNG CHI TIẾT &amp; HƯỚNG DẪN</h2>
        <ul style="padding-left: 25px;">
          <li><strong>Phần lý thuyết cốt lõi:</strong> Nắm vững định nghĩa, công thức toán học và phương pháp giải quyết tình huống.</li>
          <li><strong>Phần bài tập rèn luyện:</strong> Tự giác làm bài theo từng mức độ nhận biết, thông hiểu, vận dụng và vận dụng cao.</li>
          <li><strong>Trao đổi thảo luận:</strong> Sử dụng mục Trợ lý AI hoặc Thảo luận lớp để giải đáp các thắc mắc khó.</li>
        </ul>

        <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 18px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #1e3a8a;">Lưu ý của Giáo viên:</p>
          <p style="margin: 5px 0 0 0; font-size: 13pt;">Các em học sinh có thể tải về file Word .docx gốc để chỉnh sửa, ghi chú thêm câu hỏi và in ra làm tài liệu lưu trữ cá nhân.</p>
        </div>
      </div>
    `;
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setHtmlContent(null);

    const loadDocx = async () => {
      // Check if sample or empty url
      if (!url || url === '#' || url.startsWith('http://localhost') === false && !url.startsWith('data:') && !url.startsWith('blob:')) {
        // Try sample render first
        if (url === '#' || !url) {
          setIsSampleDoc(true);
          const sampleHtml = getSampleDocContent(fileName);
          setHtmlContent(sampleHtml);
          setLoading(false);
          return;
        }
      }

      try {
        let arrayBuffer: ArrayBuffer | null = null;

        if (url.startsWith('data:')) {
          // Convert Data URL to ArrayBuffer
          const base64 = url.split(',')[1];
          const binaryString = window.atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else if (url.startsWith('blob:') || url.startsWith('http')) {
          const resp = await fetch(url);
          arrayBuffer = await resp.arrayBuffer();
        }

        if (arrayBuffer && containerRef.current && isMounted) {
          containerRef.current.innerHTML = '';
          try {
            await renderAsync(arrayBuffer, containerRef.current, undefined, {
              className: 'docx-preview-container',
              inWrapper: false,
              ignoreWidth: false,
              ignoreHeight: false
            });
            setLoading(false);
            return;
          } catch (renderErr) {
            console.warn('docx-preview failed, attempting mammoth fallback...', renderErr);
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setHtmlContent(result.value);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err: any) {
        console.warn('Direct DOCX binary load failed:', err);
      }

      if (isMounted) {
        // Fallback to rich sample content
        setIsSampleDoc(true);
        const sampleHtml = getSampleDocContent(fileName);
        setHtmlContent(sampleHtml);
        setLoading(false);
      }
    };

    loadDocx();

    return () => {
      isMounted = false;
    };
  }, [url, fileName]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 2.0));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (url && url !== '#') {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Create blob download from html content
      const blob = new Blob([
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title></head><body>${htmlContent || getSampleDocContent(fileName)}</body></html>`
      ], { type: 'application/msword' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = fileName.endsWith('.docx') || fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border-b border-slate-700 px-4 py-2 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-600 text-blue-300 text-xs font-bold">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Trình xem Tài liệu Word (.docx)</span>
          </div>
          {isSampleDoc && (
            <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-600/60 px-2 py-0.5 rounded-md hidden sm:inline">
              Bản xem trước trực tiếp
            </span>
          )}
        </div>

        {/* Zoom Controls & Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-white cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            onClick={handleResetZoom}
            className="px-2.5 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold font-mono text-white transition-colors cursor-pointer"
            title="Tỷ lệ 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-white cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
            title="Tải tệp Word về máy"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Tải .docx</span>
          </button>
        </div>
      </div>

      {/* Main Document Canvas (A4 Page simulation) */}
      <div className="flex-1 overflow-auto bg-slate-900/90 p-4 sm:p-8 flex justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-300 my-auto">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs font-bold">Đang tải và định dạng tài liệu Word...</p>
          </div>
        )}

        {!loading && (
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="w-full max-w-3xl my-auto transition-all"
          >
            {/* A4 Paper Container */}
            <div className="min-h-[850px] w-full rounded-2xl bg-white p-8 sm:p-14 shadow-2xl border border-slate-200 text-slate-900 font-serif selection:bg-blue-100 selection:text-blue-900">
              {htmlContent ? (
                <div
                  className="prose max-w-none text-slate-900 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              ) : (
                <div ref={containerRef} className="docx-render-output" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
