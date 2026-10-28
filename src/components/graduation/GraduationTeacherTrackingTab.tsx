/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Download,
  Sliders,
  Edit2,
  Bookmark,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Eye,
  Check,
  Save,
  RotateCcw,
  Upload
} from 'lucide-react';
import { GraduationRegistration } from '../../types';
import { graduationService, ELECTIVE_SUBJECTS_LIST } from '../../services/GraduationService';
import { studentService } from '../../services/StudentService';
import { GraduationFlagModal } from './GraduationFlagModal';
import { GraduationEditStudentModal } from './GraduationEditStudentModal';
import { GraduationRuleConfigModal } from './GraduationRuleConfigModal';
import { GraduationExcelImportModal } from './GraduationExcelImportModal';

type FilterTabType = 'all' | 'flagged' | 'below_5' | 'dead_point' | 'missing_electives' | 'missing_data' | 'completed';

interface StudentDraft {
  math: string;
  literature: string;
  elective1: string;
  elective2: string;
  electiveSubject1: string;
  electiveSubject2: string;
  isForeignLanguageExempt: boolean;
  gpa10: string;
  gpa11: string;
  gpa12: string;
  priorityBonus: string;
  encouragementBonus: string;
}

const buildRowDraft = (r: GraduationRegistration): StudentDraft => ({
  math: r.scores?.math !== undefined ? String(r.scores.math) : '',
  literature: r.scores?.literature !== undefined ? String(r.scores.literature) : '',
  elective1: r.scores?.elective1 !== undefined ? String(r.scores.elective1) : '',
  elective2: r.scores?.elective2 !== undefined ? String(r.scores.elective2) : '',
  electiveSubject1: r.electiveSubject1 || '',
  electiveSubject2: r.electiveSubject2 || '',
  isForeignLanguageExempt: !!r.isForeignLanguageExempt,
  gpa10: r.gpa10 !== undefined ? String(r.gpa10) : '',
  gpa11: r.gpa11 !== undefined ? String(r.gpa11) : '',
  gpa12: r.gpa12 !== undefined ? String(r.gpa12) : '',
  priorityBonus: r.priorityBonus !== undefined && !isNaN(Number(r.priorityBonus)) ? String(Number(r.priorityBonus)) : '0',
  encouragementBonus: r.encouragementBonus !== undefined && !isNaN(Number(r.encouragementBonus)) ? String(Number(r.encouragementBonus)) : '0',
});

const createDraftState = (
  regs: GraduationRegistration[],
  existing: Record<string, StudentDraft> = {},
  dirtyIds: Set<string> = new Set()
): Record<string, StudentDraft> => {
  const draft: Record<string, StudentDraft> = { ...existing };
  regs.forEach(r => {
    if (!draft[r.studentId] || !dirtyIds.has(r.studentId)) {
      draft[r.studentId] = buildRowDraft(r);
    }
  });
  return draft;
};

