/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Key,
  Copy,
  Check,
  Printer,
  Download,
  Sparkles,
  RefreshCw,
  Lock,
  Unlock,
  Search,
  ShieldCheck,
  History,
  ShieldAlert,
  KeyRound,
  RotateCcw,
  Clock,
  UserCheck,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  LockKeyhole
} from 'lucide-react';
import { studentService } from '../../services/StudentService';
import { exportService } from '../../services/ExportService';
import { classService } from '../../services/ClassService';
import { auditService } from '../../services/AuditService';
import { tenantService } from '../../services/TenantService';
import {
  authRepository,
  ServerCredentialItem,
  ServerCredentialAudit
} from '../../services/AuthRepository';

interface ActivationCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'codes' | 'batch_passwords' | 'history';
}

interface BatchResultItem {
  studentId: string;
  studentName: string;
  studentCode: string;
  type: 'STUDENT' | 'PARENT';
  loginCode: string;
  password?: string;
}

export const ActivationCodesModal: React.FC<ActivationCodesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'codes'
}) => {
  // 1. ALL HOOKS CALLED UNCONDITIONALLY AT TOP-LEVEL (STRICT RULES OF HOOKS)
  const [activeTab, setActiveTab] = useState<'codes' | 'batch_passwords' | 'history'>(initialTab);
  const [students, setStudents] = useState(studentService.getAll(true));
  const [serverCredentials, setServerCredentials] = useState<ServerCredentialItem[]>([]);
  const [historyAudits, setHistoryAudits] = useState<ServerCredentialAudit[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multiselect for Class Activation Tab
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Set password single modal state (Individual account only)
  const [passwordModal, setPasswordModal] = useState<{
    studentId: string;
    studentName: string;
    type: 'STUDENT' | 'PARENT';
    newPassword: string;
  } | null>(null);

  // Bulk Passwords Provisioning State (NO bulk reset)
  const [batchTargetType, setBatchTargetType] = useState<'ALL' | 'STUDENT' | 'PARENT'>('ALL');
  const [batchScope, setBatchScope] = useState<'CLASS' | 'SELECTED'>('CLASS');
  const [batchPasswordMode, setBatchPasswordMode] = useState<'RANDOM' | 'CUSTOM'>('RANDOM');
  const [batchCustomPassword, setBatchCustomPassword] = useState<string>('Matkhau@2026');
  const [batchReason, setBatchReason] = useState<string>('');
  const [batchResult, setBatchResult] = useState<{
    successCount: number;
    failCount: number;
    totalProcessed: number;
    list: BatchResultItem[];
    failures?: Array<{ studentId: string; studentName?: string; reason: string }>;
  } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const loadServerCredentials = useCallback(async () => {
    const res = await authRepository.fetchCredentials();
    if (res.success && res.credentials) {
      setServerCredentials(res.credentials);
    }
  }, []);

  const loadHistoryAudits = useCallback(async () => {
    setIsLoadingHistory(true);
    const res = await authRepository.fetchCredentialHistory();
    if (res.success && res.history) {
      setHistoryAudits(res.history);
    }
    setIsLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStudents(studentService.getAll(true));
      loadServerCredentials();
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, loadServerCredentials]);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadHistoryAudits();
    }
  }, [isOpen, activeTab, loadHistoryAudits]);

  const currentClassName = useMemo(() => {
    return classService.getSettings().className || '11A1';
  }, []);

  const targetScopeStudents = useMemo(() => {
    if (batchScope === 'SELECTED') {
      return students.filter(s => selectedStudentIds.includes(s.id));
    }
    return students;
  }, [students, batchScope, selectedStudentIds]);

  const estimatedAccountsCount = useMemo(() => {
    const studentCount = targetScopeStudents.length;
    if (batchTargetType === 'ALL') return studentCount * 2;
    return studentCount;
  }, [targetScopeStudents, batchTargetType]);

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      (s?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s?.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // Handlers
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  const handleRegenerateAll = async () => {
    setIsProcessing(true);
    studentService.regenerateAllTokens();
    setStudents(studentService.getAll(true));
    await loadServerCredentials();
    auditService.log(
      'Tạo lại toàn bộ mã kích hoạt',
      'TEACHER',
      'Tập thể Lớp',
      'Đã tạo mới mã truy cập cho toàn bộ học sinh và phụ huynh trong lớp'
    );
    setIsProcessing(false);
    showToast('Đã tạo mới và đồng bộ toàn bộ mã kích hoạt lên máy chủ!');
  };

  const handleSaveAllCredentials = async () => {
    setIsProcessing(true);
    try {
      const res = await studentService.syncAllCredentialsToServer();
      setStudents(studentService.getAll(true));
      await loadServerCredentials();
      auditService.log(
        'Lưu và đồng bộ mã truy cập',
        'TEACHER',
        'Tập thể Lớp',
        `Đã lưu và đồng bộ bền vững ${res.count} mã truy cập học sinh & phụ huynh lên máy chủ`
      );
      showToast(`Đã lưu bền vững toàn bộ ${res.count} mã truy cập vào hệ thống an toàn!`);
    } catch {
      showToast('Có lỗi khi lưu mã lên máy chủ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSingleStudent = async (studentId: string, studentName: string) => {
    setIsProcessing(true);
    const target = studentService.getAll(true).find(s => s.id === studentId);
    if (target) {
      const sToken = target.activationTokenStudent || target.studentActivationToken || target.code;
      const pToken = target.activationTokenParent || target.parentActivationToken || `PAR-${target.id.slice(-4).toUpperCase()}`;
      await studentService.saveSingleStudentCredential(studentId, sToken, pToken);
      setStudents(studentService.getAll(true));
      await loadServerCredentials();
      showToast(`Đã lưu mã truy cập bền vững cho em ${studentName}!`);
    }
    setIsProcessing(false);
  };

  const handleRegenerateSingle = async (id: string, name: string) => {
    setIsProcessing(true);
    const res = studentService.regenerateTokens(id);
    if (res) {
      setStudents(studentService.getAll(true));
      await loadServerCredentials();
      auditService.log(
        'Cấp lại mã truy cập cá nhân',
        'TEACHER',
        name,
        `Cấp lại mã mới: HS (${res.studentToken}), PH (${res.parentToken})`
      );
      showToast(`Đã tạo lại mã kích hoạt cho em ${name}`);
    }
    setIsProcessing(false);
  };

  const handleToggleToken = async (id: string, name: string, type: 'student' | 'parent') => {
    studentService.toggleTokenStatus(id, type);
    setStudents(studentService.getAll(true));
    const targetStudent = studentService.getAll(true).find(s => s.id === id);
    const newStatus = type === 'student' ? targetStudent?.tokenStudentStatus : targetStudent?.tokenParentStatus;
    await loadServerCredentials();
    auditService.log(
      newStatus === 'active' ? 'Mở khóa mã truy cập' : 'Tạm khóa mã truy cập',
      'TEACHER',
      `${name} (${type === 'student' ? 'Học sinh' : 'Phụ huynh'})`,
      `Trạng thái chuyển sang: ${newStatus}`
    );
    showToast(`Đã ${newStatus === 'active' ? 'mở khóa' : 'tạm khóa'} mã ${type === 'student' ? 'học sinh' : 'phụ huynh'} của ${name}`);
  };

  // INDIVIDUAL PASSWORD RESET HANDLER (STRICTLY PER ACCOUNT)
  const handleResetPassword = async (studentId: string, studentName: string, type: 'STUDENT' | 'PARENT') => {
    const roleLabel = type === 'STUDENT' ? 'học sinh' : 'phụ huynh';

    setIsProcessing(true);
    const tId = tenantService.getActiveTenantId();
    const result = await authRepository.resetCredentialPassword({
      tenantId: tId,
      ownerId: studentId,
      type
    });
    setIsProcessing(false);

    if (result.success) {
      await loadServerCredentials();
      auditService.log(
        'Đặt lại mật khẩu tài khoản cá nhân',
        'TEACHER',
        `${studentName} (${type === 'STUDENT' ? 'Học sinh' : 'Phụ huynh'})`,
        'GVCN đã đặt lại mật khẩu về mặc định mã truy cập'
      );
      showToast(`Đã xóa mật khẩu cá nhân của ${roleLabel} em ${studentName}. Người dùng đăng nhập bằng Mã truy cập!`);
    } else {
      showToast(result.message || 'Không thể đặt lại mật khẩu.');
    }
  };

  // INDIVIDUAL SET PASSWORD HANDLER
  const handleSetCustomPasswordSubmit = async () => {
    if (!passwordModal) return;
    const { studentId, studentName, type, newPassword } = passwordModal;
    if (!newPassword || newPassword.trim().length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsProcessing(true);
    const tId = tenantService.getActiveTenantId();
    const result = await authRepository.setPasswordByTeacher({
      tenantId: tId,
      ownerId: studentId,
      type,
      newPassword: newPassword.trim()
    });
    setIsProcessing(false);

    if (result.success) {
      await loadServerCredentials();
      auditService.log(
        'Cài đặt mật khẩu mới',
        'TEACHER',
        `${studentName} (${type === 'STUDENT' ? 'Học sinh' : 'Phụ huynh'})`,
        'GVCN đã cài đặt trực tiếp mật khẩu mới cho tài khoản'
      );
      showToast(`Đã cài đặt mật khẩu mới cho ${type === 'STUDENT' ? 'học sinh' : 'phụ huynh'} ${studentName}!`);
      setPasswordModal(null);
    } else {
      showToast(result.message || 'Không thể cài đặt mật khẩu.');
    }
  };

  // BULK PASSWORD PROVISIONING EXECUTION (STRICTLY PROVISIONING - NO BULK RESET)
  const handleExecuteBatchGrant = async () => {
    if (isProcessing) return;

    if (targetScopeStudents.length === 0) {
      showToast('Chưa có học sinh nào trong phạm vi được chọn.');
      return;
    }

    if (batchPasswordMode === 'CUSTOM') {
      if (!batchCustomPassword || batchCustomPassword.trim().length < 6) {
        showToast('Mật khẩu chung phải có độ dài tối thiểu 6 ký tự.');
        return;
      }
    }

    const tId = tenantService.getActiveTenantId();
    const targetStudentIds = batchScope === 'SELECTED' ? selectedStudentIds : undefined;
    const targetLabel = batchTargetType === 'ALL' ? 'Học viên & Phụ huynh' : batchTargetType === 'STUDENT' ? 'Học viên' : 'Phụ huynh';

    setIsProcessing(true);

    try {
      const res = await authRepository.batchGrantPasswords({
        tenantId: tId,
        targetType: batchTargetType,
        targetStudentIds,
        customPassword: batchPasswordMode === 'CUSTOM' ? batchCustomPassword.trim() : undefined,
        reason: batchReason.trim() || `GVCN cấp mật khẩu hàng loạt cho lớp ${currentClassName}`
      });

      if (res.success && res.generatedList) {
        const list: BatchResultItem[] = res.generatedList.map(item => ({
          studentId: item.studentId,
          studentName: item.studentName,
          studentCode: item.studentCode,
          type: item.type,
          loginCode: item.loginCode,
          password: item.newPasswordPlain
        }));

        setBatchResult({
          successCount: res.successCount ?? list.length,
          failCount: res.failCount ?? (res.failures ? res.failures.length : 0),
          totalProcessed: res.totalProcessed ?? list.length,
          list,
          failures: res.failures
        });

        await loadServerCredentials();
        auditService.log(
          'Cấp mật khẩu hàng loạt',
          'TEACHER',
          `Lớp ${currentClassName}`,
          `Cấp mật khẩu thành công cho ${list.length} tài khoản (${targetLabel})`
        );
        showToast(`Cấp mật khẩu thành công cho ${list.length} tài khoản!`);
      } else {
        showToast(res.message || 'Lỗi khi cấp mật khẩu hàng loạt.');
      }
    } catch (err: any) {
      showToast(`Lỗi: ${err?.message || 'Có lỗi xảy ra khi cấp mật khẩu.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyBatchResult = () => {
    if (!batchResult || batchResult.list.length === 0) return;
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const header = `📋 DANH SÁCH TÀI KHOẢN & MẬT KHẨU LỚP ${currentClassName}\n` +
      `📅 Ngày cấp: ${dateStr}\n` +
      `🔒 Hình thức: Cấp mật khẩu đăng nhập đồng loạt\n` +
      `--------------------------------------------------\n`;

    const lines = batchResult.list.map((item, idx) => {
      const roleStr = item.type === 'STUDENT' ? 'Học sinh' : 'Phụ huynh';
      return `${idx + 1}. [${roleStr}] ${item.studentName} (Mã HS: ${item.studentCode})\n` +
        `   • Tên đăng nhập: ${item.loginCode}\n` +
        `   • Mật khẩu: ${item.password || 'Mã truy cập'}\n`;
    });

    const fullText = header + lines.join('\n') + `\n--------------------------------------------------\nLưu ý: Học sinh và Phụ huynh bảo mật thông tin đăng nhập cá nhân.`;
    navigator.clipboard.writeText(fullText);
    showToast('Đã sao chép toàn bộ danh sách để gửi Zalo/tin nhắn!');
  };

  const handleExportBatchExcel = () => {
    if (!batchResult || batchResult.list.length === 0) return;
    const data = batchResult.list.map((item, idx) => ({
      'STT': idx + 1,
      'Họ và tên': item.studentName,
      'Mã học sinh': item.studentCode,
      'Vai trò': item.type === 'STUDENT' ? 'Học sinh' : 'Phụ huynh',
      'Tên đăng nhập (Mã truy cập)': item.loginCode,
      'Mật khẩu mới': item.password || 'Mã truy cập'
    }));

    exportService.exportToExcel(data, `Mat_Khau_Lop_${currentClassName}_${Date.now()}`, 'Mật Khẩu Cấp');
  };

  const handlePrintBatch = () => {
    if (!batchResult || batchResult.list.length === 0) return;
    const rowsHtml = batchResult.list.map((item, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><b>${item.studentName}</b></td>
        <td>${item.studentCode}</td>
        <td>${item.type === 'STUDENT' ? '<span style="color:#2563eb;font-weight:bold;">Học sinh</span>' : '<span style="color:#059669;font-weight:bold;">Phụ huynh</span>'}</td>
        <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-weight:bold;">${item.loginCode}</code></td>
        <td><code style="background:#fef3c7;padding:2px 6px;border-radius:4px;font-weight:bold;color:#b45309;">${item.password || 'Mã truy cập'}</code></td>
      </tr>
    `).join('');

    exportService.printReport(
      `DANH SÁCH BÀN GIAO TÀI KHOẢN & MẬT KHẨU - LỚP ${currentClassName}`,
      `
        <p>Thời gian cấp: ${new Date().toLocaleString('vi-VN')} | Người cấp: Giáo viên chủ nhiệm</p>
        <table>
          <thead>
            <tr>
              <th style="width:40px;">STT</th>
              <th>Họ và tên</th>
              <th>Mã HS</th>
              <th>Vai trò</th>
              <th>Tên đăng nhập</th>
              <th>Mật khẩu</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `
    );
  };

  const handleExportExcelAll = () => {
    const data = students.map((s) => {
      const sCred = serverCredentials.find(c => c.ownerId === s.id && c.type === 'STUDENT');
      const pCred = serverCredentials.find(c => c.ownerId === s.id && c.type === 'PARENT');

      return {
        'Mã HS': s.code,
        'Họ và tên': s.fullName,
        'Tổ': s.group,
        'Mã Kích hoạt Học sinh': s.activationTokenStudent || s.code,
        'Trạng thái HS': (sCred?.status === 'LOCKED' || s.tokenStudentStatus === 'revoked') ? 'Tạm khóa' : 'Đang hoạt động',
        'Mật khẩu Học sinh (Cấp ban đầu)': sCred?.initialPassword || (sCred?.hasPassword ? 'Đã cài đặt' : 'Chưa cài (dùng mã)'),
        'Mã Kích hoạt Phụ huynh': s.activationTokenParent || '',
        'Trạng thái PH': (pCred?.status === 'LOCKED' || s.tokenParentStatus === 'revoked') ? 'Tạm khóa' : 'Đang hoạt động',
        'Mật khẩu Phụ huynh (Cấp ban đầu)': pCred?.initialPassword || (pCred?.hasPassword ? 'Đã cài đặt' : 'Chưa cài (dùng mã)')
      };
    });

    exportService.exportToExcel(data, `Ma_Kich_Hoat_Lop_${currentClassName}`, 'Mã Kích Hoạt');
  };

  const handlePrintAll = () => {
    const rowsHtml = students.map((s) => `
      <tr>
        <td><b>${s.code}</b></td>
        <td>${s.fullName}</td>
        <td>Tổ ${s.group}</td>
        <td><code style="background:#EEF2FF;padding:2px 6px;border-radius:4px;font-weight:bold;">${s.activationTokenStudent || s.code}</code></td>
        <td><code style="background:#ECFDF5;padding:2px 6px;border-radius:4px;font-weight:bold;">${s.activationTokenParent || ''}</code></td>
      </tr>
    `).join('');

    exportService.printReport(
      'DANH SÁCH MÃ KÍCH HOẠT TÀI KHOẢN KHÔNG GIAN CHỦ NHIỆM SỐ',
      `
        <p>Phiếu cấp mã đăng nhập an toàn cho Học sinh và Phụ huynh Lớp ${currentClassName}.</p>
        <table>
          <thead>
            <tr>
              <th>Mã HS</th>
              <th>Họ và tên</th>
              <th>Tổ</th>
              <th>Mã Học sinh</th>
              <th>Mã Phụ huynh</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `
    );
  };

  // 2. ONLY RENDER PORTAL IF OPEN AND DOM READY (STRICT RETURN AT THE VERY BOTTOM)
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl animate-fade-in flex items-center gap-2 border border-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-bold shadow-xs">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">Mã Kích Hoạt & Cấp Mật Khẩu Lớp {currentClassName}</h3>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">GVCN</span>
              </div>
              <p className="text-xs text-slate-500">Mã kích hoạt lớp · Cấp mật khẩu hàng loạt cho Học viên & Phụ huynh · Bảo toàn định danh & phân quyền</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'codes' && (
              <>
                <button
                  onClick={handleExportExcelAll}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Xuất Excel</span>
                </button>
                <button
                  onClick={handlePrintAll}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>In phiếu cấp</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('codes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
              activeTab === 'codes'
                ? 'bg-white text-amber-700 border-amber-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Key className="h-4 w-4 text-amber-600" />
            <span>Mã kích hoạt lớp ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('batch_passwords')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
              activeTab === 'batch_passwords'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>Cấp mật khẩu hàng loạt</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadHistoryAudits();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 border-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <History className="h-4 w-4 text-blue-600" />
            <span>Nhật ký & Lịch sử cấp</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: CODES & ACCOUNT SECURITY STATUS */}
        {/* ============================================================== */}
        {activeTab === 'codes' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-950">
              <div className="flex items-start sm:items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold">Mã kích hoạt lớp {currentClassName}:</span> Mã đăng nhập định danh duy nhất cho học sinh và phụ huynh. GVCN có thể lưu đồng bộ, tạo mới hoặc bấm <b>Cấp mật khẩu hàng loạt</b> để phát tài khoản cho cả lớp.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('batch_passwords')}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl shrink-0 cursor-pointer shadow-xs transition-colors"
                  title="Chuyển sang tab Cấp mật khẩu hàng loạt"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Cấp MK hàng loạt</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllCredentials}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl shrink-0 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  title="Lưu và đồng bộ toàn bộ mã vào máy chủ bảo mật để sử dụng lâu dài"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Lưu tất cả mã</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateAll}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3.5 py-1.5 rounded-xl border border-slate-300 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Tạo mới toàn bộ mã truy cập cho cả lớp"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Tạo mới toàn bộ</span>
                </button>
              </div>
            </div>

            {/* Selection actions bar if selected */}
            {selectedStudentIds.length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs animate-fade-in">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  <span>Đã chọn {selectedStudentIds.length} học sinh</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchScope('SELECTED');
                      setActiveTab('batch_passwords');
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 text-xs shadow-xs cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Cấp MK cho {selectedStudentIds.length} học sinh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh theo tên hoặc mã số..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium focus:border-amber-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.length === students.length && students.length > 0}
                        onChange={handleSelectAllStudents}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="p-3">Học sinh</th>
                    <th className="p-3">Mã Học sinh & Mật khẩu</th>
                    <th className="p-3">Mã Phụ huynh & Mật khẩu</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s, idx) => {
                    const sCred = serverCredentials.find(c => c.ownerId === s.id && c.type === 'STUDENT');
                    const pCred = serverCredentials.find(c => c.ownerId === s.id && c.type === 'PARENT');

                    const isStudentLocked = (sCred && sCred.status === 'LOCKED') || s.tokenStudentStatus === 'revoked' || s.tokenRevoked;
                    const isParentLocked = (pCred && pCred.status === 'LOCKED') || s.tokenParentStatus === 'revoked' || s.tokenRevoked;

                    const sToken = s.activationTokenStudent || s.studentActivationToken || s.code;
                    const pToken = s.activationTokenParent || s.parentActivationToken || 'CHƯA CẤP';
                    const isChecked = selectedStudentIds.includes(s.id);

                    return (
                      <tr key={`${s.id}-${idx}`} className={`hover:bg-slate-50 ${isChecked ? 'bg-indigo-50/30' : ''}`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectStudent(s.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{s.fullName}</div>
                          <div className="text-[11px] text-slate-400">
                            Mã: {s.code} · Tổ {s.group} {s.officerRole ? `· ${s.officerRole}` : ''}
                          </div>
                        </td>

                        {/* Student Token Column */}
                        <td className="p-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <code className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold border ${
                                isStudentLocked
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {sToken}
                              </code>
                              {!isStudentLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(sToken)}
                                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="Sao chép mã HS"
                                >
                                  {copiedToken === sToken ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleToken(s.id, s.fullName, 'student')}
                                className={`rounded-md p-1 transition-colors cursor-pointer ${
                                  isStudentLocked ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-600'
                                }`}
                                title={isStudentLocked ? 'Mở khóa mã HS' : 'Tạm khóa mã HS'}
                              >
                                {isStudentLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            {/* Student Password Status & Reset/Set Button */}
                            <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                              {sCred?.initialPassword ? (
                                <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-semibold border border-amber-200" title="Mật khẩu do GVCN cấp ban đầu">
                                  <KeyRound className="h-3 w-3 text-amber-600 shrink-0" />
                                  <span>MK cấp:</span>
                                  <code className="font-mono font-bold text-amber-900 bg-amber-100/80 px-1 py-0.5 rounded text-[11px]">{sCred.initialPassword}</code>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(sCred.initialPassword!)}
                                    className="text-amber-700 hover:text-amber-950 p-0.5 cursor-pointer ml-0.5"
                                    title="Sao chép mật khẩu"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : sCred?.hasPassword ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  Đã đặt MK riêng
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Chưa đặt MK (dùng mã)</span>
                              )}

                              <button
                                type="button"
                                onClick={() => setPasswordModal({
                                  studentId: s.id,
                                  studentName: s.fullName,
                                  type: 'STUDENT',
                                  newPassword: sCred?.initialPassword || ''
                                })}
                                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded-md font-semibold border border-blue-200 cursor-pointer"
                                title="Cài đặt trực tiếp mật khẩu mới cho học sinh"
                              >
                                <Lock className="h-2.5 w-2.5" />
                                {sCred?.hasPassword ? 'Đổi MK' : 'Cài MK'}
                              </button>

                              {sCred?.hasPassword && (
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(s.id, s.fullName, 'STUDENT')}
                                  className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold border border-amber-200 cursor-pointer"
                                  title="Xóa mật khẩu riêng nếu học sinh quên (Đăng nhập lại bằng mã)"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                  Xóa MK
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Parent Token Column */}
                        <td className="p-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <code className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold border ${
                                isParentLocked
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {pToken}
                              </code>
                              {!isParentLocked && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(pToken)}
                                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-colors cursor-pointer"
                                  title="Sao chép mã PH"
                                >
                                  {copiedToken === pToken ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleToken(s.id, s.fullName, 'parent')}
                                className={`rounded-md p-1 transition-colors cursor-pointer ${
                                  isParentLocked ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-600'
                                }`}
                                title={isParentLocked ? 'Mở khóa mã PH' : 'Tạm khóa mã PH'}
                              >
                                {isParentLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            {/* Parent Password Status & Reset/Set Button */}
                            <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                              {pCred?.initialPassword ? (
                                <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-semibold border border-amber-200" title="Mật khẩu do GVCN cấp ban đầu">
                                  <KeyRound className="h-3 w-3 text-amber-600 shrink-0" />
                                  <span>MK cấp:</span>
                                  <code className="font-mono font-bold text-amber-900 bg-amber-100/80 px-1 py-0.5 rounded text-[11px]">{pCred.initialPassword}</code>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(pCred.initialPassword!)}
                                    className="text-amber-700 hover:text-amber-950 p-0.5 cursor-pointer ml-0.5"
                                    title="Sao chép mật khẩu"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : pCred?.hasPassword ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  Đã đặt MK riêng
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Chưa đặt MK (dùng mã)</span>
                              )}

                              <button
                                type="button"
                                onClick={() => setPasswordModal({
                                  studentId: s.id,
                                  studentName: s.fullName,
                                  type: 'PARENT',
                                  newPassword: pCred?.initialPassword || ''
                                })}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-md font-semibold border border-emerald-200 cursor-pointer"
                                title="Cài đặt trực tiếp mật khẩu mới cho phụ huynh"
                              >
                                <Lock className="h-2.5 w-2.5" />
                                {pCred?.hasPassword ? 'Đổi MK' : 'Cài MK'}
                              </button>

                              {pCred?.hasPassword && (
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(s.id, s.fullName, 'PARENT')}
                                  className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold border border-amber-200 cursor-pointer"
                                  title="Xóa mật khẩu riêng nếu phụ huynh quên (Đăng nhập lại bằng mã)"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                  Xóa MK
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveSingleStudent(s.id, s.fullName)}
                              disabled={isProcessing}
                              className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                              title="Lưu và đồng bộ mã học sinh & phụ huynh này vào máy chủ"
                            >
                              Lưu mã
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateSingle(s.id, s.fullName)}
                              disabled={isProcessing}
                              className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                              title="Tạo mới lại cả 2 mã cho học sinh này"
                            >
                              Cấp lại mã
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BULK PASSWORD PROVISIONING (INTEGRATED INSIDE ACTIVATION AREA) */}
        {/* ============================================================== */}
        {activeTab === 'batch_passwords' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {!batchResult ? (
              <div className="space-y-5">
                {/* Information Banner */}
                <div className="rounded-2xl bg-indigo-50/80 border border-indigo-200 p-4 text-xs text-indigo-950 flex items-start gap-3 shadow-2xs">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-indigo-900 text-sm">Chức năng Cấp Mật Khẩu Hàng Loạt — Lớp {currentClassName}</p>
                    <p className="text-indigo-800">
                      • Giúp GVCN khởi tạo mật khẩu đăng nhập đồng loạt cho toàn bộ học sinh và phụ huynh trong lớp mà không cần làm thủ công từng tài khoản.<br />
                      • <b>Bảo toàn định danh:</b> Mã đăng nhập (Student Code / Parent Login Code), điểm số và mọi dữ liệu học sinh được giữ nguyên 100%.<br />
                      • Mật khẩu được mã hóa an toàn (scrypt) trên máy chủ. Sau khi cấp, GVCN có thể sao chép nhanh gửi Zalo hoặc xuất file Excel bàn giao.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Card 1: Target Type */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>1. Nhóm tài khoản cấp mật khẩu</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchTargetType('ALL')}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          batchTargetType === 'ALL'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs">Cả hai</div>
                        <div className="text-[11px] opacity-75">Học viên & Phụ huynh</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchTargetType('STUDENT')}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          batchTargetType === 'STUDENT'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs">Học viên</div>
                        <div className="text-[11px] opacity-75">Chỉ tài khoản HS</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchTargetType('PARENT')}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          batchTargetType === 'PARENT'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs">Phụ huynh</div>
                        <div className="text-[11px] opacity-75">Chỉ tài khoản PH</div>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Scope */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-indigo-600" />
                        <span>2. Phạm vi áp dụng trong lớp</span>
                      </label>
                      {batchScope === 'SELECTED' && (
                        <span className="text-[11px] font-semibold text-indigo-600">
                          {selectedStudentIds.length} học sinh được chọn
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchScope('CLASS')}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          batchScope === 'CLASS'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs">Toàn bộ lớp {currentClassName}</div>
                        <div className="text-[11px] opacity-75">{students.length} học sinh</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchScope('SELECTED')}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          batchScope === 'SELECTED'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs">Học sinh được chọn</div>
                        <div className="text-[11px] opacity-75">{selectedStudentIds.length} đã tick chọn</div>
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Password Format */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 md:col-span-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <LockKeyhole className="h-4 w-4 text-indigo-600" />
                      <span>3. Quy cách mật khẩu khởi tạo</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBatchPasswordMode('RANDOM')}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          batchPasswordMode === 'RANDOM'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">Ngẫu nhiên an toàn (Được khuyến nghị)</div>
                        <div className="text-[11px] opacity-75 mt-0.5">Tự sinh mật khẩu riêng biệt cho từng tài khoản (Ví dụ: Hs#8291, Ph#9182)</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchPasswordMode('CUSTOM')}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          batchPasswordMode === 'CUSTOM'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">Đặt chung 1 mật khẩu khởi tạo</div>
                        <div className="text-[11px] opacity-75 mt-0.5">Cả lớp dùng chung 1 mật khẩu ban đầu và tự đổi sau</div>
                      </button>
                    </div>

                    {batchPasswordMode === 'CUSTOM' && (
                      <div className="space-y-1 pt-2 border-t border-slate-100">
                        <label className="text-[11px] font-bold text-slate-700">Nhập mật khẩu khởi tạo chung:</label>
                        <input
                          type="text"
                          value={batchCustomPassword}
                          onChange={(e) => setBatchCustomPassword(e.target.value)}
                          placeholder="Nhập mật khẩu khởi tạo chung (tối thiểu 6 ký tự)..."
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 outline-hidden bg-slate-50/50"
                        />
                        <p className="text-[10px] text-slate-400">Gợi ý: Matkhau@2026 hoặc Lop11A1@2026 (tối thiểu 6 ký tự)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scope selector drawer if SELECTED */}
                {batchScope === 'SELECTED' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Chọn danh sách học sinh cần cấp mật khẩu ({selectedStudentIds.length}/{students.length}):</span>
                      <button
                        type="button"
                        onClick={handleSelectAllStudents}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {selectedStudentIds.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn cả lớp'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                      {students.map(s => {
                        const isChecked = selectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectStudent(s.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="truncate">{s.fullName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                  <label className="text-xs font-bold text-slate-800">Lý do / Ghi chú đợt cấp mật khẩu (Tùy chọn)</label>
                  <input
                    type="text"
                    value={batchReason}
                    onChange={(e) => setBatchReason(e.target.value)}
                    placeholder={`Ví dụ: GVCN cấp mật khẩu đầu năm học / Cấp mật khẩu học kỳ cho lớp ${currentClassName}...`}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 outline-hidden"
                  />
                </div>

                {/* CONFIRMATION SUMMARY CARD */}
                <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-4.5 text-white shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-indigo-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>XÁC NHẬN TỔNG QUAN TRƯỚC KHI CẤP MẬT KHẨU</span>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
                      Ước tính: ~{estimatedAccountsCount} tài khoản
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-t border-white/10 pt-3">
                    <div>
                      <div className="text-slate-400 text-[10px]">Lớp thực hiện</div>
                      <div className="font-bold text-white">Lớp {currentClassName}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Nhóm tài khoản</div>
                      <div className="font-bold text-indigo-300">
                        {batchTargetType === 'ALL' ? 'Học viên & Phụ huynh' : batchTargetType === 'STUDENT' ? 'Học viên' : 'Phụ huynh'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Phạm vi áp dụng</div>
                      <div className="font-bold text-white">
                        {batchScope === 'CLASS' ? `Cả lớp (${students.length} HS)` : `${selectedStudentIds.length} HS đã chọn`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isProcessing || targetScopeStudents.length === 0}
                      onClick={handleExecuteBatchGrant}
                      className="flex items-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Đang xử lý cấp mật khẩu...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Xác nhận & Cấp mật khẩu ngay</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* RESULTS VIEW */
              <div className="space-y-4">
                {/* Result header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">
                        Cấp mật khẩu thành công!
                      </h4>
                      <p className="text-xs text-emerald-700">
                        Đã cấp mật khẩu an toàn cho <b>{batchResult.successCount}</b> tài khoản
                        {batchResult.failCount > 0 ? ` (thất bại: ${batchResult.failCount})` : ''} · Lớp {currentClassName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyBatchResult}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao chép gửi Zalo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportBatchExcel}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Xuất Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintBatch}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-600" />
                      <span>In phiếu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchResult(null)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <span>Thực hiện đợt mới</span>
                    </button>
                  </div>
                </div>

                {/* Failures list if any */}
                {batchResult.failures && batchResult.failures.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-rose-900">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Một số tài khoản không thể xử lý:</span>
                    </div>
                    {batchResult.failures.map((f, i) => (
                      <div key={i} className="pl-5">• {f.studentName || f.studentId}: {f.reason}</div>
                    ))}
                  </div>
                )}

                {/* Table of results */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3 w-12 text-center">STT</th>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3">Vai trò</th>
                        <th className="p-3">Mã đăng nhập (Username)</th>
                        <th className="p-3">Mật khẩu mới</th>
                        <th className="p-3 text-right">Sao chép</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchResult.list.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800">
                            {item.studentName}
                            <span className="text-[11px] text-slate-400 font-normal ml-2">({item.studentCode})</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              item.type === 'STUDENT'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {item.type === 'STUDENT' ? 'Học sinh' : 'Phụ huynh'}
                            </span>
                          </td>
                          <td className="p-3">
                            <code className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-xs font-bold text-slate-800">
                              {item.loginCode}
                            </code>
                          </td>
                          <td className="p-3">
                            <code className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 font-mono text-xs font-bold text-amber-800">
                              {item.password || 'Mã truy cập'}
                            </code>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopy(`${item.loginCode} / ${item.password || 'Mã truy cập'}`)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Sao chép tên đăng nhập và mật khẩu"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: AUDIT HISTORY */}
        {/* ============================================================== */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>
                  <b>Nhật ký bảo mật tập trung:</b> Ghi lại chi tiết mọi hành động cấp mật khẩu hàng loạt, cấp lại mã và đổi mật khẩu theo thời gian thực.
                </span>
              </div>
              <button
                type="button"
                onClick={loadHistoryAudits}
                disabled={isLoadingHistory}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shrink-0 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Tải lại</span>
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-16 text-slate-400 text-xs">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Đang tải lịch sử cấp mã từ máy chủ...
              </div>
            ) : historyAudits.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Chưa có sự kiện cấp mã mới nào được ghi nhận.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Học sinh / Đối tượng</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">Hành động</th>
                      <th className="p-3">Phiên bản</th>
                      <th className="p-3">Ghi chú & Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyAudits.map((audit) => {
                      const matchedStudent = students.find(s => s.id === audit.owner_id);
                      const targetName = matchedStudent ? matchedStudent.fullName : audit.owner_id;

                      let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                      let actionText = audit.action;

                      if (audit.action === 'ISSUED_INITIAL') {
                        actionText = 'Cấp mã lần đầu';
                        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      } else if (audit.action === 'REGENERATED') {
                        actionText = 'Cấp lại mã mới';
                        badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                      } else if (audit.action === 'STATUS_CHANGE') {
                        actionText = 'Đổi trạng thái';
                        badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                      } else if (audit.action === 'PASSWORD_SET') {
                        actionText = 'Thiết lập mật khẩu';
                        badgeClass = 'bg-teal-50 text-teal-700 border-teal-200';
                      } else if (audit.action === 'PASSWORD_RESET') {
                        actionText = 'GVCN đặt lại MK cá nhân';
                        badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      } else if (audit.action === 'LOGIN_SUCCESS') {
                        actionText = 'Đăng nhập';
                        badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
                      }

                      return (
                        <tr key={audit.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(audit.created_at).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {targetName}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-600">
                              {audit.role === 'STUDENT' ? 'Học sinh' : audit.role === 'PARENT' ? 'Phụ huynh' : audit.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-[10px] border ${badgeClass}`}>
                              {actionText}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            v{audit.credential_version}
                          </td>
                          <td className="p-3 text-slate-600 text-[11px]">
                            {audit.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-between items-center border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Mã kích hoạt và mật khẩu có giá trị truy cập tài khoản. Chỉ bàn giao cho đúng học sinh và phụ huynh.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>

        {/* Set Password Sub-Modal (Individual Account Only) */}
        {passwordModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Cài đặt Mật khẩu {passwordModal.type === 'STUDENT' ? 'Học sinh' : 'Phụ huynh'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Học sinh: {passwordModal.studentName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordModal(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu mới (Tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="text"
                    value={passwordModal.newPassword}
                    onChange={(e) => setPasswordModal({ ...passwordModal, newPassword: e.target.value })}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sau khi lưu, {passwordModal.type === 'STUDENT' ? 'học sinh' : 'phụ huynh'} có thể dùng mã truy cập kèm mật khẩu này để đăng nhập.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModal(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isProcessing || !passwordModal.newPassword || passwordModal.newPassword.trim().length < 6}
                  onClick={handleSetCustomPasswordSubmit}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Đang lưu...' : 'Lưu Mật Khẩu'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
