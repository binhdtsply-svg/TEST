/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Heart, Clock, UserX, FilePlus, Upload, Search, Check, ChevronDown, User, Users, CheckSquare, Square } from 'lucide-react';
import { TrainingCategory, AttachedFile, Student } from '../../types';
import { studentService } from '../../services/StudentService';
import { trainingService } from '../../services/TrainingService';
import { authService } from '../../services/AuthService';
import { fileStorageService } from '../../services/FileStorageService';
import { submissionService } from '../../services/SubmissionService';
import { inAppNotificationService } from '../../services/InAppNotificationService';
import { classService } from '../../services/ClassService';
import { tenantService } from '../../services/TenantService';

interface QuickReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickReportModal: React.FC<QuickReportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const currentUser = authService.getCurrentUser();
  const students = studentService.getAll();
  const rules = trainingService.getRules();

  // Multi-student selection state - MUST start EMPTY (selectedStudent = null / [])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const [eventDate, setEventDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [eventTime, setEventTime] = useState<string>(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [category, setCategory] = useState<TrainingCategory>('Việc tốt');
  const [reason, setReason] = useState<string>('');
  const [points, setPoints] = useState<number>(10);
  const [parentVisible, setParentVisible] = useState<boolean>(true);
  const [evidenceFiles, setEvidenceFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset all temporary draft state of the form to clean empty state
  const resetDraftState = () => {
    setSelectedStudentIds([]);
    setStudentSearch('');
    setIsComboboxOpen(false);
    setCategory('Việc tốt');
    setReason('');
    setPoints(10);
    setEvidenceFiles([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(false);
    const today = new Date();
    setEventDate(today.toISOString().split('T')[0]);
    setEventTime(new Date().toTimeString().slice(0, 5));
    setParentVisible(true);
  };

  // Extract unique groups from student roster
  const availableGroups = Array.from(new Set(students.map(s => s.group))).filter(Boolean).sort((a, b) => Number(a) - Number(b));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When opening modal, start each session with a clean EMPTY state without pre-selected students or previous draft
  useEffect(() => {
    if (isOpen) {
      resetDraftState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      `tổ ${s.group}`.includes(q)
    );
  });

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(students.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudentIds([]);
  };

  const selectGroupStudents = (groupNum: number | string) => {
    const groupStudentIds = students.filter(s => String(s.group) === String(groupNum)).map(s => s.id);
    const allGroupSelected = groupStudentIds.every(id => selectedStudentIds.includes(id));

    if (allGroupSelected) {
      // Unselect this group
      setSelectedStudentIds(prev => prev.filter(id => !groupStudentIds.includes(id)));
    } else {
      // Add missing students of this group
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...groupStudentIds])));
    }
  };

  const removeSelectedStudent = (studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  };

  const handleCategoryChange = (cat: TrainingCategory) => {
    setCategory(cat);
    setErrorMessage(null);

    if (cat === 'Nghỉ không phép') {
      setPoints(-5);
      setReason('Nghỉ học không phép');
      return;
    }
    if (cat === 'Đi trễ') {
      setPoints(-2);
      setReason('Đi học trễ');
      return;
    }
    if (cat === 'Nghỉ có phép') {
      setPoints(0);
      setReason('Nghỉ học có phép');
      return;
    }
    if (cat === 'Vi phạm nội quy') {
      setPoints(-5);
      setReason('Vi phạm nội quy lớp/trường');
      return;
    }
    if (cat === 'Việc tốt') {
      setPoints(10);
      setReason('Làm việc tốt giúp đỡ bạn bè');
      return;
    }
    if (cat === 'Tiến bộ') {
      setPoints(8);
      setReason('Có tiến bộ tích cực trong học tập');
      return;
    }
    if (cat === 'Khen thưởng') {
      setPoints(15);
      setReason('Đạt thành tích khen thưởng');
      return;
    }

    const matchingRule = rules.find(r => r.category === cat);
    if (matchingRule) {
      setPoints(matchingRule.points);
      setReason(matchingRule.title);
    } else {
      setPoints(0);
      setReason('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const uploaded = await fileStorageService.uploadLocalFile(files[i]);
        setEvidenceFiles(prev => [...prev, uploaded]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedStudentIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một học sinh cần ghi nhận.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập nội dung chi tiết / lý do ghi nhận.');
      return;
    }

    setIsSubmitting(true);
    const isTeacher = currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN';
    const formattedDate = eventDate ? eventDate.split('-').reverse().join('/') : new Date().toLocaleDateString('vi-VN');
    const classSettings = classService.getSettings();
    const currentClassId = classSettings.className || '11A1';
    const currentTenantId = tenantService.getActiveTenantId();

    try {
      // Loop through all selected students and record for each one
      for (const studentId of selectedStudentIds) {
        const targetStudent = students.find(s => s.id === studentId);
        if (!targetStudent) continue;

        if (isTeacher) {
          // 1. GVCN direct record -> approved
          trainingService.addTransaction({
            studentId: targetStudent.id,
            studentName: targetStudent.fullName,
            studentGroup: targetStudent.group,
            classId: currentClassId,
            points: Number(points),
            category,
            reason: reason.trim(),
            proposedByRole: currentUser.role,
            proposedByName: currentUser.name,
            approvedBy: currentUser.name,
            status: 'approved',
            eventDate: formattedDate,
            eventTime: eventTime || undefined,
            evidenceFiles: evidenceFiles.length > 0 ? evidenceFiles : undefined,
            parentVisible
          });
        } else {
          // 2. Student / Class Officer / Parent -> Create submission + notify GVCN Class Admin
          const isViolation =
            Number(points) < 0 ||
            ['Đi trễ', 'Nghỉ không phép', 'Vi phạm nội quy'].includes(category) ||
            category.toLowerCase().includes('vi phạm');

          const submissionType = isViolation ? 'violation' : category === 'Tiến bộ' ? 'progress' : 'good_deed';

          const res = submissionService.createSubmission(
            {
              studentId: targetStudent.id,
              studentName: targetStudent.fullName,
              studentGroup: targetStudent.group,
              submissionType,
              category,
              description: reason.trim(),
              proposedPoints: Number(points),
              eventDate: formattedDate,
              session: 'Sáng',
              evidence: evidenceFiles.length > 0 ? evidenceFiles : undefined,
              parentVisible
            },
            currentUser
          );

          const reportId = res.submission?.id || `qr-${Date.now()}-${targetStudent.id}`;

          trainingService.addTransaction({
            id: reportId,
            studentId: targetStudent.id,
            studentName: targetStudent.fullName,
            studentGroup: targetStudent.group,
            classId: currentClassId,
            points: Number(points),
            category,
            reason: reason.trim(),
            proposedByRole: currentUser.role,
            proposedByName: currentUser.name,
            status: 'pending',
            eventDate: formattedDate,
            eventTime: eventTime || undefined,
            evidenceFiles: evidenceFiles.length > 0 ? evidenceFiles : undefined,
            parentVisible
          } as any);

          // Explicitly trigger QUICK_REPORT_CREATED event and notify GVCN
          inAppNotificationService.notifyQuickReportCreated(
            {
              id: reportId,
              studentId: targetStudent.id,
              studentName: targetStudent.fullName,
              studentGroup: targetStudent.group,
              category,
              reason: reason.trim(),
              points: Number(points),
              classId: currentClassId,
              tenantId: currentTenantId,
              isViolation
            },
            currentUser
          );
        }
      }

      if (selectedStudentIds.length === 1) {
        const singleStudent = students.find(s => s.id === selectedStudentIds[0]);
        setSuccessMessage(
          isTeacher
            ? `Đã ghi nhận thành công cho em ${singleStudent?.fullName || 'học sinh'}!`
            : `Đã gửi báo cáo cho GVCN xét duyệt thành công!`
        );
      } else {
        setSuccessMessage(
          isTeacher
            ? `Đã ghi nhận thành công cho ${selectedStudentIds.length} học sinh!`
            : `Đã gửi báo cáo cho ${selectedStudentIds.length} học sinh tới GVCN xét duyệt!`
        );
      }

      if (onSuccess) onSuccess();
      setTimeout(() => {
        // Clear all temporary form draft data from memory after SUCCESSFUL save
        resetDraftState();
        onClose();
      }, 700);
    } catch (err: any) {
      // ON FAILURE: DO NOT CLEAR DRAFT! Preserve user's inputs
      setIsSubmitting(false);
      setErrorMessage(`Lỗi ghi nhận: ${err?.message || 'Vui lòng thử lại.'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-xs">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">⚡ BÁO CÁO NHANH</h3>
              <p className="text-xs text-slate-500">
                {currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN'
                  ? 'Ghi nhận và duyệt trực tiếp vào hệ thống (Hỗ trợ chọn nhiều học sinh)'
                  : 'Gửi đề xuất lên Giáo viên chủ nhiệm duyệt'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200 animate-fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Multi-Student Selector with Quick Filters & Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Chọn Học viên ghi nhận <span className="text-rose-500">*</span>
                <span className="ml-2 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Đã chọn: {selectedStudentIds.length} / {students.length} học viên
                </span>
              </label>

              {/* Fast Select All / Deselect All */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllStudents}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllStudents}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Quick Group Selector Badges */}
            {availableGroups.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <span className="text-[11px] font-medium text-slate-500">Chọn nhanh theo tổ:</span>
                {availableGroups.map((grp) => {
                  const grpIds = students.filter(s => String(s.group) === String(grp)).map(s => s.id);
                  const isAllGrpSelected = grpIds.length > 0 && grpIds.every(id => selectedStudentIds.includes(id));
                  const isPartGrpSelected = !isAllGrpSelected && grpIds.some(id => selectedStudentIds.includes(id));

                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => selectGroupStudents(grp)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        isAllGrpSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : isPartGrpSelected
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Tổ {grp} ({grpIds.length} HS)
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Student Chips / Tags Preview */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-28 overflow-y-auto">
                {selectedStudents.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 bg-white text-slate-800 text-[11px] font-semibold pl-1.5 pr-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs group"
                  >
                    <img src={s.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                    <span>{s.fullName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({s.code})</span>
                    <span className="text-[10px] text-slate-500">T{s.group}</span>
                    <button
                      type="button"
                      onClick={(e) => removeSelectedStudent(s.id, e)}
                      className="ml-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Bỏ chọn học sinh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Combobox Dropdown Trigger */}
            <div className="relative" ref={comboboxRef}>
              <div
                onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                className="flex items-center justify-between w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 cursor-pointer shadow-2xs hover:border-blue-400"
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  {selectedStudentIds.length === 0 ? (
                    <span className="text-slate-400">Bấm để tìm và chọn một hoặc nhiều học sinh...</span>
                  ) : selectedStudentIds.length === 1 ? (
                    <span className="font-semibold text-slate-800">
                      1 học sinh: {selectedStudents[0]?.fullName} ({selectedStudents[0]?.code})
                    </span>
                  ) : (
                    <span className="font-semibold text-blue-700">
                      Đã chọn {selectedStudentIds.length} học sinh ({selectedStudents.slice(0, 3).map(s => s.fullName).join(', ')}{selectedStudentIds.length > 3 ? '...' : ''})
                    </span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isComboboxOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu with Search & Multi-Checkboxes */}
              {isComboboxOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2.5 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Gõ tìm tên, mã HS (HV...), tổ..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s) => {
                        const isSelected = selectedStudentIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleStudentSelection(s.id)}
                            className={`flex items-center justify-between p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/90 text-blue-900 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="text-blue-600 shrink-0">
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Square className="h-4 w-4 text-slate-300" />
                                )}
                              </div>
                              <img src={s.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                              <div className="truncate text-xs">
                                <span className="font-semibold">{s.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono ml-1.5">{s.code}</span>
                                <span className="ml-1 text-[10px] text-slate-500">· Tổ {s.group}</span>
                                {s.officerRole && (
                                  <span className="ml-1.5 rounded-md bg-amber-50 text-amber-700 px-1 py-0.2 text-[9px] font-bold">
                                    ⭐ {s.officerRole}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Không tìm thấy học sinh phù hợp
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date and Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ngày xảy ra <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Giờ ghi nhận
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Category Badges */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chuyên mục ghi nhận <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['Việc tốt', 'Tiến bộ', 'Khen thưởng', 'Đi trễ', 'Nghỉ có phép', 'Nghỉ không phép', 'Vi phạm nội quy', 'Khác'] as TrainingCategory[]).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium transition-all ${
                    category === cat
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'Việc tốt' && <Heart className="h-3.5 w-3.5 text-emerald-500" />}
                  {cat === 'Tiến bộ' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                  {cat === 'Đi trễ' && <Clock className="h-3.5 w-3.5 text-amber-500" />}
                  {cat.includes('Nghỉ') && <UserX className="h-3.5 w-3.5 text-indigo-500" />}
                  {cat.includes('Vi phạm') && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                  <span>{cat === 'Nghỉ không phép' ? 'Nghỉ học không phép' : cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reason & Points */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nội dung chi tiết / Lý do <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Đi học muộn, Không mặc đúng đồng phục..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số điểm
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className={`w-full rounded-xl border px-3.5 py-2 text-sm font-bold outline-hidden ${
                  points > 0 ? 'border-emerald-300 text-emerald-600 bg-emerald-50/50' : points < 0 ? 'border-rose-300 text-rose-600 bg-rose-50/50' : 'border-slate-300 text-slate-700 bg-white'
                }`}
              />
            </div>
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Đính kèm minh chứng (Ảnh, Biên bản, File xác nhận)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                <Upload className="h-4 w-4 text-slate-500" />
                <span>{isUploading ? 'Đang tải lên...' : 'Chọn tệp đính kèm'}</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
              </label>
              <span className="text-xs text-slate-400">Đã chọn {evidenceFiles.length} tệp</span>
            </div>

            {evidenceFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {evidenceFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceFiles(prev => prev.filter(f => f.id !== file.id))}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parent Visibility */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="parentVisibleCheck"
              checked={parentVisible}
              onChange={(e) => setParentVisible(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="parentVisibleCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
              Hiển thị thông tin này trên hồ sơ Phụ huynh xem được
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 font-medium">
              Sẽ ghi nhận cho: <strong className="text-blue-600">{selectedStudentIds.length} học sinh</strong>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedStudentIds.length === 0 || !reason.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {selectedStudentIds.length === 0
                        ? 'Chưa chọn học viên'
                        : !reason.trim()
                        ? 'Chưa nhập nội dung'
                        : currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN'
                        ? selectedStudentIds.length > 1
                          ? `Ghi nhận cho ${selectedStudentIds.length} học sinh`
                          : 'Ghi nhận ngay'
                        : 'Gửi đề xuất GVCN'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
