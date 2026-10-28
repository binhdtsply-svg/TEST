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
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Info,
  FileText
} from 'lucide-react';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { academicService, PERIOD_NAMES, calculateSubjectAverage, isEnteredValidScore, isSameSubject } from '../../services/AcademicService';
import { AcademicPeriod, Student, SubjectGrade } from '../../types';

interface SubjectColumnMap {
  evaluationCol?: string; // Cột kết quả duy nhất cho môn đánh giá bằng nhận xét
  tx1?: string;
  tx2?: string;
  tx3?: string;
  tx4?: string;
  tx5?: string;
  tx6?: string;
  midterm?: string;
  finalExam?: string;
  tbHk1?: string;
  tbHk2?: string;
  avg?: string;
  comment?: string;
}

interface ExcelGradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPeriod: AcademicPeriod;
  onSuccess: () => void;
}

interface ParsedRow {
  rowIndex: number;
  raw: Record<string, any>;
  matchedStudent?: Student;
  studentCode?: string;
  studentName?: string;
  grades: SubjectGrade[];
  teacherComment?: string;
  strongestSubject?: string;
  improvementSubject?: string;
  excusedAbsences?: number;
  unexcusedAbsences?: number;
  academicSummary?: string;
  conductSummary?: string;
  errors: string[];
}

