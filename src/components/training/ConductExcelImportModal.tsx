/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { Student, ConductPeriodEvaluation } from '../../types';
import { classService } from '../../services/ClassService';
import { normalizeConductGrade, unwrapAnswerValue } from '../../utils/surveyAnswerUtils';

const VALID_GRADES = ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'];

export interface ConductExcelImportItem {
  studentId: string;
  selfAssessment?: string;
  collectiveAssessment?: string;
  teacherAssessment?: string;
  finalGrade?: string;
  teacherNote?: string;
}

interface ParsedPreviewRow {
  rowIndex: number;
  rawCode: string;
  rawName: string;
  matchedStudent?: Student;
  selfAssessment?: string;
  collectiveAssessment?: string;
  teacherAssessment?: string;
  finalGrade?: string;
  teacherNote?: string;
  status: 'VALID' | 'ERROR';
  errorMessage?: string;
}

export interface ConductExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvaluation: ConductPeriodEvaluation | null;
  students: Student[];
  onConfirmImport: (importedItems: ConductExcelImportItem[], shouldAutoSave?: boolean) => void;
}

export async function downloadConductExcelTemplate(
  currentEvaluation: ConductPeriodEvaluation | null,
  students: Student[],
  classNameParam?: string
) {
  const XLSX = await import('xlsx');
  const wsData: any[][] = [];
  const classSettings = classService.getSettings();
  const className = classNameParam || classSettings.className || '12A1';
  const schoolYear = currentEvaluation?.schoolYear || classSettings.academicYear || '2025 - 2026';
  const periodType = currentEvaluation?.periodType || 'SEMESTER_1';

  let periodTag = 'HKI';
  let periodLabel = 'Cuối Học kỳ I (HKI)';
  if (periodType === 'SEMESTER_2') {
    periodTag = 'HKII';
    periodLabel = 'Cuối Học kỳ II (HKII)';
  } else if (periodType === 'MID_SEMESTER_1') {
    periodTag = 'GHKI';
    periodLabel = 'Giữa Học kỳ I (GHK I)';
  } else if (periodType === 'MID_SEMESTER_2') {
    periodTag = 'GHKII';
    periodLabel = 'Giữa Học kỳ II (GHK II)';
  } else if (periodType === 'FULL_YEAR') {
    periodTag = 'CaNam';
    periodLabel = 'Cả năm học';
  } else if (periodType === 'CUSTOM') {
    periodTag = 'DotThiDua';
    periodLabel = 'Đợt thi đua';
  }

  // Row 1: Header Title
  wsData.push([
    `BẢNG NHẬP DỮ LIỆU ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN — ${periodLabel.toUpperCase()}`,
    '', '', '', '', '', '', '', ''
  ]);
  // Row 2: Metadata Info
  wsData.push([
    `Lớp: ${className} | Năm học: ${schoolYear} | Đợt: ${currentEvaluation?.periodTitle || periodLabel}`,
    '', '', '', '', '', '', '', ''
  ]);
  // Row 3: Instructions
  wsData.push([
    'LƯU Ý: Các mức xếp loại hợp lệ: "Tốt", "Khá", "Đạt", "Chưa đạt". Cột để trống sẽ giữ nguyên dữ liệu hiện tại trên hệ thống.',
    '', '', '', '', '', '', '', ''
  ]);
  // Row 4: Column Headers
  wsData.push([
    'STT',
    'Mã học sinh',
    'Họ và tên',
    'Tổ',
    'Tự đánh giá',
    'Tập thể đánh giá',
    'GVCN đánh giá',
    'Kết quả chính thức',
    'Nhận xét của GVCN'
  ]);
  // Row 5: Sample illustration row
  wsData.push([
    'Ví dụ',
    'MAU_01',
    'Học sinh mẫu (Dòng minh họa - không tính vào kết quả)',
    'Tổ 1',
    'Tốt',
    'Tốt',
    'Tốt',
    'Tốt',
    'Tham gia phong trào đầy đủ, có nhiều tiến bộ'
  ]);
  // Row 6+: Students roster
  const evalMap = new Map((currentEvaluation?.evaluations || []).map(e => [e.studentId, e]));
  students.forEach((stu, idx) => {
    const curEval = evalMap.get(stu.id);
    wsData.push([
      idx + 1,
      stu.code || `HS${String(idx + 1).padStart(3, '0')}`,
      stu.fullName,
      stu.group ? `Tổ ${stu.group}` : 'Tổ 1',
      curEval?.selfAssessment || '',
      curEval?.collectiveAssessment || '',
      curEval?.teacherAssessment || '',
      curEval?.finalGrade || '',
      curEval?.teacherNote || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 26 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 35 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `DanhGia_${periodTag}`);

  const cleanYear = (schoolYear || '2025-2026').replace(/\s+/g, '');
  const fileName = `Mau_Danh_Gia_Ren_Luyen_${periodTag}_Lop_${className}_${cleanYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function extractCleanText(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '[object Object]' || trimmed === '[object object]') {
      return undefined;
    }
    return val; // Preserve full original text, diacritics and spacing
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (typeof val === 'object') {
    const unwrapped = unwrapAnswerValue(val);
    if (typeof unwrapped === 'string') {
      const trimmed = unwrapped.trim();
      if (!trimmed || trimmed === '[object Object]' || trimmed === '[object object]') {
        return undefined;
      }
      return unwrapped;
    }
    if (val.note && typeof val.note === 'string') return val.note.trim() || undefined;
    if (val.text && typeof val.text === 'string') return val.text.trim() || undefined;
    if (val.comment && typeof val.comment === 'string') return val.comment.trim() || undefined;
    if (val.value && typeof val.value === 'string') return val.value.trim() || undefined;
    return undefined; // Never return '[object Object]'
  }
  return undefined;
}

function normalizeGrade(val: any): string | undefined {
  return normalizeConductGrade(val);
}

export const ConductExcelImportModal: React.FC<ConductExcelImportModalProps> = ({
  isOpen,
  onClose,
  currentEvaluation,
  students,
  onConfirmImport
}) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedPreviewRow[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'error'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const classSettings = classService.getSettings();
  const className = classSettings.className || '12A1';

  // 1. Download template Excel file
  const handleDownloadTemplate = () => {
    downloadConductExcelTemplate(currentEvaluation, students, className);
  };

  // 2. Process uploaded Excel file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const sizeKB = Math.round(file.size / 1024);
    setFileSizeStr(sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`);
    setParseError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('File Excel không có trang tính hợp lệ.');
        }

        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('File Excel rỗng, không chứa dữ liệu.');
        }

        // Find header row
        let headerRowIndex = -1;
        let colCodeIdx = -1;
        let colNameIdx = -1;
        let colSelfIdx = -1;
        let colCollectiveIdx = -1;
        let colTeacherIdx = -1;
        let colFinalIdx = -1;
        let colNoteIdx = -1;

        for (let r = 0; r < Math.min(rawJson.length, 10); r++) {
          const row = rawJson[r];
          if (!Array.isArray(row)) continue;

          row.forEach((cell, c) => {
            const str = String(cell).toLowerCase().trim();
            if (!str) return;

            // 1. Mã học sinh
            if (str.includes('mã học sinh') || str === 'mã hs' || str === 'ma hs' || str === 'mã' || str === 'studentcode' || str === 'code') {
              colCodeIdx = c;
            } 
            // 2. Họ và tên
            else if (str.includes('họ và tên') || str === 'họ tên' || str === 'tên học sinh' || str === 'fullname' || str === 'studentname') {
              colNameIdx = c;
            } 
            // 3. Nhận xét / Ghi chú (MUST BE CHECKED BEFORE GVCN ĐÁNH GIÁ so "Nhận xét của GVCN" maps to Note, NOT Teacher assessment)
            else if (
              str.includes('nhận xét') ||
              str.includes('ghi chú') ||
              str.includes('nhan xet') ||
              str.includes('note') ||
              str.includes('lời phê') ||
              str.includes('ý kiến') ||
              str.includes('đánh giá chung')
            ) {
              colNoteIdx = c;
            } 
            // 4. Tự đánh giá (Must NOT match tập thể or gvcn)
            else if (
              (str.includes('tự đánh giá') || str.includes('tu danh gia') || str === 'tự đg' || str === 'tu dg' || str === 'selfassessment' || str === 'tự nhận') &&
              !str.includes('tập thể') &&
              !str.includes('gvcn')
            ) {
              colSelfIdx = c;
            }
            // 5. Tập thể đánh giá
            else if (
              (str.includes('tập thể') || str.includes('lớp đánh giá') || str.includes('tap the') || str.includes('tổ đánh giá')) &&
              !str.includes('nhận xét') &&
              !str.includes('ghi chú')
            ) {
              colCollectiveIdx = c;
            } 
            // 6. GVCN đánh giá (Exclusive: must NOT contain note keywords)
            else if (
              (str.includes('gvcn') || str.includes('giáo viên') || str.includes('giao vien') || str.includes('chủ nhiệm')) &&
              !str.includes('nhận xét') &&
              !str.includes('ghi chú') &&
              !str.includes('lời phê') &&
              !str.includes('ý kiến')
            ) {
              colTeacherIdx = c;
            } 
            // 7. Kết quả chính thức
            else if (
              (str.includes('kết quả') || str.includes('chính thức') || str.includes('finalgrade') || str === 'xếp loại' || str === 'xếp loại rèn luyện') &&
              !str.includes('tập thể') &&
              !str.includes('gvcn') &&
              !str.includes('nhận xét') &&
              !str.includes('ghi chú')
            ) {
              colFinalIdx = c;
            }
          });

          if (colCodeIdx !== -1 || colNameIdx !== -1) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1 || (colCodeIdx === -1 && colNameIdx === -1)) {
          throw new Error('Không nhận diện được tiêu đề cột học sinh (cần có cột "Mã học sinh" hoặc "Họ và tên").');
        }

        // Parse student rows starting after headerRowIndex
        const parsedRows: ParsedPreviewRow[] = [];

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!Array.isArray(row) || row.every(c => String(c).trim() === '')) {
            continue; // Skip empty row
          }

          const rawCode = colCodeIdx !== -1 ? String(row[colCodeIdx] || '').trim() : '';
          const rawName = colNameIdx !== -1 ? String(row[colNameIdx] || '').trim() : '';

          if (!rawCode && !rawName) {
            continue;
          }

          // Skip demo / sample rows
          const rawCodeLower = rawCode.toLowerCase();
          const rawNameLower = rawName.toLowerCase();
          if (
            rawCodeLower.startsWith('mau') ||
            rawCodeLower.includes('ví dụ') ||
            rawNameLower.includes('minh họa') ||
            rawNameLower.includes('ví dụ') ||
            rawNameLower.includes('học sinh mẫu')
          ) {
            continue;
          }

          // Match student against current class roster
          let matched = students.find(s => {
            if (rawCode && s.code && s.code.toLowerCase() === rawCode.toLowerCase()) {
              return true;
            }
            return false;
          });

          if (!matched && rawName) {
            matched = students.find(s => s.fullName.trim().toLowerCase() === rawName.toLowerCase());
          }

          const rawSelf = colSelfIdx !== -1 ? row[colSelfIdx] : undefined;
          const rawCollective = colCollectiveIdx !== -1 ? row[colCollectiveIdx] : undefined;
          const rawTeacher = colTeacherIdx !== -1 ? row[colTeacherIdx] : undefined;
          const rawFinal = colFinalIdx !== -1 ? row[colFinalIdx] : undefined;
          const rawNote = colNoteIdx !== -1 ? row[colNoteIdx] : undefined;

          const normSelf = normalizeConductGrade(rawSelf);
          const normCollective = normalizeConductGrade(rawCollective);
          const normTeacher = normalizeConductGrade(rawTeacher);
          const normFinal = normalizeConductGrade(rawFinal);
          const noteStr = extractCleanText(rawNote);

          // Validate row
          let rowStatus: 'VALID' | 'ERROR' = 'VALID';
          const errorMsgs: string[] = [];

          if (!matched) {
            rowStatus = 'ERROR';
            errorMsgs.push(`Học sinh "${rawName || rawCode}" không thuộc danh sách lớp.`);
          }

          const hasRawSelf = rawSelf !== undefined && rawSelf !== null && String(rawSelf).trim() !== '';
          if (hasRawSelf && !normSelf) {
            rowStatus = 'ERROR';
            errorMsgs.push(`Tự ĐG "${String(rawSelf).trim()}" không hợp lệ (chỉ nhận: Tốt, Khá, Đạt, Chưa đạt).`);
          }

          const hasRawCollective = rawCollective !== undefined && rawCollective !== null && String(rawCollective).trim() !== '';
          if (hasRawCollective && !normCollective) {
            rowStatus = 'ERROR';
            errorMsgs.push(`Tập thể ĐG "${String(rawCollective).trim()}" không hợp lệ (chỉ nhận: Tốt, Khá, Đạt, Chưa đạt).`);
          }

          const hasRawTeacher = rawTeacher !== undefined && rawTeacher !== null && String(rawTeacher).trim() !== '';
          if (hasRawTeacher && !normTeacher) {
            rowStatus = 'ERROR';
            errorMsgs.push(`GVCN ĐG "${String(rawTeacher).trim()}" không hợp lệ (chỉ nhận: Tốt, Khá, Đạt, Chưa đạt).`);
          }

          const hasRawFinal = rawFinal !== undefined && rawFinal !== null && String(rawFinal).trim() !== '';
          if (hasRawFinal && !normFinal) {
            rowStatus = 'ERROR';
            errorMsgs.push(`Kết quả "${String(rawFinal).trim()}" không hợp lệ (chỉ nhận: Tốt, Khá, Đạt, Chưa đạt).`);
          }

          parsedRows.push({
            rowIndex: r + 1,
            rawCode,
            rawName,
            matchedStudent: matched,
            selfAssessment: normSelf,
            collectiveAssessment: normCollective,
            teacherAssessment: normTeacher,
            finalGrade: normFinal,
            teacherNote: noteStr,
            status: rowStatus,
            errorMessage: errorMsgs.join('; ')
          });
        }

        if (parsedRows.length === 0) {
          throw new Error('Không đọc được dòng dữ liệu học sinh nào từ file.');
        }

        setPreviewRows(parsedRows);
        setStep('preview');
      } catch (err: any) {
        console.error('Failed to parse Excel file', err);
        setParseError(err.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setParseError('Lỗi đọc file từ máy tính. Vui lòng thử lại.');
    };

    reader.readAsArrayBuffer(file);
  };

  const validRows = previewRows.filter(r => r.status === 'VALID');
  const errorRows = previewRows.filter(r => r.status === 'ERROR');

  const displayedRows = previewRows.filter(r => {
    if (activeTab === 'valid') return r.status === 'VALID';
    if (activeTab === 'error') return r.status === 'ERROR';
    return true;
  });

  // 3. Confirm import into parent component (with direct save or buffer option)
  const handleConfirm = (autoSave: boolean = true) => {
    const importItems: ConductExcelImportItem[] = validRows
      .filter(r => r.matchedStudent)
      .map(r => ({
        studentId: r.matchedStudent!.id,
        selfAssessment: r.selfAssessment,
        collectiveAssessment: r.collectiveAssessment,
        teacherAssessment: r.teacherAssessment,
        finalGrade: r.finalGrade,
        teacherNote: r.teacherNote
      }));

    onConfirmImport(importItems, autoSave);
    onClose();
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setFileSizeStr('');
    setPreviewRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Nhập Dữ Liệu Đánh Giá Rèn Luyện Từ File Excel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentEvaluation?.periodTitle} • Đối chiếu danh sách học sinh và kiểm tra dữ liệu trước khi lưu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {step === 'upload' ? (
            <div className="space-y-4">
              {/* Template Download Card */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-700" />
                    <span>Tải File Mẫu Excel Chuẩn ({students.length} học sinh)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    File mẫu đã điền sẵn danh sách học sinh Lớp {className} kèm hướng dẫn các cột đánh giá.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải File Mẫu (.xlsx)</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 p-8 text-center cursor-pointer transition-colors space-y-3"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs text-emerald-600 border border-slate-200">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Kéo thả file Excel vào đây, hoặc <span className="text-emerald-700 underline">bấm để chọn file</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hỗ trợ định dạng: .xlsx, .xls, .csv (Tối đa 10MB)
                  </p>
                </div>
                {fileName && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-900 border border-emerald-300">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                    <span>File đã chọn: {fileName}</span>
                    {fileSizeStr && <span className="text-[10px] font-semibold text-emerald-700">({fileSizeStr})</span>}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {isProcessing && (
                <div className="p-3 text-center text-xs font-bold text-slate-600 animate-pulse">
                  Đang đọc và đối chiếu dữ liệu học sinh...
                </div>
              )}

              {parseError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-bold text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div>{parseError}</div>
                    <div className="text-[11px] font-normal text-rose-600 mt-1">
                      Gợi ý: Thầy/cô vui lòng tải file mẫu chuẩn ở trên để nhập dữ liệu đúng định dạng.
                    </div>
                  </div>
                </div>
              )}

              {/* Safety notice */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Quy tắc bảo toàn dữ liệu khi nhập file Excel:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                  <li>Chỉ cập nhật cho các học sinh khớp với danh sách của lớp. Không tạo mới hay chuyển học sinh.</li>
                  <li>Các ô để trống trong file Excel sẽ <b>giữ nguyên</b> giá trị hiện có, không ghi đè giá trị rỗng.</li>
                  <li>Hỗ trợ đồng bộ cột "Tự đánh giá"; GVCN có thể nhập qua Excel hoặc đồng bộ từ bài khảo sát.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-500">Tổng dòng đọc được</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{previewRows.length}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <div className="text-[11px] font-bold text-emerald-700">Hợp lệ (Sẵn sàng nhập)</div>
                  <div className="text-xl font-black text-emerald-900 mt-0.5">{validRows.length}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
                  <div className="text-[11px] font-bold text-rose-700">Dòng lỗi (Sẽ bỏ qua)</div>
                  <div className="text-xl font-black text-rose-900 mt-0.5">{errorRows.length}</div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`rounded-lg px-3 py-1 text-xs font-bold cursor-pointer transition-colors ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({previewRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('valid')}
                  className={`rounded-lg px-3 py-1 text-xs font-bold cursor-pointer transition-colors ${
                    activeTab === 'valid'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Hợp lệ ({validRows.length})
                </button>
                {errorRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('error')}
                    className={`rounded-lg px-3 py-1 text-xs font-bold cursor-pointer transition-colors ${
                      activeTab === 'error'
                        ? 'bg-rose-700 text-white'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    Dòng lỗi ({errorRows.length})
                  </button>
                )}
                <div className="ml-auto text-[11px] text-slate-400">
                  File: <span className="font-bold text-slate-600">{fileName}</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto max-h-[45vh] rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 text-center w-10">Dòng</th>
                      <th className="p-2.5">Mã HS & Tên trong file</th>
                      <th className="p-2.5">Đối chiếu học sinh</th>
                      <th className="p-2.5 text-center">Trạng thái</th>
                      <th className="p-2.5 text-center">Tự ĐG</th>
                      <th className="p-2.5 text-center">Tập thể ĐG</th>
                      <th className="p-2.5 text-center">GVCN ĐG</th>
                      <th className="p-2.5 text-center">Kết quả</th>
                      <th className="p-2.5">Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.length > 0 ? (
                      displayedRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.status === 'ERROR' ? 'bg-rose-50/60' : 'hover:bg-slate-50/70'}
                        >
                          <td className="p-2.5 text-center text-slate-400 font-bold">{row.rowIndex}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-800">{row.rawName || '—'}</div>
                            <div className="text-[10px] text-slate-400">{row.rawCode || 'Không có mã'}</div>
                          </td>
                          <td className="p-2.5">
                            {row.matchedStudent ? (
                              <div>
                                <span className="font-bold text-emerald-800">{row.matchedStudent.fullName}</span>
                                <span className="text-[10px] text-slate-400 ml-1">
                                  ({row.matchedStudent.code} • Tổ {row.matchedStudent.group})
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-rose-600 font-bold">Không tìm thấy</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {row.status === 'VALID' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Hợp lệ</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800"
                                title={row.errorMessage}
                              >
                                <AlertCircle className="h-3 w-3" />
                                <span>Lỗi</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {row.selfAssessment || <span className="text-slate-300 italic">—</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {row.collectiveAssessment || <span className="text-slate-300 italic">—</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {row.teacherAssessment || <span className="text-slate-300 italic">—</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {row.finalGrade || <span className="text-slate-300 italic">—</span>}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px] max-w-xs truncate">
                            {row.teacherNote || <span className="text-slate-300 italic">—</span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-xs text-slate-400 italic">
                          Không có dòng nào trong bộ lọc này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {errorRows.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Lưu ý:</span> Phát hiện {errorRows.length} dòng không khớp hoặc lỗi định dạng.
                    Hệ thống sẽ <b>bỏ qua các dòng lỗi</b> và chỉ nhập {validRows.length} dòng hợp lệ.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Chọn file khác</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              Đóng
            </button>

            {step === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={() => handleConfirm(false)}
                  disabled={validRows.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Đưa dữ liệu vào bảng tạm trên giao diện để kiểm tra trước khi bấm Lưu"
                >
                  <span>Nhập vào bảng tạm</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm(true)}
                  disabled={validRows.length === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  title={`Lưu và ghi nhận dữ liệu chính thức cho ${currentEvaluation?.periodTitle || 'đợt này'}`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Lưu & Áp Dụng Ngay ({validRows.length} HS)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
