/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  Save,
  X,
  UserCheck,
  Tag,
  BookOpen,
  Sparkles,
  RotateCcw,
  MessageSquare,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  PhoneCall,
  Check,
  Scale,
  Settings as SettingsIcon
} from 'lucide-react';
import { Student, ViolationHandlingRecord, ViolationHandlingStatus } from '../../types';
import { studentService } from '../../services/StudentService';
import { trainingService } from '../../services/TrainingService';
import { classService } from '../../services/ClassService';
import { exportService } from '../../services/ExportService';
import { classAnalyticsAndAlertService } from '../../services/ClassAnalyticsAndAlertService';
import { schoolWeekService } from '../../services/SchoolWeekService';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

const VIOLATION_CATEGORIES_LIST = [
  'Nề nếp & Tác phong',
  'Chuyên cần / Đi muộn / Vắng học',
  'Học tập / Không thuộc bài / Thiếu bài tập',
  'Kỷ luật / Làm việc riêng / Mất trật tự',
  'Sử dụng điện thoại / Thiết bị trái phép',
  'Đạo đức / Ứng xử / Bất kính',
  'Bảo vệ tài sản / Vệ sinh chung',
  'Khác'
];

const SEVERITY_LIST = ['Nhẹ', 'Vừa', 'Nặng', 'Nghiêm trọng'];

const STATUS_CONFIG: Record<ViolationHandlingStatus, { label: string; bg: string; text: string; border: string; icon: any }> = {
  WARNING: {
    label: 'Cảnh báo',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertTriangle
  },
  PROCESSING: {
    label: 'Đang xử lý',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock
  },
  RESOLVED: {
    label: 'Đã ổn định',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2
  }
};

interface ViolationHandlingTableProps {
  students: Student[];
  onOpenProfile: (student: Student) => void;
  onOpenEdit: (student: Student) => void;
}

