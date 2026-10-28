/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Save,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Info,
  ChevronRight,
  UserCheck,
  Lock
} from 'lucide-react';
import { GraduationRegistration, GraduationRuleConfig } from '../../types';
import { graduationService } from '../../services/GraduationService';
import { studentService } from '../../services/StudentService';
import { authService } from '../../services/AuthService';

export const GraduationCalculatorTab: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const role = currentUser.role;
  const isTeacher = role === 'TEACHER' || role === 'SUPER_ADMIN';
  const isOfficer = role === 'CLASS_OFFICER';
  const isStudent = role === 'STUDENT';
  const isStudentLike = isStudent || isOfficer;
  const isParent = role === 'PARENT';

  const [students, setStudents] = useState(() => studentService.getAll());
  const ruleConfig = graduationService.getRuleConfig();

  const resolveOwnStudentId = (studentList = students): string => {
    if (isStudentLike) {
      const rawId = currentUser.studentId || (currentUser.id?.startsWith('usr_stu_') ? currentUser.id.replace('usr_stu_', '') : currentUser.id);
      const matched = studentList.find(
        s => s.id === rawId || (s.code && s.code.toLowerCase() === String(rawId || '').toLowerCase())
      );
      return matched?.id || currentUser.studentId || studentList[0]?.id || '';
    }
    if (isParent) {
      const rawId = currentUser.childStudentId || currentUser.studentId || (currentUser.id?.startsWith('usr_par_') ? currentUser.id.replace('usr_par_', '') : '');
      const matched = studentList.find(
        s => s.id === rawId || (s.code && s.code.toLowerCase() === String(rawId || '').toLowerCase())
      );
      return matched?.id || currentUser.childStudentId || currentUser.studentId || studentList[0]?.id || '';
    }
    return studentList[0]?.id || '';
  };

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => resolveOwnStudentId());

  // Form Inputs
  const [mathScore, setMathScore] = useState<string>('');
  const [literatureScore, setLiteratureScore] = useState<string>('');
  const [elective1Name, setElective1Name] = useState<string>('');
  const [elective1Score, setElective1Score] = useState<string>('');
  const [elective2Name, setElective2Name] = useState<string>('');
  const [elective2Score, setElective2Score] = useState<string>('');

  // GPA 3 years
  const [gpa10, setGpa10] = useState<string>('');
  const [gpa11, setGpa11] = useState<string>('');
  const [gpa12, setGpa12] = useState<string>('');

  // Bonuses
  const [encouragementBonus, setEncouragementBonus] = useState<string>('0');
  const [priorityBonus, setPriorityBonus] = useState<string>('0');
  const [isForeignLanguageExempt, setIsForeignLanguageExempt] = useState<boolean>(false);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [showEncouragementGuide, setShowEncouragementGuide] = useState<boolean>(false);
  const [showPriorityGuide, setShowPriorityGuide] = useState<boolean>(false);

  const normalizeBonusValue = (val: unknown): string => {
    if (val === undefined || val === null || val === '') return '0';
    const n = Number(val);
    return isNaN(n) ? '0' : String(n);
  };

  // Load from registration if available
  const reloadFromRegistration = () => {
    const latestStudents = studentService.getAll();
    setStudents(latestStudents);
    const isSelectedInClass = latestStudents.some(s => s.id === selectedStudentId);
    const effectiveStudentId =
      (!isTeacher ? resolveOwnStudentId(latestStudents) : (isSelectedInClass ? selectedStudentId : latestStudents[0]?.id)) ||
      latestStudents[0]?.id ||
      '';
    if (effectiveStudentId && effectiveStudentId !== selectedStudentId) {
      setSelectedStudentId(effectiveStudentId);
    }
    const targetId = effectiveStudentId || selectedStudentId;
    const reg = graduationService.getByStudentId(targetId);
    if (reg) {
      setMathScore(reg.scores?.math !== undefined ? String(reg.scores.math) : '');
      setLiteratureScore(reg.scores?.literature !== undefined ? String(reg.scores.literature) : '');
      setElective1Name(reg.electiveSubject1 || '');
      setElective1Score(reg.scores?.elective1 !== undefined ? String(reg.scores.elective1) : '');
      setElective2Name(reg.electiveSubject2 || '');
      setElective2Score(reg.scores?.elective2 !== undefined ? String(reg.scores.elective2) : '');
      setGpa10(reg.gpa10 !== undefined ? String(reg.gpa10) : '');
      setGpa11(reg.gpa11 !== undefined ? String(reg.gpa11) : '');
      setGpa12(reg.gpa12 !== undefined ? String(reg.gpa12) : '');
      setEncouragementBonus(normalizeBonusValue(reg.encouragementBonus));
      setPriorityBonus(normalizeBonusValue(reg.priorityBonus));
      setIsForeignLanguageExempt(!!reg.isForeignLanguageExempt);
    } else {
      setMathScore('');
      setLiteratureScore('');
      setElective1Name('');
      setElective1Score('');
      setElective2Name('');
      setElective2Score('');
      setGpa10('');
      setGpa11('');
      setGpa12('');
      setEncouragementBonus('0');
      setPriorityBonus('0');
      setIsForeignLanguageExempt(false);
    }
  };

  useEffect(() => {
    graduationService.fetchFromServer();
  }, []);

  useEffect(() => {
    reloadFromRegistration();
    const unsubGrad = graduationService.subscribe(reloadFromRegistration);
    const unsubStudents = studentService.subscribe(reloadFromRegistration);
    return () => {
      unsubGrad();
      unsubStudents();
    };
  }, [selectedStudentId]);

  // Compute values
  const numMath = parseFloat(mathScore);
  const numLit = parseFloat(literatureScore);
  const numEl1 = parseFloat(elective1Score);
  const numEl2 = parseFloat(elective2Score);

  const numGpa10 = parseFloat(gpa10);
  const numGpa11 = parseFloat(gpa11);
  const numGpa12 = parseFloat(gpa12);

  const numEnc = parseFloat(encouragementBonus) || 0;
  const numPrio = parseFloat(priorityBonus) || 0;

  // Build mock registration for calculation
  const mockRegistration: GraduationRegistration = {
    id: `calc-${selectedStudentId}`,
    studentId: selectedStudentId,
    studentName: 'Học sinh',
    studentCode: '',
    studentGroup: 1,
    compulsorySubjects: ['Toán', 'Ngữ văn'],
    electiveSubject1: elective1Name,
    electiveSubject2: elective2Name,
    scores: {
      math: isNaN(numMath) ? undefined : numMath,
      literature: isNaN(numLit) ? undefined : numLit,
      elective1: isNaN(numEl1) ? undefined : numEl1,
      elective2: isNaN(numEl2) ? undefined : numEl2
    },
    gpa10: isNaN(numGpa10) ? undefined : numGpa10,
    gpa11: isNaN(numGpa11) ? undefined : numGpa11,
    gpa12: isNaN(numGpa12) ? undefined : numGpa12,
    isForeignLanguageExempt,
    priorityBonus: numPrio,
    encouragementBonus: numEnc,
    status: 'pending',
    registeredAt: '',
    updatedAt: ''
  };

  const calcResult = graduationService.calculateResult(mockRegistration, ruleConfig);
  const calculatedGpaAll = graduationService.calculateGpaAllYears(numGpa10, numGpa11, numGpa12, ruleConfig);

  const handleSaveToProfile = async () => {
    if (isParent) return;
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    const targetStudentId = selectedStudentId || resolveOwnStudentId();
    if (!targetStudentId) {
      setSaveErrorMsg('Không xác định được học viên cần lưu điểm. Vui lòng chọn học viên.');
      return;
    }

    const parseOptionalScore = (raw: string, label: string): number | undefined => {
      if (!raw || raw.trim() === '') return undefined;
      const n = parseFloat(raw.replace(',', '.'));
      if (isNaN(n) || n < 0 || n > 10) {
        throw new Error(`Điểm ${label} phải nằm trong khoảng từ 0 đến 10.`);
      }
      return n;
    };

    const currentReg = graduationService.getByStudentId(targetStudentId);
    const matchedStudent = students.find(s => s.id === targetStudentId);

    try {
      const parsedMath = parseOptionalScore(mathScore, 'Toán');
      const parsedLit = parseOptionalScore(literatureScore, 'Ngữ văn');
      const parsedEl1 = parseOptionalScore(elective1Score, 'Môn tự chọn 1');
      const parsedEl2 = isForeignLanguageExempt ? undefined : parseOptionalScore(elective2Score, 'Môn tự chọn 2');
      const parsedGpa10 = parseOptionalScore(gpa10, 'ĐTB Lớp 10');
      const parsedGpa11 = parseOptionalScore(gpa11, 'ĐTB Lớp 11');
      const parsedGpa12 = parseOptionalScore(gpa12, 'ĐTB Lớp 12');

      const parsedPrio = Number(priorityBonus.replace(',', '.'));
      if (isNaN(parsedPrio) || ![0, 0.25, 0.5].includes(parsedPrio)) {
        throw new Error('Điểm Ưu tiên không hợp lệ. Chỉ chấp nhận các mức theo quy định: 0, 0.25 hoặc 0.5 điểm.');
      }

      const parsedEnc = Number(encouragementBonus.replace(',', '.'));
      if (isNaN(parsedEnc) || ![0, 1, 1.5, 2].includes(parsedEnc)) {
        throw new Error('Điểm Khuyến khích không hợp lệ. Chỉ chấp nhận một mức điểm của giải cao nhất theo quy định: 0, 1.0, 1.5 hoặc 2.0 điểm.');
      }

      await graduationService.updateRegistration(currentReg?.id || `grad-reg-${targetStudentId}`, {
        studentId: targetStudentId,
        studentName: matchedStudent?.fullName || currentReg?.studentName || 'Học sinh',
        studentCode: matchedStudent?.code || currentReg?.studentCode || '',
        studentGroup: matchedStudent?.group || currentReg?.studentGroup || 1,
        electiveSubject1: elective1Name || currentReg?.electiveSubject1 || '',
        electiveSubject2: elective2Name || currentReg?.electiveSubject2 || '',
        scores: {
          math: parsedMath,
          literature: parsedLit,
          elective1: parsedEl1,
          elective2: parsedEl2
        },
        gpa10: parsedGpa10,
        gpa11: parsedGpa11,
        gpa12: parsedGpa12,
        priorityBonus: parsedPrio,
        encouragementBonus: parsedEnc,
        isForeignLanguageExempt,
        schoolYear: currentReg?.schoolYear || ruleConfig.schoolYear || '2025-2026',
        updatedBy: isTeacher ? 'Giáo viên chủ nhiệm' : 'Học sinh'
      });

      setSaveSuccessMsg('Đã lưu điểm dự kiến vào hồ sơ theo dõi thành công!');
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Lỗi đồng bộ dữ liệu điểm xét tốt nghiệp.');
    }
  };

  const handleResetToDefault = () => {
    if (isParent) return;
    setMathScore('');
    setLiteratureScore('');
    setElective1Score('');
    setElective2Score('');
    setGpa10('');
    setGpa11('');
    setGpa12('');
    setEncouragementBonus('0');
    setPriorityBonus('0');
    setIsForeignLanguageExempt(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Parent Read-only notice */}
      {isParent && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3.5 text-xs font-bold text-amber-900 border border-amber-200 shadow-xs">
          <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-extrabold text-amber-950">Chế độ xem Phụ huynh (Chỉ đọc)</p>
            <p className="text-amber-800 text-[11px] font-medium mt-0.5">
              Quý Phụ huynh đang xem dữ liệu và điểm xét tốt nghiệp THPT dự kiến của con. Chỉ GVCN và Học sinh mới có quyền chỉnh sửa.
            </p>
          </div>
        </div>
      )}

      {/* 1. Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span>DỰ KIẾN & TÍNH ĐIỂM XÉT TỐT NGHIỆP THPT</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Công thức chuẩn GDPT 2018: ĐTB các năm học (hệ số 1-2-3) &amp; Điểm 4 môn thi THPT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTeacher && (
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.fullName}
                </option>
              ))}
            </select>
          )}

          {!isParent && (
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Khôi phục điểm mẫu"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Mặc định</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Formula Banner */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-purple-50/60 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase text-indigo-900 tracking-wider">
              📐 CÔNG THỨC TÍNH ĐIỂM TRUNG BÌNH 3 NĂM HỌC
            </span>
            <div className="rounded-xl bg-white/90 p-2.5 border border-indigo-200 font-mono font-bold text-indigo-950 text-xs sm:text-sm">
              ĐTB các năm học = (ĐTB lớp 10 × 1 + ĐTB lớp 11 × 2 + ĐTB lớp 12 × 3) ÷ 6
            </div>
          </div>

          <div className="space-y-1 max-w-md">
            <span className="text-[11px] font-black uppercase text-blue-900 tracking-wider">
              🎓 CÔNG THỨC ĐXTN
            </span>
            <div className="rounded-xl bg-white/90 p-2.5 border border-blue-200 font-mono font-bold text-blue-950 text-xs sm:text-sm">
              ĐXTN = [ (Tổng 4 môn + Điểm KK/4) ÷ 4 × 0.5 ] + [ ĐTB 3 năm × 0.5 ] + Điểm Ưu tiên
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 3. Left Input Panel (7 cols on large) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Section A: 4 Exam Scores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                1. ĐIỂM THI DỰ KIẾN (THANG ĐIỂM 10)
              </h3>
              <span className="text-[10px] font-bold text-slate-500">Yêu cầu mỗi môn &gt; 1.0đ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Math */}
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Toán (Bắt buộc)</span>
                  <span className="text-[10px] text-blue-600 font-bold">0 - 10đ</span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isParent}
                  value={mathScore}
                  onChange={e => setMathScore(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-1.5 text-sm font-black focus:outline-hidden ${
                    isParent
                      ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-blue-500'
                  }`}
                  placeholder="8.0"
                />
              </div>

              {/* Literature */}
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Ngữ văn (Bắt buộc)</span>
                  <span className="text-[10px] text-blue-600 font-bold">0 - 10đ</span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isParent}
                  value={literatureScore}
                  onChange={e => setLiteratureScore(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-1.5 text-sm font-black focus:outline-hidden ${
                    isParent
                      ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-blue-500'
                  }`}
                  placeholder="7.5"
                />
              </div>

              {/* Elective 1 */}
              <div className="space-y-1 rounded-xl bg-blue-50/50 p-3 border border-blue-200">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                  <span>MÔN TỰ CHỌN 1: {elective1Name}</span>
                  <span className="text-[10px] text-blue-600 font-bold">0 - 10đ</span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isParent}
                  value={elective1Score}
                  onChange={e => setElective1Score(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-1.5 text-sm font-black focus:outline-hidden ${
                    isParent
                      ? 'border-blue-200 bg-slate-100 text-blue-900 cursor-not-allowed'
                      : 'border-blue-300 bg-white text-blue-900 focus:border-blue-600'
                  }`}
                  placeholder="8.5"
                />
              </div>

              {/* Elective 2 */}
              <div className="space-y-1 rounded-xl bg-indigo-50/50 p-3 border border-indigo-200">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                  <span>MÔN TỰ CHỌN 2: {elective2Name}</span>
                  {isForeignLanguageExempt ? (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 rounded-sm">
                      Miễn thi
                    </span>
                  ) : (
                    <span className="text-[10px] text-indigo-600 font-bold">0 - 10đ</span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isParent || isForeignLanguageExempt}
                  value={isForeignLanguageExempt ? '' : elective2Score}
                  onChange={e => setElective2Score(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-1.5 text-sm font-black focus:outline-hidden ${
                    isParent || isForeignLanguageExempt
                      ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                      : 'border-indigo-300 bg-white text-indigo-900 focus:border-indigo-600'
                  }`}
                  placeholder={isForeignLanguageExempt ? 'Được miễn thi' : '8.0'}
                />
              </div>
            </div>

            <label className={`flex items-center gap-2 pt-1 ${isParent ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={isParent}
                checked={isForeignLanguageExempt}
                onChange={e => setIsForeignLanguageExempt(e.target.checked)}
                className="rounded-md text-blue-600 h-4 w-4 disabled:cursor-not-allowed"
              />
              <span className="text-xs font-bold text-slate-700">
                Thí sinh được miễn thi Ngoại ngữ (tính ĐXTN trên 3 môn thi còn lại)
              </span>
            </label>
          </div>

          {/* Section B: GPA 3 Years (10, 11, 12) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                2. ĐIỂM TRUNG BÌNH HỌC BẠ 3 NĂM HỌC
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                Hệ số: 1 - 2 - 3
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 block">ĐTB Lớp 10 (Hệ số 1)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isParent}
                  value={gpa10}
                  onChange={e => setGpa10(e.target.value)}
                  className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-black focus:outline-hidden ${
                    isParent
                      ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-blue-500'
                  }`}
                  placeholder="8.0"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 block">ĐTB Lớp 11 (Hệ số 2)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isParent}
                  value={gpa11}
                  onChange={e => setGpa11(e.target.value)}
                  className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-black focus:outline-hidden ${
                    isParent
                      ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-blue-500'
                  }`}
                  placeholder="8.2"
                />
              </div>

              <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 block">ĐTB Lớp 12 (Hệ số 3)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="10"
                  disabled={isParent}
                  value={gpa12}
                  onChange={e => setGpa12(e.target.value)}
                  className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-black focus:outline-hidden ${
                    isParent
                      ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-blue-500'
                  }`}
                  placeholder="8.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 p-2.5 text-xs font-bold text-indigo-950 border border-indigo-200">
              <span>ĐTB các năm học tính toán:</span>
              <span className="text-sm font-black text-indigo-800 font-mono">
                {calculatedGpaAll.toFixed(2)} điểm
              </span>
            </div>
          </div>

          {/* Section C: Bonus Points (Ưu tiên & Khuyến khích) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-2">
              3. ĐIỂM ƯU TIÊN &amp; ĐIỂM KHUYẾN KHÍCH
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Điểm Khuyến khích (Tối đa 2.0đ)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEncouragementGuide(prev => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
                  >
                    <HelpCircle className="h-3 w-3" />
                    <span>{showEncouragementGuide ? 'Ẩn hướng dẫn' : 'Tra cứu mức điểm'}</span>
                  </button>
                </div>
                <select
                  disabled={isParent}
                  value={encouragementBonus}
                  onChange={e => setEncouragementBonus(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-hidden ${
                    isParent
                      ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-blue-500'
                  }`}
                >
                  <option value="0">0.0 điểm (Không có)</option>
                  <option value="1">1.0 điểm (+1.0đ)</option>
                  <option value="1.5">1.5 điểm (+1.5đ)</option>
                  <option value="2">2.0 điểm (+2.0đ)</option>
                  {!['0', '1', '1.5', '2'].includes(encouragementBonus) && (
                    <option value={encouragementBonus}>{encouragementBonus} điểm</option>
                  )}
                </select>
                {showEncouragementGuide && (
                  <div className="mt-1.5 rounded-xl bg-blue-50/70 p-3 border border-blue-200 text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
                    <div className="font-extrabold text-blue-950 uppercase text-[10px]">
                      Tra cứu Điểm Khuyến khích (Cấp THPT)
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong className="text-slate-900">+2,0 điểm:</strong> Giải Nhất, Nhì, Ba kỳ thi chọn HSG quốc gia hoặc giải Nhất cấp tỉnh; Giải Nhất, Nhì, Ba quốc gia hoặc giải Nhất cấp tỉnh / Huy chương Vàng các cuộc thi thí nghiệm thực hành (Vật lí, Hóa học, Sinh học), văn nghệ, TDTT, hội thao GDQP, KHKT, viết thư quốc tế do ngành Giáo dục phối hợp tổ chức từ cấp tỉnh trở lên.
                      </li>
                      <li>
                        <strong className="text-slate-900">+1,5 điểm:</strong> Giải Khuyến khích kỳ thi chọn HSG quốc gia hoặc giải Nhì cấp tỉnh; Giải KK quốc gia, giải Tư KHKT cấp quốc gia hoặc giải Nhì cấp tỉnh / Huy chương Bạc các cuộc thi nêu trên.
                      </li>
                      <li>
                        <strong className="text-slate-900">+1,0 điểm:</strong> Giải Ba cấp tỉnh kỳ thi chọn HSG; Giải Ba cấp tỉnh / Huy chương Đồng các cuộc thi nêu trên.
                      </li>
                    </ul>
                    <div className="text-[10px] text-slate-600 pt-1 border-t border-blue-200/70 space-y-0.5">
                      <div>
                        <strong>Nguyên tắc:</strong> Giải đồng đội chỉ cộng đối với giải cấp quốc gia. Đoạt nhiều giải khác nhau chỉ hưởng một mức điểm của giải cao nhất.
                      </div>
                      <div>
                        <strong>Căn cứ pháp lý:</strong> Điều 43 Quy chế thi tốt nghiệp THPT (Thông tư số 24/2024/TT-BGDĐT, sửa đổi bổ sung bởi Thông tư số 13/2026/TT-BGDĐT).
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Điểm Ưu tiên (Diện 1, 2, 3 - Tối đa 0.5đ)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPriorityGuide(prev => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                  >
                    <HelpCircle className="h-3 w-3" />
                    <span>{showPriorityGuide ? 'Ẩn hướng dẫn' : 'Tra cứu mức điểm'}</span>
                  </button>
                </div>
                <select
                  disabled={isParent}
                  value={priorityBonus}
                  onChange={e => setPriorityBonus(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-hidden ${
                    isParent
                      ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-blue-500'
                  }`}
                >
                  <option value="0">Diện 1: 0.0 điểm (Bình thường)</option>
                  <option value="0.25">Diện 2: +0.25 điểm</option>
                  <option value="0.5">Diện 3: +0.50 điểm</option>
                  {!['0', '0.25', '0.5'].includes(priorityBonus) && (
                    <option value={priorityBonus}>+{priorityBonus} điểm</option>
                  )}
                </select>
                {showPriorityGuide && (
                  <div className="mt-1.5 rounded-xl bg-indigo-50/70 p-3 border border-indigo-200 text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
                    <div className="font-extrabold text-indigo-950 uppercase text-[10px]">
                      Tra cứu Điểm Ưu tiên Xét Tốt nghiệp
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong className="text-slate-900">Diện 1 (0,0 điểm):</strong> Thí sinh bình thường không thuộc diện hưởng ưu tiên.
                      </li>
                      <li>
                        <strong className="text-slate-900">Diện 2 (+0,25 điểm):</strong> Thương binh, bệnh binh, người hưởng chính sách như thương binh suy giảm KNLĐ dưới 81% (GDTX) hoặc con của các đối tượng này; Anh hùng LLVTND, Anh hùng Lao động, con Bà mẹ VNAH, con Anh hùng LLVTND/Lao động; Người dân tộc thiểu số; Người Kinh, người nước ngoài cư trú tại Việt Nam học ít nhất 2/3 thời gian cấp THPT tại trường phổ thông (không thuộc các quận của TP trực thuộc TW) ở xã ĐBKK, xã biên giới, xã an toàn khu (CT 135), xã ĐBKK vùng bãi ngang ven biển và hải đảo, xã khu vực I, II, III hoặc xã có thôn ĐBKK vùng đồng bào DTTS và miền núi; Người nhiễm chất độc hóa học hoặc con của họ, người bị dị dạng/dị tật/suy giảm khả năng tự lực do chất độc hóa học; Thí sinh GDTX từ 35 tuổi trở lên tính đến ngày thi.
                      </li>
                      <li>
                        <strong className="text-slate-900">Diện 3 (+0,50 điểm):</strong> Người dân tộc thiểu số học ít nhất 2/3 thời gian cấp THPT tại các xã ĐBKK, xã biên giới, xã an toàn khu (CT 135), xã ĐBKK vùng bãi ngang ven biển và hải đảo, xã khu vực I, II, III và xã có thôn ĐBKK vùng đồng bào DTTS và miền núi; Thương binh, bệnh binh, người hưởng chính sách như thương binh suy giảm KNLĐ từ 81% trở lên (GDTX); Con của liệt sĩ; con của thương binh, bệnh binh, người hưởng chính sách như thương binh suy giảm KNLĐ từ 81% trở lên.
                      </li>
                    </ul>
                    <div className="text-[10px] text-slate-600 pt-1 border-t border-indigo-200/70 space-y-0.5">
                      <div>
                        <strong>Nguyên tắc:</strong> Thí sinh có nhiều tiêu chuẩn ưu tiên chỉ được hưởng tiêu chuẩn ưu tiên cao nhất.
                      </div>
                      <div>
                        <strong>Căn cứ pháp lý:</strong> Điều 42 Quy chế thi tốt nghiệp THPT (Thông tư số 24/2024/TT-BGDĐT, sửa đổi bổ sung bởi Thông tư số 13/2026/TT-BGDĐT).
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {saveErrorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-800 border border-rose-200">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {saveSuccessMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {isParent ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Phụ huynh chỉ xem, không thể chỉnh sửa điểm</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveToProfile}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu điểm dự kiến vào hồ sơ</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Right Result & Calculation Steps Panel (5 cols on large) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Score Display Box */}
          <div
            className={`rounded-2xl border-2 p-5 shadow-sm space-y-3 transition-colors ${
              calcResult.status === 'pending'
                ? 'border-slate-300 bg-slate-50/70'
                : calcResult.hasDeadPoint
                ? 'border-rose-400 bg-rose-50/70'
                : calcResult.status === 'unqualified'
                ? 'border-rose-300 bg-rose-50/50'
                : calcResult.status === 'at_risk'
                ? 'border-amber-300 bg-amber-50/50'
                : 'border-emerald-400 bg-emerald-50/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                ĐIỂM XÉT TỐT NGHIỆP DỰ KIẾN (ĐXTN)
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                  calcResult.status === 'pending'
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : calcResult.hasDeadPoint
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : calcResult.status === 'unqualified'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : calcResult.status === 'at_risk'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {calcResult.status === 'pending'
                  ? 'CHƯA ĐỦ ĐIỂM DỰ KIẾN'
                  : calcResult.hasDeadPoint
                  ? 'CÓ ĐIỂM LIỆT (≤ 1.0)'
                  : calcResult.status === 'unqualified'
                  ? 'CHƯA ĐẠT (ĐXTN < 5)'
                  : calcResult.status === 'at_risk'
                  ? 'CẬN ĐIỂM CHUẨN'
                  : 'ĐỦ ĐIỀU KIỆN DỰ KIẾN'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl font-black font-mono tracking-tight ${
                  calcResult.status === 'pending'
                    ? 'text-slate-400'
                    : calcResult.hasDeadPoint || calcResult.status === 'unqualified'
                    ? 'text-rose-600'
                    : calcResult.status === 'at_risk'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {calcResult.score !== undefined ? calcResult.score.toFixed(2) : '--'}
              </span>
              <span className="text-sm font-bold text-slate-500">/ 10 điểm</span>
            </div>

            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              {calcResult.reason}
            </p>

            {/* Condition Checklist */}
            <div className="space-y-1.5 border-t border-slate-200/80 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Toán &gt; 1.0 điểm:</span>
                <span className={`font-bold ${isNaN(numMath) ? 'text-slate-400' : numMath > 1.0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isNaN(numMath) ? '- Chưa nhập' : numMath > 1.0 ? `✓ Đạt (${numMath}đ)` : `✗ Điểm liệt (${numMath}đ)`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Ngữ văn &gt; 1.0 điểm:</span>
                <span className={`font-bold ${isNaN(numLit) ? 'text-slate-400' : numLit > 1.0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isNaN(numLit) ? '- Chưa nhập' : numLit > 1.0 ? `✓ Đạt (${numLit}đ)` : `✗ Điểm liệt (${numLit}đ)`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Môn tự chọn 1 ({elective1Name || 'Chưa chọn'}) &gt; 1.0đ:</span>
                <span className={`font-bold ${isNaN(numEl1) ? 'text-slate-400' : numEl1 > 1.0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isNaN(numEl1) ? '- Chưa nhập' : numEl1 > 1.0 ? `✓ Đạt (${numEl1}đ)` : `✗ Điểm liệt (${numEl1}đ)`}
                </span>
              </div>

              {!isForeignLanguageExempt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Môn tự chọn 2 ({elective2Name || 'Chưa chọn'}) &gt; 1.0đ:</span>
                  <span className={`font-bold ${isNaN(numEl2) ? 'text-slate-400' : numEl2 > 1.0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isNaN(numEl2) ? '- Chưa nhập' : numEl2 > 1.0 ? `✓ Đạt (${numEl2}đ)` : `✗ Điểm liệt (${numEl2}đ)`}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-slate-700">Điểm xét tốt nghiệp (ĐXTN) ≥ 5.00:</span>
                <span
                  className={
                    calcResult.score === undefined
                      ? 'text-slate-400'
                      : calcResult.score >= 5.0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }
                >
                  {calcResult.score === undefined
                    ? '- Chưa tính'
                    : calcResult.score >= 5.0
                    ? `✓ Đạt (${calcResult.score.toFixed(2)}đ)`
                    : `✗ Chưa đạt (${calcResult.score.toFixed(2)}đ)`}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Calculation Steps */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 text-xs">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span>CÁC BƯỚC TÍNH TOÁN CHI TIẾT</span>
            </h3>

            <div className="space-y-2.5">
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Bước 1: Điểm trung bình 4 môn thi
                </span>
                <div className="font-mono text-slate-800 font-bold text-[11px]">
                  {calcResult.calculationSteps?.step1 || '--'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Bước 2: ĐTB các năm học (hệ số 1-2-3)
                </span>
                <div className="font-mono text-slate-800 font-bold text-[11px]">
                  {calcResult.calculationSteps?.step2 || '--'}
                </div>
              </div>

              <div className="rounded-xl bg-blue-50/60 p-2.5 border border-blue-200 space-y-1">
                <span className="text-[10px] font-bold text-blue-800 uppercase">
                  Bước 3: Điểm xét tốt nghiệp (ĐXTN)
                </span>
                <div className="font-mono text-blue-950 font-black text-[11px]">
                  {calcResult.calculationSteps?.step3 || '--'}
                </div>
              </div>
            </div>

            {/* Mandatory Disclaimer */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Lưu ý quan trọng:</strong> Đây là công cụ hỗ trợ theo dõi và dự kiến. Kết quả chính thức được xác định theo dữ liệu, quy chế và quyết định của cơ quan có thẩm quyền.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
