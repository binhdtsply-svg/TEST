/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { ActivityPost, ActivityRegistration, Student } from '../../types';
import { activityService } from '../../services/ActivityService';
import { studentService } from '../../services/StudentService';
import { authService } from '../../services/AuthService';

interface ActivityRegistrationsModalProps {
  activity: ActivityPost;
  onClose: () => void;
}

export const ActivityRegistrationsModal: React.FC<ActivityRegistrationsModalProps> = ({
  activity,
  onClose
}) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN';

  const [registrations, setRegistrations] = useState<ActivityRegistration[]>(
    activity.registrations || []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Add student manually state
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const allStudents = studentService.getAll();

  const handleStatusChange = (
    registrationId: string,
    newStatus: ActivityRegistration['status']
  ) => {
    if (!isTeacher) return;
    activityService.updateRegistrationStatus(activity.id, registrationId, newStatus);
    setRegistrations(activityService.getRegistrationsForActivity(activity.id));
  };

  const handleManualRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTeacher || !selectedStudentId) return;

    const student = studentService.getById(selectedStudentId);
    if (!student) return;

    activityService.registerStudentForActivity(activity.id, student, manualNotes);
    setRegistrations(activityService.getRegistrationsForActivity(activity.id));
    setIsManualAddOpen(false);
    setSelectedStudentId('');
    setManualNotes('');
  };

  // Filter registrations
  const filteredRegs = registrations.filter((reg) => {
    if (selectedStatus !== 'all' && reg.status !== selectedStatus) return false;
    if (selectedGroup !== 'all' && reg.groupOrTeam !== selectedGroup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = reg.studentName.toLowerCase().includes(q);
      const matchCode = (reg.studentCode || '').toLowerCase().includes(q);
      const matchNote = (reg.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchNote) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRegs.length / pageSize) || 1;
  const paginatedRegs = filteredRegs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const activeCount = registrations.filter((r) => r.status !== 'cancelled').length;
  const attendedCount = registrations.filter((r) => r.status === 'attended').length;

  const handleExportCSV = () => {
    if (!isTeacher) return;
    const headers = ['STT', 'Mã Học Sinh', 'Họ Và Tên', 'Tổ / Nhóm', 'Thời Gian Đăng Ký', 'Trạng Thái', 'Ghi Chú'];
    const rows = filteredRegs.map((r, i) => [
      i + 1,
      `"${r.studentCode || ''}"`,
      `"${r.studentName}"`,
      `"${r.groupOrTeam || ''}"`,
      `"${r.registeredAt}"`,
      `"${r.status === 'registered' ? 'Đã đăng ký' : r.status === 'attended' ? 'Đã tham gia' : r.status === 'absent' ? 'Vắng mặt' : 'Đã hủy'}"`,
      `"${r.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Danh_sach_dang_ky_${activity.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Danh Sách Đăng Ký Tham Gia
                </h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  {activeCount} {activity.maxParticipants ? `/ ${activity.maxParticipants}` : ''} học sinh
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 max-w-lg mt-0.5">
                {activity.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeacher && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Xuất file danh sách"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Xuất Excel/CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng lượt đăng ký</span>
            <p className="text-lg font-black text-blue-600">{activeCount}</p>
          </div>
          <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Đã tham gia</span>
            <p className="text-lg font-black text-emerald-600">{attendedCount}</p>
          </div>
          <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Hạn chót đăng ký</span>
            <p className="text-xs font-bold text-slate-700 mt-1">
              {activity.registrationDeadline ? activity.registrationDeadline : 'Không giới hạn'}
            </p>
          </div>
          <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Chỉ tiêu tối đa</span>
            <p className="text-xs font-bold text-slate-700 mt-1">
              {activity.maxParticipants ? `${activity.maxParticipants} học sinh` : 'Toàn thể lớp'}
            </p>
          </div>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên, mã số, ghi chú..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Filter by Group */}
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả tổ</option>
              <option value="Tổ 1">Tổ 1</option>
              <option value="Tổ 2">Tổ 2</option>
              <option value="Tổ 3">Tổ 3</option>
              <option value="Tổ 4">Tổ 4</option>
            </select>

            {/* Filter by Status */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="registered">Đã đăng ký</option>
              <option value="attended">Đã tham gia</option>
              <option value="absent">Vắng mặt</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <button
            onClick={() => setIsManualAddOpen(!isManualAddOpen)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm học sinh</span>
          </button>
        </div>

        {/* Manual Add Inline Card */}
        {isManualAddOpen && (
          <form
            onSubmit={handleManualRegister}
            className="m-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-end gap-3 animate-fade-in text-xs"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-blue-900 mb-1">
                Chọn học sinh ghi danh
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full rounded-xl border border-blue-200 bg-white p-2 text-xs text-slate-800"
              >
                <option value="">-- Chọn học sinh từ danh sách lớp --</option>
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.code || s.id}) - {s.group ? `Tổ ${s.group}` : 'Chưa xếp tổ'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-blue-900 mb-1">
                Ghi chú / Phân công vị trí
              </label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Ví dụ: Đội trưởng, chuẩn bị hoa..."
                className="w-full rounded-xl border border-blue-200 bg-white p-2 text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => setIsManualAddOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {paginatedRegs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Users className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Không có học sinh nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-0.5">Thử thay đổi bộ lọc tìm kiếm hoặc tổ chức lại</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-3 w-12">STT</th>
                    <th className="pb-3">Học viên</th>
                    <th className="pb-3 w-24">Tổ</th>
                    <th className="pb-3 w-36">Thời gian đăng ký</th>
                    <th className="pb-3">Ghi chú</th>
                    <th className="pb-3 w-36 pr-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRegs.map((reg, idx) => {
                    const stt = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pl-3 font-semibold text-slate-400">{stt}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={reg.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                              alt={reg.studentName}
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{reg.studentName}</p>
                              {reg.studentCode && (
                                <p className="text-[10px] text-slate-400">{reg.studentCode}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            {reg.groupOrTeam || 'Tổ 1'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500">{reg.registeredAt}</td>
                        <td className="py-3 text-slate-600 italic">
                          {reg.notes || '—'}
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={reg.status || 'registered'}
                            onChange={(e) =>
                              handleStatusChange(reg.id, e.target.value as any)
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors ${
                              reg.status === 'attended'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : reg.status === 'absent'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : reg.status === 'cancelled'
                                ? 'border-slate-200 bg-slate-100 text-slate-500'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}
                          >
                            <option value="registered">Đã đăng ký</option>
                            <option value="attended">Đã tham gia</option>
                            <option value="absent">Vắng mặt</option>
                            <option value="cancelled">Đã hủy</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-slate-50/50 text-xs">
          <span className="text-slate-500 font-medium">
            Hiển thị {filteredRegs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, filteredRegs.length)} trong tổng số{' '}
            <strong>{filteredRegs.length}</strong> học sinh
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-bold text-slate-700">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
