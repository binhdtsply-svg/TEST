/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Edit3,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  User,
  Calendar,
  FileText,
  MessageCircle,
  ShieldCheck,
  History,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Paperclip
} from 'lucide-react';
import {
  Submission,
  SubmissionStatus,
  UserAccount,
  AuditLog,
  AttachedFile
} from '../../types';
import { authService } from '../../services/AuthService';
import { submissionService } from '../../services/SubmissionService';
import { auditService } from '../../services/AuditService';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';
import { FilePreviewModal } from '../common/FilePreviewModal';

interface ApprovalCenterModuleProps {
  onOpenStudentProfile?: (studentId: string) => void;
  initialTab?: 'pending' | 'approved' | 'edited_and_approved' | 'rejected' | 'my_submissions' | 'audit_logs';
  highlightProposalId?: string;
}

const REJECTION_REASONS = [
  'Thông tin chưa chính xác',
  'Thiếu minh chứng / hình ảnh xác nhận',
  'Trùng lặp nội dung đã được ghi nhận',
  'Sai học viên',
  'Sai số điểm quy định theo nội quy',
  'Hết thời hạn đề xuất quy định',
  'Lý do khác'
];

export const ApprovalCenterModule: React.FC<ApprovalCenterModuleProps> = ({
  onOpenStudentProfile,
  initialTab,
  highlightProposalId
}) => {
  const [currentUser, setCurrentUser] = useState<UserAccount>(authService.getCurrentUser());
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'edited_and_approved' | 'rejected' | 'my_submissions' | 'audit_logs'>(
    initialTab || 'pending'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [previewFilesList, setPreviewFilesList] = useState<AttachedFile[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | undefined>(highlightProposalId);

  // Sync initialTab when changed from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync highlightProposalId
  useEffect(() => {
    if (highlightProposalId) {
      setHighlightedId(highlightProposalId);
      const timer = setTimeout(() => {
        // Scroll to highlighted element if present
        const el = document.getElementById(`proposal-card-${highlightProposalId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightProposalId]);

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Edit modal form
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPoints, setEditPoints] = useState(0);
  const [editNote, setEditNote] = useState('');
  const [editParentVisible, setEditParentVisible] = useState(true);

  // Reject modal form
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  // Create submission form
  const students = studentService.getAll();
  const [newStudentId, setNewStudentId] = useState(students[0]?.id || 'hs-01');
  const [newType, setNewType] = useState('good_deed');
  const [newCategory, setNewCategory] = useState('Việc tốt & Giúp bạn');
  const [newDescription, setNewDescription] = useState('');
  const [newPoints, setNewPoints] = useState(5);
  const [newEventDate, setNewEventDate] = useState(new Date().toLocaleDateString('vi-VN'));
  const [newSession, setNewSession] = useState('Sáng');
  const [newParentVisible, setNewParentVisible] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getCurrentUser());
    });

    const loadData = () => {
      setSubmissions(submissionService.getAll());
      setAuditLogs(auditService.getLogs());
    };

    loadData();
    const unsubSub = submissionService.subscribe(loadData);
    const unsubAudit = auditService.subscribe(loadData);

    return () => {
      unsubAuth();
      unsubSub();
      unsubAudit();
    };
  }, []);

  const isTeacher = currentUser.role === 'TEACHER';
  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  // Set default tab based on role
  useEffect(() => {
    if (!isTeacher && activeTab === 'pending') {
      setActiveTab('my_submissions');
    }
  }, [isTeacher]);

  // Tab counts
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const editedCount = submissions.filter(s => s.status === 'edited_and_approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;
  const mySubmissionsCount = submissions.filter(s => s.proposedById === currentUser.id).length;

  // Filter items
  const filteredList = submissions.filter(s => {
    if (activeTab === 'my_submissions') {
      if (s.proposedById !== currentUser.id && s.studentId !== currentUser.id) return false;
    } else if (activeTab !== 'audit_logs') {
      if (s.status !== activeTab) return false;
    }

    if (selectedCategory !== 'all' && s.category !== selectedCategory) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.studentName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.proposedBy.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Action 1: [DUYỆT]
  const handleApprove = (sub: Submission) => {
    try {
      submissionService.approveSubmission(sub.id, currentUser);
    } catch (e: any) {
      console.error('Error approving submission:', e);
    }
  };

  // Action 2: Open [CHỈNH SỬA & DUYỆT] Modal
  const handleOpenEdit = (sub: Submission) => {
    setSelectedSub(sub);
    setEditCategory(sub.category);
    setEditDescription(sub.description);
    setEditPoints(sub.proposedPoints || 0);
    setEditNote(sub.reviewerNote || '');
    setEditParentVisible(sub.parentVisible !== undefined ? sub.parentVisible : true);
    setIsEditModalOpen(true);
  };

  const handleSaveEditAndApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    submissionService.editAndApproveSubmission(selectedSub.id, currentUser, {
      category: editCategory,
      description: editDescription,
      proposedPoints: Number(editPoints),
      reviewerNote: editNote.trim(),
      parentVisible: editParentVisible
    });

    setIsEditModalOpen(false);
    setSelectedSub(null);
  };

  // Action 3: Open [TỪ CHỐI] Modal
  const handleOpenReject = (sub: Submission) => {
    setSelectedSub(sub);
    setRejectReason(REJECTION_REASONS[0]);
    setCustomRejectReason('');
    setRejectNote('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    const finalReason = rejectReason === 'Lý do khác'
      ? (customRejectReason.trim() || 'Lý do khác')
      : rejectReason;

    submissionService.rejectSubmission(selectedSub.id, currentUser, finalReason, rejectNote);
    setIsRejectModalOpen(false);
    setSelectedSub(null);
  };

  // Create new proposal
  const handleCreateSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = students.find(s => s.id === newStudentId);
    if (!targetStudent) return;

    const res = submissionService.createSubmission(
      {
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        studentGroup: targetStudent.group,
        submissionType: newType,
        category: newCategory,
        description: newDescription,
        proposedPoints: Number(newPoints),
        eventDate: newEventDate,
        session: newSession,
        parentVisible: newParentVisible
      },
      currentUser
    );

    if (!res.success) {
      setCreateError(res.error || 'Có lỗi xảy ra!');
      return;
    }

    setIsNewModalOpen(false);
    setNewDescription('');
    setCreateError(null);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Trung tâm xét duyệt & phản hồi của GVCN
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Xét duyệt minh bạch các đề xuất điểm rèn luyện, việc tốt, báo bài và phản hồi học viên
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isTeacher ? '+ Ghi nhận / Tạo đề xuất' : '+ Gửi đề xuất mới'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {isTeacher && (
          <>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ GVCN duyệt</span>
              {pendingCount > 0 && (
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'pending' ? 'bg-white text-orange-700' : 'bg-orange-100 text-orange-800'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã duyệt ({approvedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('edited_and_approved')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'edited_and_approved'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>GVCN đã chỉnh sửa & duyệt ({editedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Từ chối ({rejectedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'audit_logs'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Nhật ký kiểm toán ({auditLogs.length})</span>
            </button>
          </>
        )}

        {/* Tab for Students & Officers */}
        <button
          onClick={() => setActiveTab('my_submissions')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'my_submissions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Đề xuất của tôi ({mySubmissionsCount})</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      {activeTab !== 'audit_logs' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-hidden"
            >
              <option value="all">Tất cả phân loại</option>
              <option value="Việc tốt & Giúp bạn">Việc tốt & Giúp bạn</option>
              <option value="Tiến bộ vượt bậc">Tiến bộ vượt bậc</option>
              <option value="Đề xuất điều chỉnh điểm rèn luyện">Đề xuất chỉnh điểm</option>
              <option value="Xin nghỉ học có phép">Nghỉ học có phép</option>
              <option value="Vi phạm trật tự">Vi phạm nội quy</option>
            </select>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo học viên, người gửi, nội dung..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* Content Display */}
      {activeTab === 'audit_logs' ? (
        /* Audit Logs Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Lịch sử thao tác & Nhật ký hệ thống (Audit Logs)
            </h3>
            <span className="text-xs text-slate-500">Tự động ghi nhận mọi hành động duyệt/sửa/xóa</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Thời gian</th>
                  <th className="p-3.5">Hành động</th>
                  <th className="p-3.5">Người thực hiện</th>
                  <th className="p-3.5">Đối tượng</th>
                  <th className="p-3.5">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.action.includes('APPROVED')
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action.includes('EDITED')
                          ? 'bg-blue-100 text-blue-800'
                          : log.action.includes('REJECTED')
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                      {log.performedBy || log.actorId}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 whitespace-nowrap">
                      {log.target || log.targetId}
                    </td>
                    <td className="p-3.5 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Không có đề xuất nào trong danh mục này</h3>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'pending'
              ? 'Tất cả các đề xuất của ban cán sự và học viên đã được xử lý xong!'
              : 'Chưa có dữ liệu cho mục này.'}
          </p>
        </div>
      ) : (
        /* List of Submissions Cards */
        <div className="space-y-3.5">
          {filteredList.map(sub => {
            const isPending = sub.status === 'pending';
            const isApproved = sub.status === 'approved';
            const isEdited = sub.status === 'edited_and_approved';
            const isRejected = sub.status === 'rejected';

            const isHighlighted = highlightedId === sub.id;

            return (
              <div
                key={sub.id}
                id={`proposal-card-${sub.id}`}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-sm ${
                  isHighlighted
                    ? 'border-orange-500 ring-4 ring-orange-300/60 shadow-md scale-[1.005]'
                    : isPending
                    ? 'border-orange-300 ring-1 ring-orange-100'
                    : isRejected
                    ? 'border-red-200 bg-red-50/20'
                    : isEdited
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Main Information */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        Tổ {sub.studentGroup || 1} • {sub.studentName}
                      </span>

                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {sub.category}
                      </span>

                      {/* Points badge */}
                      {sub.proposedPoints !== undefined && sub.proposedPoints !== 0 && (
                        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                          sub.proposedPoints > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {sub.proposedPoints > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {sub.proposedPoints > 0 ? `+${sub.proposedPoints} điểm` : `${sub.proposedPoints} điểm`}
                        </span>
                      )}

                      {/* Status indicator */}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isPending
                          ? 'bg-orange-100 text-orange-800'
                          : isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isEdited
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isPending
                          ? '🟠 Đang chờ GVCN duyệt'
                          : isApproved
                          ? '🟢 GVCN đã duyệt'
                          : isEdited
                          ? '🔵 GVCN đã điều chỉnh & duyệt'
                          : '🔴 GVCN từ chối'}
                      </span>
                    </div>

                    {/* Description text */}
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {sub.description}
                    </p>

                    {/* Compare Edited version if edited */}
                    {isEdited && sub.originalData && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-1">
                        <p className="font-bold text-blue-900 flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Chi tiết GVCN điều chỉnh:</span>
                        </p>
                        <p className="text-slate-600">
                          Điểm đề xuất ban đầu: <strong className="text-slate-800">{sub.originalData.proposedPoints >= 0 ? `+${sub.originalData.proposedPoints}` : sub.originalData.proposedPoints}đ</strong> → Điểm duyệt chính thức: <strong className="text-blue-700">{sub.proposedPoints && sub.proposedPoints >= 0 ? `+${sub.proposedPoints}` : sub.proposedPoints}đ</strong>
                        </p>
                        {sub.reviewerNote && (
                          <p className="text-blue-800 italic mt-0.5">
                            Lời nhắn của Cô: "{sub.reviewerNote}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection reason & note */}
                    {isRejected && (
                      <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs space-y-1">
                        <p className="font-bold text-red-900 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Lý do từ chối: {sub.rejectionReason}</span>
                        </p>
                        {sub.reviewerNote && (
                          <p className="text-red-800 italic">
                            Lời nhắn của GVCN: "{sub.reviewerNote}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Meta info & Evidence attachments */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Đề xuất bởi: <strong className="text-slate-700">{sub.proposedBy}</strong> ({sub.proposedByRole === 'TEACHER' ? 'GVCN' : sub.proposedByRole === 'CLASS_OFFICER' ? 'Ban cán sự' : sub.proposedByRole === 'PARENT' ? 'Phụ huynh' : 'Học sinh'})</span>
                      <span>•</span>
                      <span>Ngày gửi: {sub.proposedAt}</span>
                      {sub.reviewedBy && (
                        <>
                          <span>•</span>
                          <span>Duyệt bởi: <strong className="text-purple-700">{sub.reviewedBy}</strong> ({sub.reviewedAt})</span>
                        </>
                      )}
                    </div>

                    {/* Evidence files */}
                    {sub.evidence && sub.evidence.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span>Minh chứng đính kèm ({sub.evidence.length}):</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {sub.evidence.map(ev => {
                            const isImg =
                              ev.type === 'image' ||
                              /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(ev.name || '') ||
                              (ev.url && (ev.url.includes('images.unsplash.com') || ev.url.startsWith('data:image/')));

                            return (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => {
                                  setPreviewFile(ev);
                                  setPreviewFilesList(sub.evidence || [ev]);
                                }}
                                className="group relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50/80 hover:text-blue-700 transition-all cursor-pointer shadow-2xs"
                                title={`Nhấp để xem: ${ev.name}`}
                              >
                                {isImg ? (
                                  <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-200">
                                    <img
                                      src={ev.url}
                                      alt={ev.name}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                )}
                                <span className="max-w-[140px] truncate">{ev.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal">({ev.size || 'Tệp tin'})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right 3 Mandatory Action Buttons (GVCN only for Pending) */}
                  {isTeacher && isPending && (
                    <div className="flex lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-4">
                      {/* Button 1: DUYỆT */}
                      <button
                        onClick={() => handleApprove(sub)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Duyệt nguyên trạng và cộng/trừ điểm ngay"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>[DUYỆT]</span>
                      </button>

                      {/* Button 2: CHỈNH SỬA & DUYỆT */}
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Điều chỉnh số điểm, nội dung rồi duyệt"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>[CHỈNH SỬA & DUYỆT]</span>
                      </button>

                      {/* Button 3: TỪ CHỐI */}
                      <button
                        onClick={() => handleOpenReject(sub)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Từ chối đề xuất kèm lý do và phản hồi"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>[TỪ CHỐI]</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: [CHỈNH SỬA & DUYỆT] */}
      {isEditModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chỉnh sửa & Duyệt đề xuất
                </h3>
                <p className="text-xs text-slate-500">
                  Học viên: <strong className="text-slate-800">{selectedSub.studentName}</strong> (Tổ {selectedSub.studentGroup})
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAndApprove} className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <strong>Đề xuất gốc từ {selectedSub.proposedBy}:</strong> "{selectedSub.description}" ({selectedSub.proposedPoints && selectedSub.proposedPoints >= 0 ? `+${selectedSub.proposedPoints}` : selectedSub.proposedPoints}đ)
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phân loại
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung điều chỉnh
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Số điểm duyệt chính thức (+ hoặc -)
                </label>
                <input
                  type="number"
                  value={editPoints}
                  onChange={e => setEditPoints(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ghi chú / Lời nhắn của GVCN gửi học viên
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  placeholder="VD: Cô điều chỉnh lại điểm theo khung quy chế nhé..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editParentVis"
                  checked={editParentVisible}
                  onChange={e => setEditParentVisible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editParentVis" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Hiển thị trong nhật ký theo dõi của Phụ huynh
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Lưu thay đổi & Duyệt ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: [TỪ CHỐI] */}
      {isRejectModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-red-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Từ chối đề xuất
                </h3>
                <p className="text-xs text-red-700">
                  Học viên: {selectedSub.studentName} ({selectedSub.proposedBy})
                </p>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1.5 text-red-400 hover:text-red-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lý do từ chối (Bắt buộc)
                </label>
                <select
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden"
                >
                  {REJECTION_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {rejectReason === 'Lý do khác' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nhập lý do cụ thể
                  </label>
                  <input
                    type="text"
                    required
                    value={customRejectReason}
                    onChange={e => setCustomRejectReason(e.target.value)}
                    placeholder="Nhập lý do từ chối..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ghi chú / Lời nhắn bổ sung của GVCN
                </label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Nhập lời dặn dò học viên hoặc yêu cầu nộp lại..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Gửi đề xuất mới */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isTeacher ? 'GVCN Ghi nhận đề xuất mới' : 'Gửi đề xuất tới GVCN'}
                </h3>
                <p className="text-xs text-slate-500">
                  Người gửi: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role === 'TEACHER' ? 'GVCN' : currentUser.role === 'CLASS_OFFICER' ? 'Ban cán sự' : 'Học sinh'})
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmission} className="p-6 space-y-4 overflow-y-auto">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chọn học viên
                </label>
                <select
                  value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      Tổ {s.group} - {s.fullName} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Loại đề xuất
                  </label>
                  <select
                    value={newType}
                    onChange={e => {
                      setNewType(e.target.value);
                      if (e.target.value === 'good_deed') setNewCategory('Việc tốt & Giúp bạn');
                      if (e.target.value === 'progress') setNewCategory('Tiến bộ vượt bậc');
                      if (e.target.value === 'leave_permitted') {
                        setNewCategory('Xin nghỉ học có phép');
                        setNewPoints(0);
                      }
                      if (e.target.value === 'violation') {
                        setNewCategory('Vi phạm nội quy');
                        setNewPoints(-3);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden"
                  >
                    <option value="good_deed">⭐ Việc tốt & Giúp bạn</option>
                    <option value="progress">📈 Tiến bộ vượt bậc</option>
                    <option value="reward">🏆 Khen thưởng</option>
                    <option value="leave_permitted">📝 Nghỉ học có phép</option>
                    <option value="violation">⚠️ Vi phạm nội quy</option>
                    <option value="training_error">🔄 Đề xuất chỉnh điểm rèn luyện</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Số điểm đề xuất (+ / -)
                  </label>
                  <input
                    type="number"
                    value={newPoints}
                    onChange={e => setNewPoints(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung chi tiết & Lý do
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Mô tả cụ thể hành động, thời gian, sự việc..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newParentVis"
                  checked={newParentVisible}
                  onChange={e => setNewParentVisible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="newParentVis" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Hiển thị trong nhật ký theo dõi của Phụ huynh
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Gửi đề xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global In-App File & Image Viewer */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          filesList={previewFilesList}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};
