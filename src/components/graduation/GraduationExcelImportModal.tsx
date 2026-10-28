/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Info,
  Check
} from 'lucide-react';
import { GraduationRegistration } from '../../types';
import { graduationService, ELECTIVE_SUBJECTS_LIST } from '../../services/GraduationService';
import { studentService } from '../../services/StudentService';

interface GraduationExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedGraduationRow {
  rowIndex: number;
  raw: Record<string, any>;
  matchedStudentId?: string;
  matchedStudentName?: string;
  matchedStudentCode?: string;
  studentGroup?: number;
  math?: number;
  literature?: number;
  electiveSubject1?: string;
  electiveSubject2?: string;
  elective1Score?: number;
  elective2Score?: number;
  gpa10?: number;
  gpa11?: number;
  gpa12?: number;
  priorityBonus?: number;
  encouragementBonus?: number;
  isForeignLanguageExempt?: boolean;
  teacherNote?: string;
  isExistingRecord: boolean;
  errors: string[];
}

export const GraduationExcelImportModal: React.FC<GraduationExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fileTypeNotice, setFileTypeNotice] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedGraduationRow[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'overwrite' | 'skip'>('overwrite');
  const [importSummary, setImportSummary] = useState<{ total: number; success: number; skipped: number; errors: number }>({
    total: 0,
    success: 0,
    skipped: 0,
    errors: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const students = studentService.getAll();
    const registrations = graduationService.getAll();

    const sampleData = (students.length > 0 ? students : [
      { id: 'hs-01', code: 'GH982', fullName: 'Nguyễn Gia Huy', group: 1 },
      { id: 'hs-02', code: 'LA714', fullName: 'Trần Lan Anh', group: 1 }
    ]).map((s, idx) => {
      const reg = registrations.find(r => r.studentId === s.id);
      return {
        'STT': idx + 1,
        'Mã học sinh': s.code,
        'Họ và tên': s.fullName,
        'Tổ': `Tổ ${s.group || 1}`,
        'Điểm Toán': reg?.scores.math ?? (8.0 + (idx % 3) * 0.5),
        'Điểm Ngữ văn': reg?.scores.literature ?? (7.5 + (idx % 3) * 0.5),
        'Môn tự chọn 1': reg?.electiveSubject1 || 'Vật lí',
        'Điểm Môn tự chọn 1': reg?.scores.elective1 ?? 8.0,
        'Môn tự chọn 2': reg?.electiveSubject2 || 'Hóa học',
        'Điểm Môn tự chọn 2': reg?.scores.elective2 ?? 8.5,
        'ĐTB Lớp 10': reg?.gpa10 ?? 8.2,
        'ĐTB Lớp 11': reg?.gpa11 ?? 8.5,
        'ĐTB Lớp 12': reg?.gpa12 ?? 8.8,
        'Điểm Ưu tiên': reg?.priorityBonus ?? 0,
        'Điểm Khuyến khích': reg?.encouragementBonus ?? 0,
        'Ghi chú GVCN': reg?.teacherNote || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Tot_Nghiep');
    XLSX.writeFile(wb, 'Mau_Nhap_Lieu_Thi_Tot_Nghiep_THPT.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeneralError(null);
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setGeneralError('Định dạng tệp không được hỗ trợ. Vui lòng chỉ tải lên tệp Excel (.xlsx hoặc .xls).');
      return;
    }

    setFileTypeNotice(`Đã nạp tệp định dạng .${ext.toUpperCase()}`);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const buffer = evt.target?.result;
        if (!buffer) {
          throw new Error('Không thể đọc nội dung tệp.');
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Tệp Excel không chứa bảng tính (sheet) nào.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          throw new Error('Bảng tính Excel không có dòng dữ liệu nào.');
        }

        processRawRows(jsonData);
      } catch (err: any) {
        console.error('Error reading Excel file:', err);
        setGeneralError(err.message || 'Lỗi xử lý tệp Excel.');
      }
    };

    reader.onerror = () => {
      setGeneralError('Đã xảy ra lỗi khi đọc tệp từ thiết bị.');
    };

    reader.readAsArrayBuffer(file);
  };

  const findColumnValue = (row: Record<string, any>, candidateKeys: string[]): any => {
    const rowKeys = Object.keys(row);
    for (const ck of candidateKeys) {
      const normalizedCk = ck.toLowerCase().trim().replace(/[\s_\-]+/g, '');
      for (const rk of rowKeys) {
        const normalizedRk = rk.toLowerCase().trim().replace(/[\s_\-]+/g, '');
        if (normalizedRk === normalizedCk || normalizedRk.includes(normalizedCk)) {
          return row[rk];
        }
      }
    }
    return undefined;
  };

  const parseScore = (val: any, fieldLabel: string, errors: string[], maxScore = 10): number | undefined => {
    if (val === undefined || val === null || String(val).trim() === '') {
      return undefined;
    }
    const cleanStr = String(val).trim().replace(',', '.');
    const num = parseFloat(cleanStr);
    if (isNaN(num)) {
      errors.push(`${fieldLabel}: "${val}" không phải là số hợp lệ.`);
      return undefined;
    }
    if (num < 0 || num > maxScore) {
      errors.push(`${fieldLabel}: ${num} nằm ngoài thang điểm cho phép (0 - ${maxScore}).`);
      return undefined;
    }
    return Math.round(num * 100) / 100;
  };

  const processRawRows = (rows: Record<string, any>[]) => {
    const students = studentService.getAll();
    const existingRegistrations = graduationService.getAll();

    const parsed: ParsedGraduationRow[] = [];

    rows.forEach((row, idx) => {
      const rowIndex = idx + 2; // Row 1 is header
      const errors: string[] = [];

      // Find Student Identifier (prioritize stable studentId / studentCode over fullName)
      const rawId = findColumnValue(row, ['id', 'student_id', 'studentid', 'mã định danh']);
      const rawCode = findColumnValue(row, ['mã học sinh', 'mã hs', 'mã học viên', 'mahs', 'sbd', 'mã số', 'code']);
      const rawName = findColumnValue(row, ['họ và tên', 'họ tên', 'tên học sinh', 'tên học viên', 'hovaten', 'tên', 'name']);

      let matchedStudent = students.find(s => {
        if (rawId && String(s.id).trim().toLowerCase() === String(rawId).trim().toLowerCase()) {
          return true;
        }
        if (rawCode && (
          String(s.code).trim().toLowerCase() === String(rawCode).trim().toLowerCase() ||
          String(s.id).trim().toLowerCase() === String(rawCode).trim().toLowerCase()
        )) {
          return true;
        }
        return false;
      });

      if (!matchedStudent) {
        if (rawCode || rawId) {
          errors.push(`Không tìm thấy học viên có Mã định danh / Mã HS "${rawCode || rawId}" trong danh sách lớp hiện tại.`);
        } else if (rawName) {
          const nameNorm = String(rawName).trim().toLowerCase();
          const candidates = students.filter(s => s.fullName.trim().toLowerCase() === nameNorm);
          if (candidates.length === 1) {
            matchedStudent = candidates[0];
          } else if (candidates.length > 1) {
            errors.push(`Trùng họ tên "${rawName}" trong lớp (${candidates.length} học viên). Bắt buộc phải cung cấp cột "Mã học sinh" để đối chiếu chính xác.`);
          } else {
            errors.push(`Không tìm thấy học viên "${rawName}" trong danh sách lớp.`);
          }
        } else {
          errors.push('Thiếu cả Mã học sinh và Họ tên.');
        }
      }

      // Check if existing registration has scores entered
      const existingReg = matchedStudent
        ? existingRegistrations.find(r => r.studentId === matchedStudent?.id)
        : undefined;

      const isExistingRecord = Boolean(
        existingReg &&
        (existingReg.scores.math !== undefined ||
          existingReg.scores.literature !== undefined ||
          existingReg.scores.elective1 !== undefined ||
          existingReg.scores.elective2 !== undefined ||
          existingReg.gpa10 !== undefined)
      );

      // Parse Scores
      const rawMath = findColumnValue(row, ['điểm toán', 'toán', 'toan']);
      const math = parseScore(rawMath, 'Điểm Toán', errors, 10);

      const rawLit = findColumnValue(row, ['điểm ngữ văn', 'ngữ văn', 'văn', 'van']);
      const literature = parseScore(rawLit, 'Điểm Ngữ văn', errors, 10);

      // Electives
      const electiveSubject1 = findColumnValue(row, ['môn tự chọn 1', 'môn tc 1', 'tự chọn 1', 'tuchon1']);
      const rawEl1 = findColumnValue(row, ['điểm môn tự chọn 1', 'điểm môn tc 1', 'điểm tc 1', 'điểm tự chọn 1', 'diemtc1']);
      const elective1Score = parseScore(rawEl1, 'Điểm Tự chọn 1', errors, 10);

      const electiveSubject2 = findColumnValue(row, ['môn tự chọn 2', 'môn tc 2', 'tự chọn 2', 'tuchon2']);
      const rawEl2 = findColumnValue(row, ['điểm môn tự chọn 2', 'điểm môn tc 2', 'điểm tc 2', 'điểm tự chọn 2', 'diemtc2']);
      const elective2Score = parseScore(rawEl2, 'Điểm Tự chọn 2', errors, 10);

      // Transcript GPAs
      const rawGpa10 = findColumnValue(row, ['đtb lớp 10', 'tb 10', 'gpa 10', 'lớp 10', 'tb10']);
      const gpa10 = parseScore(rawGpa10, 'ĐTB Lớp 10', errors, 10);

      const rawGpa11 = findColumnValue(row, ['đtb lớp 11', 'tb 11', 'gpa 11', 'lớp 11', 'tb11']);
      const gpa11 = parseScore(rawGpa11, 'ĐTB Lớp 11', errors, 10);

      const rawGpa12 = findColumnValue(row, ['đtb lớp 12', 'tb 12', 'gpa 12', 'lớp 12', 'tb12']);
      const gpa12 = parseScore(rawGpa12, 'ĐTB Lớp 12', errors, 10);

      // Bonuses
      const rawPrio = findColumnValue(row, ['điểm ưu tiên', 'ưu tiên', 'ứt', 'diemuutien']);
      const priorityBonus = parseScore(rawPrio, 'Điểm Ưu tiên', errors, 2.0);

      const rawEnc = findColumnValue(row, ['điểm khuyến khích', 'khuyến khích', 'kk', 'diemkhuyenkhich']);
      const encouragementBonus = parseScore(rawEnc, 'Điểm Khuyến khích', errors, 4.0);

      // Teacher Note
      const teacherNote = findColumnValue(row, ['ghi chú gvcn', 'ghi chú', 'ghichu', 'nhận xét']);

      // Exemption
      const rawExempt = findColumnValue(row, ['miễn thi ngoại ngữ', 'miễn ngoại ngữ', 'miễn nn', 'miễn thi', 'exempt']);
      const isForeignLanguageExempt = rawExempt !== undefined && rawExempt !== '' ? (
        rawExempt === true ||
        String(rawExempt).toLowerCase().trim() === 'có' ||
        String(rawExempt).toLowerCase().trim() === 'x' ||
        String(rawExempt).toLowerCase().trim() === '1' ||
        String(rawExempt).toLowerCase().trim() === 'true'
      ) : undefined;

      parsed.push({
        rowIndex,
        raw: row,
        matchedStudentId: matchedStudent?.id,
        matchedStudentName: matchedStudent?.fullName || String(rawName || 'Chưa rõ'),
        matchedStudentCode: matchedStudent?.code || String(rawCode || 'N/A'),
        studentGroup: matchedStudent?.group,
        math,
        literature,
        electiveSubject1: electiveSubject1 ? String(electiveSubject1).trim() : undefined,
        electiveSubject2: electiveSubject2 ? String(electiveSubject2).trim() : undefined,
        elective1Score,
        elective2Score,
        gpa10,
        gpa11,
        gpa12,
        priorityBonus,
        encouragementBonus,
        isForeignLanguageExempt,
        teacherNote: teacherNote ? String(teacherNote).trim() : undefined,
        isExistingRecord,
        errors
      });
    });

    setParsedRows(parsed);
    setStep('preview');
  };

  const validRows = parsedRows.filter(r => r.errors.length === 0 && r.matchedStudentId);
  const errorRows = parsedRows.filter(r => r.errors.length > 0 || !r.matchedStudentId);
  const duplicateRows = validRows.filter(r => r.isExistingRecord);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;

    setIsProcessing(true);
    setGeneralError(null);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const failedMessages: string[] = [];

    try {
      for (const row of validRows) {
        if (!row.matchedStudentId) continue;

        if (row.isExistingRecord && duplicateMode === 'skip') {
          skippedCount++;
          continue;
        }

        const existingReg = graduationService.getByStudentId(row.matchedStudentId);

        const currentScores = existingReg ? { ...(existingReg.scores || {}) } : {};
        if (row.math !== undefined) currentScores.math = row.math;
        if (row.literature !== undefined) currentScores.literature = row.literature;
        if (row.elective1Score !== undefined) currentScores.elective1 = row.elective1Score;
        if (row.elective2Score !== undefined) currentScores.elective2 = row.elective2Score;

        const updatePayload: any = {
          studentId: row.matchedStudentId,
          studentCode: row.matchedStudentCode,
          studentName: row.matchedStudentName,
          scores: currentScores,
          updatedBy: 'Giáo viên chủ nhiệm (Excel)'
        };

        if (row.electiveSubject1) updatePayload.electiveSubject1 = row.electiveSubject1;
        if (row.electiveSubject2) updatePayload.electiveSubject2 = row.electiveSubject2;
        if (row.isForeignLanguageExempt !== undefined) updatePayload.isForeignLanguageExempt = row.isForeignLanguageExempt;
        if (row.gpa10 !== undefined) updatePayload.gpa10 = row.gpa10;
        if (row.gpa11 !== undefined) updatePayload.gpa11 = row.gpa11;
        if (row.gpa12 !== undefined) updatePayload.gpa12 = row.gpa12;
        if (row.priorityBonus !== undefined) updatePayload.priorityBonus = row.priorityBonus;
        if (row.encouragementBonus !== undefined) updatePayload.encouragementBonus = row.encouragementBonus;
        if (row.teacherNote !== undefined) updatePayload.teacherNote = row.teacherNote;

        const targetId = existingReg?.id || `grad-reg-${row.matchedStudentId}`;
        try {
          const res = await graduationService.updateRegistration(targetId, updatePayload);
          if (res) {
            successCount++;
          } else {
            errorCount++;
            failedMessages.push(`${row.matchedStudentName} (${row.matchedStudentCode}): Không thể cập nhật bản ghi`);
          }
        } catch (rowErr: any) {
          errorCount++;
          failedMessages.push(`${row.matchedStudentName} (${row.matchedStudentCode}): ${rowErr?.message || 'Lỗi đồng bộ'}`);
        }
      }

      setImportSummary({
        total: validRows.length,
        success: successCount,
        skipped: skippedCount,
        errors: errorCount + errorRows.length
      });

      if (failedMessages.length > 0) {
        setGeneralError(`Có ${failedMessages.length} bản ghi gặp lỗi đồng bộ: ${failedMessages.join(' | ')}`);
      }

      setStep('result');
      onSuccess();
    } catch (err: any) {
      console.error('Error during bulk Excel import:', err);
      setGeneralError('Đã xảy ra lỗi trong quá trình lưu dữ liệu: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setFileTypeNotice('');
    setParsedRows([]);
    setGeneralError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                NHẬP DỮ LIỆU THI TỐT NGHIỆP THPT TỪ EXCEL
              </h3>
              <p className="text-xs text-slate-500">
                Phần 4: Theo dõi của GVCN • Hỗ trợ tệp định dạng .xlsx và .xls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {generalError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Instructions Banner */}
              <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-950">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>Quy tắc đối chiếu và định dạng file Excel</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                  <li>Hệ thống hỗ trợ cả 2 định dạng phổ biến: <strong>.xlsx</strong> (Excel chuẩn) và <strong>.xls</strong> (Excel 97-2003).</li>
                  <li>Cột bắt buộc để đối soát học sinh: <strong>Mã học sinh</strong> hoặc <strong>Họ và tên</strong> (khớp với danh sách học sinh hiện có).</li>
                  <li>Các cột điểm số thi dự kiến: <strong>Điểm Toán</strong>, <strong>Điểm Ngữ văn</strong>, <strong>Điểm Môn tự chọn 1</strong>, <strong>Điểm Môn tự chọn 2</strong> (thang điểm 0 - 10).</li>
                  <li>Các cột học bạ: <strong>ĐTB Lớp 10</strong>, <strong>ĐTB Lớp 11</strong>, <strong>ĐTB Lớp 12</strong> (thang điểm 0 - 10).</li>
                  <li>Điểm cộng: <strong>Điểm Ưu tiên</strong> (0 - 2.0đ), <strong>Điểm Khuyến khích</strong> (0 - 4.0đ), <strong>Ghi chú GVCN</strong>.</li>
                </ul>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải file mẫu Excel (.xlsx) với danh sách lớp hiện hành</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mx-auto shadow-2xs">
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Nhấp để chọn tệp Excel từ máy tính của bạn
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ định dạng .xlsx hoặc .xls (kích thước tối đa 10MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VERIFY */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats overview */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Tệp: <strong>{fileName}</strong></span>
                  {fileTypeNotice && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {fileTypeNotice}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Tổng: <strong>{parsedRows.length} dòng</strong></span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    ✓ Hợp lệ: {validRows.length}
                  </span>
                  {errorRows.length > 0 && (
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                      ⚠️ Lỗi: {errorRows.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Duplicate Handling Option if duplicates exist */}
              {duplicateRows.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Phát hiện {duplicateRows.length} học sinh đã có dữ liệu trong hệ thống:</span>
                  </div>
                  <div className="flex items-center gap-4 pl-6 text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="dupMode"
                        value="overwrite"
                        checked={duplicateMode === 'overwrite'}
                        onChange={() => setDuplicateMode('overwrite')}
                        className="text-blue-600"
                      />
                      <span>Cập nhật / Ghi đè bằng dữ liệu mới từ file Excel (Khuyến nghị)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="dupMode"
                        value="skip"
                        checked={duplicateMode === 'skip'}
                        onChange={() => setDuplicateMode('skip')}
                        className="text-blue-600"
                      />
                      <span>Giữ nguyên dữ liệu cũ, chỉ nạp học sinh mới</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Error Rows Table if any */}
              {errorRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 uppercase flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Danh sách các dòng có lỗi ({errorRows.length} dòng - sẽ không được nạp vào hệ thống):
                  </h4>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50/40 p-2.5 text-xs divide-y divide-rose-100">
                    {errorRows.map((er) => (
                      <div key={er.rowIndex} className="py-1.5 text-rose-900">
                        <strong>Dòng {er.rowIndex}</strong> ({er.matchedStudentName}): {er.errors.join('; ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Table of Valid Rows */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Xem trước dữ liệu hợp lệ sẵn sàng nạp ({validRows.length} dòng):
                </h4>
                <div className="max-h-60 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-2 text-center w-10">Dòng</th>
                        <th className="p-2">Mã HS</th>
                        <th className="p-2">Họ và tên</th>
                        <th className="p-2 text-center">Toán</th>
                        <th className="p-2 text-center">Văn</th>
                        <th className="p-2 text-center">TC 1</th>
                        <th className="p-2 text-center">TC 2</th>
                        <th className="p-2 text-center">TB 10</th>
                        <th className="p-2 text-center">TB 11</th>
                        <th className="p-2 text-center">TB 12</th>
                        <th className="p-2 text-center">ƯT</th>
                        <th className="p-2 text-center">KK</th>
                        <th className="p-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {validRows.slice(0, 50).map((r) => (
                        <tr key={r.rowIndex} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono text-slate-400">{r.rowIndex}</td>
                          <td className="p-2 font-mono font-bold text-blue-900">{r.matchedStudentCode}</td>
                          <td className="p-2 font-bold">{r.matchedStudentName}</td>
                          <td className="p-2 text-center font-bold">{r.math ?? '-'}</td>
                          <td className="p-2 text-center font-bold">{r.literature ?? '-'}</td>
                          <td className="p-2 text-center text-blue-800">{r.elective1Score !== undefined ? `${r.elective1Score}đ` : '-'}</td>
                          <td className="p-2 text-center text-indigo-800">{r.elective2Score !== undefined ? `${r.elective2Score}đ` : '-'}</td>
                          <td className="p-2 text-center">{r.gpa10 ?? '-'}</td>
                          <td className="p-2 text-center">{r.gpa11 ?? '-'}</td>
                          <td className="p-2 text-center">{r.gpa12 ?? '-'}</td>
                          <td className="p-2 text-center">{r.priorityBonus ? `+${r.priorityBonus}` : '0'}</td>
                          <td className="p-2 text-center">{r.encouragementBonus ? `+${r.encouragementBonus}` : '0'}</td>
                          <td className="p-2">
                            {r.isExistingRecord ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                                {duplicateMode === 'overwrite' ? 'Sẽ cập nhật' : 'Sẽ bỏ qua'}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                Mới
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 mx-auto shadow-xs">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">
                  Nhập Dữ Liệu Tốt Nghiệp THPT Thành Công!
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Dữ liệu đã được lưu bền vững vào hệ thống, tự động tính toán ĐTB các năm học và Điểm xét tốt nghiệp (ĐXTN).
                </p>
              </div>

              <div className="flex justify-center gap-4 text-xs font-bold pt-2">
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                  ✓ Thành công: {importSummary.success} học sinh
                </span>
                {importSummary.skipped > 0 && (
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                    Bỏ qua: {importSummary.skipped} học sinh
                  </span>
                )}
                {importSummary.errors > 0 && (
                  <span className="px-3 py-1.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
                    Lỗi: {importSummary.errors} dòng
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <div className="text-[11px] text-slate-400">
                Hãy tải file mẫu nếu chưa rõ cấu trúc cột
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Chọn lại file khác</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={validRows.length === 0 || isProcessing}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isProcessing
                      ? 'Đang lưu dữ liệu...'
                      : `Xác nhận nhập (${duplicateMode === 'overwrite' ? validRows.length : validRows.length - duplicateRows.length} dòng)`}
                  </span>
                </button>
              </div>
            </>
          )}

          {step === 'result' && (
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
