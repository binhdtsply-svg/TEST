/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Key,
  LayoutGrid,
  List,
  Edit2,
  Edit3,
  Phone,
  Eye,
  EyeOff,
  TreePine,
  Download,
  Star,
  UserPlus,
  Upload,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileCheck2,
  Sparkles,
  Trash2,
  User,
  Globe,
  Award,
  KeyRound
} from 'lucide-react';
import { Student } from '../../types';
import { studentService } from '../../services/StudentService';
import { trainingService } from '../../services/TrainingService';
import { exportService } from '../../services/ExportService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { downloadStudentImportTemplate } from '../../utils/studentExcelUtils';
import { StudentProfileModal } from './StudentProfileModal';
import { StudentEditModal } from './StudentEditModal';
import { StudentAddModal } from './StudentAddModal';
import { ExcelImportModal } from './ExcelImportModal';
import { ActivationCodesModal } from './ActivationCodesModal';
import { SpecialAttentionTable } from './SpecialAttentionTable';
import { ViolationHandlingTable } from './ViolationHandlingTable';
import { ClassSizeModal } from './ClassSizeModal';
import { Pagination } from '../common/Pagination';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface StudentsModuleProps {
  initialGroup?: string;
  initialSubTab?: string;
}

export const StudentsModule: React.FC<StudentsModuleProps> = ({
  initialGroup,
  initialSubTab
}) => {
  const [students, setStudents] = useState<Student[]>(studentService.getAll());
  const [selectedGroup, setSelectedGroup] = useState<string>(
    initialGroup ||
    (initialSubTab === 'violation_handling'
      ? 'violation_handling'
      : initialSubTab === 'special_attention'
      ? 'special_attention'
      : 'all')
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isTokensOpen, setIsTokensOpen] = useState<boolean>(false);
  const [tokenModalTab, setTokenModalTab] = useState<'codes' | 'batch_passwords' | 'history'>('codes');
  const [isClassSizeModalOpen, setIsClassSizeModalOpen] = useState<boolean>(false);
  const [initialImportFile, setInitialImportFile] = useState<File | null>(null);

  // Settings for GVCN Roster Management
  const [classSettings, setClassSettings] = useState(classService.getSettings());
  const [inputMethod, setInputMethod] = useState<'excel' | 'manual'>('excel');
  const [identityMode, setIdentityMode] = useState<'IDENTIFIED' | 'ANONYMOUS'>(
    classSettings.studentIdentityMode || 'IDENTIFIED'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state (15 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  // Live student violation cases from studentService
  const studentViolations = useMemo(() => {
    return studentService.getAllViolationHandlingStudents();
  }, [students]);

  useEffect(() => {
    const unsubStudent = studentService.subscribe(() => {
      setStudents(studentService.getAll());
    });
    const unsubClass = classService.subscribe(() => {
      const current = classService.getSettings();
      setClassSettings(current);
      if (current.studentIdentityMode) {
        setIdentityMode(current.studentIdentityMode);
      }
    });
    return () => {
      unsubStudent();
      unsubClass();
    };
  }, []);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroup, searchQuery]);

  useEffect(() => {
    if (initialGroup) {
      setSelectedGroup(initialGroup);
    } else if (initialSubTab === 'violation_handling') {
      setSelectedGroup('violation_handling');
    } else if (initialSubTab === 'special_attention') {
      setSelectedGroup('special_attention');
    }
  }, [initialGroup, initialSubTab]);

  // 5 Real-time Metrics for "TỔNG QUAN HỌC VIÊN"
  const totalStudentsCount = students.length;
  const maleCount = students.filter(
    (s) => s.gender === 'Nam' || s.gender?.toLowerCase() === 'nam'
  ).length;
  const femaleCount = students.filter(
    (s) => s.gender === 'Nữ' || s.gender?.toLowerCase() === 'nữ' || s.gender?.toLowerCase() === 'nu'
  ).length;

  // Dân tộc khác: Đếm học sinh có thông tin dân tộc xác định khác 'Kinh'
  const otherEthnicityStudents = students.filter((s) => {
    const eth = (s.ethnicity || (s as any).danToc || '').trim().toLowerCase();
    return eth && eth !== 'kinh';
  });
  const otherEthnicityCount = otherEthnicityStudents.length;
  const otherEthnicitiesList = Array.from(
    new Set(otherEthnicityStudents.map((s) => s.ethnicity || (s as any).danToc))
  ).filter(Boolean);

  // Đoàn viên: Đếm học sinh có isUnionMember = true, chức vụ Đoàn, hoặc ngày kết nạp Đoàn
  const unionMemberCount = students.filter((s) => {
    if (s.isUnionMember === true || (s as any).doanVien === true) return true;
    if (s.officerRole && s.officerRole.toLowerCase().includes('đoàn')) return true;
    if (s.unionJoinDate) return true;
    return false;
  }).length;

  const handleDeleteStudent = (student: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStudentToDelete(student);
  };

  const confirmDeleteStudent = () => {
    if (studentToDelete) {
      studentService.deleteStudent(studentToDelete.id);
      setStudents(studentService.getAll());
      if (selectedStudent?.id === studentToDelete.id) {
        setSelectedStudent(null);
      }
      if (editingStudent?.id === studentToDelete.id) {
        setEditingStudent(null);
      }
      setStudentToDelete(null);
    }
  };

  const handleToggleIdentityMode = (mode: 'IDENTIFIED' | 'ANONYMOUS') => {
    setIdentityMode(mode);
    classService.updateSettings({ studentIdentityMode: mode });
  };

  const handleDownloadTemplate = () => {
    downloadStudentImportTemplate();
  };

  const handleQuickFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInitialImportFile(file);
      setIsImportOpen(true);
      // Reset input value so same file can be reselected if needed
      e.target.value = '';
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchGroup =
      selectedGroup === 'all'
        ? true
        : selectedGroup === 'special_attention'
        ? !!s.needsSpecialAttention
        : selectedGroup === 'officers'
        ? !!s.officerRole
        : s.group === Number(selectedGroup);

    const matchSearch =
      searchQuery === '' ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.anonymousCode && s.anonymousCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.phone && s.phone.includes(searchQuery));

    return matchGroup && matchSearch;
  });

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportExcel = () => {
    const isAnon = identityMode === 'ANONYMOUS';
    const exportData = filteredStudents.map((s) => ({
      'Mã HS': s.code,
      'Mã ẩn danh': s.anonymousCode || s.code,
      'Họ và tên': isAnon ? `Học sinh ${s.anonymousCode || s.code}` : s.fullName,
      'Giới tính': s.gender,
      'Ngày sinh': isAnon ? '••/••/••••' : s.dob,
      'Tổ': s.group,
      'Chức vụ cán sự': s.officerRole || '',
      'Số điện thoại': isAnon ? '••••••••••' : (s.phone || ''),
      'Họ tên Cha': isAnon ? '••••••••••' : (s.parent?.fatherName || s.fatherName || ''),
      'SĐT Cha': isAnon ? '••••••••••' : (s.parent?.fatherPhone || s.fatherPhone || ''),
      'Họ tên Mẹ': isAnon ? '••••••••••' : (s.parent?.motherName || s.motherName || ''),
      'SĐT Mẹ': isAnon ? '••••••••••' : (s.parent?.motherPhone || s.motherPhone || ''),
      'Địa chỉ': isAnon ? 'TP. Hồ Chí Minh' : (s.address || '')
    }));

    const cName = classService.getSettings().className || '12A1';
    exportService.exportToExcel(exportData, `Danh_Sach_Hoc_Sinh_${cName}`, `Học sinh ${cName}`);
  };

  return (
    <div className="space-y-4">
      {/* 1. SECTION: THIẾT LẬP DANH SÁCH LỚP CHỦ NHIỆM (GVCN ONLY) */}
      {isTeacher && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                  ⚙️
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  THIẾT LẬP DANH SÁCH LỚP CHỦ NHIỆM
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cấu hình phương thức nhập dữ liệu và bảo mật danh tính cho {students.length} học sinh
              </p>
            </div>

            {/* Two Master Switches */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Switch 1: Input Method */}
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 pl-2 pr-1">Cách nhập:</span>
                <button
                  type="button"
                  onClick={() => setInputMethod('excel')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'excel'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Nhập bằng Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('manual')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'manual'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                  <span>Nhập thủ công</span>
                </button>
              </div>

              {/* Switch 2: Identity Mode */}
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 pl-2 pr-1">Danh tính:</span>
                <button
                  type="button"
                  onClick={() => handleToggleIdentityMode('IDENTIFIED')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    identityMode === 'IDENTIFIED'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  <span>Hiển thị danh tính</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleIdentityMode('ANONYMOUS')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    identityMode === 'ANONYMOUS'
                      ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5 text-amber-600" />
                  <span>Chế độ ẩn danh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Mode Interactive Panel */}
          {inputMethod === 'excel' ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                      Chế độ Excel
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">
                      Tải mẫu → điền thông tin → lưu file → tải lên hệ thống.
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    File mẫu Excel chứa đầy đủ các cột thông tin chuẩn và hướng dẫn định dạng ngày sinh, phân tổ, chức vụ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải mẫu Excel danh sách học sinh</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer shadow-2xs">
                    <Upload className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Chọn file Excel để tải lên</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleQuickFileSelected}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 5-Step Process Bar */}
              <div className="mt-4 pt-3 border-t border-emerald-200/70 flex items-center justify-between gap-1 text-[11px] text-emerald-900 font-bold overflow-x-auto">
                <span className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-200 text-[10px] text-emerald-900">1</span>
                  Tải mẫu Excel
                </span>
                <span className="text-emerald-400">→</span>
                <span className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-200 text-[10px] text-emerald-900">2</span>
                  Điền thông tin
                </span>
                <span className="text-emerald-400">→</span>
                <span className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-200 text-[10px] text-emerald-900">3</span>
                  Tải file lên
                </span>
                <span className="text-emerald-400">→</span>
                <span className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-200 text-[10px] text-emerald-900">4</span>
                  Kiểm tra dữ liệu
                </span>
                <span className="text-emerald-400">→</span>
                <span className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-200 text-[10px] text-emerald-900">5</span>
                  Xác nhận nhập
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-600 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                      Chế độ thủ công
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">
                      Thêm từng học sinh trực tiếp vào cơ sở dữ liệu lớp học
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Nhập thông tin hồ sơ cá nhân, phân tổ, chức vụ và số điện thoại phụ huynh qua biểu mẫu trực quan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Thêm học sinh thủ công</span>
                </button>
              </div>
            </div>
          )}

          {/* Anonymous Mode Active Notification */}
          {identityMode === 'ANONYMOUS' && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Đang bật Chế độ ẩn danh:</strong> Họ tên và thông tin liên lạc được ẩn tự động bằng mã định danh an toàn (HS-XXXXXX) để bảo vệ quyền riêng tư khi trình chiếu.
                </span>
              </div>
              <button
                onClick={() => handleToggleIdentityMode('IDENTIFIED')}
                className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer shrink-0 ml-2"
              >
                Tắt ẩn danh
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. HEADER & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>DANH SÁCH & HỒ SƠ HỌC SINH</span>
          </h2>
          <p className="text-xs text-slate-500">
            Sĩ số thực tế: <b className="text-slate-800">{students.length} học sinh</b>
            {classSettings.confirmedTotalStudents && classSettings.confirmedTotalStudents !== students.length && (
              <span className="ml-1.5 font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 text-[11px]">
                (GVCN xác nhận: {classSettings.confirmedTotalStudents})
              </span>
            )}
            {identityMode === 'ANONYMOUS' && ' · 🛡️ Chế độ ẩn danh đang kích hoạt'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isTeacher && (
            <>
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Thêm học sinh</span>
              </button>

              <button
                onClick={() => {
                  setTokenModalTab('codes');
                  setIsTokensOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                title="Xem và quản lý mã kích hoạt, cấp mật khẩu hàng loạt và trạng thái tài khoản của cả lớp"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Mã kích hoạt lớp</span>
              </button>

              <button
                onClick={() => {
                  setInitialImportFile(null);
                  setIsImportOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Nhập Excel</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2.5 TỔNG QUAN HỌC VIÊN (COMPACT OVERVIEW CARDS) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                TỔNG QUAN HỌC VIÊN
              </h3>
              <p className="text-[11px] text-slate-500">
                Chỉ số và phân loại học sinh thời gian thực từ dữ liệu lớp
              </p>
            </div>
          </div>
          {isTeacher && (
            <button
              type="button"
              onClick={() => setIsClassSizeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Chỉnh / Xác nhận sĩ số</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: Tổng số học viên */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                Tổng số học viên
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Users className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {totalStudentsCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {classSettings.confirmedTotalStudents && classSettings.confirmedTotalStudents !== totalStudentsCount ? (
                  <span className="text-amber-700 font-semibold bg-amber-100/80 px-1.5 py-0.2 rounded-sm">
                    Xác nhận: {classSettings.confirmedTotalStudents}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">✓ Khớp danh sách</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Nam */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3.5 flex flex-col justify-between hover:bg-sky-50/70 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-tight">
                Nam
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <User className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-sky-950 tracking-tight">
                {maleCount}
              </div>
              <div className="text-[10px] text-sky-700 font-medium mt-0.5">
                {totalStudentsCount > 0
                  ? `${Math.round((maleCount / totalStudentsCount) * 100)}% tổng số`
                  : '0%'}
              </div>
            </div>
          </div>

          {/* Card 3: Nữ */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 flex flex-col justify-between hover:bg-rose-50/70 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-tight">
                Nữ
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                <User className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-rose-950 tracking-tight">
                {femaleCount}
              </div>
              <div className="text-[10px] text-rose-700 font-medium mt-0.5">
                {totalStudentsCount > 0
                  ? `${Math.round((femaleCount / totalStudentsCount) * 100)}% tổng số`
                  : '0%'}
              </div>
            </div>
          </div>

          {/* Card 4: Dân tộc khác */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 flex flex-col justify-between hover:bg-emerald-50/70 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-tight">
                Dân tộc khác
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Globe className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-950 tracking-tight">
                {otherEthnicityCount}
              </div>
              <div
                className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate"
                title={otherEthnicitiesList.length > 0 ? otherEthnicitiesList.join(', ') : '100% Dân tộc Kinh'}
              >
                {otherEthnicityCount > 0
                  ? `${otherEthnicitiesList.join(', ')}`
                  : '100% Dân tộc Kinh'}
              </div>
            </div>
          </div>

          {/* Card 5: Đoàn viên */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 flex flex-col justify-between hover:bg-amber-50/70 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-tight">
                Đoàn viên
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Award className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-950 tracking-tight">
                {unionMemberCount}
              </div>
              <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                {totalStudentsCount > 0
                  ? `${Math.round((unionMemberCount / totalStudentsCount) * 100)}% tỉ lệ Đoàn`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER AND VIEW MODE TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Group Filter Tabs with visible horizontal scrollbar */}
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-thin pb-2 pt-0.5 px-0.5">
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-max">
            {[
              { id: 'all', label: 'Tất cả' },
              ...(isTeacher ? [
                { id: 'special_attention', label: '❤️ Cần quan tâm' },
                { id: 'violation_handling', label: '⚖️ Theo dõi & Xử lý vi phạm' }
              ] : []),
              { id: '1', label: 'Tổ 1' },
              { id: '2', label: 'Tổ 2' },
              { id: '3', label: 'Tổ 3' },
              { id: '4', label: 'Tổ 4' },
              { id: 'officers', label: '⭐ Ban cán sự' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedGroup(tab.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 whitespace-nowrap select-none cursor-pointer ${
                  selectedGroup === tab.id
                    ? tab.id === 'special_attention'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : tab.id === 'violation_handling'
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-blue-600 text-white shadow-xs'
                    : tab.id === 'special_attention'
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                    : tab.id === 'violation_handling'
                    ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Layout toggle */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã HS, SĐT..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Xem dạng Lưới thẻ"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Xem dạng Bảng danh sách"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. STUDENT LIST (SPECIAL ATTENTION, VIOLATION HANDLING, GRID OR TABLE) */}
      {selectedGroup === 'special_attention' && isTeacher ? (
        <SpecialAttentionTable
          students={students}
          onOpenProfile={(s) => setSelectedStudent(s)}
          onOpenEdit={(s) => setEditingStudent(s)}
        />
      ) : selectedGroup === 'violation_handling' && isTeacher ? (
        <ViolationHandlingTable
          students={students}
          onOpenProfile={(s) => setSelectedStudent(s)}
          onOpenEdit={(s) => setEditingStudent(s)}
        />
      ) : viewMode === 'grid' ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedStudents.map((student, idx) => {
              const tree = trainingService.getStudentTree(student.id);
              const isAnon = identityMode === 'ANONYMOUS';
              const displayName = isAnon
                ? `Học sinh ${student.anonymousCode || student.code}`
                : student.fullName;

              return (
                <div
                  key={`${student.id}-${idx}`}
                  onClick={() => setSelectedStudent(student)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                >
                  <div>
                    {/* Top Bar with Group, Officer, and Quick Actions */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          Tổ {student.group}
                        </span>
                        {isTeacher && student.needsSpecialAttention && (
                          <span className="rounded-md bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-black border border-rose-300 animate-pulse">
                            ❤️ Cần quan tâm
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {student.officerRole ? (
                          <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-black border border-amber-200">
                            ⭐ {student.officerRole}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {isAnon ? student.anonymousCode || student.code : student.code}
                          </span>
                        )}

                        {isTeacher && (
                          <div className="flex items-center gap-0.5 ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStudent(student);
                              }}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteStudent(student, e)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa học sinh khỏi lớp"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={student.avatar}
                        alt={student.fullName}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-100 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600">
                          {displayName}
                        </h3>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {student.gender} · {isAnon ? '••/••/••••' : student.dob}
                        </div>
                      </div>
                    </div>

                    {/* Laurel Tree Badge */}
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 border border-emerald-100 p-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{tree?.icon || '🌱'}</span>
                        <span className="text-[11px] font-bold text-emerald-800 truncate">
                          {tree?.stageName || 'Mầm non'}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700">
                        🌼 {tree?.completedTrees || 0} Cây
                      </span>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Phone className="h-3 w-3" />
                      <span>
                        {isAnon
                          ? '••••••••••'
                          : isTeacher ||
                            currentUser.studentId === student.id ||
                            (currentUser.role === 'PARENT' &&
                              (currentUser.childStudentId === student.id ||
                                currentUser.studentId === student.id))
                          ? student.phone || 'Chưa có SĐT'
                          : '••••••••••'}
                      </span>
                    </span>
                    <span className="text-blue-600 font-semibold group-hover:underline">
                      Xem hồ sơ →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStudents.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredStudents.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[12, 15, 24, 36]}
                itemLabel="học sinh"
              />
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">Học sinh</th>
                  <th className="p-3">{identityMode === 'ANONYMOUS' ? 'Mã ẩn danh' : 'Mã HS'}</th>
                  <th className="p-3">Tổ</th>
                  <th className="p-3">Chức vụ</th>
                  <th className="p-3">Nguyệt Quế</th>
                  <th className="p-3">SĐT Phụ huynh</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.map((s, idx) => {
                  const tree = trainingService.getStudentTree(s.id);
                  const isAnon = identityMode === 'ANONYMOUS';
                  const displayName = isAnon
                    ? `Học sinh ${s.anonymousCode || s.code}`
                    : s.fullName;

                  const canSeePhone =
                    !isAnon &&
                    (isTeacher ||
                      currentUser.studentId === s.id ||
                      (currentUser.role === 'PARENT' &&
                        (currentUser.childStudentId === s.id || currentUser.studentId === s.id)));

                  return (
                    <tr key={`${s.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img src={s.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{displayName}</span>
                              {isTeacher && s.needsSpecialAttention && (
                                <span className="rounded-md bg-rose-100 text-rose-800 px-1 py-0.2 text-[9px] font-black border border-rose-300">
                                  ❤️ Quan tâm
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {s.gender} · {isAnon ? '••/••/••••' : s.dob}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-600">
                        {isAnon ? s.anonymousCode || s.code : s.code}
                      </td>
                      <td className="p-3 font-semibold text-slate-700">Tổ {s.group}</td>
                      <td className="p-3">
                        {s.officerRole ? (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            {s.officerRole}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-bold text-emerald-700">
                          {tree?.icon} {tree?.stageName} ({tree?.completedTrees} cây)
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-mono">
                        {canSeePhone
                          ? s.parent?.motherPhone || s.parent?.fatherPhone || s.motherPhone || s.fatherPhone || s.phone || '-'
                          : '••••••••••'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100 cursor-pointer"
                          >
                            Chi tiết
                          </button>
                          {isTeacher && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStudent(s);
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteStudent(s, e)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Xóa học sinh"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStudents.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredStudents.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 15, 20, 30]}
              itemLabel="học sinh"
            />
          )}
        </div>
      )}

      {/* 5. MODALS */}
      <StudentProfileModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onOpenEdit={(s) => {
          setSelectedStudent(null);
          setEditingStudent(s);
        }}
        onDeleteStudent={(s) => handleDeleteStudent(s)}
      />

      <StudentEditModal
        student={editingStudent}
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSaved={() => setStudents(studentService.getAll())}
        onDeleteStudent={(s) => {
          setEditingStudent(null);
          handleDeleteStudent(s);
        }}
      />

      <StudentAddModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => setStudents(studentService.getAll())}
      />

      <ExcelImportModal
        isOpen={isImportOpen}
        initialFile={initialImportFile}
        onClose={() => {
          setIsImportOpen(false);
          setInitialImportFile(null);
        }}
        onSuccess={() => setStudents(studentService.getAll())}
      />

      <ActivationCodesModal
        isOpen={isTokensOpen}
        onClose={() => setIsTokensOpen(false)}
        initialTab={tokenModalTab}
      />

      <ClassSizeModal
        isOpen={isClassSizeModalOpen}
        onClose={() => setIsClassSizeModalOpen(false)}
        onSuccess={() => {
          setClassSettings(classService.getSettings());
          setStudents(studentService.getAll());
        }}
      />

      {/* Confirmation Modal for Student Deletion */}
      <ConfirmDeleteModal
        isOpen={!!studentToDelete}
        title="Xác nhận xóa học sinh"
        itemName={studentToDelete ? `${studentToDelete.fullName} (Mã: ${studentToDelete.code} - Tổ ${studentToDelete.group})` : undefined}
        message="Thầy/Cô có chắc chắn muốn xóa học sinh này khỏi danh sách lớp chủ nhiệm không? Hồ sơ học sinh sẽ được chuyển sang lưu trữ an toàn (Archived) và không còn xuất hiện trong danh sách lớp."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteStudent}
        onClose={() => setStudentToDelete(null)}
      />
    </div>
  );
};
