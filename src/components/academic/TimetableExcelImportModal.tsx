/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Check,
  CheckCheck,
  Save,
  Layers,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { academicService } from '../../services/AcademicService';
import { classService } from '../../services/ClassService';
import { DayTimetable, TimetablePeriod } from '../../types';

interface TimetableExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  rowNumber: number;
  dayRaw: string;
  dayNormalized: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | null;
  sessionRaw: string;
  sessionNormalized: 'morning' | 'afternoon' | null;
  periodRaw: string | number;
  periodNumber: number | null;
  subject: string;
  teacher?: string;
  startTime?: string;
  endTime?: string;
  validFrom?: string;
  note?: string;
  isValid: boolean;
  errors: string[];
}

export const TimetableExcelImportModal: React.FC<TimetableExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [detectedPeriodTimes, setDetectedPeriodTimes] = useState<{
    morning: Array<{ period: number; startTime: string; endTime: string }>;
    afternoon: Array<{ period: number; startTime: string; endTime: string }>;
  } | null>(null);
  const [versionName, setVersionName] = useState<string>(
    `TKB Nhập từ Excel - ${new Date().toLocaleDateString('vi-VN')}`
  );
  const [semester, setSemester] = useState<'HK1' | 'HK2'>('HK1');
  const [validFrom, setValidFrom] = useState<string>(new Date().toLocaleDateString('vi-VN'));
  const [activeStep, setActiveStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  // Save Mode states: 'OVERWRITE' | 'NEW_VERSION' | 'INITIAL' | null
  const [saveMode, setSaveMode] = useState<'OVERWRITE' | 'NEW_VERSION' | 'INITIAL' | null>(null);
  const [isConfirmOverwriteOpen, setIsConfirmOverwriteOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'DRAFT' | 'APPLY_NOW' | null>(null);
  const [successSummary, setSuccessSummary] = useState<{
    mode: 'OVERWRITE' | 'NEW_VERSION' | 'INITIAL';
    applied: boolean;
    count: number;
    name: string;
  } | null>(null);

  // Active timetable information to check if timetable exists
  const activeTimetable = academicService.getActiveTimetable();
  const hasExistingTimetable = useMemo(() => {
    if (!activeTimetable || !Array.isArray(activeTimetable.schedule)) return false;
    return activeTimetable.schedule.some(
      d => (d.morningPeriods && d.morningPeriods.length > 0) || (d.afternoonPeriods && d.afternoonPeriods.length > 0)
    );
  }, [activeTimetable, isOpen]);

  if (!isOpen) return null;

  // 1. Download Excel Template (Matrix Structure)
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      {
        'Thời gian bắt đầu': '07:15',
        'Thời gian kết thúc': '08:00',
        'Thứ 2': 'SHL - Đ.T.Bình',
        'Thứ 3': 'Vật lí - Đ.T.Bình',
        'Thứ 4': 'Toán - D.N.Tạo',
        'Thứ 5': 'Toán - D.N.Tạo',
        'Thứ 6': 'HĐTNHN - L.M.X.Trường',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '08:00',
        'Thời gian kết thúc': '08:45',
        'Thứ 2': 'Hóa học - N.V.Trinh',
        'Thứ 3': 'Hóa học - N.V.Trinh',
        'Thứ 4': 'Toán - D.N.Tạo',
        'Thứ 5': 'Lịch Sử - H.T.K.Duyên',
        'Thứ 6': 'HĐTNHN - L.M.X.Trường',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '09:05',
        'Thời gian kết thúc': '09:50',
        'Thứ 2': 'Hóa học - N.V.Trinh',
        'Thứ 3': 'Ngữ Văn - Đ.T.K.Cương',
        'Thứ 4': 'Tiếng Anh - N.B.Linh',
        'Thứ 5': 'Lịch Sử - H.T.K.Duyên',
        'Thứ 6': 'Ngữ Văn - Đ.T.K.Cương',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '09:50',
        'Thời gian kết thúc': '10:35',
        'Thứ 2': 'Vật lí - Đ.T.Bình',
        'Thứ 3': 'Sinh học - N.T.N.Hân',
        'Thứ 4': 'Tin học - V.T.M.Phương',
        'Thứ 5': 'Tiếng Anh - N.B.Linh',
        'Thứ 6': 'Ngữ Văn - Đ.T.K.Cương',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '10:45',
        'Thời gian kết thúc': '11:30',
        'Thứ 2': 'Vật lí - Đ.T.Bình',
        'Thứ 3': 'Sinh học - N.T.N.Hân',
        'Thứ 4': 'Tin học - V.T.M.Phương',
        'Thứ 5': 'Tiếng Anh - N.B.Linh',
        'Thứ 6': 'Toán - D.N.Tạo',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '13:15',
        'Thời gian kết thúc': '14:00',
        'Thứ 2': 'Ngữ Văn - N.T.N.Thuận',
        'Thứ 3': 'Vật lí - Đ.T.Bình',
        'Thứ 4': 'Sinh học - N.T.N.Hân',
        'Thứ 5': 'Vật lí - Đ.T.Bình',
        'Thứ 6': 'Lịch Sử - H.T.K.Duyên',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '14:00',
        'Thời gian kết thúc': '14:45',
        'Thứ 2': 'Ngữ Văn - N.T.N.Thuận',
        'Thứ 3': 'Vật lí - Đ.T.Bình',
        'Thứ 4': 'Sinh học - N.T.N.Hân',
        'Thứ 5': 'Tin học - V.T.M.Phương',
        'Thứ 6': 'Lịch Sử - H.T.K.Duyên',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '15:00',
        'Thời gian kết thúc': '15:45',
        'Thứ 2': 'Tin học - V.T.M.Phương',
        'Thứ 3': 'HĐTNHN - N.V.Trinh',
        'Thứ 4': 'Tiếng Anh - N.B.Linh',
        'Thứ 5': 'Hóa học - N.V.Trinh',
        'Thứ 6': 'Toán - V.T.T.Vân',
        'Thứ 7': ''
      },
      {
        'Thời gian bắt đầu': '15:45',
        'Thời gian kết thúc': '16:30',
        'Thứ 2': 'Toán - V.T.T.Vân',
        'Thứ 3': 'HĐTNHN - N.V.Trinh',
        'Thứ 4': 'Tiếng Anh - N.B.Linh',
        'Thứ 5': 'Hóa học - N.V.Trinh',
        'Thứ 6': 'Toán - V.T.T.Vân',
        'Thứ 7': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set col widths
    worksheet['!cols'] = [
      { wch: 18 }, // Thời gian bắt đầu
      { wch: 18 }, // Thời gian kết thúc
      { wch: 26 }, // Thứ 2
      { wch: 26 }, // Thứ 3
      { wch: 26 }, // Thứ 4
      { wch: 26 }, // Thứ 5
      { wch: 26 }, // Thứ 6
      { wch: 26 }  // Thứ 7
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Thoi_Khoa_Bieu');
    XLSX.writeFile(workbook, 'Mau_Nhap_Thoi_Khoa_Bieu_Chuan.xlsx');
  };

  // Helper normalizers
  const normalizeDay = (val: any): 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' | null => {
    if (!val) return null;
    const str = String(val).trim().toLowerCase();
    if (str.includes('2') || str.includes('hai') || str.includes('mon')) return 'Thứ 2';
    if (str.includes('3') || str.includes('ba') || str.includes('tue')) return 'Thứ 3';
    if (str.includes('4') || str.includes('tư') || str.includes('tu') || str.includes('bốn') || str.includes('bon') || str.includes('wed')) return 'Thứ 4';
    if (str.includes('5') || str.includes('năm') || str.includes('nam') || str.includes('thu')) return 'Thứ 5';
    if (str.includes('6') || str.includes('sáu') || str.includes('sau') || str.includes('fri')) return 'Thứ 6';
    if (str.includes('7') || str.includes('bảy') || str.includes('bay') || str.includes('sat')) return 'Thứ 7';
    return null;
  };

  const normalizeSession = (val: any): 'morning' | 'afternoon' | null => {
    if (!val) return null;
    const str = String(val).trim().toLowerCase();
    if (str.includes('sáng') || str.includes('sang') || str.includes('morning') || str.includes('am')) return 'morning';
    if (str.includes('chiều') || str.includes('chieu') || str.includes('afternoon') || str.includes('pm')) return 'afternoon';
    return null;
  };

  // Format time string to HH:mm
  const formatTimeString = (val: any): string | null => {
    if (val === null || val === undefined || val === '') return null;

    if (val instanceof Date) {
      const h = String(val.getHours()).padStart(2, '0');
      const m = String(val.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }

    if (typeof val === 'number') {
      // If fractional day in Excel (0 <= val <= 1)
      if (val >= 0 && val <= 1) {
        const totalMinutes = Math.round(val * 24 * 60);
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      const str = String(val);
      if (str.length === 3 || str.length === 4) {
        const h = str.slice(0, str.length - 2).padStart(2, '0');
        const m = str.slice(-2);
        return `${h}:${m}`;
      }
    }

    const str = String(val).trim();
    if (!str) return null;

    // Match HH:mm or H:mm or HH:mm:ss or HhM or Hh
    const timeRegex = /^([0-9]{1,2})[:hH\-\.]([0-9]{1,2})(?:[:hH\-\.][0-9]{1,2})?$/;
    const match = str.match(timeRegex);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    const hourOnlyMatch = str.match(/^([0-9]{1,2})[hH]?$/);
    if (hourOnlyMatch) {
      const h = parseInt(hourOnlyMatch[1], 10);
      if (h >= 0 && h <= 23) {
        return `${String(h).padStart(2, '0')}:00`;
      }
    }

    return null;
  };

  // Parse subject and teacher from "Môn học - Giáo viên"
  const parseSubjectTeacher = (rawCell: string): { subject: string; teacher: string } => {
    const trimmed = rawCell.trim();
    if (!trimmed) return { subject: '', teacher: '' };

    // Match dash separators: " - ", " – ", " — ", "-", "–", "—"
    const match = trimmed.match(/^([\s\S]*?)\s*[\-\–\—]\s*([\s\S]*)$/);
    if (match) {
      const subject = match[1].trim();
      const teacher = match[2].trim();
      return { subject, teacher };
    }

    return { subject: trimmed, teacher: '' };
  };

  // 2. Parse Excel file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    parseExcel(selected);
  };

  const parseExcel = async (fileObj: File) => {
    setIsProcessing(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await fileObj.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setErrorMessage('File Excel không có trang tính (sheet) nào. Thời khóa biểu hiện tại được giữ nguyên vẹn.');
        setFile(null);
        setIsProcessing(false);
        return;
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        setErrorMessage('Trang tính đầu tiên trong file Excel không có dữ liệu. Thời khóa biểu hiện tại được giữ nguyên vẹn.');
        setFile(null);
        setIsProcessing(false);
        return;
      }
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawData.length < 2) {
        setErrorMessage('File Excel không có dữ liệu hoặc không đúng định dạng mẫu. Thời khóa biểu hiện tại được giữ nguyên vẹn.');
        setFile(null);
        setIsProcessing(false);
        return;
      }

      // Find the header row (usually row 0, but scan first 6 rows to be resilient)
      let headerRowIndex = -1;
      let isMatrixFormat = false;

      // Scan rows to find header
      for (let i = 0; i < Math.min(6, rawData.length); i++) {
        const rowStr = (rawData[i] || []).map((c: any) => String(c).trim().toLowerCase()).join(' ');
        if (
          (rowStr.includes('bắt đầu') || rowStr.includes('bat dau') || rowStr.includes('thời gian') || rowStr.includes('tiết') || rowStr.includes('tiet')) &&
          (rowStr.includes('thứ 2') || rowStr.includes('thứ hai') || rowStr.includes('thứ 3') || rowStr.includes('t2') || rowStr.includes('mon'))
        ) {
          headerRowIndex = i;
          isMatrixFormat = true;
          break;
        }
        if (
          (rowStr.includes('thứ') || rowStr.includes('thu') || rowStr.includes('day')) &&
          (rowStr.includes('tiết') || rowStr.includes('tiet') || rowStr.includes('period')) &&
          (rowStr.includes('môn') || rowStr.includes('mon') || rowStr.includes('subject'))
        ) {
          headerRowIndex = i;
          isMatrixFormat = false;
          break;
        }
      }

      // Secondary check: if row 0 has at least 2 day names in columns
      if (headerRowIndex === -1 && rawData.length > 0) {
        const row0 = (rawData[0] || []).map((c: any) => String(c).trim().toLowerCase());
        const dayColsFound = row0.filter((c: string) => normalizeDay(c) !== null);
        if (dayColsFound.length >= 2) {
          headerRowIndex = 0;
          isMatrixFormat = true;
        }
      }

      if (headerRowIndex === -1) {
        setErrorMessage('File Excel không đúng cấu trúc Thời khóa biểu mẫu (Hệ thống hỗ trợ dạng Ma trận các thứ trong tuần hoặc dạng Danh sách tiết học). Vui lòng tải file mẫu chuẩn để kiểm tra. Thời khóa biểu hiện tại được giữ nguyên vẹn.');
        setFile(null);
        setIsProcessing(false);
        return;
      }

      const headers = (rawData[headerRowIndex] || []).map((h: any) => String(h).trim().toLowerCase());
      const rows: ParsedRow[] = [];
      const seenSlots = new Set<string>();

      const morningTimes: Array<{ period: number; startTime: string; endTime: string }> = [];
      const afternoonTimes: Array<{ period: number; startTime: string; endTime: string }> = [];

      if (isMatrixFormat) {
        // --- MATRIX FORMAT PARSING ---
        // Header: Thời gian bắt đầu | Thời gian kết thúc | Thứ 2 | Thứ 3 | Thứ 4 | Thứ 5 | Thứ 6 | Thứ 7
        let startIdx = headers.findIndex((h: string) => h.includes('bắt đầu') || h.includes('bat dau') || h.includes('start'));
        let endIdx = headers.findIndex((h: string) => h.includes('kết thúc') || h.includes('ket thuc') || h.includes('end'));

        if (startIdx === -1) startIdx = 0;
        if (endIdx === -1) endIdx = 1;

        // Day columns mapping
        const dayCols: Array<{ colIdx: number; dayName: string; dayNormalized: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7' }> = [];
        
        headers.forEach((h: string, idx: number) => {
          if (idx === startIdx || idx === endIdx) return;
          const normalized = normalizeDay(h);
          if (normalized) {
            dayCols.push({
              colIdx: idx,
              dayName: String(rawData[headerRowIndex][idx]).trim(),
              dayNormalized: normalized
            });
          }
        });

        // Fallback default day columns if headers weren't named with 'Thứ X'
        if (dayCols.length === 0) {
          const standardDays: Array<'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'> = [
            'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
          ];
          standardDays.forEach((dayName, i) => {
            const cIdx = 2 + i;
            if (cIdx < (rawData[headerRowIndex] || []).length) {
              dayCols.push({
                colIdx: cIdx,
                dayName,
                dayNormalized: dayName
              });
            }
          });
        }

        let morningCounter = 0;
        let afternoonCounter = 0;
        let currentSection: 'morning' | 'afternoon' | null = null;

        for (let r = headerRowIndex + 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.every((c: any) => c === '')) continue;

          // Check for section divider rows like "Sáng" or "Chiều"
          const firstNonEmpty = String(row.find((c: any) => String(c).trim() !== '') || '').trim().toLowerCase();
          if (firstNonEmpty === 'sáng' || firstNonEmpty === 'buổi sáng' || firstNonEmpty === 'morning') {
            currentSection = 'morning';
            continue;
          }
          if (firstNonEmpty === 'chiều' || firstNonEmpty === 'buổi chiều' || firstNonEmpty === 'afternoon') {
            currentSection = 'afternoon';
            continue;
          }

          const startTimeRaw = row[startIdx];
          const endTimeRaw = row[endIdx];
          const startTime = formatTimeString(startTimeRaw);
          const endTime = formatTimeString(endTimeRaw);

          // If row doesn't have times, check if it's an empty or decorative row
          if (!startTime && !endTime) {
            // Check if there are any lessons in this row
            const hasAnyContent = dayCols.some(dc => String(row[dc.colIdx] || '').trim() !== '');
            if (!hasAnyContent) continue;
          }

          // Determine session (Morning vs. Afternoon)
          let session: 'morning' | 'afternoon' = 'morning';
          if (currentSection) {
            session = currentSection;
          } else if (startTime) {
            const startHour = parseInt(startTime.split(':')[0], 10);
            session = startHour >= 12 ? 'afternoon' : 'morning';
          } else if (morningCounter >= 5) {
            session = 'afternoon';
          }

          // Assign period number
          let periodNum = 1;
          if (session === 'morning') {
            morningCounter++;
            periodNum = morningCounter;
            if (startTime && endTime && morningTimes.length < 5) {
              morningTimes.push({ period: periodNum, startTime, endTime });
            }
          } else {
            afternoonCounter++;
            periodNum = afternoonCounter;
            if (startTime && endTime && afternoonTimes.length < 5) {
              afternoonTimes.push({ period: periodNum, startTime, endTime });
            }
          }

          // Process each day in this time slot row
          dayCols.forEach(dayCol => {
            const rawCell = row[dayCol.colIdx];
            const cellText = rawCell !== undefined && rawCell !== null ? String(rawCell).trim() : '';

            // Blank cells are ignored (no fake records, no error)
            if (!cellText) return;

            // Skip if the cell is just a session label
            if (cellText.toLowerCase() === 'sáng' || cellText.toLowerCase() === 'chiều') return;

            const { subject, teacher } = parseSubjectTeacher(cellText);
            const rowErrors: string[] = [];

            if (!subject) {
              rowErrors.push(`Dòng ${r + 1} (${dayCol.dayNormalized}): Tên môn học trống.`);
            }

            if (startTime && endTime) {
              const [sh, sm] = startTime.split(':').map(Number);
              const [eh, em] = endTime.split(':').map(Number);
              if (sh * 60 + sm >= eh * 60 + em) {
                rowErrors.push(`Thời gian bắt đầu (${startTime}) phải nhỏ hơn thời gian kết thúc (${endTime}).`);
              }
            }

            // Check duplicate slot
            const slotKey = `${dayCol.dayNormalized}-${session}-${periodNum}`;
            if (seenSlots.has(slotKey)) {
              rowErrors.push(`Trùng lặp: Đã có môn học ở ${dayCol.dayNormalized}, Buổi ${session === 'morning' ? 'Sáng' : 'Chiều'}, Tiết ${periodNum}`);
            } else {
              seenSlots.add(slotKey);
            }

            rows.push({
              rowNumber: r + 1,
              dayRaw: dayCol.dayName,
              dayNormalized: dayCol.dayNormalized,
              sessionRaw: session === 'morning' ? 'Sáng' : 'Chiều',
              sessionNormalized: session,
              periodRaw: periodNum,
              periodNumber: periodNum,
              subject,
              teacher,
              startTime: startTime || undefined,
              endTime: endTime || undefined,
              isValid: rowErrors.length === 0,
              errors: rowErrors
            });
          });
        }
      } else {
        // --- LIST FORMAT PARSING (Backward Compatibility) ---
        let dayIdx = headers.findIndex((h: string) => h.includes('thứ') || h.includes('thu') || h.includes('day'));
        let sessionIdx = headers.findIndex((h: string) => h.includes('buổi') || h.includes('buoi') || h.includes('session'));
        let periodIdx = headers.findIndex((h: string) => h.includes('tiết') || h.includes('tiet') || h.includes('period'));
        let subjectIdx = headers.findIndex((h: string) => h.includes('môn') || h.includes('mon') || h.includes('subject'));
        let startIdx = headers.findIndex((h: string) => h.includes('bắt đầu') || h.includes('bat dau') || h.includes('start'));
        let endIdx = headers.findIndex((h: string) => h.includes('kết thúc') || h.includes('ket thuc') || h.includes('end'));
        let validFromIdx = headers.findIndex((h: string) => h.includes('áp dụng') || h.includes('ap dung') || h.includes('valid'));
        let noteIdx = headers.findIndex((h: string) => h.includes('ghi chú') || h.includes('ghi chu') || h.includes('note'));

        if (dayIdx === -1) dayIdx = 0;
        if (sessionIdx === -1) sessionIdx = 1;
        if (periodIdx === -1) periodIdx = 2;
        if (subjectIdx === -1) subjectIdx = 3;

        for (let r = headerRowIndex + 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.every((c: any) => c === '')) continue;

          const dayRaw = row[dayIdx] !== undefined ? String(row[dayIdx]).trim() : '';
          const sessionRaw = row[sessionIdx] !== undefined ? String(row[sessionIdx]).trim() : '';
          const periodRaw = row[periodIdx] !== undefined ? row[periodIdx] : '';
          const subjectRaw = row[subjectIdx] !== undefined ? String(row[subjectIdx]).trim() : '';
          const startTime = startIdx !== -1 && row[startIdx] ? formatTimeString(row[startIdx]) || undefined : undefined;
          const endTime = endIdx !== -1 && row[endIdx] ? formatTimeString(row[endIdx]) || undefined : undefined;
          const validFromVal = validFromIdx !== -1 && row[validFromIdx] ? String(row[validFromIdx]).trim() : undefined;
          const note = noteIdx !== -1 && row[noteIdx] ? String(row[noteIdx]).trim() : undefined;

          // Parse subject & teacher
          const { subject, teacher } = parseSubjectTeacher(subjectRaw);

          const dayNormalized = normalizeDay(dayRaw);
          const sessionNormalized = normalizeSession(sessionRaw);

          let periodNumber: number | null = null;
          if (typeof periodRaw === 'number') {
            periodNumber = periodRaw;
          } else if (typeof periodRaw === 'string') {
            const num = parseInt(periodRaw.replace(/\D/g, ''), 10);
            if (!isNaN(num)) periodNumber = num;
          }

          const errors: string[] = [];

          if (!dayNormalized) {
            errors.push(`Thứ không hợp lệ: "${dayRaw}" (Cần Thứ 2, 3, 4, 5, 6, 7 hoặc Thứ Hai...)`);
          }

          if (!sessionNormalized) {
            errors.push(`Buổi không hợp lệ: "${sessionRaw}" (Cần "Sáng" hoặc "Chiều")`);
          }

          if (!periodNumber || periodNumber < 1 || periodNumber > 5) {
            errors.push(`Tiết không hợp lệ: "${periodRaw}" (Cần từ tiết 1 đến tiết 5)`);
          }

          if (!subject) {
            errors.push('Tên môn học không được để trống.');
          }

          if (dayNormalized && sessionNormalized && periodNumber) {
            const slotKey = `${dayNormalized}-${sessionNormalized}-${periodNumber}`;
            if (seenSlots.has(slotKey)) {
              errors.push(`Trùng lặp tiết: Đã có môn học ở ${dayNormalized}, Buổi ${sessionNormalized === 'morning' ? 'Sáng' : 'Chiều'}, Tiết ${periodNumber}`);
            } else {
              seenSlots.add(slotKey);
            }
          }

          rows.push({
            rowNumber: r + 1,
            dayRaw,
            dayNormalized,
            sessionRaw,
            sessionNormalized,
            periodRaw,
            periodNumber,
            subject,
            teacher,
            startTime,
            endTime,
            validFrom: validFromVal,
            note,
            isValid: errors.length === 0,
            errors
          });
        }
      }

      setDetectedPeriodTimes(
        morningTimes.length > 0 || afternoonTimes.length > 0
          ? { morning: morningTimes, afternoon: afternoonTimes }
          : null
      );
      setParsedRows(rows);
      if (!hasExistingTimetable) {
        setSaveMode('INITIAL');
      } else {
        setSaveMode(null);
      }
      setActiveStep('preview');
    } catch (err: any) {
      setErrorMessage(`Lỗi khi đọc file Excel: ${err?.message || 'Vui lòng kiểm tra định dạng file.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  // 3. Initiate Save: check validation, saveMode selection, and trigger confirmation if OVERWRITE
  const handleInitiateSave = (action: 'DRAFT' | 'APPLY_NOW') => {
    if (validCount === 0) {
      setErrorMessage('Không có dòng dữ liệu nào hợp lệ để nhập vào Thời khóa biểu.');
      return;
    }

    if (hasExistingTimetable && !saveMode) {
      setErrorMessage('Vui lòng chọn 1 trong 2 phương án lưu: "Ghi đè bản hiện tại" hoặc "Tạo bản mới".');
      return;
    }

    const currentMode = hasExistingTimetable ? saveMode : 'INITIAL';

    if (currentMode === 'NEW_VERSION' || currentMode === 'INITIAL') {
      if (!versionName.trim()) {
        setErrorMessage('Vui lòng nhập tên phiên bản thời khóa biểu mới.');
        return;
      }
    }

    setErrorMessage(null);

    // If Overwrite mode: MUST ask for confirmation before replacing!
    if (currentMode === 'OVERWRITE') {
      setPendingAction(action);
      setIsConfirmOverwriteOpen(true);
      return;
    }

    // Otherwise proceed directly
    executeSave(action, currentMode || 'NEW_VERSION');
  };

  const executeSave = async (
    action: 'DRAFT' | 'APPLY_NOW',
    explicitMode?: 'OVERWRITE' | 'NEW_VERSION' | 'INITIAL'
  ) => {
    const mode = explicitMode || saveMode || (hasExistingTimetable ? 'NEW_VERSION' : 'INITIAL');
    if (action === 'APPLY_NOW') {
      setIsApplying(true);
    } else {
      setIsSaving(true);
    }
    setErrorMessage(null);
    setSyncWarning(null);

    try {
      // Build base schedule structure
      const days: Array<'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7'> = [
        'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
      ];

      const newSchedule: DayTimetable[] = days.map(d => ({
        dayOfWeek: d,
        morningPeriods: [1, 2, 3, 4, 5].map(pNum => ({
          period: pNum,
          subject: '',
          teacher: '',
          room: ''
        })),
        afternoonPeriods: [1, 2, 3, 4, 5].map(pNum => ({
          period: pNum,
          subject: '',
          teacher: '',
          room: ''
        }))
      }));

      // Populate from valid parsed rows
      parsedRows.forEach(row => {
        if (!row.isValid || !row.dayNormalized || !row.sessionNormalized || !row.periodNumber) return;

        const dayObj = newSchedule.find(d => d.dayOfWeek === row.dayNormalized);
        if (!dayObj) return;

        const list = row.sessionNormalized === 'morning' ? dayObj.morningPeriods : dayObj.afternoonPeriods;
        const targetPeriod = list.find(p => p.period === row.periodNumber);
        if (targetPeriod) {
          targetPeriod.subject = row.subject;
          targetPeriod.teacher = row.teacher || '';
          if (row.note) targetPeriod.note = row.note;
        }
      });

      // Update period times if detected in imported Excel
      if (detectedPeriodTimes) {
        const currentPeriodTimes = academicService.getPeriodTimes() || { morning: [], afternoon: [] };
        const updatedMorning = [...currentPeriodTimes.morning];
        const updatedAfternoon = [...currentPeriodTimes.afternoon];

        detectedPeriodTimes.morning.forEach(dp => {
          const idx = updatedMorning.findIndex(p => p.period === dp.period);
          if (idx !== -1) {
            updatedMorning[idx] = { ...updatedMorning[idx], startTime: dp.startTime, endTime: dp.endTime };
          }
        });

        detectedPeriodTimes.afternoon.forEach(dp => {
          const idx = updatedAfternoon.findIndex(p => p.period === dp.period);
          if (idx !== -1) {
            updatedAfternoon[idx] = { ...updatedAfternoon[idx], startTime: dp.startTime, endTime: dp.endTime };
          }
        });

        academicService.updatePeriodTimes({ morning: updatedMorning, afternoon: updatedAfternoon });
      }

      let res: { success: boolean; message: string; syncSuccess: boolean; error?: string };

      if (mode === 'OVERWRITE') {
        res = await academicService.overwriteCurrentTimetable(
          newSchedule,
          action === 'APPLY_NOW',
          versionName.trim()
        );
      } else {
        res = await academicService.createNewTimetableVersionAsync(
          versionName.trim() || `TKB Nhập từ Excel (${new Date().toLocaleDateString('vi-VN')})`,
          semester,
          validFrom || new Date().toLocaleDateString('vi-VN'),
          newSchedule,
          action === 'APPLY_NOW'
        );
      }

      if (!res.success) {
        // Lưu thất bại: giữ nguyên TKB đang hoạt động, giữ bản xem trước và báo lỗi
        setErrorMessage(res.message || 'Lỗi khi lưu vào máy chủ. Bản xem trước được giữ nguyên.');
        return;
      }

      // Lưu thành công
      if (!res.syncSuccess) {
        setSyncWarning(res.message);
      }

      setSuccessSummary({
        mode,
        applied: action === 'APPLY_NOW',
        count: validCount,
        name: mode === 'OVERWRITE' ? (activeTimetable?.versionName || 'Bản hiện tại') : versionName.trim()
      });

      setIsConfirmOverwriteOpen(false);
      setActiveStep('success');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(`Lỗi xử lý: ${err?.message || 'Không thể lưu thời khóa biểu'}. Bản xem trước được giữ nguyên.`);
    } finally {
      setIsSaving(false);
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-2xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                NHẬP THỜI KHÓA BIỂU TỪ EXCEL
              </h3>
              <p className="text-xs text-slate-500">
                Tải lên file Excel để cập nhật toàn bộ lịch học và lưu thành phiên bản mới
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 animate-fade-in">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 1: Upload & Template */}
          {activeStep === 'upload' && (
            <div className="space-y-5">
              {/* Instructions banner */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-blue-950">
                      Cấu trúc file Excel mẫu Thời khóa biểu:
                    </p>
                    <p>
                      Hệ thống hỗ trợ chuẩn ma trận: <span className="font-bold text-slate-900">Thời gian bắt đầu | Thời gian kết thúc | Thứ 2 | Thứ 3 | Thứ 4 | Thứ 5 | Thứ 6 | Thứ 7</span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      • <span className="font-semibold">Nội dung ô:</span> Định dạng <span className="font-bold text-slate-800">"Môn học - Giáo viên"</span> (ví dụ: <code className="bg-blue-100/60 px-1 py-0.5 rounded text-blue-900 font-mono">SHL - Đ.T.Bình</code>, <code className="bg-blue-100/60 px-1 py-0.5 rounded text-blue-900 font-mono">Toán - D.N.Tạo</code>).<br />
                      • <span className="font-semibold">Thời gian:</span> 07:15 - 08:00, 08:00 - 08:45, 13:15 - 14:00... (tự động phân loại Buổi Sáng / Buổi Chiều).<br />
                      • <span className="font-semibold">Ô trống:</span> Tiết không có giờ học được để trống tự nhiên mà không gây lỗi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download Template Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between hover:border-emerald-300 transition-all">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                      <Download className="h-4 w-4 text-emerald-600" />
                      <span>Bước 1: Tải file mẫu Excel chuẩn</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      File mẫu dạng bảng ma trận theo đúng khung giờ và phân môn chuẩn thực tế.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-white border border-emerald-300 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải file mẫu Excel (.xlsx)</span>
                  </button>
                </div>

                {/* Upload Card */}
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/40 p-4 flex flex-col justify-between text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all relative">
                  <div>
                    <Upload className="mx-auto h-7 w-7 text-blue-600 mb-1" />
                    <div className="text-xs font-bold text-slate-800">
                      Bước 2: Chọn hoặc kéo thả file Excel
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hỗ trợ định dạng .xlsx, .xls
                    </p>
                  </div>

                  <label className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-xs cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>Chọn file từ máy tính</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {isProcessing && (
                <div className="rounded-xl bg-slate-100 p-4 text-center text-xs text-slate-600 animate-pulse">
                  Đang đọc và phân tích file Excel, vui lòng đợi...
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview & Validation */}
          {activeStep === 'preview' && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                    {validCount} tiết hợp lệ
                  </span>
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-xl">
                      <AlertTriangle className="h-4 w-4" />
                      {errorCount} dòng có lỗi
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    (Tổng số {parsedRows.length} tiết đọc được)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                    setActiveStep('upload');
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Chọn file khác</span>
                </button>
              </div>

              {/* Form config & Save options */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                {hasExistingTimetable ? (
                  <div>
                    <label className="text-xs font-black text-slate-800 uppercase tracking-tight block mb-2">
                      Chọn phương án lưu <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Ghi đè bản hiện tại */}
                      <div
                        onClick={() => setSaveMode('OVERWRITE')}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition-all relative ${
                          saveMode === 'OVERWRITE'
                            ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="saveMode"
                            checked={saveMode === 'OVERWRITE'}
                            onChange={() => setSaveMode('OVERWRITE')}
                            className="mt-0.5 h-4 w-4 text-blue-600 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>Ghi đè bản hiện tại</span>
                              {activeTimetable?.isApplied && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                                  Đang áp dụng
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Cập nhật trực tiếp lên bản <strong>"{activeTimetable?.versionName || 'Bản chính thức'}"</strong>. Không tạo thêm bản trùng lặp trong lịch sử. Hệ thống sẽ hỏi xác nhận trước khi thay thế.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Option 2: Tạo bản mới */}
                      <div
                        onClick={() => setSaveMode('NEW_VERSION')}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition-all relative ${
                          saveMode === 'NEW_VERSION'
                            ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="saveMode"
                            checked={saveMode === 'NEW_VERSION'}
                            onChange={() => setSaveMode('NEW_VERSION')}
                            className="mt-0.5 h-4 w-4 text-blue-600 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              Tạo bản mới trong lịch sử
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Tạo một phiên bản riêng biệt trong lịch sử. Bản hiện tại và các phiên bản cũ được giữ nguyên vẹn.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Lớp hiện chưa có thời khóa biểu. File Excel này sẽ tạo bản thời khóa biểu đầu tiên cho lớp.</span>
                  </div>
                )}

                {/* Sub-inputs when NEW_VERSION or INITIAL */}
                {(saveMode === 'NEW_VERSION' || saveMode === 'INITIAL' || !hasExistingTimetable) && (
                  <div className="pt-2 border-t border-slate-200 space-y-2.5">
                    <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                      Cấu hình thông tin phiên bản mới:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tên phiên bản <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={versionName}
                          onChange={(e) => setVersionName(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-hidden focus:border-blue-500 font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Học kỳ
                        </label>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-hidden focus:border-blue-500 font-semibold"
                        >
                          <option value="HK1">Học kỳ I (HK1)</option>
                          <option value="HK2">Học kỳ II (HK2)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Ngày bắt đầu áp dụng
                        </label>
                        <input
                          type="text"
                          value={validFrom}
                          onChange={(e) => setValidFrom(e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-hidden focus:border-blue-500 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notice when OVERWRITE */}
                {saveMode === 'OVERWRITE' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Đang chọn ghi đè lên: <strong>"{activeTimetable?.versionName || 'Thời khóa biểu hiện tại'}"</strong>. Khi nhấn lưu, hệ thống sẽ mở hộp thoại xác nhận trước khi thay thế.
                    </span>
                  </div>
                )}

                {hasExistingTimetable && !saveMode && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs font-semibold text-blue-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Vui lòng chọn 1 trong 2 phương án lưu ở trên để tiếp tục.</span>
                  </div>
                )}
              </div>

              {/* Data Preview Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-72">
                <table className="w-full border-collapse text-left text-xs bg-white">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-black uppercase">
                    <tr>
                      <th className="p-2.5 text-center w-12">Dòng</th>
                      <th className="p-2.5">Thứ</th>
                      <th className="p-2.5">Thời gian</th>
                      <th className="p-2.5">Buổi</th>
                      <th className="p-2.5 text-center">Tiết</th>
                      <th className="p-2.5">Môn học</th>
                      <th className="p-2.5">Giáo viên</th>
                      <th className="p-2.5">Trạng thái & Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={`${row.rowNumber}-${idx}`}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50'}
                      >
                        <td className="p-2.5 text-center font-mono text-slate-400 text-[11px]">
                          {row.rowNumber}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          {row.dayNormalized || row.dayRaw}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600">
                          {row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : '-'}
                        </td>
                        <td className="p-2.5">
                          {row.sessionNormalized === 'morning' ? 'Sáng' : row.sessionNormalized === 'afternoon' ? 'Chiều' : row.sessionRaw}
                        </td>
                        <td className="p-2.5 text-center font-bold">
                          {row.periodNumber ? `Tiết ${row.periodNumber}` : row.periodRaw}
                        </td>
                        <td className="p-2.5 font-bold text-blue-900">
                          {row.subject || <span className="text-rose-500">(Trống)</span>}
                        </td>
                        <td className="p-2.5 font-medium text-slate-700">
                          {row.teacher ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold">
                              {row.teacher}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <Check className="h-3.5 w-3.5" /> Hợp lệ
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((err, i) => (
                                <div key={i} className="text-[10px] font-semibold text-rose-700 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Success Confirmation */}
          {activeStep === 'success' && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">
                  Nhập Thời Khóa Biểu Thành Công!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  {successSummary?.mode === 'OVERWRITE'
                    ? `Đã ghi đè thành công nội dung ${successSummary.count} tiết học lên bản hiện tại "${successSummary.name}".`
                    : `Đã tạo thành công phiên bản mới "${successSummary?.name}" với ${successSummary?.count} tiết học.`}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800 border border-slate-200">
                  {successSummary?.applied ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCheck className="h-4 w-4" /> Đã áp dụng chính thức cho Học viên và Phụ huynh
                    </span>
                  ) : (
                    <span className="text-blue-700 flex items-center gap-1">
                      <Save className="h-4 w-4" /> Đã lưu bản làm việc (Bản nháp)
                    </span>
                  )}
                </div>
              </div>

              {syncWarning && (
                <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>{syncWarning}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await academicService.applyTimetableNow();
                        if (res.syncSuccess) {
                          setSyncWarning(null);
                        }
                      } catch {}
                    }}
                    className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Thử đồng bộ lại</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          {activeStep === 'upload' && (
            <>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Tải file mẫu Excel</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </>
          )}

          {activeStep === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setActiveStep('upload')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>

                {/* Phương án 1: Lưu bản làm việc (DRAFT) */}
                <button
                  type="button"
                  disabled={validCount === 0 || (hasExistingTimetable && !saveMode) || isSaving || isApplying}
                  onClick={() => handleInitiateSave('DRAFT')}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 shadow-2xs active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                  title="Lưu vào kho dữ liệu chính dưới dạng bản làm việc (chưa công bố cho HS/PH)"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu bản làm việc'}</span>
                </button>

                {/* Phương án 2: Lưu và áp dụng ngay (APPLY_NOW) */}
                <button
                  type="button"
                  disabled={validCount === 0 || (hasExistingTimetable && !saveMode) || isSaving || isApplying}
                  onClick={() => handleInitiateSave('APPLY_NOW')}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                  title="Lưu vào kho dữ liệu chính và áp dụng chính thức cho HS & PH"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>{isApplying ? 'Đang áp dụng...' : 'Lưu & Áp dụng ngay'}</span>
                </button>
              </div>
            </>
          )}

          {activeStep === 'success' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-xs cursor-pointer"
              >
                Hoàn tất & Xem TKB
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Ghi đè bản hiện tại */}
      {isConfirmOverwriteOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-amber-200">
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white font-bold shadow-2xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950 uppercase tracking-tight">
                    Xác nhận ghi đè thời khóa biểu
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Cập nhật thay thế bản hiện tại
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOverwriteOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-amber-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs text-slate-600">
              <p className="leading-relaxed text-slate-800">
                Bạn đang chuẩn bị <strong className="text-amber-800">ghi đè bản thời khóa biểu hiện tại</strong>:
              </p>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">
                  {activeTimetable?.versionName || 'Thời khóa biểu chính thức'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Số tiết nhập từ Excel: <span className="font-bold text-emerald-700">{validCount} tiết</span>
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 font-medium text-slate-700 text-[11px]">
                <li>Toàn bộ các tiết học trong bản hiện tại sẽ được thay thế bằng dữ liệu từ file Excel này.</li>
                <li>Hệ thống <strong>không tạo bản trùng lặp</strong> trong lịch sử.</li>
                <li>Các phiên bản khác trong lịch sử được giữ nguyên vẹn.</li>
                {pendingAction === 'APPLY_NOW' && (
                  <li className="font-bold text-emerald-700">
                    Bản này sẽ được công bố và đồng bộ ngay lập tức cho Học viên & Phụ huynh.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsConfirmOverwriteOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Hủy bỏ (Giữ nguyên)
              </button>
              <button
                type="button"
                disabled={isSaving || isApplying}
                onClick={() => executeSave(pendingAction || 'DRAFT', 'OVERWRITE')}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSaving || isApplying ? 'Đang xử lý...' : 'Xác nhận ghi đè'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