export const GraduationTeacherTrackingTab: React.FC = () => {
  const [registrations, setRegistrations] = useState<GraduationRegistration[]>(() => graduationService.getAllForClass());
  const ruleConfig = graduationService.getRuleConfig();

  // Pagination State (10 or 20 students per page)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filters & Search
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTabType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [elective1Filter, setElective1Filter] = useState<string>('all');
  const [elective2Filter, setElective2Filter] = useState<string>('all');

  // Selected students for bulk action or export
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modals state
  const [flaggingStudent, setFlaggingStudent] = useState<GraduationRegistration | null>(null);
  const [editingStudent, setEditingStudent] = useState<GraduationRegistration | null>(null);
  const [isRuleConfigModalOpen, setIsRuleConfigModalOpen] = useState<boolean>(false);
  const [viewingNoteStudent, setViewingNoteStudent] = useState<GraduationRegistration | null>(null);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState<boolean>(false);

  // Direct Data Entry Mode State - Enabled by default for immediate editing
  const [isDirectInputMode, setIsDirectInputMode] = useState<boolean>(true);
  const dirtyStudentIdsRef = React.useRef<Set<string>>(new Set());
  const [draftData, setDraftData] = useState<Record<string, StudentDraft>>(() => {
    const initialRegs = graduationService.getAllForClass();
    return createDraftState(initialRegs);
  });
  const [isSavingDirect, setIsSavingDirect] = useState<boolean>(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [directSaveNotice, setDirectSaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = (forceRefreshDraft: boolean = false) => {
    const list = graduationService.getAllForClass();
    setRegistrations(list);
    if (forceRefreshDraft) {
      dirtyStudentIdsRef.current.clear();
    }
    setDraftData(prev => createDraftState(list, prev, dirtyStudentIdsRef.current));
  };

  useEffect(() => {
    loadData(true);
    graduationService.fetchFromServer();
    const unsub = graduationService.subscribe(() => loadData(false));
    return unsub;
  }, []);

  // Reset current page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, groupFilter, elective1Filter, elective2Filter, activeFilterTab, pageSize]);

  // Direct Input Mode Handlers
  const startDirectInput = () => {
    setDraftData(prev => createDraftState(registrations, prev, dirtyStudentIdsRef.current));
    setIsDirectInputMode(true);
    setDirectSaveNotice(null);
  };

  const cancelDirectInput = () => {
    dirtyStudentIdsRef.current.clear();
    const resetDraft: Record<string, StudentDraft> = {};
    registrations.forEach(r => {
      resetDraft[r.studentId] = buildRowDraft(r);
    });
    setDraftData(resetDraft);
    setDirectSaveNotice(null);
  };

  const handleDraftChange = (studentId: string, field: keyof StudentDraft, value: any) => {
    dirtyStudentIdsRef.current.add(studentId);
    setDraftData(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          math: '',
          literature: '',
          elective1: '',
          elective2: '',
          electiveSubject1: '',
          electiveSubject2: '',
          isForeignLanguageExempt: false,
          gpa10: '',
          gpa11: '',
          gpa12: '',
          priorityBonus: '0',
          encouragementBonus: '0',
        }),
        [field]: value
      }
    }));
  };

  const handleSaveSingleRow = async (studentId: string) => {
    const draft = draftData[studentId];
    if (!draft) return;
    setSavingStudentId(studentId);

    const parseNum = (val: string, name: string): number | undefined => {
      if (!val || val.trim() === '') return undefined;
      const n = parseFloat(val.replace(',', '.'));
      if (isNaN(n) || n < 0 || n > 10) {
        throw new Error(`Điểm ${name} phải nằm trong khoảng từ 0 đến 10.`);
      }
      return n;
    };

    try {
      if (
        !draft.isForeignLanguageExempt &&
        draft.electiveSubject1 &&
        draft.electiveSubject2 &&
        draft.electiveSubject1 === draft.electiveSubject2
      ) {
        throw new Error('Hai môn thi tự chọn không được trùng nhau.');
      }

      const math = parseNum(draft.math, 'Toán');
      const literature = parseNum(draft.literature, 'Ngữ văn');
      const elective1 = parseNum(draft.elective1, 'Môn tự chọn 1');
      const elective2 = draft.isForeignLanguageExempt ? undefined : parseNum(draft.elective2, 'Môn tự chọn 2');

      const gpa10 = parseNum(draft.gpa10, 'ĐTB lớp 10');
      const gpa11 = parseNum(draft.gpa11, 'ĐTB lớp 11');
      const gpa12 = parseNum(draft.gpa12, 'ĐTB lớp 12');

      const rawPrio = draft.priorityBonus !== undefined && draft.priorityBonus.trim() !== ''
        ? draft.priorityBonus.trim().replace(',', '.')
        : '0';
      const priorityBonus = Number(rawPrio);
      if (isNaN(priorityBonus) || ![0, 0.25, 0.5].includes(priorityBonus)) {
        throw new Error('Điểm Ưu tiên (ƯT) không hợp lệ. Chỉ chấp nhận các mức theo quy định: 0, 0.25 hoặc 0.5 điểm.');
      }

      const rawEnc = draft.encouragementBonus !== undefined && draft.encouragementBonus.trim() !== ''
        ? draft.encouragementBonus.trim().replace(',', '.')
        : '0';
      const encouragementBonus = Number(rawEnc);
      if (isNaN(encouragementBonus) || ![0, 1, 1.5, 2].includes(encouragementBonus)) {
        throw new Error('Điểm Khuyến khích (KK) không hợp lệ. Chỉ chấp nhận một mức điểm của giải cao nhất theo quy định: 0, 1.0, 1.5 hoặc 2.0 điểm.');
      }

      const updated = await graduationService.updateRegistration(studentId, {
        studentId,
        scores: {
          math,
          literature,
          elective1,
          elective2
        },
        electiveSubject1: draft.electiveSubject1 || undefined,
        electiveSubject2: draft.isForeignLanguageExempt ? (draft.electiveSubject2 || 'Ngoại ngữ') : (draft.electiveSubject2 || undefined),
        isForeignLanguageExempt: draft.isForeignLanguageExempt,
        gpa10,
        gpa11,
        gpa12,
        priorityBonus,
        encouragementBonus,
        updatedBy: 'Giáo viên chủ nhiệm'
      });

      if (!updated) {
        throw new Error(`Lưu thất bại: Không thể cập nhật hoặc đồng bộ dữ liệu cho học sinh ${studentId}.`);
      }

      dirtyStudentIdsRef.current.delete(studentId);
      setDraftData(prev => ({
        ...prev,
        [studentId]: buildRowDraft(updated)
      }));

      loadData(false);
      setDirectSaveNotice({
        type: 'success',
        message: `Đã lưu và đồng bộ thành công dữ liệu cho học sinh ${updated.studentName} (${updated.studentCode}) vào Mục 2, Mục 3, Hồ sơ học viên, trang Học viên và Phụ huynh!`
      });
    } catch (err: any) {
      setDirectSaveNotice({
        type: 'error',
        message: err.message || 'Lỗi khi lưu dữ liệu học sinh.'
      });
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleSaveAllDirect = async () => {
    setIsSavingDirect(true);
    setDirectSaveNotice(null);

    try {
      // Only save rows that were modified (dirty) OR already have entered data, to avoid creating empty records for untouched students
      const targetIds = dirtyStudentIdsRef.current.size > 0
        ? Array.from(dirtyStudentIdsRef.current)
        : Object.keys(draftData).filter(sid => {
            const d = draftData[sid];
            if (!d) return false;
            return Boolean(
              d.electiveSubject1 ||
              d.electiveSubject2 ||
              d.math !== '' ||
              d.literature !== '' ||
              d.elective1 !== '' ||
              d.elective2 !== '' ||
              d.gpa10 !== '' ||
              d.gpa11 !== '' ||
              d.gpa12 !== '' ||
              (d.priorityBonus && d.priorityBonus !== '0') ||
              (d.encouragementBonus && d.encouragementBonus !== '0')
            );
          });

      let savedCount = 0;
      const failedStudents: string[] = [];

      for (const studentId of targetIds) {
        const draft = draftData[studentId];
        if (!draft) continue;
        const studentReg = registrations.find(r => r.studentId === studentId);
        const studentLabel = studentReg ? `${studentReg.studentName} (${studentReg.studentCode})` : studentId;

        const parseNum = (val: string, name: string): number | undefined => {
          if (!val || val.trim() === '') return undefined;
          const n = parseFloat(val.replace(',', '.'));
          if (isNaN(n) || n < 0 || n > 10) {
            throw new Error(`Điểm ${name} của học sinh "${studentLabel}" phải từ 0 đến 10.`);
          }
          return n;
        };

        try {
          if (
            !draft.isForeignLanguageExempt &&
            draft.electiveSubject1 &&
            draft.electiveSubject2 &&
            draft.electiveSubject1 === draft.electiveSubject2
          ) {
            throw new Error(`Hai môn tự chọn của học sinh "${studentLabel}" không được trùng nhau.`);
          }

          const math = parseNum(draft.math, 'Toán');
          const literature = parseNum(draft.literature, 'Ngữ văn');
          const elective1 = parseNum(draft.elective1, 'Môn tự chọn 1');
          const elective2 = draft.isForeignLanguageExempt ? undefined : parseNum(draft.elective2, 'Môn tự chọn 2');

          const gpa10 = parseNum(draft.gpa10, 'ĐTB lớp 10');
          const gpa11 = parseNum(draft.gpa11, 'ĐTB lớp 11');
          const gpa12 = parseNum(draft.gpa12, 'ĐTB lớp 12');

          const rawPrio = draft.priorityBonus !== undefined && draft.priorityBonus.trim() !== ''
            ? draft.priorityBonus.trim().replace(',', '.')
            : '0';
          const priorityBonus = Number(rawPrio);
          if (isNaN(priorityBonus) || ![0, 0.25, 0.5].includes(priorityBonus)) {
            throw new Error('Điểm Ưu tiên (ƯT) không hợp lệ. Chỉ chấp nhận các mức theo quy định: 0, 0.25 hoặc 0.5 điểm.');
          }

          const rawEnc = draft.encouragementBonus !== undefined && draft.encouragementBonus.trim() !== ''
            ? draft.encouragementBonus.trim().replace(',', '.')
            : '0';
          const encouragementBonus = Number(rawEnc);
          if (isNaN(encouragementBonus) || ![0, 1, 1.5, 2].includes(encouragementBonus)) {
            throw new Error('Điểm Khuyến khích (KK) không hợp lệ. Chỉ chấp nhận một mức điểm của giải cao nhất theo quy định: 0, 1.0, 1.5 hoặc 2.0 điểm.');
          }

          const res = await graduationService.updateRegistration(studentId, {
            studentId,
            scores: {
              math,
              literature,
              elective1,
              elective2
            },
            electiveSubject1: draft.electiveSubject1 || undefined,
            electiveSubject2: draft.isForeignLanguageExempt ? (draft.electiveSubject2 || 'Ngoại ngữ') : (draft.electiveSubject2 || undefined),
            isForeignLanguageExempt: draft.isForeignLanguageExempt,
            gpa10,
            gpa11,
            gpa12,
            priorityBonus,
            encouragementBonus,
            updatedBy: 'Giáo viên chủ nhiệm'
          });

          if (res) {
            savedCount++;
            dirtyStudentIdsRef.current.delete(studentId);
          } else {
            failedStudents.push(`${studentLabel} (chưa cập nhật được bản ghi)`);
          }
        } catch (rowErr: any) {
          failedStudents.push(`${studentLabel}: ${rowErr?.message || 'Lỗi đồng bộ'}`);
        }
      }

      loadData(false);
      if (failedStudents.length > 0) {
        setDirectSaveNotice({
          type: 'error',
          message: `Đã lưu ${savedCount} học sinh, nhưng có ${failedStudents.length} học sinh gặp lỗi đồng bộ: ${failedStudents.join(' | ')}`
        });
      } else {
        setDirectSaveNotice({
          type: 'success',
          message: `Đã lưu và đồng bộ thành công dữ liệu cho ${savedCount} học sinh vào Mục 2, Mục 3, Hồ sơ học viên, trang Học viên và Phụ huynh!`
        });
      }
    } catch (err: any) {
      setDirectSaveNotice({
        type: 'error',
        message: err.message || 'Lỗi lưu dữ liệu trực tiếp.'
      });
    } finally {
      setIsSavingDirect(false);
    }
  };

  // Live calculation helper for previewing ĐXTN as GVCN edits
  const getLiveResult = (r: GraduationRegistration) => {
    if (!isDirectInputMode) {
      return {
        score: r.calculatedScore,
        status: r.status,
        reason: r.statusReason,
        hasDeadPoint: false
      };
    }
    const draft = draftData[r.studentId];
    if (!draft) {
      return {
        score: r.calculatedScore,
        status: r.status,
        reason: r.statusReason,
        hasDeadPoint: false
      };
    }
    const m = draft.math && draft.math.trim() !== '' ? parseFloat(draft.math.replace(',', '.')) : undefined;
    const l = draft.literature && draft.literature.trim() !== '' ? parseFloat(draft.literature.replace(',', '.')) : undefined;
    const e1 = draft.elective1 && draft.elective1.trim() !== '' ? parseFloat(draft.elective1.replace(',', '.')) : undefined;
    const e2 = draft.isForeignLanguageExempt ? undefined : (draft.elective2 && draft.elective2.trim() !== '' ? parseFloat(draft.elective2.replace(',', '.')) : undefined);
    const g10 = draft.gpa10 && draft.gpa10.trim() !== '' ? parseFloat(draft.gpa10.replace(',', '.')) : undefined;
    const g11 = draft.gpa11 && draft.gpa11.trim() !== '' ? parseFloat(draft.gpa11.replace(',', '.')) : undefined;
    const g12 = draft.gpa12 && draft.gpa12.trim() !== '' ? parseFloat(draft.gpa12.replace(',', '.')) : undefined;
    const prio = draft.priorityBonus ? parseFloat(draft.priorityBonus.replace(',', '.')) : 0;
    const enc = draft.encouragementBonus ? parseFloat(draft.encouragementBonus.replace(',', '.')) : 0;

    const tempReg: GraduationRegistration = {
      ...r,
      scores: {
        math: m !== undefined && !isNaN(m) ? m : undefined,
        literature: l !== undefined && !isNaN(l) ? l : undefined,
        elective1: e1 !== undefined && !isNaN(e1) ? e1 : undefined,
        elective2: e2 !== undefined && !isNaN(e2) ? e2 : undefined
      },
      electiveSubject1: draft.electiveSubject1 || '',
      electiveSubject2: draft.electiveSubject2 || '',
      isForeignLanguageExempt: draft.isForeignLanguageExempt,
      gpa10: g10 !== undefined && !isNaN(g10) ? g10 : undefined,
      gpa11: g11 !== undefined && !isNaN(g11) ? g11 : undefined,
      gpa12: g12 !== undefined && !isNaN(g12) ? g12 : undefined,
      priorityBonus: isNaN(prio) ? 0 : prio,
      encouragementBonus: isNaN(enc) ? 0 : enc
    };
    return graduationService.calculateResult(tempReg, ruleConfig);
  };

  // Quick statistics calculation
  const totalStudents = registrations.length;
  const withFullElectives = registrations.filter(r => r.electiveSubject1 && r.electiveSubject2).length;
  const missingElectives = totalStudents - withFullElectives;
  const scoreAbove5 = registrations.filter(r => r.calculatedScore !== undefined && r.calculatedScore >= 5.0 && !r.statusReason?.includes('điểm liệt')).length;
  const scoreBelow5 = registrations.filter(r => r.calculatedScore !== undefined && r.calculatedScore < 5.0).length;
  const deadPointCount = registrations.filter(r => {
    const s = r.scores;
    const min = ruleConfig.minimumSubjectScore ?? 1.0;
    return (
      (s.math !== undefined && s.math <= min) ||
      (s.literature !== undefined && s.literature <= min) ||
      (s.elective1 !== undefined && s.elective1 <= min) ||
      (!r.isForeignLanguageExempt && s.elective2 !== undefined && s.elective2 <= min)
    );
  }).length;
  const isStudentFlagged = (r: GraduationRegistration): boolean =>
    Boolean(
      r.isFlagged ||
        (r.teacherNote && r.teacherNote.trim().length > 0) ||
        (Array.isArray(r.flagReasons) && r.flagReasons.length > 0)
    );
  const flaggedCount = registrations.filter(isStudentFlagged).length;

  // Filter application
  const filteredRegistrations = registrations.filter(r => {
    // 1. Group filter
    if (groupFilter !== 'all' && r.studentGroup !== Number(groupFilter)) {
      return false;
    }

    // 2. Elective 1 & 2 filters
    if (elective1Filter !== 'all' && r.electiveSubject1 !== elective1Filter) {
      return false;
    }
    if (elective2Filter !== 'all' && r.electiveSubject2 !== elective2Filter) {
      return false;
    }

    // 3. Search query (name, code)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.studentName.toLowerCase().includes(q);
      const matchCode = r.studentCode.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }

    // 4. Filter Tab
    const minDead = ruleConfig.minimumSubjectScore ?? 1.0;
    const hasDead =
      (r.scores.math !== undefined && r.scores.math <= minDead) ||
      (r.scores.literature !== undefined && r.scores.literature <= minDead) ||
      (r.scores.elective1 !== undefined && r.scores.elective1 <= minDead) ||
      (!r.isForeignLanguageExempt && r.scores.elective2 !== undefined && r.scores.elective2 <= minDead);

    switch (activeFilterTab) {
      case 'flagged':
        return isStudentFlagged(r);
      case 'below_5':
        return r.calculatedScore !== undefined && r.calculatedScore < 5.0;
      case 'dead_point':
        return hasDead;
      case 'missing_electives':
        return !r.electiveSubject1 || !r.electiveSubject2;
      case 'missing_data':
        return (
          r.scores.math === undefined ||
          r.scores.literature === undefined ||
          r.scores.elective1 === undefined ||
          (!r.isForeignLanguageExempt && r.scores.elective2 === undefined)
        );
      case 'completed':
        return r.status === 'qualified';
      case 'all':
      default:
        return true;
    }
  });

  // Pagination calculations
  const totalItems = filteredRegistrations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRegistrations = filteredRegistrations.slice(startIndex, endIndex);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageStudentIds = paginatedRegistrations.map(r => r.studentId);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...pageStudentIds])));
    } else {
      const pageStudentIds = new Set(paginatedRegistrations.map(r => r.studentId));
      setSelectedStudentIds(prev => prev.filter(id => !pageStudentIds.has(id)));
    }
  };

  const handleToggleSelectOne = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleExportExcel = () => {
    graduationService.exportToExcel({
      className: '12A1',
      selectedStudentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
      filterType: activeFilterTab === 'flagged' ? 'flagged' : undefined
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Quick Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* Total */}
        <div
          onClick={() => setActiveFilterTab('all')}
          className={`cursor-pointer rounded-2xl border p-3 transition-all ${
            activeFilterTab === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${activeFilterTab === 'all' ? 'text-blue-100' : 'text-slate-400'}`}>
            Tổng học sinh
          </span>
          <div className="text-xl font-black mt-0.5">{totalStudents}</div>
        </div>

        {/* Flagged (Cần chú ý) */}
        <div
          onClick={() => setActiveFilterTab('flagged')}
          className={`cursor-pointer rounded-2xl border p-3 transition-all ${
            activeFilterTab === 'flagged'
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-amber-50/70 text-amber-950 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase ${activeFilterTab === 'flagged' ? 'text-amber-100' : 'text-amber-700'}`}>
              Cần chú ý
            </span>
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div className="text-xl font-black mt-0.5 text-amber-900">{flaggedCount}</div>
        </div>

        {/* Score >= 5 */}
        <div
          onClick={() => setActiveFilterTab('completed')}
          className={`cursor-pointer rounded-2xl border p-3 transition-all ${
            activeFilterTab === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-emerald-50/60 text-emerald-950 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${activeFilterTab === 'completed' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            ĐXTN ≥ 5.0đ
          </span>
          <div className="text-xl font-black mt-0.5 text-emerald-800">{scoreAbove5}</div>
        </div>

        {/* Score < 5 */}
        <div
          onClick={() => setActiveFilterTab('below_5')}
          className={`cursor-pointer rounded-2xl border p-3 transition-all ${
            activeFilterTab === 'below_5'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50/60 text-rose-950 border-rose-200 hover:border-rose-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${activeFilterTab === 'below_5' ? 'text-rose-100' : 'text-rose-700'}`}>
            ĐXTN &lt; 5.0đ
          </span>
          <div className="text-xl font-black mt-0.5 text-rose-800">{scoreBelow5}</div>
        </div>

        {/* Dead point */}
        <div
          onClick={() => setActiveFilterTab('dead_point')}
          className={`cursor-pointer rounded-2xl border p-3 transition-all ${
            activeFilterTab === 'dead_point'
              ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
              : 'bg-white text-rose-700 border-rose-200 hover:border-rose-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${activeFilterTab === 'dead_point' ? 'text-rose-100' : 'text-rose-600'}`}>
            Có môn ≤ 1.0đ
          </span>
          <div className="text-xl font-black mt-0.5">{deadPointCount}</div>
        </div>

        {/* Full Electives */}
        <div
          onClick={() => setActiveFilterTab('all')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 hover:border-blue-300 transition-all"
        >
          <span className="text-[10px] font-bold uppercase text-slate-400">Đã chọn 2 môn</span>
          <div className="text-xl font-black text-slate-800 mt-0.5">{withFullElectives}</div>
        </div>

        {/* Missing Electives */}
        <div
          onClick={() => setActiveFilterTab('missing_electives')}
          className={`cursor-pointer rounded-2xl border p-3 transition-all ${
            activeFilterTab === 'missing_electives'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase ${activeFilterTab === 'missing_electives' ? 'text-amber-100' : 'text-slate-400'}`}>
            Chưa chọn đủ
          </span>
          <div className="text-xl font-black mt-0.5 text-amber-700">{missingElectives}</div>
        </div>
      </div>

      {/* 2. Control Toolbar & Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Top Controls: Search, Selectors, Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search & Groups */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, mã học sinh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Tổ Filter */}
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="all">Tất cả tổ</option>
              <option value="1">Tổ 1</option>
              <option value="2">Tổ 2</option>
              <option value="3">Tổ 3</option>
              <option value="4">Tổ 4</option>
            </select>

            {/* Môn tự chọn 1 Filter */}
            <select
              value={elective1Filter}
              onChange={e => setElective1Filter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden max-w-[140px] truncate"
            >
              <option value="all">Tự chọn 1: Tất cả</option>
              {ELECTIVE_SUBJECTS_LIST.map(s => (
                <option key={`flt1-${s}`} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Môn tự chọn 2 Filter */}
            <select
              value={elective2Filter}
              onChange={e => setElective2Filter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-hidden max-w-[140px] truncate"
            >
              <option value="all">Tự chọn 2: Tất cả</option>
              {ELECTIVE_SUBJECTS_LIST.map(s => (
                <option key={`flt2-${s}`} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* 1. Nhập từ Excel */}
            <button
              onClick={() => setIsExcelImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
              title="Nhập điểm và thông tin tốt nghiệp từ file Excel (.xlsx, .xls)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Nhập từ Excel</span>
            </button>

            {/* 2. Nhập trực tiếp & Lưu */}
            <div className="flex items-center gap-1.5">
              {isDirectInputMode && (
                <button
                  onClick={handleSaveAllDirect}
                  disabled={isSavingDirect}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-black transition-all shadow-xs cursor-pointer disabled:opacity-60"
                  title="Lưu toàn bộ dữ liệu vừa nhập trên bảng vào cơ sở dữ liệu"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingDirect ? 'Đang lưu...' : 'Lưu tất cả'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (!isDirectInputMode) {
                    startDirectInput();
                  } else {
                    setIsDirectInputMode(false);
                  }
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors shadow-2xs cursor-pointer ${
                  isDirectInputMode
                    ? 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
                title={isDirectInputMode ? 'Nhấn để chuyển sang chế độ chỉ xem' : 'Bật chế độ nhập và sửa điểm trực tiếp trên bảng'}
              >
                <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                <span>{isDirectInputMode ? 'Nhập trực tiếp: BẬT' : 'Nhập trực tiếp'}</span>
              </button>

              {isDirectInputMode && (
                <button
                  onClick={cancelDirectInput}
                  disabled={isSavingDirect}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                  title="Khôi phục lại toàn bộ dữ liệu chưa lưu theo cơ sở dữ liệu"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setIsRuleConfigModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-600" />
              <span>Cấu hình Quy chế</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Xuất Excel ({selectedStudentIds.length > 0 ? selectedStudentIds.length : 'Cả lớp'})</span>
            </button>
          </div>
        </div>

        {/* Notices and Alerts */}
        {directSaveNotice && (
          <div
            className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium animate-fade-in ${
              directSaveNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {directSaveNotice.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{directSaveNotice.message}</span>
            </div>
            <button
              onClick={() => setDirectSaveNotice(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {isDirectInputMode && (
          <div className="flex items-center justify-between rounded-xl bg-blue-50/90 border border-blue-200 p-2.5 text-xs text-blue-950 font-medium animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>
                <strong>Chế độ nhập trực tiếp đang bật:</strong> Thầy/cô có thể chỉnh sửa điểm và môn thi của từng học sinh ngay trên bảng dưới đây. Sau khi nhập, bấm nút <strong>Lưu tất cả</strong> ở trên hoặc nút <strong>Lưu</strong> ở từng dòng để lưu vào hệ thống.
              </span>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Lọc nhanh:
          </span>

          <button
            onClick={() => setActiveFilterTab('all')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeFilterTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tất cả ({registrations.length})
          </button>

          <button
            onClick={() => setActiveFilterTab('flagged')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeFilterTab === 'flagged'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            ⚠️ Cần chú ý ({flaggedCount})
          </button>

          <button
            onClick={() => setActiveFilterTab('below_5')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeFilterTab === 'below_5'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            ĐXTN &lt; 5.0 ({scoreBelow5})
          </button>

          <button
            onClick={() => setActiveFilterTab('dead_point')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeFilterTab === 'dead_point'
                ? 'bg-rose-700 text-white'
                : 'bg-slate-50 text-rose-700 hover:bg-rose-50 border border-slate-200'
            }`}
          >
            Có môn ≤ 1.0đ ({deadPointCount})
          </button>

          <button
            onClick={() => setActiveFilterTab('missing_electives')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeFilterTab === 'missing_electives'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Thiếu môn tự chọn ({missingElectives})
          </button>

          <button
            onClick={() => setActiveFilterTab('completed')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
              activeFilterTab === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Đạt điều kiện ({scoreAbove5})
          </button>
        </div>
      </div>

      {/* 3. Main Student Tracking Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-tight text-[11px]">
                <th className="w-8 p-3 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedRegistrations.length > 0 &&
                      paginatedRegistrations.every(r => selectedStudentIds.includes(r.studentId))
                    }
                    onChange={handleSelectAll}
                    className="h-3.5 w-3.5 rounded-md text-blue-600"
                  />
                </th>
                <th className="p-3 text-center w-10">STT</th>
                <th className="p-3 min-w-[150px]">Họ và tên</th>
                <th className="p-3 text-center">Toán</th>
                <th className="p-3 text-center">Văn</th>
                <th className="p-3 min-w-[110px]">MÔN TỰ CHỌN 1</th>
                <th className="p-3 min-w-[110px]">MÔN TỰ CHỌN 2</th>
                <th className="p-3 text-center" title="ĐTB Lớp 10 (hệ số 1)">TB 10</th>
                <th className="p-3 text-center" title="ĐTB Lớp 11 (hệ số 2)">TB 11</th>
                <th className="p-3 text-center" title="ĐTB Lớp 12 (hệ số 3)">TB 12</th>
                <th className="p-3 text-center bg-indigo-50/50 text-indigo-900 font-black" title="ĐTB các năm học = (10*1 + 11*2 + 12*3)/6">
                  TB 3 năm
                </th>
                <th className="p-3 text-center">ƯT</th>
                <th className="p-3 text-center">KK</th>
                <th className="p-3 text-center bg-blue-50/60 text-blue-950 font-black">ĐXTN</th>
                <th className="p-3 min-w-[140px]">Trạng thái theo dõi</th>
                <th className="p-3 text-center w-24">Cần chú ý</th>
                <th className="p-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedRegistrations.map((r, idx) => {
                const s = r.scores;
                const liveRes = getLiveResult(r);
                const minDead = ruleConfig.minimumSubjectScore ?? 1.0;

                const draft = draftData[r.studentId];
                const mathVal = isDirectInputMode && draft?.math ? parseFloat(draft.math.replace(',', '.')) : s.math;
                const litVal = isDirectInputMode && draft?.literature ? parseFloat(draft.literature.replace(',', '.')) : s.literature;
                const el1Val = isDirectInputMode && draft?.elective1 ? parseFloat(draft.elective1.replace(',', '.')) : s.elective1;
                const el2Val = isDirectInputMode && !draft?.isForeignLanguageExempt && draft?.elective2 ? parseFloat(draft.elective2.replace(',', '.')) : s.elective2;

                const isMathDead = mathVal !== undefined && !isNaN(mathVal) && mathVal <= minDead;
                const isLitDead = litVal !== undefined && !isNaN(litVal) && litVal <= minDead;
                const isEl1Dead = el1Val !== undefined && !isNaN(el1Val) && el1Val <= minDead;
                const isEl2Dead = !r.isForeignLanguageExempt && el2Val !== undefined && !isNaN(el2Val) && el2Val <= minDead;
                const hasDeadPoint = liveRes.hasDeadPoint || isMathDead || isLitDead || isEl1Dead || isEl2Dead;

                // Row background style: soft light yellow for flagged, or subtle rose if dead point / low
                const isRowFlagged = isStudentFlagged(r);
                const rowBgClass = isRowFlagged
                  ? 'bg-[#FFF9DB]/80 hover:bg-[#FFF4C2]'
                  : hasDeadPoint
                  ? 'bg-rose-50/40 hover:bg-rose-50/70'
                  : liveRes.score !== undefined && liveRes.score < 5.0
                  ? 'bg-amber-50/30 hover:bg-amber-50/60'
                  : 'hover:bg-slate-50/70';

                return (
                  <tr key={r.id} className={`transition-colors ${rowBgClass}`}>
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(r.studentId)}
                        onChange={() => handleToggleSelectOne(r.studentId)}
                        className="h-3.5 w-3.5 rounded-md text-blue-600"
                      />
                    </td>

                    {/* STT */}
                    <td className="p-3 text-center font-bold text-slate-400">{startIndex + idx + 1}</td>

                    {/* Student Info */}
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900 leading-snug">{r.studentName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {r.studentCode} • Tổ {r.studentGroup}
                      </div>
                    </td>

                    {/* Math */}
                    {isDirectInputMode ? (
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draftData[r.studentId]?.math ?? ''}
                          onChange={e => handleDraftChange(r.studentId, 'math', e.target.value)}
                          placeholder="-"
                          className="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center font-bold text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>
                    ) : (
                      <td className={`p-3 text-center font-bold ${isMathDead ? 'text-rose-600 bg-rose-100/50' : ''}`}>
                        {s.math !== undefined ? s.math : '-'}
                      </td>
                    )}

                    {/* Literature */}
                    {isDirectInputMode ? (
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draftData[r.studentId]?.literature ?? ''}
                          onChange={e => handleDraftChange(r.studentId, 'literature', e.target.value)}
                          placeholder="-"
                          className="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center font-bold text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>
                    ) : (
                      <td className={`p-3 text-center font-bold ${isLitDead ? 'text-rose-600 bg-rose-100/50' : ''}`}>
                        {s.literature !== undefined ? s.literature : '-'}
                      </td>
                    )}

                    {/* Elective 1 */}
                    {isDirectInputMode ? (
                      <td className="p-2">
                        <div className="space-y-1 min-w-[130px]">
                          <select
                            value={draftData[r.studentId]?.electiveSubject1 ?? ''}
                            onChange={e => handleDraftChange(r.studentId, 'electiveSubject1', e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden"
                          >
                            <option value="">-- Chọn môn --</option>
                            {ELECTIVE_SUBJECTS_LIST.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold">Điểm:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draftData[r.studentId]?.elective1 ?? ''}
                              onChange={e => handleDraftChange(r.studentId, 'elective1', e.target.value)}
                              placeholder="-"
                              className="w-14 rounded-md border border-slate-300 bg-white px-1 py-0.5 text-center font-bold text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </td>
                    ) : (
                      <td className="p-3">
                        <div className="text-[11px] font-bold text-blue-900 truncate">{r.electiveSubject1 || 'Chưa chọn'}</div>
                        <div className={`text-[10px] font-bold ${isEl1Dead ? 'text-rose-600' : 'text-slate-500'}`}>
                          {s.elective1 !== undefined ? `${s.elective1}đ` : 'Chưa có điểm'}
                        </div>
                      </td>
                    )}

                    {/* Elective 2 */}
                    {isDirectInputMode ? (
                      <td className="p-2">
                        <div className="space-y-1 min-w-[130px]">
                          <label className="flex items-center gap-1 text-[10px] text-slate-700 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!draftData[r.studentId]?.isForeignLanguageExempt}
                              onChange={e => handleDraftChange(r.studentId, 'isForeignLanguageExempt', e.target.checked)}
                              className="h-3 w-3 rounded text-emerald-600"
                            />
                            <span>Miễn Ngoại ngữ</span>
                          </label>
                          {!draftData[r.studentId]?.isForeignLanguageExempt ? (
                            <>
                              <select
                                value={draftData[r.studentId]?.electiveSubject2 ?? ''}
                                onChange={e => handleDraftChange(r.studentId, 'electiveSubject2', e.target.value)}
                                className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-bold text-indigo-900 focus:border-blue-500 focus:outline-hidden"
                              >
                                <option value="">-- Chọn môn --</option>
                                {ELECTIVE_SUBJECTS_LIST.map(sub => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">Điểm:</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={draftData[r.studentId]?.elective2 ?? ''}
                                  onChange={e => handleDraftChange(r.studentId, 'elective2', e.target.value)}
                                  placeholder="-"
                                  className="w-14 rounded-md border border-slate-300 bg-white px-1 py-0.5 text-center font-bold text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="rounded-md bg-emerald-50 px-1 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 text-center">
                              Miễn thi (quy đổi 10đ)
                            </div>
                          )}
                        </div>
                      </td>
                    ) : (
                      <td className="p-3">
                        {r.isForeignLanguageExempt ? (
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            Miễn thi
                          </span>
                        ) : (
                          <>
                            <div className="text-[11px] font-bold text-indigo-900 truncate">{r.electiveSubject2 || 'Chưa chọn'}</div>
                            <div className={`text-[10px] font-bold ${isEl2Dead ? 'text-rose-600' : 'text-slate-500'}`}>
                              {s.elective2 !== undefined ? `${s.elective2}đ` : 'Chưa có điểm'}
                            </div>
                          </>
                        )}
                      </td>
                    )}

                    {/* GPA 10, 11, 12 */}
                    {isDirectInputMode ? (
                      <>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draftData[r.studentId]?.gpa10 ?? ''}
                            onChange={e => handleDraftChange(r.studentId, 'gpa10', e.target.value)}
                            placeholder="-"
                            className="w-12 rounded-md border border-slate-300 bg-white px-1 py-1 text-center font-semibold text-slate-800 text-xs focus:border-blue-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draftData[r.studentId]?.gpa11 ?? ''}
                            onChange={e => handleDraftChange(r.studentId, 'gpa11', e.target.value)}
                            placeholder="-"
                            className="w-12 rounded-md border border-slate-300 bg-white px-1 py-1 text-center font-semibold text-slate-800 text-xs focus:border-blue-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draftData[r.studentId]?.gpa12 ?? ''}
                            onChange={e => handleDraftChange(r.studentId, 'gpa12', e.target.value)}
                            placeholder="-"
                            className="w-12 rounded-md border border-slate-300 bg-white px-1 py-1 text-center font-semibold text-slate-800 text-xs focus:border-blue-500 focus:outline-hidden"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-center font-medium text-slate-600">{r.gpa10 ?? '-'}</td>
                        <td className="p-3 text-center font-medium text-slate-600">{r.gpa11 ?? '-'}</td>
                        <td className="p-3 text-center font-medium text-slate-600">{r.gpa12 ?? '-'}</td>
                      </>
                    )}

                    {/* GPA 3 years (hệ số 1-2-3) */}
                    <td className="p-3 text-center font-black text-indigo-900 bg-indigo-50/40">
                      {(() => {
                        if (isDirectInputMode) {
                          const g10 = draftData[r.studentId]?.gpa10 ? parseFloat(draftData[r.studentId].gpa10.replace(',', '.')) : undefined;
                          const g11 = draftData[r.studentId]?.gpa11 ? parseFloat(draftData[r.studentId].gpa11.replace(',', '.')) : undefined;
                          const g12 = draftData[r.studentId]?.gpa12 ? parseFloat(draftData[r.studentId].gpa12.replace(',', '.')) : undefined;
                          if (g10 !== undefined && g11 !== undefined && g12 !== undefined && !isNaN(g10) && !isNaN(g11) && !isNaN(g12)) {
                            return ((g10 * 1 + g11 * 2 + g12 * 3) / 6).toFixed(2);
                          }
                        }
                        return r.gpaAllYears !== undefined ? r.gpaAllYears.toFixed(2) : '-';
                      })()}
                    </td>

                    {/* Bonus Priority & Encouragement */}
                    {isDirectInputMode ? (
                      <>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draftData[r.studentId]?.priorityBonus ?? '0'}
                            onChange={e => handleDraftChange(r.studentId, 'priorityBonus', e.target.value)}
                            placeholder="0"
                            className="w-11 rounded-md border border-slate-300 bg-white px-1 py-1 text-center font-medium text-slate-700 text-xs focus:border-blue-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={draftData[r.studentId]?.encouragementBonus ?? '0'}
                            onChange={e => handleDraftChange(r.studentId, 'encouragementBonus', e.target.value)}
                            placeholder="0"
                            className="w-11 rounded-md border border-slate-300 bg-white px-1 py-1 text-center font-medium text-slate-700 text-xs focus:border-blue-500 focus:outline-hidden"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-center text-slate-500">{r.priorityBonus ? `+${r.priorityBonus}` : '0'}</td>
                        <td className="p-3 text-center text-slate-500">{r.encouragementBonus ? `+${r.encouragementBonus}` : '0'}</td>
                      </>
                    )}

                    {/* ĐXTN dự kiến */}
                    <td className="p-3 text-center bg-blue-50/50">
                      {liveRes.score !== undefined ? (
                        <span
                          className={`inline-block rounded-xl px-2.5 py-1 text-xs font-black font-mono shadow-2xs ${
                            hasDeadPoint
                              ? 'bg-rose-600 text-white'
                              : liveRes.score < 5.0
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : liveRes.score < 5.8
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-600 text-white'
                          }`}
                          title={liveRes.reason}
                        >
                          {liveRes.score.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">--</span>
                      )}
                    </td>

                    {/* Status & Warning reasons */}
                    <td className="p-3">
                      {isRowFlagged && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900">
                          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {r.flagReasons && r.flagReasons.length > 0
                              ? r.flagReasons[0]
                              : r.teacherNote && r.teacherNote.trim().length > 0
                              ? r.teacherNote.trim()
                              : 'Cần chú ý'}
                          </span>
                        </div>
                      )}

                      {r.statusReason ? (
                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{r.statusReason}</div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Bình thường</span>
                      )}

                      {(Boolean(r.teacherNote && r.teacherNote.trim().length > 0) ||
                        Boolean(r.flagReasons && r.flagReasons.length > 0)) && (
                        <button
                          onClick={() => setViewingNoteStudent(r)}
                          className="mt-0.5 flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          <Bookmark className="h-2.5 w-2.5" /> Ghi chú GVCN
                        </button>
                      )}
                    </td>

                    {/* Flag Toggle Button */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setFlaggingStudent(r)}
                        className={`rounded-xl p-1.5 transition-all cursor-pointer ${
                          isRowFlagged
                            ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
                            : 'border border-slate-200 bg-white text-slate-400 hover:text-amber-600 hover:border-amber-300'
                        }`}
                        title={isRowFlagged ? 'Chỉnh sửa lý do chú ý' : 'Đánh dấu cần chú ý'}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isDirectInputMode && (
                          <button
                            onClick={() => handleSaveSingleRow(r.studentId)}
                            disabled={savingStudentId === r.studentId || isSavingDirect}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-1.5 shadow-2xs transition-colors cursor-pointer"
                            title={savingStudentId === r.studentId ? 'Đang lưu...' : 'Lưu dòng này'}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingStudent(r)}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
                          title="Sửa điểm và môn thi"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={17} className="p-12 text-center">
                    <div className="mx-auto max-w-md space-y-2">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <AlertCircle className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-700">
                        {registrations.length === 0
                          ? 'Chưa có dữ liệu đăng ký tốt nghiệp THPT'
                          : 'Không tìm thấy học sinh phù hợp với bộ lọc'}
                      </div>
                      <p className="text-xs text-slate-400">
                        {registrations.length === 0
                          ? 'Lớp học hiện tại chưa có học sinh nào đăng ký môn thi tự chọn hoặc lưu điểm dự kiến. Khi học sinh đăng ký hoặc GVCN nhập điểm, dữ liệu sẽ tự động lưu bền vững và hiển thị tại đây.'
                          : 'Vui lòng thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại các tiêu chí lọc.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pagination & Items Per Page Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        {/* Left: Summary */}
        <div className="text-xs text-slate-600">
          Hiển thị <span className="font-bold text-slate-900">{totalItems === 0 ? 0 : startIndex + 1} - {endIndex}</span> trong tổng số <span className="font-bold text-slate-900">{totalItems}</span> học sinh
        </div>

        {/* Center: Page Size Selector (10 vs 20) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Số học sinh mỗi trang:</span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => {
                setPageSize(10);
                setCurrentPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                pageSize === 10
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              10 / trang
            </button>
            <button
              type="button"
              onClick={() => {
                setPageSize(20);
                setCurrentPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                pageSize === 20
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              20 / trang
            </button>
          </div>
        </div>

        {/* Right: Page Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage <= 1}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang đầu"
          >
            «
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang trước"
          >
            ‹ Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={`page-btn-${page}`}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`min-w-[28px] rounded-lg px-2 py-1 text-xs font-bold transition-colors cursor-pointer ${
                safeCurrentPage === page
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang sau"
          >
            Sau ›
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang cuối"
          >
            »
          </button>
        </div>
      </div>

      {/* Modals */}
      {flaggingStudent && (
        <GraduationFlagModal
          registration={flaggingStudent}
          onClose={() => setFlaggingStudent(null)}
          onSaved={updated => {
            loadData(false);
            setDirectSaveNotice({
              type: 'success',
              message: updated.isFlagged
                ? `Đã lưu ghi chú "Cần chú ý" cho học viên ${updated.studentName} (${updated.studentCode}).`
                : `Đã gỡ đánh dấu "Cần chú ý" cho học viên ${updated.studentName} (${updated.studentCode}).`
            });
          }}
        />
      )}

      {editingStudent && (
        <GraduationEditStudentModal
          registration={editingStudent}
          onClose={() => {
            dirtyStudentIdsRef.current.delete(editingStudent.studentId);
            setEditingStudent(null);
            loadData(false);
          }}
        />
      )}

      {isRuleConfigModalOpen && (
        <GraduationRuleConfigModal
          onClose={() => setIsRuleConfigModalOpen(false)}
        />
      )}

      {isExcelImportModalOpen && (
        <GraduationExcelImportModal
          isOpen={isExcelImportModalOpen}
          onClose={() => setIsExcelImportModalOpen(false)}
          onSuccess={() => {
            setIsExcelImportModalOpen(false);
            loadData();
            setDirectSaveNotice({
              type: 'success',
              message: 'Nhập dữ liệu từ Excel thành công! Toàn bộ bảng theo dõi đã được cập nhật.'
            });
          }}
        />
      )}

      {/* Private Teacher Note Modal */}
      {viewingNoteStudent && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-50/80 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
                  <Bookmark className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-indigo-950 uppercase tracking-tight">
                    GHI CHÚ THEO DÕI CỦA GVCN
                  </h3>
                  <p className="text-[11px] text-indigo-800">
                    {viewingNoteStudent.studentName} ({viewingNoteStudent.studentCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingNoteStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                {viewingNoteStudent.teacherNote || 'Chưa có ghi chú nào.'}
              </div>

              {viewingNoteStudent.flagReasons && viewingNoteStudent.flagReasons.length > 0 && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-700">Các lý do đã đánh dấu:</span>
                  <div className="flex flex-wrap gap-1">
                    {viewingNoteStudent.flagReasons.map(r => (
                      <span
                        key={r}
                        className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
              <button
                onClick={() => setViewingNoteStudent(null)}
                className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