export const ViolationHandlingTable: React.FC<ViolationHandlingTableProps> = ({
  students,
  onOpenProfile,
  onOpenEdit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ViolationHandlingStatus>('ALL');
  const [selectedStudentForRecord, setSelectedStudentForRecord] = useState<Student | null>(null);
  const [editingRecord, setEditingRecord] = useState<ViolationHandlingRecord | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form "+ Thêm học viên vi phạm"
  const [isAddTrackingModalOpen, setIsAddTrackingModalOpen] = useState(false);
  const [addTrackingStudentId, setAddTrackingStudentId] = useState('');
  const [addTrackingReasonPreset, setAddTrackingReasonPreset] = useState('Vi phạm lặp lại qua nhiều tuần');
  const [addTrackingReasonDetail, setAddTrackingReasonDetail] = useState('');
  const [addTrackingNotes, setAddTrackingNotes] = useState('');
  const [addTrackingError, setAddTrackingError] = useState<string | null>(null);
  const [addTrackingSuccess, setAddTrackingSuccess] = useState<string | null>(null);
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);

  // Ngưỡng cảnh báo vi phạm do GVCN cấu hình
  const [warningThreshold, setWarningThreshold] = useState<number>(() => classService.getViolationWarningThreshold());
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [newThresholdInput, setNewThresholdInput] = useState<number>(() => classService.getViolationWarningThreshold());
  const [thresholdSaveSuccess, setThresholdSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsub = classService.subscribe(() => {
      const cur = classService.getViolationWarningThreshold();
      setWarningThreshold(cur);
      setNewThresholdInput(cur);
    });
    return unsub;
  }, []);

  // Form State for Record
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formRecordedBy, setFormRecordedBy] = useState('Giáo viên chủ nhiệm');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('Nề nếp & Tác phong');
  const [formSeverity, setFormSeverity] = useState('Vừa');
  const [formFrequency, setFormFrequency] = useState<number>(1);
  const [formEducationalMeasure, setFormEducationalMeasure] = useState('');
  const [formStudentExchange, setFormStudentExchange] = useState('');
  const [formParentCoordination, setFormParentCoordination] = useState('');
  const [formHandlingResult, setFormHandlingResult] = useState('');
  const [formStatus, setFormStatus] = useState<ViolationHandlingStatus>('PROCESSING');
  const [formTeacherNotes, setFormTeacherNotes] = useState('');
  const [formSaveSuccess, setFormSaveSuccess] = useState<string | null>(null);
  const [formSaveError, setFormSaveError] = useState<string | null>(null);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);
  const [deleteToastMessage, setDeleteToastMessage] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<{
    studentId: string;
    studentName: string;
    recordId: string;
    content: string;
  } | null>(null);

  // History expansion state
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(new Set());

  // Aggregate student violation data (Phân tách rõ: "Theo dõi & xử lí vi phạm" chỉ là hồ sơ GVCN đưa vào diện theo dõi)
  const allTransactions = trainingService.getAllTransactions().filter(t => t.status === 'approved' && t.points < 0);

  const studentViolationData = useMemo(() => {
    let currentWeekNum = 1;
    let currentWeekAlertIds = new Set<string>();
    try {
      const weekInfo = classAnalyticsAndAlertService.getCurrentWeekInfo();
      currentWeekNum = weekInfo.currentWeekNum;
      const specialCases = classAnalyticsAndAlertService.getSpecialCaseStudents(currentWeekNum);
      currentWeekAlertIds = new Set(specialCases.map(sc => sc.studentId));
    } catch {
      // Fallback if service not ready
    }

    return students.map(student => {
      const records = student.violationHandlingRecords || [];
      const txs = allTransactions.filter(t => t.studentId === student.id);
      
      // TỔNG SỐ LƯỢT VI PHẠM TRONG NĂM HỌC (Bảo toàn 100% lịch sử từ Rèn luyện & Kỷ luật, không bao giờ bị xóa/giảm khi đổi threshold)
      const totalViolationsCount = txs.length + records.reduce((sum, r) => sum + (r.frequencyCount || 1), 0);
      const latestRecord = records[0] || null;
      const latestTx = txs[0] || null;

      const hasCurrentWeekAlert = currentWeekAlertIds.has(student.id);
      const currentWeekRecord = records.find(r => r.weekNumber === currentWeekNum) || null;

      // Học viên chỉ thuộc diện "Theo dõi & xử lí vi phạm" khi đã được GVCN chủ động tạo hồ sơ theo dõi
      const isUnderTracking = Array.isArray(records) && records.length > 0;

      // Trạng thái xử lý theo hồ sơ của GVCN:
      let activeStatus: ViolationHandlingStatus = 'RESOLVED';
      if (isUnderTracking) {
        if (currentWeekRecord) {
          activeStatus = currentWeekRecord.status;
        } else if (latestRecord) {
          activeStatus = latestRecord.status;
        } else {
          activeStatus = 'PROCESSING';
        }
      }

      const isRepeatViolation = isUnderTracking && hasCurrentWeekAlert && (!currentWeekRecord || currentWeekRecord.status === 'WARNING');
      const resolvedRecordsCount = records.filter(r => r.status === 'RESOLVED').length;
      const unhandledRecordsCount = records.filter(r => r.status !== 'RESOLVED').length;

      return {
        student,
        records,
        txs,
        totalViolationsCount,
        resolvedRecordsCount,
        unhandledRecordsCount,
        latestRecord,
        latestTx,
        activeStatus,
        hasCurrentWeekAlert,
        isRepeatViolation,
        isUnderTracking,
        hasActivity: isUnderTracking
      };
    }).filter(item => {
      // 1. Mặc định: CHỈ hiển thị danh sách các học viên được GVCN đưa vào diện theo dõi (có hồ sơ xử lý)
      // Không tự chuyển tất cả vi phạm vào đây. Cảnh báo chỉ là tín hiệu dữ liệu, không tự động tạo hồ sơ theo dõi.
      if (!searchQuery.trim()) {
        return item.isUnderTracking;
      }
      // 2. Khi tìm kiếm: Cho phép tìm kiếm toàn bộ học viên để GVCN có thể xem xét và lập hồ sơ đưa vào diện theo dõi
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.student.fullName.toLowerCase().includes(q);
      const matchCode = item.student.code.toLowerCase().includes(q);
      const matchGroup = `tổ ${item.student.group}`.toLowerCase().includes(q);
      const matchContent = item.records.some(r => r.content.toLowerCase().includes(q) || r.educationalMeasure?.toLowerCase().includes(q));
      return matchName || matchCode || matchGroup || matchContent;
    });
  }, [students, allTransactions, searchQuery, warningThreshold]);

  // Single source of truth alias ensuring studentViolations is always defined
  const studentViolations = studentViolationData;

  // Filtered students
  const filteredData = useMemo(() => {
    return studentViolationData.filter(item => {
      if (statusFilter !== 'ALL' && item.activeStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [studentViolationData, statusFilter]);

  // Top Metrics (Chỉ tính trên học viên đã được đưa vào diện theo dõi)
  const metrics = useMemo(() => {
    const trackedList = students
      .map(student => {
        const records = student.violationHandlingRecords || [];
        if (!records || records.length === 0) return null;
        let currentWeekNum = 1;
        try {
          currentWeekNum = classAnalyticsAndAlertService.getCurrentWeekInfo().currentWeekNum;
        } catch {}
        const currentWeekRecord = records.find(r => r.weekNumber === currentWeekNum) || null;
        const latestRecord = records[0];
        const activeStatus: ViolationHandlingStatus = currentWeekRecord ? currentWeekRecord.status : (latestRecord ? latestRecord.status : 'PROCESSING');
        return { student, activeStatus };
      })
      .filter(Boolean) as Array<{ student: Student; activeStatus: ViolationHandlingStatus }>;

    const totalTracked = trackedList.length;
    const warningCount = trackedList.filter(s => s.activeStatus === 'WARNING').length;
    const processingCount = trackedList.filter(s => s.activeStatus === 'PROCESSING').length;
    const resolvedCount = trackedList.filter(s => s.activeStatus === 'RESOLVED').length;
    return { totalTracked, warningCount, processingCount, resolvedCount };
  }, [students]);

  // Học viên được chọn trong Form "+ Thêm học viên vi phạm"
  const selectedStudentForTracking = useMemo(() => {
    return students.find(s => s.id === addTrackingStudentId) || null;
  }, [students, addTrackingStudentId]);

  // Chống duplicate: Kiểm tra học viên đã có hồ sơ theo dõi đang hoạt động chưa
  const isAlreadyTracked = useMemo(() => {
    if (!selectedStudentForTracking) return false;
    const records = selectedStudentForTracking.violationHandlingRecords || [];
    return records.length > 0;
  }, [selectedStudentForTracking]);

  const existingActiveRecord = useMemo(() => {
    if (!selectedStudentForTracking) return null;
    return selectedStudentForTracking.violationHandlingRecords?.[0] || null;
  }, [selectedStudentForTracking]);

  // Thông tin vi phạm hỗ trợ tham khảo từ "Rèn luyện & Kỷ luật" (Chỉ tham chiếu, không di chuyển/sao chép/xóa vi phạm gốc)
  const trackingRefViolations = useMemo(() => {
    if (!selectedStudentForTracking) return { count: 0, weeks: [] as string[], categories: [] as string[], recentSummary: '' };
    const txs = allTransactions.filter(t => t.studentId === selectedStudentForTracking.id);

    const weeks = Array.from(new Set(
      txs.map(t => {
        try {
          const d = t.eventDate || t.createdAt;
          if (d) {
            const info = schoolWeekService.getWeekInfoForDate(new Date(d));
            if (info && info.weekNumber) return `Tuần ${info.weekNumber}`;
          }
        } catch {}
        return null;
      }).filter(Boolean) as string[]
    ));

    const categories = Array.from(new Set(
      txs.map(t => t.category || 'Nề nếp').filter(Boolean)
    ));

    const recentSummary = txs.slice(0, 3).map(t => `${t.reason || t.category} (${t.eventDate || t.createdAt || 'N/A'})`).join('; ');

    return {
      count: txs.length,
      weeks,
      categories,
      recentSummary
    };
  }, [selectedStudentForTracking, allTransactions]);

  const handleOpenAddTrackingStudentModal = (preselectedStudentId?: string) => {
    setAddTrackingStudentId(preselectedStudentId || '');
    setAddTrackingReasonPreset('Vi phạm lặp lại qua nhiều tuần');
    setAddTrackingReasonDetail('');
    setAddTrackingNotes('');
    setAddTrackingError(null);
    setAddTrackingSuccess(null);
    setIsSubmittingTracking(false);
    setIsAddTrackingModalOpen(true);
  };

  const handleSaveAddTrackingStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForTracking) {
      setAddTrackingError('Vui lòng chọn học viên cần đưa vào diện theo dõi.');
      return;
    }

    // Chống duplicate: Nếu học viên đã có hồ sơ theo dõi đang hoạt động
    if (isAlreadyTracked) {
      setAddTrackingError('Học viên này đã có hồ sơ theo dõi. Vui lòng mở hồ sơ hiện có để cập nhật.');
      return;
    }

    const finalReason = addTrackingReasonPreset === 'Khác'
      ? addTrackingReasonDetail.trim()
      : addTrackingReasonDetail.trim()
      ? `${addTrackingReasonPreset}: ${addTrackingReasonDetail.trim()}`
      : addTrackingReasonPreset;

    if (!finalReason.trim()) {
      setAddTrackingError('Vui lòng nhập lý do đưa học viên vào diện theo dõi.');
      return;
    }

    if (isSubmittingTracking) return;
    setIsSubmittingTracking(true);
    setAddTrackingError(null);

    let currentWeekNum = 1;
    try {
      currentWeekNum = classAnalyticsAndAlertService.getCurrentWeekInfo().currentWeekNum;
    } catch {}

    const recentCategory = trackingRefViolations.categories[0] || 'Nề nếp & Tác phong';
    const cSettings = classService.getSettings();

    try {
      // PERSISTENCE THẬT: Lưu hồ sơ theo dõi độc lập, giữ nguyên vi phạm gốc tại Rèn luyện & Kỷ luật
      const ok = studentService.addViolationHandlingRecord(selectedStudentForTracking.id, {
        studentId: selectedStudentForTracking.id,
        studentName: selectedStudentForTracking.fullName,
        classId: selectedStudentForTracking.classId || cSettings?.className || '11A1',
        className: cSettings?.className || '11A1',
        tenantId: (selectedStudentForTracking as any).tenantId,
        schoolYear: cSettings?.schoolYear || '2025 - 2026',
        academicYear: cSettings?.academicYear || '2025 - 2026',
        date: new Date().toISOString().split('T')[0],
        weekNumber: currentWeekNum,
        content: finalReason.trim(),
        category: recentCategory,
        severity: 'Vừa',
        frequencyCount: 1,
        status: 'PROCESSING', // Bắt đầu theo dõi: Đang xử lý
        teacherNotes: addTrackingNotes.trim() || undefined,
        recordedBy: 'Giáo viên chủ nhiệm'
      });

      if (ok) {
        setAddTrackingSuccess(`Đã thêm học viên ${selectedStudentForTracking.fullName} vào diện theo dõi & xử lý vi phạm thành công!`);
        setTimeout(() => {
          setIsAddTrackingModalOpen(false);
          setAddTrackingSuccess(null);
          setIsSubmittingTracking(false);
        }, 900);
      } else {
        setAddTrackingError('Không thể lưu hồ sơ theo dõi vào hệ thống. Vui lòng thử lại.');
        setIsSubmittingTracking(false);
      }
    } catch (err: any) {
      setAddTrackingError(err?.message || 'Có lỗi xảy ra khi lưu hồ sơ theo dõi.');
      setIsSubmittingTracking(false);
    }
  };

  const handleOpenAddRecord = (student: Student) => {
    setSelectedStudentForRecord(student);
    setEditingRecord(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime(new Date().toTimeString().slice(0, 5));
    setFormRecordedBy('Giáo viên chủ nhiệm');
    setFormContent('');
    setFormCategory('Nề nếp & Tác phong');
    setFormSeverity('Vừa');
    setFormFrequency(1);
    setFormEducationalMeasure('');
    setFormStudentExchange('');
    setFormParentCoordination('');
    setFormHandlingResult('');
    setFormStatus('PROCESSING');
    setFormTeacherNotes('');
    setFormSaveSuccess(null);
    setIsRecordModalOpen(true);
  };

  const handleOpenEditRecord = (student: Student, record: ViolationHandlingRecord) => {
    setSelectedStudentForRecord(student);
    setEditingRecord(record);
    setFormDate(record.date || new Date().toISOString().split('T')[0]);
    setFormTime(record.time || '');
    setFormRecordedBy(record.recordedBy || 'Giáo viên chủ nhiệm');
    setFormContent(record.content || '');
    setFormCategory(record.category || 'Nề nếp & Tác phong');
    setFormSeverity(record.severity || 'Vừa');
    setFormFrequency(record.frequencyCount || 1);
    setFormEducationalMeasure(record.educationalMeasure || '');
    setFormStudentExchange(record.studentExchangeNotes || '');
    setFormParentCoordination(record.parentCoordinationNotes || '');
    setFormHandlingResult(record.handlingResult || '');
    setFormStatus(record.status || 'PROCESSING');
    setFormTeacherNotes(record.teacherNotes || '');
    setFormSaveSuccess(null);
    setIsRecordModalOpen(true);
  };

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.max(1, Math.floor(newThresholdInput || 2));
    await classService.setViolationWarningThreshold(val);
    setWarningThreshold(val);
    setThresholdSaveSuccess(`Đã cập nhật ngưỡng cảnh báo: ≥ ${val} lượt vi phạm!`);
    setTimeout(() => {
      setIsThresholdModalOpen(false);
      setThresholdSaveSuccess(null);
    }, 900);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForRecord || !formContent.trim()) return;
    if (isSubmittingRecord) return; // Prevent double click duplicates

    setIsSubmittingRecord(true);
    setFormSaveError(null);

    let currentWeekNum = 1;
    try {
      currentWeekNum = classAnalyticsAndAlertService.getCurrentWeekInfo().currentWeekNum;
    } catch {}

    try {
      if (editingRecord) {
        const ok = studentService.updateViolationHandlingRecord(
          selectedStudentForRecord.id,
          editingRecord.id,
          {
            date: formDate,
            time: formTime.trim() || undefined,
            recordedBy: formRecordedBy.trim() || undefined,
            weekNumber: editingRecord.weekNumber || currentWeekNum,
            content: formContent.trim(),
            category: formCategory,
            severity: formSeverity,
            frequencyCount: formFrequency,
            educationalMeasure: formEducationalMeasure.trim() || undefined,
            studentExchangeNotes: formStudentExchange.trim() || undefined,
            parentCoordinationNotes: formParentCoordination.trim() || undefined,
            handlingResult: formHandlingResult.trim() || undefined,
            status: formStatus,
            teacherNotes: formTeacherNotes.trim() || undefined
          }
        );
        if (ok) {
          setFormSaveSuccess('Đã cập nhật tiến trình xử lý vi phạm thành công!');
          setTimeout(() => {
            setIsRecordModalOpen(false);
            setFormSaveSuccess(null);
            setIsSubmittingRecord(false);
          }, 800);
        } else {
          setFormSaveError('Không thể cập nhật hồ sơ vi phạm. Vui lòng thử lại.');
          setIsSubmittingRecord(false);
        }
      } else {
        const ok = studentService.addViolationHandlingRecord(selectedStudentForRecord.id, {
          studentId: selectedStudentForRecord.id,
          studentName: selectedStudentForRecord.fullName,
          date: formDate,
          time: formTime.trim() || undefined,
          recordedBy: formRecordedBy.trim() || 'Giáo viên chủ nhiệm',
          weekNumber: currentWeekNum,
          content: formContent.trim(),
          category: formCategory,
          severity: formSeverity,
          frequencyCount: formFrequency,
          educationalMeasure: formEducationalMeasure.trim() || undefined,
          studentExchangeNotes: formStudentExchange.trim() || undefined,
          parentCoordinationNotes: formParentCoordination.trim() || undefined,
          handlingResult: formHandlingResult.trim() || undefined,
          status: formStatus,
          teacherNotes: formTeacherNotes.trim() || undefined
        });
        if (ok) {
          setFormSaveSuccess('Đã ghi nhận hồ sơ theo dõi & xử lý vi phạm thành công!');
          setTimeout(() => {
            setIsRecordModalOpen(false);
            setFormSaveSuccess(null);
            setIsSubmittingRecord(false);
          }, 800);
        } else {
          setFormSaveError('Không thể lưu hồ sơ vi phạm. Vui lòng thử lại.');
          setIsSubmittingRecord(false);
        }
      }
    } catch (err: any) {
      setFormSaveError(err?.message || 'Có lỗi xảy ra khi lưu hồ sơ vi phạm.');
      setIsSubmittingRecord(false);
    }
  };

  const handleQuickUpdateStatus = (student: Student, newStatus: ViolationHandlingStatus) => {
    let currentWeekNum = 1;
    try {
      currentWeekNum = classAnalyticsAndAlertService.getCurrentWeekInfo().currentWeekNum;
    } catch {}

    const records = student.violationHandlingRecords || [];
    const targetRecord = records.find(r => r.weekNumber === currentWeekNum) || records[0];

    if (targetRecord) {
      studentService.updateViolationHandlingRecord(
        student.id,
        targetRecord.id,
        {
          status: newStatus,
          handlingResult:
            newStatus === 'RESOLVED'
              ? (targetRecord.handlingResult || 'Đã ổn định nề nếp theo xác nhận của GVCN')
              : targetRecord.handlingResult
        },
        newStatus === 'RESOLVED' ? 'GVCN xác nhận đã ổn định nề nếp' : 'GVCN chuyển sang Đang xử lý'
      );
    } else {
      studentService.addViolationHandlingRecord(student.id, {
        studentId: student.id,
        studentName: student.fullName,
        date: new Date().toISOString().split('T')[0],
        weekNumber: currentWeekNum,
        content: newStatus === 'RESOLVED' ? 'Xác nhận nề nếp ổn định' : 'Tiếp nhận xử lý vi phạm nề nếp',
        category: 'Nề nếp & Tác phong',
        severity: 'Vừa',
        frequencyCount: 1,
        status: newStatus,
        handlingResult: newStatus === 'RESOLVED' ? 'Đã ổn định nề nếp theo xác nhận của GVCN' : 'Đang xử lý nề nếp'
      });
    }
  };

  const toggleExpand = (studentId: string) => {
    setExpandedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleConfirmDeleteRecord = () => {
    if (!recordToDelete) return;
    const ok = studentService.deleteViolationHandlingRecord(recordToDelete.studentId, recordToDelete.recordId);
    if (ok) {
      setDeleteToastMessage(`Đã xóa vĩnh viễn bản ghi vi phạm [${recordToDelete.recordId}] của học viên ${recordToDelete.studentName}.`);
      setTimeout(() => setDeleteToastMessage(null), 3500);
    }
    setRecordToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Thông báo xóa thành công */}
      {deleteToastMessage && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between text-xs font-bold text-emerald-900 shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{deleteToastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteToastMessage(null)}
            className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. TOP METRICS DASHBOARD CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Hồ sơ theo dõi</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Scale className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{metrics.totalTracked}</span>
            <span className="text-xs text-slate-500">học viên</span>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase">Cảnh báo</span>
            <span className="p-1.5 rounded-lg bg-rose-200 text-rose-800">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-950">{metrics.warningCount}</span>
            <span className="text-xs text-rose-700 font-semibold">cần chú ý</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase">Đang xử lý</span>
            <span className="p-1.5 rounded-lg bg-amber-200 text-amber-800">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-950">{metrics.processingCount}</span>
            <span className="text-xs text-amber-700 font-semibold">đang theo dõi</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">Đã ổn định</span>
            <span className="p-1.5 rounded-lg bg-emerald-200 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-950">{metrics.resolvedCount}</span>
            <span className="text-xs text-emerald-700 font-semibold">tiến bộ tốt</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({metrics.totalTracked})
          </button>
          <button
            onClick={() => setStatusFilter('WARNING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'WARNING'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Cảnh báo ({metrics.warningCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('PROCESSING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PROCESSING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Đang xử lý ({metrics.processingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Đã ổn định ({metrics.resolvedCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Nút + Thêm học viên vi phạm */}
          <button
            type="button"
            onClick={() => handleOpenAddTrackingStudentModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Chủ động thêm học viên vào diện theo dõi & xử lý vi phạm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Thêm học viên vi phạm</span>
          </button>

          {/* Quick Warning Threshold Setting */}
          <button
            type="button"
            onClick={() => {
              setNewThresholdInput(warningThreshold);
              setIsThresholdModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Nhấp để cấu hình số lượt vi phạm kích hoạt Cảnh báo"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Ngưỡng cảnh báo:</span>
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md font-black text-[11px]">
              ≥ {warningThreshold} lượt
            </span>
            <SettingsIcon className="h-3 w-3 text-indigo-400 ml-0.5" />
          </button>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm học viên, nội dung vi phạm..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 3. VIOLATION TRACKING & HANDLING TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              {searchQuery.trim() ? 'Không tìm thấy học viên phù hợp' : 'Chưa có học viên nào trong diện theo dõi & xử lý'}
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery.trim()
                ? 'Thử tìm với tên hoặc mã học viên khác.'
                : 'Mục này chỉ quản lý danh sách hồ sơ học viên được GVCN đưa vào diện theo dõi. Toàn bộ vi phạm nề nếp hàng ngày được lưu giữ đầy đủ tại "Rèn luyện & Kỷ luật".'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">Học viên</th>
                  <th className="p-3.5 text-center">Lượt vi phạm cả năm</th>
                  <th className="p-3.5">Nội dung & Ngày gần nhất</th>
                  <th className="p-3.5">Biện pháp giáo dục / Xử lý</th>
                  <th className="p-3.5">Trao đổi HS & Phối hợp PH</th>
                  <th className="p-3.5 text-center">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map(({ student, records, txs, totalViolationsCount, resolvedRecordsCount, unhandledRecordsCount, latestRecord, latestTx, activeStatus, isRepeatViolation, isUnderTracking }) => {
                  const statusInfo = STATUS_CONFIG[activeStatus];
                  const StatusIcon = statusInfo.icon;
                  const isExpanded = expandedStudentIds.has(student.id);

                  return (
                    <React.Fragment key={student.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        {/* Student Name & Avatar */}
                        <td className="p-3.5 align-top">
                          <div
                            onClick={() => onOpenProfile(student)}
                            className="flex items-center gap-2.5 cursor-pointer group"
                          >
                            <img
                              src={student.avatar}
                              alt={student.fullName}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200 group-hover:scale-105 transition-transform"
                            />
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                <span>{student.fullName}</span>
                                {student.needsSpecialAttention && (
                                  <span className="text-[10px] px-1 py-0.2 bg-rose-100 text-rose-800 rounded font-black">
                                    ❤️ Quan tâm
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {student.code} • Tổ {student.group}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Violation Count Badge (Bảo toàn số lượt vi phạm trong năm học) */}
                        <td className="p-3.5 align-top text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-black text-xs ${
                                totalViolationsCount >= warningThreshold
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : totalViolationsCount > 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {totalViolationsCount} lượt
                            </span>
                            {totalViolationsCount >= warningThreshold && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                ≥ Ngưỡng ({warningThreshold})
                              </span>
                            )}
                            {records.length > 0 && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                <span className="text-emerald-700 font-semibold">{resolvedRecordsCount} đã xử lý</span>
                                {unhandledRecordsCount > 0 && (
                                  <span className="text-amber-700 font-semibold ml-1">• {unhandledRecordsCount} chờ</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Latest Violation Content & Date */}
                        <td className="p-3.5 align-top max-w-xs">
                          {latestRecord ? (
                            <div>
                              <div className="font-bold text-slate-800 line-clamp-1">{latestRecord.content}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{latestRecord.date}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-amber-700">{latestRecord.category}</span>
                              </div>
                            </div>
                          ) : latestTx ? (
                            <div>
                              <div className="font-bold text-slate-800 line-clamp-1">{latestTx.reason || latestTx.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{latestTx.createdAt || latestTx.date}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-slate-600">{latestTx.category || 'Nề nếp'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có ghi nhận</span>
                          )}
                        </td>

                        {/* Educational Measure */}
                        <td className="p-3.5 align-top max-w-xs">
                          {latestRecord?.educationalMeasure ? (
                            <div className="text-slate-700 font-medium line-clamp-2">
                              {latestRecord.educationalMeasure}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa ghi nhận biện pháp</span>
                          )}
                        </td>

                        {/* Student Exchange & Parent Coordination */}
                        <td className="p-3.5 align-top max-w-xs space-y-1">
                          {latestRecord?.studentExchangeNotes && (
                            <div className="text-[11px] text-slate-600 line-clamp-1 flex items-center gap-1">
                              <UserCheck className="h-3 w-3 text-blue-500 shrink-0" />
                              <span>HS: {latestRecord.studentExchangeNotes}</span>
                            </div>
                          )}
                          {latestRecord?.parentCoordinationNotes && (
                            <div className="text-[11px] text-slate-600 line-clamp-1 flex items-center gap-1">
                              <PhoneCall className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span>PH: {latestRecord.parentCoordinationNotes}</span>
                            </div>
                          )}
                          {!latestRecord?.studentExchangeNotes && !latestRecord?.parentCoordinationNotes && (
                            <span className="text-slate-400 italic">Chưa có ghi chép trao đổi</span>
                          )}
                        </td>

                        {/* Status Badge & Quick Status Action */}
                        <td className="p-3.5 align-top text-center">
                          {!isUnderTracking ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-slate-100 text-slate-600 border-slate-200">
                                <span>Chưa theo dõi</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenAddTrackingStudentModal(student.id)}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                                title="Lập hồ sơ đưa học viên vào diện theo dõi"
                              >
                                + Đưa vào theo dõi
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                <span>{statusInfo.label}</span>
                              </span>

                              {isRepeatViolation && (
                                <span className="text-[10px] text-orange-800 font-bold bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  <span>⚠️ Tái vi phạm</span>
                                </span>
                              )}

                              {activeStatus === 'PROCESSING' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdateStatus(student, 'RESOLVED')}
                                  className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                                  title="Xác nhận học viên đã ổn định nề nếp"
                                >
                                  ✓ Đã ổn định
                                </button>
                              )}

                              {activeStatus === 'RESOLVED' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdateStatus(student, 'PROCESSING')}
                                  className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                                  title="Chuyển lại Đang xử lý"
                                >
                                  ⏳ Đang xử lý
                                </button>
                              )}

                              {activeStatus === 'WARNING' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddRecord(student)}
                                  className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-300 font-bold hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                                  title="Ghi nhận xử lý vụ việc"
                                >
                                  📝 Xử lí ngay
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 align-top text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (isUnderTracking) {
                                handleOpenAddRecord(student);
                              } else {
                                handleOpenAddTrackingStudentModal(student.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-bold text-xs"
                            title={isUnderTracking ? "Thêm biên bản xử lý / Cập nhật tiến độ" : "Lập hồ sơ đưa vào diện theo dõi"}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenProfile(student)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-bold text-xs"
                            title="Xem chi tiết hồ sơ học sinh"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {records.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(student.id)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                              title={isExpanded ? 'Thu gọn lịch sử' : 'Xem toàn bộ lịch sử xử lý'}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded History Row */}
                      {isExpanded && records.length > 0 && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                  <History className="h-4 w-4 text-blue-600" />
                                  <span>Lịch sử các đợt theo dõi & xử lý vi phạm của {student.fullName}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  Tổng số {records.length} bản ghi
                                </span>
                              </div>

                              <div className="space-y-2.5">
                                {records.map((rec) => {
                                  const rStatus = STATUS_CONFIG[rec.status];
                                  const RIcon = rStatus.icon;

                                  return (
                                    <div
                                      key={rec.id}
                                      className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                                    >
                                      <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900 text-sm">{rec.content}</span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rStatus.bg} ${rStatus.text} ${rStatus.border} flex items-center gap-1`}>
                                            <RIcon className="h-2.5 w-2.5" />
                                            {rStatus.label}
                                          </span>
                                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                            Mức độ: {rec.severity}
                                          </span>
                                        </div>

                                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                          <span>Ngày: <strong>{rec.date}</strong></span>
                                          <span>•</span>
                                          <span>Nhóm: <strong>{rec.category}</strong></span>
                                          {rec.frequencyCount && rec.frequencyCount > 1 && (
                                            <>
                                              <span>•</span>
                                              <span>Tần suất: <strong>{rec.frequencyCount} lần</strong></span>
                                            </>
                                          )}
                                        </div>

                                        {rec.educationalMeasure && (
                                          <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                            <span className="font-bold text-blue-700">Biện pháp giáo dục: </span>
                                            {rec.educationalMeasure}
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                          {rec.studentExchangeNotes && (
                                            <div className="text-[11px] text-slate-600 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                                              <span className="font-bold text-blue-800">Trao đổi học viên: </span>
                                              {rec.studentExchangeNotes}
                                            </div>
                                          )}
                                          {rec.parentCoordinationNotes && (
                                            <div className="text-[11px] text-slate-600 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                                              <span className="font-bold text-emerald-800">Phối hợp phụ huynh: </span>
                                              {rec.parentCoordinationNotes}
                                            </div>
                                          )}
                                        </div>

                                        {rec.handlingResult && (
                                          <div className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200">
                                            <span className="font-bold">Kết quả xử lý: </span>
                                            {rec.handlingResult}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditRecord(student, rec)}
                                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors font-bold text-xs flex items-center gap-1 cursor-pointer"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                          <span>Sửa</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRecordToDelete({
                                              studentId: student.id,
                                              studentName: student.fullName,
                                              recordId: rec.id,
                                              content: rec.content
                                            });
                                          }}
                                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                          title="Xóa bản ghi vi phạm"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: ADD / EDIT VIOLATION HANDLING RECORD */}
      {isRecordModalOpen && selectedStudentForRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-black">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingRecord ? 'Cập nhật Tiến trình Xử lý Vi phạm' : 'Ghi nhận Hồ sơ Xử lý Vi phạm'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Học viên: <strong className="text-slate-800">{selectedStudentForRecord.fullName}</strong> ({selectedStudentForRecord.code} • Tổ {selectedStudentForRecord.group})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formSaveSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{formSaveSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              {/* Row 1: Date, Time, Category & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Ngày vi phạm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Giờ vi phạm
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Loại vi phạm <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden bg-white"
                  >
                    {VIOLATION_CATEGORIES_LIST.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Mức độ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden bg-white"
                  >
                    {SEVERITY_LIST.map((sev) => (
                      <option key={sev} value={sev}>{sev}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Violation Content */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nội dung vi phạm cụ thể <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="VD: Đi học muộn 15 phút không phép lần 2 trong tuần..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:border-blue-500 outline-hidden"
                  required
                />
              </div>

              {/* Row 3: Educational Measure */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Biện pháp giáo dục / Xử lý của GVCN
                </label>
                <textarea
                  rows={2}
                  value={formEducationalMeasure}
                  onChange={(e) => setFormEducationalMeasure(e.target.value)}
                  placeholder="VD: Nhắc nhở trước lớp, yêu cầu viết bản tự kiểm điểm, phân công cán sự kèm cặp..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                />
              </div>

              {/* Row 4: Student Exchange & Parent Coordination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nội dung trao đổi với Học viên
                  </label>
                  <textarea
                    rows={2}
                    value={formStudentExchange}
                    onChange={(e) => setFormStudentExchange(e.target.value)}
                    placeholder="VD: Học sinh nhận thức được khuyết điểm, cam kết không tái phạm..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nội dung phối hợp với Phụ huynh
                  </label>
                  <textarea
                    rows={2}
                    value={formParentCoordination}
                    onChange={(e) => setFormParentCoordination(e.target.value)}
                    placeholder="VD: Đã trao đổi qua Zalo/Điện thoại với phụ huynh em để đôn đốc việc đi học đúng giờ..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Row 5: Handling Result & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Kết quả xử lý / Đánh giá sau can thiệp
                  </label>
                  <input
                    type="text"
                    value={formHandlingResult}
                    onChange={(e) => setFormHandlingResult(e.target.value)}
                    placeholder="VD: Em đã đi học đúng giờ liên tục 5 ngày qua..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Trạng thái theo dõi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ViolationHandlingStatus)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold focus:border-blue-500 outline-hidden bg-white"
                  >
                    <option value="WARNING">⚠️ Cảnh báo (Cần chú ý đặc biệt)</option>
                    <option value="PROCESSING">⏳ Đang xử lý (Đang theo dõi & can thiệp)</option>
                    <option value="RESOLVED">✅ Đã ổn định (Đã khắc phục / Hoàn thành)</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Teacher Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Ghi chú riêng của GVCN (Bảo mật nội bộ)
                </label>
                <input
                  type="text"
                  value={formTeacherNotes}
                  onChange={(e) => setFormTeacherNotes(e.target.value)}
                  placeholder="Ghi chú thêm cho hồ sơ..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingRecord ? 'LƯU CẬP NHẬT' : 'LƯU HỒ SƠ XỬ LÝ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: CẤU HÌNH NGƯỠNG CẢNH BÁO VI PHẠM (GVCN) */}
      {isThresholdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Cấu hình Ngưỡng Cảnh báo Vi phạm
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dành riêng cho Giáo viên Chủ nhiệm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsThresholdModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {thresholdSaveSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{thresholdSaveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveThreshold} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số lượt vi phạm kích hoạt diện Cảnh báo <span className="text-indigo-600 font-normal">(Mặc định: 2)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newThresholdInput}
                    onChange={(e) => setNewThresholdInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 rounded-xl border border-slate-300 p-2.5 text-sm font-black text-indigo-700 bg-white focus:border-indigo-500 outline-hidden"
                    required
                  />
                  <span className="text-slate-600 font-medium">lượt vi phạm trong kỳ / tuần</span>
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-100 space-y-1.5 text-slate-600">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Nguyên tắc bảo toàn dữ liệu:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Thay đổi ngưỡng cảnh báo chỉ cập nhật bộ lọc hiển thị học viên cần lưu ý. Toàn bộ lịch sử vi phạm và các bước xử lý của học sinh được lưu giữ nguyên trạng 100%, không bị mất hay reset.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsThresholdModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu ngưỡng cảnh báo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: XÁC NHẬN XÓA BẢN GHI VI PHẠM (GVCN) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 font-black">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Xác nhận Xóa Bản ghi Vi phạm
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quyền hạn dành riêng cho GVCN
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Bạn có chắc chắn muốn xóa bản ghi vi phạm này khỏi hồ sơ của học viên?
              </p>
              <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-3 space-y-1.5 text-slate-800">
                <div>
                  <span className="font-bold text-slate-600">Học viên: </span>
                  <span className="font-black text-rose-950">{recordToDelete.studentName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Mã bản ghi (ID): </span>
                  <code className="text-[11px] font-mono bg-white px-1.5 py-0.5 rounded border border-rose-200 text-rose-800 font-bold">{recordToDelete.recordId}</code>
                </div>
                <div>
                  <span className="font-bold text-slate-600">Nội dung vi phạm: </span>
                  <span className="font-medium text-slate-900">{recordToDelete.content}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Hành động này chỉ xóa hồ sơ theo dõi đã chọn, KHÔNG xóa lịch sử vi phạm gốc trong mục "Rèn luyện & Kỷ luật".
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecord}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xác nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: FORM THÊM HỌC VIÊN VI PHẠM VÀO DIỆN THEO DÕI */}
      {isAddTrackingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-black">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    + Thêm học viên vi phạm
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chủ động đưa học viên vào diện theo dõi (Không bắt buộc đạt ngưỡng)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTrackingModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông báo thành công */}
            {addTrackingSuccess && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{addTrackingSuccess}</span>
              </div>
            )}

            {/* Thông báo lỗi thật */}
            {addTrackingError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-center gap-2 text-xs font-bold text-rose-800 animate-fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{addTrackingError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddTrackingStudent} className="space-y-4 text-xs">
              {/* Chọn học viên */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Chọn học viên (Lớp {classService.getSettings()?.className || '11A1'}) <span className="text-red-500">*</span>
                </label>
                <select
                  value={addTrackingStudentId}
                  onChange={(e) => {
                    setAddTrackingStudentId(e.target.value);
                    setAddTrackingError(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 outline-hidden bg-white"
                  required
                >
                  <option value="">-- Chọn học viên cần đưa vào theo dõi --</option>
                  {students.map((s) => {
                    const isTracked = Array.isArray(s.violationHandlingRecords) && s.violationHandlingRecords.length > 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.code} • Tổ {s.group}) {isTracked ? '— [Đã có hồ sơ theo dõi]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Chống duplicate: Nếu học viên đã có hồ sơ đang hoạt động */}
              {isAlreadyTracked && selectedStudentForTracking && (
                <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3.5 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Học viên này đã có hồ sơ theo dõi.</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Học viên <strong>{selectedStudentForTracking.fullName}</strong> hiện đã có hồ sơ theo dõi & xử lý vi phạm trong hệ thống (Bản ghi: <em>{existingActiveRecord?.content || 'Đang theo dõi'}</em>). Hệ thống chống tạo hồ sơ trùng lặp.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddTrackingModalOpen(false);
                        if (existingActiveRecord) {
                          handleOpenEditRecord(selectedStudentForTracking, existingActiveRecord);
                        } else {
                          onOpenProfile(selectedStudentForTracking);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Mở hồ sơ hiện có</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Thông tin hỗ trợ tham khảo (Reference only) */}
              {selectedStudentForTracking && !isAlreadyTracked && (
                <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-3.5 space-y-2 text-slate-700 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                    <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                    <span>Dữ liệu tham khảo từ "Rèn luyện & Kỷ luật"</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-xl border border-blue-100">
                      <span className="text-slate-500 block">Số lượt vi phạm:</span>
                      <strong className="text-blue-950 font-black">{trackingRefViolations.count} lượt</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-blue-100">
                      <span className="text-slate-500 block">Các tuần vi phạm:</span>
                      <strong className="text-blue-950 font-bold">{trackingRefViolations.weeks.join(', ') || 'Chưa phát sinh'}</strong>
                    </div>
                  </div>
                  {trackingRefViolations.categories.length > 0 && (
                    <div className="text-[11px] bg-white p-2 rounded-xl border border-blue-100">
                      <span className="text-slate-500">Loại vi phạm gần đây: </span>
                      <span className="font-semibold text-slate-800">{trackingRefViolations.categories.join(', ')}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-blue-600/90 italic leading-tight">
                    * Thông tin trên chỉ để GVCN tham khảo. Thao tác này KHÔNG di chuyển, không xóa vi phạm gốc tại "Rèn luyện & Kỷ luật".
                  </p>
                </div>
              )}

              {/* Lí do đưa vào theo dõi & Ghi chú */}
              {!isAlreadyTracked && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Lí do đưa vào theo dõi <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={addTrackingReasonPreset}
                      onChange={(e) => setAddTrackingReasonPreset(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-blue-500 outline-hidden bg-white mb-2"
                    >
                      <option value="Vi phạm lặp lại qua nhiều tuần">Vi phạm lặp lại qua nhiều tuần</option>
                      <option value="Có dấu hiệu cần theo dõi nề nếp">Có dấu hiệu cần theo dõi nề nếp</option>
                      <option value="GVCN nhận thấy cần giáo dục / theo dõi">GVCN nhận thấy cần giáo dục / theo dõi</option>
                      <option value="Vi phạm chưa đạt ngưỡng nhưng cần lưu ý">Vi phạm chưa đạt ngưỡng nhưng cần lưu ý</option>
                      <option value="Khác">Lý do khác (Nhập chi tiết bên dưới)</option>
                    </select>
                    <input
                      type="text"
                      value={addTrackingReasonDetail}
                      onChange={(e) => setAddTrackingReasonDetail(e.target.value)}
                      placeholder="Chi tiết lý do / Nội dung vi phạm cụ thể (VD: Thường xuyên không làm bài tập...)"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 font-medium focus:border-blue-500 outline-hidden"
                    />
                  </div>

                  {/* Ghi chú nếu cần */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Ghi chú thêm nếu cần (Bảo mật nội bộ)
                    </label>
                    <textarea
                      rows={2}
                      value={addTrackingNotes}
                      onChange={(e) => setAddTrackingNotes(e.target.value)}
                      placeholder="Kế hoạch giáo dục, biện pháp dự kiến hoặc lưu ý riêng của GVCN..."
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                    />
                  </div>
                </>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTrackingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isAlreadyTracked || !addTrackingStudentId || isSubmittingTracking}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 ${
                    isAlreadyTracked || !addTrackingStudentId || isSubmittingTracking
                      ? 'bg-slate-300 cursor-not-allowed opacity-70'
                      : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 cursor-pointer'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  <span>{isSubmittingTracking ? 'ĐANG LƯU...' : 'LƯU HỒ SƠ THEO DÕI'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