export const ExcelGradeImportModal: React.FC<ExcelGradeImportModalProps> = ({
  isOpen,
  onClose,
  currentPeriod,
  onSuccess
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod>(currentPeriod);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Column mapping states
  const [codeCol, setCodeCol] = useState<string>('');
  const [nameCol, setNameCol] = useState<string>('');
  const [commentCol, setCommentCol] = useState<string>('');
  const [strongestCol, setStrongestCol] = useState<string>('');
  const [improvementCol, setImprovementCol] = useState<string>('');
  const [excusedAbsencesCol, setExcusedAbsencesCol] = useState<string>('');
  const [unexcusedAbsencesCol, setUnexcusedAbsencesCol] = useState<string>('');
  const [academicSummaryCol, setAcademicSummaryCol] = useState<string>('');
  const [conductSummaryCol, setConductSummaryCol] = useState<string>('');

  // Mapping of subject columns: subjectName -> SubjectColumnMap
  const [subjectMappings, setSubjectMappings] = useState<Record<string, SubjectColumnMap>>({});

  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importSummary, setImportSummary] = useState<{ total: number; success: number; errors: number }>({
    total: 0,
    success: 0,
    errors: 0
  });
  const [saveErrorsList, setSaveErrorsList] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const students = studentService.getAll();
  const appliedSubjects = classService.getAppliedSubjects();
  const classSettings = classService.getSettings();
  const isFinalPeriod = selectedPeriod === 'final_hk1' || selectedPeriod === 'final_hk2';
  const parentPeriod: AcademicPeriod = selectedPeriod === 'final_hk1' ? 'midterm_hk1' : 'midterm_hk2';

  if (!isOpen) return null;

  const isCommentSubject = (sub?: { assessmentMode?: string; assessmentType?: string; name?: string }): boolean => {
    if (!sub) return false;
    if (sub.assessmentMode === 'COMMENT_ONLY') return true;
    if (sub.assessmentType === 'COMMENT') return true;
    if (sub.name && academicService.isCommentOnlySubject(sub.name)) return true;
    return false;
  };

  // Generate and download dynamic sample Excel template
  const handleDownloadSampleExcel = async () => {
    const XLSX = await import('xlsx');

    const headerRow: string[] = ['STT', 'Mã học sinh', 'Họ và tên', 'Tổ'];

    appliedSubjects.forEach((s) => {
      const isComment = isCommentSubject(s);
      if (isComment) {
        if (selectedPeriod === 'final_hk1') {
          headerRow.push(`${s.name} - Đánh giá Cuối HKI (Đạt/Chưa đạt)`);
        } else if (selectedPeriod === 'final_hk2') {
          headerRow.push(`${s.name} - Đánh giá Cuối HKII (Đạt/Chưa đạt)`);
        } else if (selectedPeriod === 'full_year') {
          headerRow.push(`${s.name} - Đánh giá Cả Năm (Đạt/Chưa đạt)`);
        } else if (selectedPeriod === 'midterm_hk1') {
          headerRow.push(`${s.name} - Đánh giá Giữa HKI (Đạt/Chưa đạt)`);
        } else {
          headerRow.push(`${s.name} - Đánh giá Giữa HKII (Đạt/Chưa đạt)`);
        }
      } else if (selectedPeriod === 'full_year') {
        const txCount = s.txColumnCount ?? 3;
        for (let i = 1; i <= txCount; i++) {
          headerRow.push(`${s.name} - TX${i}`);
        }
        headerRow.push(`${s.name} - Giữa kỳ II`);
        headerRow.push(`${s.name} - Cuối kỳ II`);
        headerRow.push(`${s.name} - TB HKII`);
        headerRow.push(`${s.name} - TB HKI`);
        headerRow.push(`${s.name} - TB Cả Năm`);
        headerRow.push(`${s.name} - Ghi chú`);
      } else if (isFinalPeriod) {
        const configuredTxCount = s.txColumnCount ?? academicService.getSubjectRegularCount(s.name) ?? 3;
        const totalTx = Math.max(1, Math.min(6, configuredTxCount));

        // Xác định số cột TX đã có dữ liệu ở giai đoạn giữa học kỳ cho đúng môn học này
        let midtermTxCount = 0;
        for (let i = 1; i <= totalTx; i++) {
          const txKey = `tx${i}` as keyof SubjectGrade;
          const hasMidtermData = students.some((st) => {
            const pRec = academicService.getStudentAcademicRecord(st.id, parentPeriod);
            const pGrade = pRec?.grades?.find((g) => isSameSubject(g, s));
            return isEnteredValidScore(pGrade?.[txKey]);
          });
          if (hasMidtermData) {
            midtermTxCount = i;
          }
        }

        // File mẫu nhập điểm cuối kỳ chỉ gồm: Các cột điểm thường xuyên còn thiếu và Cột điểm cuối kỳ
        for (let i = midtermTxCount + 1; i <= totalTx; i++) {
          headerRow.push(`${s.name} - TX${i}`);
        }
        const finalExamLabel = selectedPeriod === 'final_hk1'
          ? `${s.name} - Cuối kỳ I`
          : `${s.name} - Cuối kỳ II`;
        headerRow.push(finalExamLabel);
      } else {
        // midterm
        const txCount = s.txColumnCount ?? 3;
        for (let i = 1; i <= txCount; i++) {
          headerRow.push(`${s.name} - TX${i}`);
        }
        const midTermLabel = selectedPeriod === 'midterm_hk1' ? `${s.name} - Giữa kỳ I` : `${s.name} - Giữa kỳ II`;
        const avgLabel = selectedPeriod === 'midterm_hk1' ? `${s.name} - ĐTB GK I` : `${s.name} - ĐTB GK II`;
        headerRow.push(midTermLabel);
        headerRow.push(avgLabel);
        headerRow.push(`${s.name} - Ghi chú`);
      }
    });

    // Summary & attendance columns
    headerRow.push('Môn thế mạnh');
    headerRow.push('Môn cần chú ý');
    headerRow.push('Nghỉ có phép');
    headerRow.push('Nghỉ không phép');
    headerRow.push('Đánh giá học tập');
    headerRow.push('Đánh giá rèn luyện');
    headerRow.push('Nhận xét của GVCN');

    // Build student rows with exact matching column counts
    const dataRows = students.map((st, idx) => {
      const row: any[] = [idx + 1, st.code, st.fullName, `Tổ ${st.group}`];

      const currentRec = academicService.getStudentAcademicRecord(st.id, selectedPeriod);
      const parentRec = isFinalPeriod ? academicService.getStudentAcademicRecord(st.id, parentPeriod) : null;

      appliedSubjects.forEach((s) => {
        const isComment = isCommentSubject(s);
        const curGrade = currentRec?.grades?.find((g) => isSameSubject(g, s));
        const parGrade = parentRec?.grades?.find((g) => isSameSubject(g, s));

        if (isComment) {
          row.push(curGrade?.qualitativeResult || '');
        } else if (selectedPeriod === 'full_year') {
          const txCount = s.txColumnCount ?? 3;
          for (let i = 1; i <= txCount; i++) {
            const txKey = `tx${i}` as keyof SubjectGrade;
            const curVal = curGrade?.[txKey] as number | undefined;
            row.push(isEnteredValidScore(curVal) ? Number(curVal) : '');
          }
          const midVal = isEnteredValidScore(curGrade?.midterm) ? Number(curGrade?.midterm) : '';
          const finVal = isEnteredValidScore(curGrade?.finalExam) ? Number(curGrade?.finalExam) : '';
          row.push(
            midVal !== undefined ? midVal : '',
            finVal !== undefined ? finVal : '',
            curGrade?.tbHk2 !== undefined ? curGrade.tbHk2 : '',
            curGrade?.tbHk1 !== undefined ? curGrade.tbHk1 : '',
            curGrade?.tbCaNam !== undefined ? curGrade.tbCaNam : (curGrade?.average !== undefined ? curGrade.average : ''),
            curGrade?.comment || curGrade?.note || ''
          );
        } else if (isFinalPeriod) {
          const configuredTxCount = s.txColumnCount ?? academicService.getSubjectRegularCount(s.name) ?? 3;
          const totalTx = Math.max(1, Math.min(6, configuredTxCount));

          let midtermTxCount = 0;
          for (let i = 1; i <= totalTx; i++) {
            const txKey = `tx${i}` as keyof SubjectGrade;
            const hasMidtermData = students.some((st) => {
              const pRec = academicService.getStudentAcademicRecord(st.id, parentPeriod);
              const pGrade = pRec?.grades?.find((g) => isSameSubject(g, s));
              return isEnteredValidScore(pGrade?.[txKey]);
            });
            if (hasMidtermData) {
              midtermTxCount = i;
            }
          }

          // Điền các cột TX còn thiếu
          for (let i = midtermTxCount + 1; i <= totalTx; i++) {
            const txKey = `tx${i}` as keyof SubjectGrade;
            const curVal = curGrade?.[txKey] as number | undefined;
            row.push(isEnteredValidScore(curVal) ? Number(curVal) : '');
          }

          // Cột điểm cuối kỳ
          const finVal = isEnteredValidScore(curGrade?.finalExam) ? Number(curGrade?.finalExam) : '';
          row.push(finVal !== undefined ? finVal : '');
        } else {
          // midterm
          const txCount = s.txColumnCount ?? 3;
          for (let i = 1; i <= txCount; i++) {
            const txKey = `tx${i}` as keyof SubjectGrade;
            const curVal = curGrade?.[txKey] as number | undefined;
            row.push(isEnteredValidScore(curVal) ? Number(curVal) : '');
          }
          const midVal = isEnteredValidScore(curGrade?.midterm) ? Number(curGrade?.midterm) : '';
          row.push(midVal !== undefined ? midVal : '');

          const avgVal = curGrade?.average !== undefined ? curGrade.average : '';
          row.push(avgVal !== undefined ? avgVal : '');

          row.push(curGrade?.comment || curGrade?.note || '');
        }
      });

      row.push(currentRec?.strongestSubject || '');
      row.push(currentRec?.improvementSubject || '');
      row.push(currentRec?.excusedAbsences !== undefined ? currentRec.excusedAbsences : '');
      row.push(currentRec?.unexcusedAbsences !== undefined ? currentRec.unexcusedAbsences : '');
      row.push(currentRec?.academicSummary || '');
      row.push(currentRec?.conductSummary || '');
      row.push(currentRec?.teacherComment || '');

      return row;
    });

    const safeClassName = classSettings.className || classSettings.name || '12A1';
    let bannerTitle = `BẢNG ĐIỂM NHẬP LIỆU ${PERIOD_NAMES[selectedPeriod].toUpperCase()} - LỚP ${safeClassName.toUpperCase()} (NĂM HỌC ${classSettings.academicYear || '2024-2025'})`;
    if (selectedPeriod === 'final_hk1') {
      bannerTitle = `BẢNG ĐIỂM NHẬP LIỆU CUỐI HỌC KỲ I - LỚP ${safeClassName.toUpperCase()} (NĂM HỌC ${classSettings.academicYear || '2024-2025'})`;
    } else if (selectedPeriod === 'final_hk2') {
      bannerTitle = `BẢNG ĐIỂM NHẬP LIỆU CUỐI HỌC KỲ II - LỚP ${safeClassName.toUpperCase()} (NĂM HỌC ${classSettings.academicYear || '2024-2025'})`;
    }

    const wsData = [
      [bannerTitle],
      [],
      headerRow,
      ...dataRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangDiem');

    let fileSuffix = 'BangDiem';
    if (selectedPeriod === 'final_hk1') fileSuffix = 'Cuoi_HKI';
    else if (selectedPeriod === 'final_hk2') fileSuffix = 'Cuoi_HKII';
    else if (selectedPeriod === 'midterm_hk1') fileSuffix = 'Giua_HKI';
    else if (selectedPeriod === 'midterm_hk2') fileSuffix = 'Giua_HKII';
    else if (selectedPeriod === 'full_year') fileSuffix = 'Ca_Nam';

    XLSX.writeFile(wb, `Mau_Nhap_Diem_${safeClassName}_${fileSuffix}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeneralError(null);
    setSaveErrorsList([]);
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          setGeneralError('File Excel không có trang tính (sheet) nào hợp lệ.');
          setIsProcessing(false);
          return;
        }
        const ws = wb.Sheets[firstSheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!Array.isArray(data) || data.length < 2) {
          setGeneralError('File Excel không có dữ liệu hoặc không đúng định dạng.');
          setIsProcessing(false);
          return;
        }

        // Detect header row accurately by looking for student identity keywords and non-empty cells
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const rowArr = Array.isArray(data[i]) ? data[i] : [];
          const nonEmptyCells = rowArr
            .map((c: any) => (c !== undefined && c !== null ? String(c).trim() : ''))
            .filter(Boolean);
          if (nonEmptyCells.length >= 2) {
            const joinedLower = nonEmptyCells.join(' | ').toLowerCase();
            if (
              joinedLower.includes('mã học sinh') ||
              joinedLower.includes('mã hs') ||
              joinedLower.includes('mã định danh') ||
              joinedLower.includes('mã học viên') ||
              joinedLower.includes('họ và tên') ||
              joinedLower.includes('họ tên') ||
              joinedLower.includes('tên học sinh') ||
              joinedLower.includes('tên học viên')
            ) {
              headerRowIndex = i;
              break;
            }
            if (headerRowIndex === -1 && nonEmptyCells.length >= 3) {
              headerRowIndex = i;
            }
          }
        }

        if (headerRowIndex === -1) {
          setGeneralError('Không tìm thấy hàng tiêu đề hợp lệ trong file Excel. Vui lòng kiểm tra lại cấu trúc file.');
          setIsProcessing(false);
          return;
        }

        const rawHeaderRow = data[headerRowIndex] || [];
        const headers = rawHeaderRow.map((h: any, idx: number) =>
          h !== undefined && h !== null && String(h).trim() !== '' ? String(h).trim() : `Cột ${idx + 1}`
        );

        const rows = data
          .slice(headerRowIndex + 1)
          .filter((r) => Array.isArray(r) && r.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== ''));

        if (rows.length === 0) {
          setGeneralError('File Excel không có dòng dữ liệu học viên nào dưới hàng tiêu đề.');
          setIsProcessing(false);
          return;
        }

        setRawHeaders(headers);
        setRawRows(rows);

        // Auto-detect basic columns
        let detectedCode = '';
        let detectedName = '';
        let detectedComment = '';
        let detectedStrongest = '';
        let detectedImprovement = '';
        let detectedExcused = '';
        let detectedUnexcused = '';
        let detectedAcademicSum = '';
        let detectedConductSum = '';

        headers.forEach((h) => {
          const lower = h.toLowerCase();
          if (
            lower.includes('mã học sinh') ||
            lower.includes('mã hs') ||
            lower.includes('mã định danh') ||
            lower.includes('mã học viên') ||
            lower === 'mã' ||
            (lower.includes('mã') && !detectedCode && !lower.includes('môn'))
          ) {
            detectedCode = h;
          } else if (
            lower.includes('họ và tên') ||
            lower.includes('họ tên') ||
            lower.includes('tên học sinh') ||
            lower.includes('tên học viên')
          ) {
            detectedName = h;
          } else if (
            lower.includes('nhận xét của gvcn') ||
            lower.includes('nhận xét gvcn') ||
            lower.includes('nhận xét chung') ||
            (lower === 'nhận xét' && !detectedComment)
          ) {
            detectedComment = h;
          } else if (lower.includes('thế mạnh') || lower.includes('môn thế mạnh')) {
            detectedStrongest = h;
          } else if (lower.includes('cần chú ý') || lower.includes('môn cần chú ý') || lower.includes('cần cố gắng')) {
            detectedImprovement = h;
          } else if (lower.includes('có phép') || lower.includes('nghỉ có phép')) {
            detectedExcused = h;
          } else if (lower.includes('không phép') || lower.includes('nghỉ không phép')) {
            detectedUnexcused = h;
          } else if (lower.includes('đánh giá học tập') || lower.includes('học lực tổng kết') || lower.includes('kết quả học tập')) {
            detectedAcademicSum = h;
          } else if (lower.includes('đánh giá rèn luyện') || lower.includes('hạnh kiểm tổng kết') || lower.includes('kết quả rèn luyện')) {
            detectedConductSum = h;
          }
        });

        setCodeCol(detectedCode || '');
        setNameCol(detectedName || '');
        setCommentCol(detectedComment || '');
        setStrongestCol(detectedStrongest || '');
        setImprovementCol(detectedImprovement || '');
        setExcusedAbsencesCol(detectedExcused || '');
        setUnexcusedAbsencesCol(detectedUnexcused || '');
        setAcademicSummaryCol(detectedAcademicSum || '');
        setConductSummaryCol(detectedConductSum || '');

        if (!detectedCode && !detectedName) {
          setGeneralError('File Excel không tìm thấy cột khóa định danh học sinh (Mã học sinh hoặc Họ và tên). Vui lòng kiểm tra lại cấu trúc file mẫu.');
          setIsProcessing(false);
          return;
        }

        // Check if file is a single-subject file (banner or filename mentions a single subject and headers are generic TX1, Giữa kỳ, etc.)
        const bannerText = data
          .slice(0, headerRowIndex)
          .map((r) => (Array.isArray(r) ? r.join(' ') : ''))
          .join(' ')
          .toLowerCase();
        const fileContextLower = `${bannerText} ${file.name.toLowerCase()}`;

        // Auto-detect subject columns based on classSubjects (SSOT)
        const autoMappings: Record<string, SubjectColumnMap> = {};
        const anyHeaderHasSubjectName = appliedSubjects.some((sub) => {
          const subLower = sub.name.toLowerCase();
          const subCodeLower = (sub.subjectCode || sub.code || '').toLowerCase();
          return headers.some((h) => {
            const hl = h.toLowerCase();
            if (hl.includes('thế mạnh') || hl.includes('cần chú ý') || hl.includes('cần cố gắng')) return false;
            return hl.includes(subLower) || (subCodeLower && hl.includes(subCodeLower));
          });
        });

        appliedSubjects.forEach((sub) => {
          const isCommentOnly = isCommentSubject(sub);
          const subLower = sub.name.toLowerCase();
          const subCodeLower = (sub.subjectCode || sub.code || '').toLowerCase();

          let matchedCols = headers.filter((h) => {
            const hl = h.toLowerCase();
            if (hl.includes('thế mạnh') || hl.includes('cần chú ý') || hl.includes('cần cố gắng')) return false;
            return hl.includes(subLower) || (subCodeLower && hl.includes(subCodeLower));
          });

          // Support single-subject Excel imports where columns are named "TX1", "TX2", "Giữa kỳ", "Cuối kỳ" without subject prefix
          if (
            matchedCols.length === 0 &&
            !anyHeaderHasSubjectName &&
            (appliedSubjects.length === 1 || fileContextLower.includes(subLower) || (subCodeLower && fileContextLower.includes(subCodeLower)))
          ) {
            matchedCols = headers.filter((h) => {
              const hl = h.toLowerCase();
              if (
                h === detectedCode ||
                h === detectedName ||
                h === detectedComment ||
                h === detectedStrongest ||
                h === detectedImprovement ||
                h === detectedExcused ||
                h === detectedUnexcused ||
                h === detectedAcademicSum ||
                h === detectedConductSum ||
                hl === 'stt' ||
                hl === 'tổ' ||
                hl === 'lớp'
              ) {
                return false;
              }
              return true;
            });
          }

          if (isCommentOnly) {
            const evalCol =
              matchedCols.find((h) => {
                const hl = h.toLowerCase();
                return (
                  hl.includes('đánh giá') ||
                  hl.includes('kết quả') ||
                  hl.includes('nhận xét') ||
                  hl.includes('đạt') ||
                  hl.includes('danh gia')
                );
              }) || matchedCols[0];

            if (evalCol) {
              autoMappings[sub.name] = {
                evaluationCol: evalCol
              };
            }
          } else if (matchedCols.length > 0) {
            // Match HKII before HKI to avoid substring collision ("tb hkii".includes("tb hki") is true!)
            const tbHk2Col = matchedCols.find((h) => {
              const hl = h.toLowerCase();
              return (
                hl.includes('tb hkii') ||
                hl.includes('tb hk2') ||
                hl.includes('tb môn hkii') ||
                hl.includes('tb môn hk2') ||
                hl.includes('đtb hkii') ||
                hl.includes('đtb hk2')
              );
            });

            const tbHk1Col = matchedCols.find((h) => {
              if (h === tbHk2Col) return false;
              const hl = h.toLowerCase();
              return (
                hl.includes('tb hki') ||
                hl.includes('tb hk1') ||
                hl.includes('tb môn hki') ||
                hl.includes('tb môn hk1') ||
                hl.includes('đtb hki') ||
                hl.includes('đtb hk1')
              );
            });

            const avgCol = matchedCols.find((h) => {
              const hl = h.toLowerCase();
              if (selectedPeriod === 'full_year') {
                return hl.includes('cả năm') || hl.includes('ca nam') || hl.includes('tb cả năm') || hl.includes('đtb cả năm');
              }
              if (selectedPeriod === 'final_hk2') {
                return (
                  h === tbHk2Col ||
                  hl.includes('tb môn') ||
                  hl.includes('tbm') ||
                  hl.includes('đtb')
                );
              }
              if (selectedPeriod === 'final_hk1') {
                return (
                  h === tbHk1Col ||
                  hl.includes('tb môn') ||
                  hl.includes('tbm') ||
                  hl.includes('đtb')
                );
              }
              return hl.includes('tb môn') || hl.includes('tbm') || hl.includes('đtb');
            });

            const midtermCol = matchedCols.find((h) => {
              if (h === avgCol || h === tbHk1Col || h === tbHk2Col) return false;
              const hl = h.toLowerCase();
              return (
                hl.includes('giữa kỳ') ||
                hl.includes('giữa kì') ||
                hl.includes('giữa học kì') ||
                hl.includes('giữa học kỳ') ||
                hl.includes('giua ky') ||
                hl.includes('giua ki') ||
                hl.includes('gk') ||
                hl.includes('đã có') ||
                hl.includes('giữ nguyên')
              );
            });

            const finalExamCol = matchedCols.find((h) => {
              if (h === avgCol || h === tbHk1Col || h === tbHk2Col || h === midtermCol) return false;
              const hl = h.toLowerCase();
              return (
                hl.includes('cuối kỳ') ||
                hl.includes('cuối kì') ||
                hl.includes('cuối học kì') ||
                hl.includes('cuối học kỳ') ||
                hl.includes('kiểm tra hk') ||
                hl.includes('cuoi ky') ||
                hl.includes('cuoi ki') ||
                hl.includes('ck')
              );
            });

            const findTxCol = (idx: number) =>
              matchedCols.find((h) => {
                if (h === avgCol || h === tbHk1Col || h === tbHk2Col || h === midtermCol || h === finalExamCol) return false;
                const hl = h.toLowerCase();
                const regex = new RegExp(`(?:tx|thường xuyên|thuong xuyen|đđgtx|ddgtx)\\s*0?${idx}(?:\\b|$)`, 'i');
                if (regex.test(hl)) return true;
                if (idx === 1 && (hl.includes('miệng') || hl.endsWith('- tx') || hl === 'tx' || hl === 'điểm thường xuyên')) {
                  return true;
                }
                return false;
              });

            const commentSubCol = matchedCols.find((h) => {
              const hl = h.toLowerCase();
              return hl.includes('ghi chú') || hl.includes('nhận xét môn');
            });

            autoMappings[sub.name] = {
              tx1: findTxCol(1),
              tx2: findTxCol(2),
              tx3: findTxCol(3),
              tx4: findTxCol(4),
              tx5: findTxCol(5),
              tx6: findTxCol(6),
              midterm: midtermCol,
              finalExam: finalExamCol,
              tbHk1: selectedPeriod === 'full_year' ? tbHk1Col : undefined,
              tbHk2: selectedPeriod === 'full_year' ? tbHk2Col : undefined,
              avg: avgCol,
              comment: commentSubCol
            };
          }
        });

        setSubjectMappings(autoMappings);

        const hasMappedSubject = Object.values(autoMappings).some((m) =>
          Boolean(
            m.evaluationCol ||
            m.tx1 || m.tx2 || m.tx3 || m.tx4 || m.tx5 || m.tx6 ||
            m.midterm || m.finalExam || m.avg || m.comment
          )
        );
        if (!hasMappedSubject) {
          setGeneralError('Không xác định được môn học nào từ cấu trúc các cột trong file Excel. Vui lòng kiểm tra lại tên cột hoặc tải file mẫu chuẩn.');
          setIsProcessing(false);
          return;
        }

        setStep('mapping');
      } catch (err: any) {
        setGeneralError(`Lỗi đọc file Excel: ${err?.message || 'Vui lòng kiểm tra lại cấu trúc file'}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const isSubjectMappingActive = (mapping: SubjectColumnMap | undefined, isCommentOnly: boolean): boolean => {
    if (!mapping) return false;
    if (isCommentOnly) {
      return Boolean(
        mapping.evaluationCol ||
          mapping.avg ||
          mapping.tx1 ||
          mapping.finalExam ||
          mapping.midterm
      );
    }
    return Boolean(
      mapping.tx1 ||
        mapping.tx2 ||
        mapping.tx3 ||
        mapping.tx4 ||
        mapping.tx5 ||
        mapping.tx6 ||
        mapping.midterm ||
        mapping.finalExam ||
        mapping.tbHk1 ||
        mapping.tbHk2 ||
        mapping.avg ||
        mapping.comment
    );
  };

  const handleProceedToPreview = () => {
    setGeneralError(null);
    setSaveErrorsList([]);

    if (!codeCol && !nameCol) {
      setGeneralError('Vui lòng chọn ít nhất cột Mã học sinh hoặc Họ và tên để đối chiếu.');
      return;
    }

    const codeIdx = codeCol ? rawHeaders.indexOf(codeCol) : -1;
    const nameIdx = nameCol ? rawHeaders.indexOf(nameCol) : -1;
    if (codeIdx < 0 && nameIdx < 0) {
      setGeneralError('Cột Mã học sinh hoặc Họ và tên đã chọn không tồn tại trong file Excel.');
      return;
    }

    const hasAnyMappedSubject = appliedSubjects.some((sub) =>
      isSubjectMappingActive(subjectMappings[sub.name], isCommentSubject(sub))
    );
    const hasAnyMappedSummary = Boolean(
      commentCol ||
        strongestCol ||
        improvementCol ||
        excusedAbsencesCol ||
        unexcusedAbsencesCol ||
        academicSummaryCol ||
        conductSummaryCol
    );

    if (!hasAnyMappedSubject && !hasAnyMappedSummary) {
      setGeneralError('Không tìm thấy cột điểm môn học hoặc tổng kết nào được ghép. Vui lòng kiểm tra lại file Excel hoặc ghép cột.');
      return;
    }

    const commentIdx = commentCol ? rawHeaders.indexOf(commentCol) : -1;
    const strongestIdx = strongestCol ? rawHeaders.indexOf(strongestCol) : -1;
    const improvementIdx = improvementCol ? rawHeaders.indexOf(improvementCol) : -1;
    const excusedIdx = excusedAbsencesCol ? rawHeaders.indexOf(excusedAbsencesCol) : -1;
    const unexcusedIdx = unexcusedAbsencesCol ? rawHeaders.indexOf(unexcusedAbsencesCol) : -1;
    const academicSumIdx = academicSummaryCol ? rawHeaders.indexOf(academicSummaryCol) : -1;
    const conductSumIdx = conductSummaryCol ? rawHeaders.indexOf(conductSummaryCol) : -1;

    const parsed: ParsedRow[] = [];
    let errCount = 0;
    const seenStudentIds = new Map<string, number>();
    const seenStudentCodes = new Map<string, number>();

    rawRows.forEach((row, rIdx) => {
      const excelRowNumber = rIdx + 2;
      const rawCode = codeIdx >= 0 && row[codeIdx] !== undefined && row[codeIdx] !== null ? String(row[codeIdx]).trim() : '';
      const rawName = nameIdx >= 0 && row[nameIdx] !== undefined && row[nameIdx] !== null ? String(row[nameIdx]).trim() : '';
      const rawComment = commentIdx >= 0 && row[commentIdx] !== undefined && row[commentIdx] !== null ? String(row[commentIdx]).trim() : '';
      const rawStrongest = strongestIdx >= 0 && row[strongestIdx] !== undefined && row[strongestIdx] !== null ? String(row[strongestIdx]).trim() : '';
      const rawImprovement = improvementIdx >= 0 && row[improvementIdx] !== undefined && row[improvementIdx] !== null ? String(row[improvementIdx]).trim() : '';
      const rawExcused =
        excusedIdx >= 0 && row[excusedIdx] !== undefined && row[excusedIdx] !== null && String(row[excusedIdx]).trim() !== ''
          ? Number(row[excusedIdx])
          : undefined;
      const rawUnexcused =
        unexcusedIdx >= 0 && row[unexcusedIdx] !== undefined && row[unexcusedIdx] !== null && String(row[unexcusedIdx]).trim() !== ''
          ? Number(row[unexcusedIdx])
          : undefined;
      const rawAcademicSum = academicSumIdx >= 0 && row[academicSumIdx] !== undefined && row[academicSumIdx] !== null ? String(row[academicSumIdx]).trim() : '';
      const rawConductSum = conductSumIdx >= 0 && row[conductSumIdx] !== undefined && row[conductSumIdx] !== null ? String(row[conductSumIdx]).trim() : '';

      // Skip completely empty rows
      if (!rawCode && !rawName) return;

      const errors: string[] = [];

      if (rawExcused !== undefined && (!Number.isFinite(rawExcused) || rawExcused < 0)) {
        errors.push(`Dòng ${excelRowNumber}: Số buổi nghỉ có phép không hợp lệ.`);
      }
      if (rawUnexcused !== undefined && (!Number.isFinite(rawUnexcused) || rawUnexcused < 0)) {
        errors.push(`Dòng ${excelRowNumber}: Số buổi nghỉ không phép không hợp lệ.`);
      }

      // Match student: prioritize studentCode / ID first, then exact fullName if unambiguous
      let matchedStudent: Student | undefined = undefined;
      if (rawCode) {
        matchedStudent = students.find(
          (s) => s.code.toLowerCase() === rawCode.toLowerCase() || s.id.toLowerCase() === rawCode.toLowerCase()
        );
        if (!matchedStudent) {
          errors.push(`Dòng ${excelRowNumber}: Mã học viên "${rawCode}" không tồn tại trong danh sách lớp.`);
        }
      } else if (rawName) {
        const matchesByName = students.filter(
          (s) => s.fullName.toLowerCase() === rawName.toLowerCase()
        );
        if (matchesByName.length === 1) {
          matchedStudent = matchesByName[0];
        } else if (matchesByName.length > 1) {
          errors.push(
            `Dòng ${excelRowNumber}: Có ${matchesByName.length} học sinh trùng họ tên "${rawName}" trong lớp. Vui lòng cung cấp cột Mã học sinh trong file Excel để xác định chính xác.`
          );
        }
      }

      if (!matchedStudent) {
        if (!errors.some((e) => e.includes(`Dòng ${excelRowNumber}`))) {
          errors.push(`Dòng ${excelRowNumber}: Không tìm thấy học sinh với mã/tên "${rawCode || rawName}" trong danh sách lớp.`);
        }
      } else {
        if (seenStudentIds.has(matchedStudent.id)) {
          errors.push(
            `Dòng ${excelRowNumber}: Học sinh "${matchedStudent.fullName} (${matchedStudent.code})" bị trùng lặp với dòng ${seenStudentIds.get(matchedStudent.id)} trong file Excel.`
          );
        } else {
          seenStudentIds.set(matchedStudent.id, excelRowNumber);
        }
      }

      if (rawCode) {
        const lowerCode = rawCode.toLowerCase();
        if (seenStudentCodes.has(lowerCode) && !matchedStudent) {
          errors.push(`Dòng ${excelRowNumber}: Mã học sinh "${rawCode}" bị trùng lặp với dòng ${seenStudentCodes.get(lowerCode)}.`);
        } else if (!matchedStudent) {
          seenStudentCodes.set(lowerCode, excelRowNumber);
        }
      }

      // Lấy hồ sơ học tập hiện có của học sinh và hồ sơ kỳ giữa tương ứng (cho kỳ cuối)
      const existingRec = matchedStudent
        ? academicService.getStudentAcademicRecord(matchedStudent.id, selectedPeriod)
        : undefined;
      const parentRec = (matchedStudent && isFinalPeriod)
        ? academicService.getStudentAcademicRecord(matchedStudent.id, parentPeriod)
        : undefined;

      // Parse subject grades: File Excel mới là nguồn dữ liệu có thẩm quyền cho tất cả các môn được ghép cột
      const grades: SubjectGrade[] = [];
      Object.entries(subjectMappings).forEach(([subName, mapping]: [string, SubjectColumnMap]) => {
        const subConfig = appliedSubjects.find((s) => isSameSubject(s, { name: subName }));
        const isCommentOnly = isCommentSubject(subConfig) || isCommentSubject({ name: subName });

        if (!isSubjectMappingActive(mapping, isCommentOnly)) {
          return;
        }

        const existingGrade = existingRec?.grades?.find((g) => isSameSubject(g, { name: subName }));
        const parentGrade = parentRec?.grades?.find((g) => isSameSubject(g, { name: subName }));

        if (isCommentOnly) {
          const targetCol = mapping.evaluationCol || mapping.avg || mapping.tx1 || mapping.finalExam || mapping.midterm;
          const colIdx = targetCol ? rawHeaders.indexOf(targetCol) : -1;
          if (colIdx < 0) return;

          const rawVal = row[colIdx];
          const isBlank =
            rawVal === undefined ||
            rawVal === null ||
            (typeof rawVal === 'string' && rawVal.trim() === '') ||
            (typeof rawVal === 'string' && (rawVal.trim() === '-' || rawVal.trim() === '—'));

          if (isBlank) {
            // Ô trống trong file Excel mới: xóa kết quả cũ (để trống thực sự), KHÔNG giữ kết quả cũ âm thầm
            grades.push({
              subjectName: subName,
              subjectCode: subConfig?.subjectCode || subConfig?.code,
              assessmentMode: 'COMMENT_ONLY',
              qualitativeResult: undefined,
              comment: '',
              _overwrittenByImport: true
            });
            return;
          }

          const strVal = String(rawVal).trim();
          const lowerVal = strVal.toLowerCase();

          if (lowerVal === 'đạt' || lowerVal === 'dat' || lowerVal === 'đ') {
            grades.push({
              subjectName: subName,
              subjectCode: subConfig?.subjectCode || subConfig?.code,
              assessmentMode: 'COMMENT_ONLY',
              qualitativeResult: 'Đạt',
              comment: existingGrade?.comment || '',
              _overwrittenByImport: true
            });
          } else if (lowerVal === 'chưa đạt' || lowerVal === 'chua dat' || lowerVal === 'cđ' || lowerVal === 'cd') {
            grades.push({
              subjectName: subName,
              subjectCode: subConfig?.subjectCode || subConfig?.code,
              assessmentMode: 'COMMENT_ONLY',
              qualitativeResult: 'Chưa đạt',
              comment: existingGrade?.comment || '',
              _overwrittenByImport: true
            });
          } else {
            const studentDisplayName = rawName || matchedStudent?.fullName || rawCode || `Học sinh dòng ${excelRowNumber}`;
            errors.push(
              `Dòng ${excelRowNumber} (${studentDisplayName}), môn "${subName}": Giá trị "${strVal}" không hợp lệ (chỉ chấp nhận "Đạt", "Chưa đạt" hoặc để trống).`
            );
          }
          return;
        }

        const parseScore = (colName?: string): number | undefined => {
          if (!colName) return undefined;
          const idx = rawHeaders.indexOf(colName);
          if (idx < 0) return undefined;
          const val = row[idx];
          if (val === undefined || val === null) return undefined;
          if (typeof val === 'string' && val.trim() === '') return undefined;
          const strVal = String(val).trim().replace(',', '.');
          if (strVal === '-' || strVal === '—') return undefined;

          if (!isEnteredValidScore(strVal)) {
            errors.push(`Dòng ${excelRowNumber}, môn ${subName} (${colName}): Điểm "${val}" không hợp lệ (phải là số từ 0 đến 10).`);
            return undefined;
          }
          return Number(strVal);
        };

        const configuredTxCount = subConfig?.txColumnCount ?? academicService.getSubjectRegularCount(subName) ?? 3;
        const totalTx = Math.max(1, Math.min(6, configuredTxCount));

        // Resolve từng slot TX từ 1 đến 6 theo đúng cấu hình và phạm vi của file mới
        const resolveTxSlot = (slotIdx: number, colName?: string): number | undefined => {
          if (slotIdx > totalTx) return undefined;
          const hasColInFile = Boolean(colName && rawHeaders.includes(colName));
          if (hasColInFile) {
            // Cột thuộc phạm vi file mới: lấy đúng giá trị từ file; nếu ô tương ứng để trống thì là undefined (xóa điểm cũ thuộc phạm vi nhập)
            return parseScore(colName);
          }
          // Cột ngoài phạm vi file mới:
          if (isFinalPeriod) {
            // Bảo toàn điểm giữa kỳ hợp lệ (hoặc điểm kỳ cuối đã lưu trước đó nếu có)
            const txKey = `tx${slotIdx}` as keyof SubjectGrade;
            const parVal = parentGrade?.[txKey] as number | undefined;
            const curVal = existingGrade?.[txKey] as number | undefined;
            return isEnteredValidScore(parVal)
              ? Number(parVal)
              : (isEnteredValidScore(curVal) ? Number(curVal) : undefined);
          }
          return undefined;
        };

        const resolvedTx1 = resolveTxSlot(1, mapping.tx1);
        const resolvedTx2 = resolveTxSlot(2, mapping.tx2);
        const resolvedTx3 = resolveTxSlot(3, mapping.tx3);
        const resolvedTx4 = resolveTxSlot(4, mapping.tx4);
        const resolvedTx5 = resolveTxSlot(5, mapping.tx5);
        const resolvedTx6 = resolveTxSlot(6, mapping.tx6);

        const hasMidtermCol = Boolean(mapping.midterm && rawHeaders.includes(mapping.midterm));
        const hasFinalExamCol = Boolean(mapping.finalExam && rawHeaders.includes(mapping.finalExam));
        const hasTbHk1Col = Boolean(mapping.tbHk1 && rawHeaders.includes(mapping.tbHk1));
        const hasTbHk2Col = Boolean(mapping.tbHk2 && rawHeaders.includes(mapping.tbHk2));
        const hasAvgCol = Boolean(mapping.avg && rawHeaders.includes(mapping.avg));
        const hasCommentSubCol = Boolean(mapping.comment && rawHeaders.includes(mapping.comment));

        // Điểm giữa kỳ:
        // Cột thuộc phạm vi file mới: lấy giá trị từ file (ô trống -> undefined)
        // Cột ngoài phạm vi file mới: với kỳ cuối, bảo toàn điểm giữa kỳ hợp lệ từ parentGrade hoặc existingGrade
        let resolvedMidterm: number | undefined = undefined;
        if (hasMidtermCol) {
          resolvedMidterm = parseScore(mapping.midterm);
        } else if (isFinalPeriod) {
          resolvedMidterm = isEnteredValidScore(parentGrade?.midterm)
            ? Number(parentGrade?.midterm)
            : (isEnteredValidScore(existingGrade?.midterm) ? Number(existingGrade?.midterm) : undefined);
        }

        // Điểm cuối kỳ:
        let resolvedFinalExam: number | undefined = undefined;
        if (hasFinalExamCol) {
          resolvedFinalExam = parseScore(mapping.finalExam);
        } else if (isFinalPeriod) {
          resolvedFinalExam = isEnteredValidScore(existingGrade?.finalExam) ? Number(existingGrade?.finalExam) : undefined;
        }

        const excelTbHk1 = hasTbHk1Col ? parseScore(mapping.tbHk1) : undefined;
        const excelTbHk2 = hasTbHk2Col ? parseScore(mapping.tbHk2) : undefined;
        const excelAvg = hasAvgCol ? parseScore(mapping.avg) : undefined;

        const subCommentIdx = hasCommentSubCol ? rawHeaders.indexOf(mapping.comment!) : -1;
        const resolvedSubComment =
          subCommentIdx >= 0 && row[subCommentIdx] !== undefined && row[subCommentIdx] !== null
            ? String(row[subCommentIdx]).trim()
            : (existingGrade?.comment || existingGrade?.note || '');

        const regularScores = [
          resolvedTx1,
          resolvedTx2,
          resolvedTx3,
          resolvedTx4,
          resolvedTx5,
          resolvedTx6
        ].filter((v): v is number => v !== undefined);

        // Đếm số cột TX có mặt trong file Excel cho môn này
        const mappedTxCols = [
          mapping.tx1,
          mapping.tx2,
          mapping.tx3,
          mapping.tx4,
          mapping.tx5,
          mapping.tx6
        ].filter((col): col is string => Boolean(col && rawHeaders.includes(col)));
        const importedTxCount = mappedTxCols.length;

        // Đối với kỳ cuối năm (full_year): tính toán TB HKII nếu có nhập điểm thành phần HKII, hoặc lấy TB HKII từ cột Excel
        let resolvedTbHk1 = hasTbHk1Col ? excelTbHk1 : existingGrade?.tbHk1;
        let resolvedTbHk2 = hasTbHk2Col ? excelTbHk2 : undefined;

        if (selectedPeriod === 'full_year') {
          const hasHk2ComponentsInFile = importedTxCount > 0 || hasMidtermCol || hasFinalExamCol;
          if (hasHk2ComponentsInFile) {
            const computedHk2 = calculateSubjectAverage({
              assessmentMode: 'SCORE_AND_COMMENT',
              tx1: resolvedTx1,
              tx2: resolvedTx2,
              tx3: resolvedTx3,
              tx4: resolvedTx4,
              tx5: resolvedTx5,
              tx6: resolvedTx6,
              regularScores,
              midterm: resolvedMidterm,
              finalExam: resolvedFinalExam,
              period: 'final_hk2'
            });
            resolvedTbHk2 = computedHk2 !== undefined ? computedHk2 : (hasTbHk2Col ? excelTbHk2 : undefined);
          }
        }

        const dynamicAvg = calculateSubjectAverage({
          assessmentMode: 'SCORE_AND_COMMENT',
          tx1: resolvedTx1,
          tx2: resolvedTx2,
          tx3: resolvedTx3,
          tx4: resolvedTx4,
          tx5: resolvedTx5,
          tx6: resolvedTx6,
          regularScores,
          midterm: resolvedMidterm,
          finalExam: resolvedFinalExam,
          period: selectedPeriod,
          tbHk1: resolvedTbHk1,
          tbHk2: resolvedTbHk2,
          tbCaNam: excelAvg
        });

        const finalAvg =
          dynamicAvg !== undefined
            ? dynamicAvg
            : (importedTxCount === 0 && !hasMidtermCol && !hasFinalExamCol && hasAvgCol ? excelAvg : undefined);

        grades.push({
          subjectName: subName,
          subjectCode: subConfig?.subjectCode || subConfig?.code,
          assessmentMode: 'SCORE_AND_COMMENT',
          tx1: resolvedTx1,
          tx2: resolvedTx2,
          tx3: resolvedTx3,
          tx4: resolvedTx4,
          tx5: resolvedTx5,
          tx6: resolvedTx6,
          regularScores,
          midterm: resolvedMidterm,
          finalExam: resolvedFinalExam,
          tbHk1: selectedPeriod === 'full_year' ? resolvedTbHk1 : (selectedPeriod === 'final_hk1' ? finalAvg : existingGrade?.tbHk1),
          tbHk2: selectedPeriod === 'full_year' ? resolvedTbHk2 : (selectedPeriod === 'final_hk2' ? finalAvg : existingGrade?.tbHk2),
          tbCaNam: selectedPeriod === 'full_year' ? finalAvg : existingGrade?.tbCaNam,
          average: finalAvg,
          comment: hasCommentSubCol ? resolvedSubComment : (existingGrade?.comment || ''),
          note: hasCommentSubCol ? resolvedSubComment : (existingGrade?.note || ''),
          _overwrittenByImport: true,
          _importedTxCount: isFinalPeriod
            ? totalTx
            : (importedTxCount > 0 || (selectedPeriod !== 'full_year' && (hasMidtermCol || hasFinalExamCol))
                ? importedTxCount
                : undefined)
        });
      });

      // Bảo toàn các môn học khác của học sinh nếu file Excel chỉ nhập một số môn
      if (matchedStudent && existingRec && Array.isArray(existingRec.grades)) {
        existingRec.grades.forEach((eg) => {
          if (!grades.some((g) => isSameSubject(g, eg))) {
            grades.push(eg);
          }
        });
      }

      if (errors.length > 0) errCount++;

      const finalComment = commentCol ? rawComment : (existingRec?.teacherComment || '');
      const finalStrongest = strongestCol ? rawStrongest : (existingRec?.strongestSubject || '');
      const finalImprovement = improvementCol ? rawImprovement : (existingRec?.improvementSubject || '');
      const finalExcused = excusedAbsencesCol ? rawExcused : existingRec?.excusedAbsences;
      const finalUnexcused = unexcusedAbsencesCol ? rawUnexcused : existingRec?.unexcusedAbsences;
      const finalAcademicSum = academicSummaryCol ? rawAcademicSum : (existingRec?.academicSummary || '');
      const finalConductSum = conductSummaryCol ? rawConductSum : (existingRec?.conductSummary || '');

      parsed.push({
        rowIndex: excelRowNumber,
        raw: row,
        matchedStudent,
        studentCode: rawCode || matchedStudent?.code,
        studentName: rawName || matchedStudent?.fullName,
        grades,
        teacherComment: finalComment,
        strongestSubject: finalStrongest,
        improvementSubject: finalImprovement,
        excusedAbsences: finalExcused,
        unexcusedAbsences: finalUnexcused,
        academicSummary: finalAcademicSum,
        conductSummary: finalConductSum,
        errors
      });
    });

    if (parsed.length === 0) {
      setGeneralError('Không tìm thấy dòng dữ liệu học viên nào hợp lệ trong file Excel.');
      return;
    }

    setParsedData(parsed);
    setImportSummary({
      total: parsed.length,
      success: parsed.length - errCount,
      errors: errCount
    });
    setStep('preview');
  };

  const handleSaveToSystem = async () => {
    if (isProcessing) return;
    setGeneralError(null);
    setSaveErrorsList([]);

    if (importSummary.errors > 0 || parsedData.some((r) => r.errors.length > 0 || !r.matchedStudent)) {
      const errorList = parsedData.flatMap((r) => r.errors);
      setGeneralError(
        `Phát hiện ${importSummary.errors} dòng dữ liệu có lỗi. Hệ thống không lưu dữ liệu dở dang — vui lòng kiểm tra và sửa file Excel trước khi lưu.`
      );
      setSaveErrorsList(errorList);
      return;
    }

    const validRows = parsedData.filter((row) => row.matchedStudent && row.errors.length === 0);
    if (validRows.length === 0) {
      setGeneralError('Không có dòng dữ liệu hợp lệ nào để lưu. Vui lòng kiểm tra lại file Excel.');
      return;
    }

    setIsProcessing(true);

    const settings = classService.getSettings();
    const authorName = settings.homeroomTeacherName ? `${settings.homeroomTeacherName} (GVCN - Nhập Excel)` : 'GVCN (Nhập Excel)';

    try {
      // Xác định số cột TX thực tế từ file Excel mới cho từng môn tính điểm được nhập (chỉ cấu hình lại số cột ở các kỳ không phải kỳ cuối)
      const importedSubjectTxCounts: Record<string, number> = {};
      if (!isFinalPeriod) {
        Object.entries(subjectMappings).forEach(([subName, mapping]: [string, SubjectColumnMap]) => {
          const subConfig = appliedSubjects.find((s) => isSameSubject(s, { name: subName }));
          const isCommentOnly = isCommentSubject(subConfig) || isCommentSubject({ name: subName });
          if (isCommentOnly || !isSubjectMappingActive(mapping, false)) return;

          const mappedTxCols = [
            mapping.tx1,
            mapping.tx2,
            mapping.tx3,
            mapping.tx4,
            mapping.tx5,
            mapping.tx6
          ].filter((col): col is string => Boolean(col && rawHeaders.includes(col)));

          const hasMidtermOrFinal = Boolean(
            (mapping.midterm && rawHeaders.includes(mapping.midterm)) ||
              (mapping.finalExam && rawHeaders.includes(mapping.finalExam))
          );

          if (mappedTxCols.length > 0 || hasMidtermOrFinal) {
            importedSubjectTxCounts[subName] = mappedTxCols.length;
          }
        });
      }

      const items = validRows.map((row) => ({
        studentId: row.matchedStudent!.id,
        updatedGrades: row.grades,
        period: selectedPeriod,
        teacherComment: row.teacherComment || undefined,
        commentUpdatedBy: authorName,
        options: {
          academicSummary: row.academicSummary || row.teacherComment || undefined,
          conductSummary: row.conductSummary || undefined,
          strongestSubject: row.strongestSubject || undefined,
          improvementSubject: row.improvementSubject || undefined,
          excusedAbsences: row.excusedAbsences,
          unexcusedAbsences: row.unexcusedAbsences,
          publishedToStudent: true,
          publishedToParent: true
        }
      }));

      const res = await academicService.persistStudentGradesBatch(items, importedSubjectTxCounts);

      if (!res.success || res.failedCount > 0 || res.savedCount === 0) {
        const errorDetails = res.failedDetails.map((d) => `${d.studentName || d.studentId}: ${d.message}`).join('; ');
        setGeneralError(`Lưu thất bại, dữ liệu đã được hoàn tác để bảo toàn trạng thái trước đó: ${errorDetails || 'Lỗi không xác định'}`);
        setSaveErrorsList(res.failedDetails.map((d) => `${d.studentName || d.studentId}: ${d.message}`));
        setIsProcessing(false);
        return;
      }

      setImportSummary({
        total: parsedData.length,
        success: res.savedCount,
        errors: 0
      });

      setStep('result');
      onSuccess();
    } catch (err: any) {
      setGeneralError(`Lỗi lưu dữ liệu lên máy chủ: ${err?.message || 'Không thể kết nối máy chủ'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Nhập Bảng Điểm & Tổng Kết từ Excel</h3>
              <p className="text-xs text-slate-500">
                Quy trình: Tải mẫu / Chọn file → Ghép cột → Kiểm tra & Xác thực → Lưu vào hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/60 px-8 py-2.5 text-xs font-bold">
          <span className={`flex items-center gap-1.5 ${step === 'upload' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">1</span>
            Chọn file Excel
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className={`flex items-center gap-1.5 ${step === 'mapping' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">2</span>
            Ghép cột dữ liệu
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className={`flex items-center gap-1.5 ${step === 'preview' ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">3</span>
            Kiểm tra & Xác thực
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className={`flex items-center gap-1.5 ${step === 'result' ? 'text-emerald-600' : 'text-slate-500'}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px]">4</span>
            Hoàn tất
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700">Mốc thời gian nhập:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as AcademicPeriod)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 outline-hidden"
                  >
                    {Object.entries(PERIOD_NAMES).map(([pKey, pLabel]) => (
                      <option key={pKey} value={pKey}>
                        {pLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-100 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 text-emerald-700" />
                  <span>Tải file Excel mẫu ({appliedSubjects.length} môn)</span>
                </button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 text-center hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3 shadow-xs">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Chọn file Excel bảng điểm (.xlsx, .xls)</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Kéo thả file vào đây hoặc nhấp để chọn. Hệ thống tự động nhận diện danh sách học sinh, điểm các môn và phần tổng kết.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {generalError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-200/60 text-xs text-blue-800 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-bold">Mẹo định dạng bảng điểm:</p>
                  <p className="mt-0.5 text-[11px] text-blue-700 leading-relaxed">
                    Bạn có thể bấm <strong>"Tải file Excel mẫu"</strong> ở trên để nhận file mẫu chứa đầy đủ danh sách học sinh lớp {classSettings.className || classSettings.name || '11A1'} và danh mục {appliedSubjects.length} môn học đã được cấu hình.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-5">
              {generalError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    File: {fileName} ({rawRows.length} dòng dữ liệu)
                  </h4>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
                    Ghép các cột trong Excel tương ứng với dữ liệu hệ thống:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Mốc nhập:</span>
                  <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {PERIOD_NAMES[selectedPeriod]}
                  </span>
                </div>
              </div>

              {/* Student identification columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl border border-slate-200 p-4 bg-slate-50/70">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cột Mã Học Sinh / Mã Định Danh *
                  </label>
                  <select
                    value={codeCol}
                    onChange={(e) => setCodeCol(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="">-- Chọn cột mã học sinh --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cột Họ và Tên *</label>
                  <select
                    value={nameCol}
                    onChange={(e) => setNameCol(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="">-- Chọn cột họ và tên --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cột Nhận xét của GVCN</label>
                  <select
                    value={commentCol}
                    onChange={(e) => setCommentCol(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold text-slate-800 outline-hidden"
                  >
                    <option value="">-- Bỏ qua hoặc chọn cột nhận xét --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Summary & Attendance mappings */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/40 space-y-3">
                <h5 className="text-xs font-bold text-slate-800">Ghép cột Tổng kết & Chuyên cần (Tùy chọn):</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Môn thế mạnh</label>
                    <select
                      value={strongestCol}
                      onChange={(e) => setStrongestCol(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs outline-hidden"
                    >
                      <option value="">(Không ghép)</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Môn cần chú ý</label>
                    <select
                      value={improvementCol}
                      onChange={(e) => setImprovementCol(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs outline-hidden"
                    >
                      <option value="">(Không ghép)</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nghỉ có phép</label>
                    <select
                      value={excusedAbsencesCol}
                      onChange={(e) => setExcusedAbsencesCol(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs outline-hidden"
                    >
                      <option value="">(Không ghép)</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nghỉ không phép</label>
                    <select
                      value={unexcusedAbsencesCol}
                      onChange={(e) => setUnexcusedAbsencesCol(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs outline-hidden"
                    >
                      <option value="">(Không ghép)</option>
                      {rawHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subject mappings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800">
                    Ghép cột điểm từng môn học ({appliedSubjects.length} môn đã áp dụng):
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Hệ thống tự động nhận diện các cột theo tên môn
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {appliedSubjects.map((sub) => {
                    const subName = sub.name;
                    const currentMap = subjectMappings[subName] || {};
                    const isCommentOnly = isCommentSubject(sub);

                    return (
                      <div
                        key={sub.id || subName}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 bg-white hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="w-44 shrink-0">
                          <span className="text-xs font-bold text-slate-800 block">{subName}</span>
                          <span className={`text-[10px] font-semibold ${isCommentOnly ? 'text-amber-700' : 'text-slate-500'}`}>
                            {isCommentOnly ? '📝 Môn nhận xét (1 cột duy nhất)' : '📊 Môn tính điểm'}
                          </span>
                        </div>

                        {isCommentOnly ? (
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-600 font-bold block mb-1">
                              Cột kết quả đánh giá (chỉ chấp nhận: <span className="text-emerald-700">Đạt</span> / <span className="text-rose-700">Chưa đạt</span>):
                            </label>
                            <select
                              value={currentMap.evaluationCol || currentMap.avg || currentMap.tx1 || ''}
                              onChange={(e) =>
                                setSubjectMappings((prev) => ({
                                  ...prev,
                                  [subName]: { ...prev[subName], evaluationCol: e.target.value || undefined }
                                }))
                              }
                              className="w-full rounded-lg border border-amber-300 bg-amber-50/40 p-1.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
                            >
                              <option value="">-- Bỏ qua hoặc chọn cột kết quả đánh giá --</option>
                              {rawHeaders.map((h, i) => (
                                <option key={i} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 flex-1">
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block truncate">TX 1:</span>
                              <select
                                value={currentMap.tx1 || ''}
                                onChange={(e) =>
                                  setSubjectMappings((prev) => ({
                                    ...prev,
                                    [subName]: { ...prev[subName], tx1: e.target.value || undefined }
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-medium outline-hidden"
                              >
                                <option value="">(Không có)</option>
                                {rawHeaders.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block truncate">TX 2:</span>
                              <select
                                value={currentMap.tx2 || ''}
                                onChange={(e) =>
                                  setSubjectMappings((prev) => ({
                                    ...prev,
                                    [subName]: { ...prev[subName], tx2: e.target.value || undefined }
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-medium outline-hidden"
                              >
                                <option value="">(Không có)</option>
                                {rawHeaders.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block truncate">TX 3:</span>
                              <select
                                value={currentMap.tx3 || ''}
                                onChange={(e) =>
                                  setSubjectMappings((prev) => ({
                                    ...prev,
                                    [subName]: { ...prev[subName], tx3: e.target.value || undefined }
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-medium outline-hidden"
                              >
                                <option value="">(Không có)</option>
                                {rawHeaders.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block truncate">TX 4:</span>
                              <select
                                value={currentMap.tx4 || ''}
                                onChange={(e) =>
                                  setSubjectMappings((prev) => ({
                                    ...prev,
                                    [subName]: { ...prev[subName], tx4: e.target.value || undefined }
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-medium outline-hidden"
                              >
                                <option value="">(Không có)</option>
                                {rawHeaders.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block truncate">
                                {selectedPeriod === 'final_hk1'
                                  ? 'Giữa kỳ I:'
                                  : selectedPeriod === 'final_hk2' || selectedPeriod === 'full_year'
                                  ? 'Giữa kỳ II:'
                                  : 'Giữa kỳ:'}
                              </span>
                              <select
                                value={currentMap.midterm || ''}
                                onChange={(e) =>
                                  setSubjectMappings((prev) => ({
                                    ...prev,
                                    [subName]: { ...prev[subName], midterm: e.target.value || undefined }
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-medium outline-hidden"
                              >
                                <option value="">(Không có)</option>
                                {rawHeaders.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block truncate">
                                {selectedPeriod === 'final_hk1'
                                  ? 'Cuối kỳ I:'
                                  : selectedPeriod === 'final_hk2' || selectedPeriod === 'full_year'
                                  ? 'Cuối kỳ II:'
                                  : 'Cuối kỳ:'}
                              </span>
                              <select
                                value={currentMap.finalExam || ''}
                                onChange={(e) =>
                                  setSubjectMappings((prev) => ({
                                    ...prev,
                                    [subName]: { ...prev[subName], finalExam: e.target.value || undefined }
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-medium outline-hidden"
                              >
                                <option value="">(Không có)</option>
                                {rawHeaders.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block truncate">
                                {selectedPeriod === 'final_hk1'
                                  ? 'ĐTB HKI:'
                                  : selectedPeriod === 'final_hk2'
                                  ? 'ĐTB HKII:'
                                  : selectedPeriod === 'full_year'
                                  ? 'ĐTB Cả năm:'
                                  : 'ĐTB Môn:'}
                              </span>
                              <select
                                value={currentMap.avg || ''}
                                onChange={(e) =>
                                  setSubjectMappings((prev) => ({
                                    ...prev,
                                    [subName]: { ...prev[subName], avg: e.target.value || undefined }
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-[11px] font-medium outline-hidden"
                              >
                                <option value="">(Không có)</option>
                                {rawHeaders.map((h, i) => (
                                  <option key={i} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & VALIDATION */}
          {step === 'preview' && (
            <div className="space-y-4">
              {generalError && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{generalError}</span>
                  </div>
                  {saveErrorsList.length > 0 && (
                    <ul className="list-disc pl-5 text-[11px] text-rose-600 max-h-24 overflow-y-auto">
                      {saveErrorsList.map((errItem, idx) => (
                        <li key={idx}>{errItem}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">
                    Tổng cộng: <strong>{importSummary.total}</strong> học sinh
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    ✓ Hợp lệ: <strong>{importSummary.success}</strong>
                  </span>
                  {importSummary.errors > 0 && (
                    <span className="text-xs font-bold text-rose-700">
                      ✗ Có lỗi: <strong>{importSummary.errors}</strong> (Cần sửa trước khi lưu)
                    </span>
                  )}
                </div>

                <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                  Mốc: {PERIOD_NAMES[selectedPeriod]}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Dòng</th>
                      <th className="p-2.5">Mã HS</th>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">Số môn</th>
                      <th className="p-2.5">Tổng kết & Chuyên cần</th>
                      <th className="p-2.5">Nhận xét</th>
                      <th className="p-2.5">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.errors.length > 0 ? 'bg-rose-50/50' : 'hover:bg-slate-50'}
                      >
                        <td className="p-2.5 text-slate-500">{row.rowIndex}</td>
                        <td className="p-2.5 font-bold text-slate-800">{row.studentCode || '-'}</td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          {row.matchedStudent ? row.matchedStudent.fullName : row.studentName}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          <span className="font-bold">{row.grades.length} môn</span>
                          {row.grades.some((g) => g.assessmentMode === 'COMMENT_ONLY') && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {row.grades
                                .filter((g) => g.assessmentMode === 'COMMENT_ONLY')
                                .map((cg, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      cg.qualitativeResult === 'Đạt'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : cg.qualitativeResult === 'Chưa đạt'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}
                                  >
                                    {cg.subjectName}: {cg.qualitativeResult || 'Chưa có kết quả'}
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px]">
                          {row.strongestSubject ? `Thế mạnh: ${row.strongestSubject} ` : ''}
                          {row.excusedAbsences ? `(Nghỉ CP: ${row.excusedAbsences})` : ''}
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-[180px] truncate">
                          {row.teacherComment || row.academicSummary || '-'}
                        </td>
                        <td className="p-2.5">
                          {row.errors.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {row.errors.map((err, eIdx) => (
                                <span key={eIdx} className="text-[11px] font-bold text-rose-600">
                                  ⚠ {err}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Hợp lệ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: RESULT */}
          {step === 'result' && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
                <Check className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-black text-slate-800">Nhập Dữ Liệu Thành Công!</h4>
              <p className="text-xs text-slate-600 max-w-md">
                Đã cập nhật bảng điểm và tổng kết cho <strong>{importSummary.success}</strong> học sinh vào mốc{' '}
                <strong>{PERIOD_NAMES[selectedPeriod]}</strong>. Dữ liệu đã đồng bộ sang góc nhìn Học sinh và Phụ huynh.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            {step === 'mapping' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Chọn lại file</span>
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Sửa ghép cột</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step !== 'result' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                {step === 'mapping' && (
                  <button
                    type="button"
                    onClick={handleProceedToPreview}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                  >
                    <span>Tiếp tục kiểm tra</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'preview' && (
                  <button
                    type="button"
                    onClick={handleSaveToSystem}
                    disabled={importSummary.success === 0 || importSummary.errors > 0 || isProcessing}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>
                      {isProcessing
                        ? 'Đang lưu...'
                        : `Lưu vào hệ thống (${importSummary.success} bản ghi)`}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
