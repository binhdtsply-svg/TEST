import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Loader2,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import { tenantService } from '../../services/TenantService';
import { auditService } from '../../services/AuditService';

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  tenantId: string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  schoolName: string;
  className: string;
  academicYear: string;
  teacherName: string;
  teacherEmail: string;
  totalStudents: number;
  totalCredentials: number;
  status: string;
  plan: string;
}

export const DeleteWorkspaceModal: React.FC<DeleteWorkspaceModalProps> = ({
  isOpen,
  tenantId,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      setLoading(true);
      setConfirmInput('');
      setErrorMessage(null);
      tenantService
        .getWorkspaceDeletionSummary(tenantId)
        .then(data => {
          setSummary(data);
          setLoading(false);
        })
        .catch(err => {
          setErrorMessage(err.message || 'Không thể tải thông tin không gian lớp.');
          setLoading(false);
        });
    } else {
      setSummary(null);
      setConfirmInput('');
      setErrorMessage(null);
      setIsDeleting(false);
    }
  }, [isOpen, tenantId]);

  if (!isOpen || !tenantId) return null;

  const isConfirmed = summary ? confirmInput.trim() === summary.name.trim() : false;

  const handleDelete = async () => {
    if (!summary || !isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await tenantService.deleteWorkspacePermanently(summary.id, confirmInput.trim());

      auditService.log(
        'Xóa vĩnh viễn không gian lớp',
        'SUPER_ADMIN',
        `${summary.name} (${summary.id})`,
        `Admin đã xóa vĩnh viễn không gian lớp ${summary.name}, trường ${summary.schoolName}, GVCN ${summary.teacherName}. Toàn bộ dữ liệu lớp học đã được giải phóng an toàn.`
      );

      onSuccess(result.message);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể xóa không gian lớp. Dữ liệu chưa bị thay đổi. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-workspace-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-rose-200 overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 id="delete-workspace-title" className="text-base font-black text-rose-900">
                Xóa Vĩnh Viễn Không Gian Lớp
              </h3>
              <p className="text-xs font-semibold text-rose-700">
                Thao tác quản trị cấp cao • Giải phóng lưu trữ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
              <p className="text-xs font-medium text-slate-500">Đang tải thông tin không gian lớp...</p>
            </div>
          ) : summary ? (
            <>
              {/* Critical Warning Box */}
              <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200 flex items-start gap-3.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-rose-950 leading-relaxed">
                  <p className="font-bold">
                    CẢNH BÁO QUAN TRỌNG:
                  </p>
                  <p>
                    Thao tác này sẽ <strong className="underline decoration-rose-500">xóa vĩnh viễn không gian lớp và toàn bộ dữ liệu</strong> thuộc không gian này (danh sách học sinh, sổ điểm, hạnh kiểm, khảo sát, bảng tin, bài tập, thời khóa biểu).
                  </p>
                  <p className="font-semibold text-rose-800">
                    Dữ liệu đã xóa không thể khôi phục bằng thao tác thông thường. Chỉ thực hiện khi chắc chắn đây là lớp cần xóa.
                  </p>
                </div>
              </div>

              {/* Workspace Metadata Details */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Tên không gian:</span>
                  <span className="font-black text-slate-900">{summary.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" /> Mã ID không gian:
                  </span>
                  <code className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {summary.id}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> Lớp phân công:
                  </span>
                  <span className="font-bold text-slate-800">{summary.className} ({summary.schoolName})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Năm học:
                  </span>
                  <span className="font-semibold text-slate-700">{summary.academicYear}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> GVCN phụ trách:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {summary.teacherName} {summary.teacherEmail ? `(${summary.teacherEmail})` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-blue-600" /> Học viên:
                    </span>
                    <span className="font-black text-blue-700">{summary.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5 text-emerald-600" /> Tài khoản:
                    </span>
                    <span className="font-black text-emerald-700">{summary.totalCredentials}</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Double Confirmation Input */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  Xác nhận lần 2: Nhập chính xác tên không gian lớp để xóa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={e => setConfirmInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    placeholder={summary.name}
                    disabled={isDeleting}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all focus:outline-hidden ${
                      isConfirmed
                        ? 'border-emerald-500 bg-emerald-50/40 text-slate-900 focus:ring-2 focus:ring-emerald-200'
                        : 'border-slate-300 bg-slate-50 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-200'
                    }`}
                  />
                  {isConfirmed && (
                    <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Tên cần nhập: <strong className="font-bold text-slate-700 select-all">{summary.name}</strong>
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="rounded-xl bg-rose-100/80 p-3 border border-rose-300 text-xs text-rose-800 font-medium">
                  {errorMessage}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500 text-center py-6">
              {errorMessage || 'Không tìm thấy dữ liệu không gian lớp.'}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting || loading}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition-all ${
              isConfirmed && !isDeleting
                ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-rose-600/30'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang xóa vĩnh viễn...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Xóa vĩnh viễn</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
