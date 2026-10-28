/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  HeartHandshake,
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
  RotateCcw
} from 'lucide-react';
import { Student, AttentionStatus } from '../../types';
import { studentService } from '../../services/StudentService';
import { exportService } from '../../services/ExportService';
import { classService } from '../../services/ClassService';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

const ATTENTION_CATEGORIES_LIST = [
  'Học tập (Yếu/Cần phụ đạo)',
  'Kỷ luật & Nề nếp',
  'Chuyên cần / Vắng nhiều',
  'Gia cảnh đặc biệt / Khó khăn',
  'Tâm lý / Cảm xúc',
  'Sức khỏe / Thể chất',
  'Kỹ năng hòa nhập',
  'Khác'
];

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  monitoring: {
    label: 'Đang theo dõi sát sao',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200'
  },
  supporting: {
    label: 'Đang can thiệp / Hỗ trợ',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  improving: {
    label: 'Đang có tiến bộ',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  resolved: {
    label: 'Đã ổn định / Hoàn thành',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  stable: {
    label: 'Đã ổn định',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  continued_support: {
    label: 'Duy trì hỗ trợ',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  ended: {
    label: 'Kết thúc theo dõi',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200'
  }
};

interface SpecialAttentionTableProps {
  students: Student[];
  onOpenProfile: (student: Student) => void;
  onOpenEdit: (student: Student) => void;
}

export const SpecialAttentionTable: React.FC<SpecialAttentionTableProps> = ({
  students,
  onOpenProfile,
  onOpenEdit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Quick inline edit modal or popover
  const [quickEditStudent, setQuickEditStudent] = useState<Student | null>(null);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editSupportMeasure, setEditSupportMeasure] = useState<string>('');
  const [editAttentionNote, setEditAttentionNote] = useState<string>('');
  const [editStatus, setEditStatus] = useState<AttentionStatus>('monitoring');

  // Add new modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAddStudentId, setSelectedAddStudentId] = useState('');
  const [addCategories, setAddCategories] = useState<string[]>([]);
  const [addSupportMeasure, setAddSupportMeasure] = useState('');
  const [addAttentionNote, setAddAttentionNote] = useState('');
  const [addStatus, setAddStatus] = useState<AttentionStatus>('monitoring');

  const attentionStudents = students.filter(
    s => Boolean(
      s.needsSpecialAttention ||
      s.attentionStatus === 'ended' ||
      s.attentionStatus === 'stopped' ||
      (s.attentionHistory && s.attentionHistory.length > 0)
    )
  );

  const filteredAttentionStudents = attentionStudents.filter(s => {
    const matchSearch =
      searchQuery === '' ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());

    const currentSt = s.attentionStatus || (s.needsSpecialAttention ? 'monitoring' : 'ended');
    const matchStatus =
      statusFilter === 'all'
        ? true
        : currentSt === statusFilter;

    const matchCat =
      categoryFilter === 'all'
        ? true
        : s.attentionCategories?.some(c => {
            const lc = c.toLowerCase();
            const lf = categoryFilter.toLowerCase();
            if (lc.includes(lf) || lf.includes(lc)) return true;
            if (lf.includes('gia cảnh') || lf.includes('gia đình') || lf.includes('hoàn cảnh')) {
              return lc.includes('gia cảnh') || lc.includes('gia đình') || lc.includes('hoàn cảnh');
            }
            if (lf.includes('sức khỏe') || lf.includes('thể chất')) {
              return lc.includes('sức khỏe') || lc.includes('thể chất');
            }
            if (lf.includes('tâm lý') || lf.includes('cảm xúc')) {
              return lc.includes('tâm lý') || lc.includes('cảm xúc');
            }
            return false;
          });

    return matchSearch && matchStatus && matchCat;
  });

  const availableStudentsToAdd = students.filter(s => !s.needsSpecialAttention && s.attentionStatus !== 'ended' && s.attentionStatus !== 'stopped');

  // Statistics
  const countMonitoring = attentionStudents.filter(s => {
    const st = s.attentionStatus || (s.needsSpecialAttention ? 'monitoring' : undefined);
    return s.needsSpecialAttention && st === 'monitoring';
  }).length;
  const countSupporting = attentionStudents.filter(s => {
    const st = s.attentionStatus;
    return s.needsSpecialAttention && (st === 'supporting' || st === 'continued_support');
  }).length;
  const countImproving = attentionStudents.filter(s => s.needsSpecialAttention && s.attentionStatus === 'improving').length;
  const countResolved = attentionStudents.filter(s => s.attentionStatus === 'resolved' || s.attentionStatus === 'stable').length;
  const countEnded = attentionStudents.filter(s => s.attentionStatus === 'ended' || s.attentionStatus === 'stopped').length;

  const [studentToRemoveAttention, setStudentToRemoveAttention] = useState<Student | null>(null);

  const handleOpenQuickEdit = (s: Student) => {
    setQuickEditStudent(s);
    setEditCategories(s.attentionCategories || []);
    setEditSupportMeasure(s.supportMeasure || '');
    setEditAttentionNote(s.attentionNote || s.privateTeacherNotes || '');
    setEditStatus(s.attentionStatus || 'monitoring');
  };

  const handleSaveQuickEdit = () => {
    if (!quickEditStudent) return;

    studentService.updateStudent(quickEditStudent.id, {
      needsSpecialAttention: editStatus !== 'ended' && editStatus !== 'stopped',
      attentionCategories: editCategories,
      supportMeasure: editSupportMeasure.trim(),
      attentionNote: editAttentionNote.trim(),
      attentionStatus: editStatus,
      attentionUpdatedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attentionUpdatedBy: 'GVCN'
    });

    setQuickEditStudent(null);
  };

  const handleToggleRemoveAttention = (student: Student) => {
    setStudentToRemoveAttention(student);
  };

  const confirmRemoveAttention = () => {
    if (studentToRemoveAttention) {
      studentService.stopStudentAttention(studentToRemoveAttention.id, 'GVCN', 'GVCN xác nhận ngừng theo dõi qua bảng quản lý');
      setStudentToRemoveAttention(null);
    }
  };

  const handleResumeAttention = (studentId: string) => {
    studentService.resumeStudentAttention(studentId, 'GVCN');
  };

  const handleSaveAddModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddStudentId) return;

    studentService.updateStudent(selectedAddStudentId, {
      needsSpecialAttention: true,
      attentionCategories: addCategories.length > 0 ? addCategories : ['Học tập (Yếu/Cần phụ đạo)'],
      supportMeasure: addSupportMeasure.trim(),
      attentionNote: addAttentionNote.trim(),
      attentionStatus: addStatus,
      attentionStartedAt: new Date().toLocaleDateString('vi-VN'),
      attentionUpdatedAt: new Date().toLocaleDateString('vi-VN'),
      attentionUpdatedBy: 'GVCN'
    });

    setIsAddModalOpen(false);
    setSelectedAddStudentId('');
    setAddCategories([]);
    setAddSupportMeasure('');
    setAddAttentionNote('');
    setAddStatus('monitoring');
  };

  const handleExportExcel = () => {
    const exportData = filteredAttentionStudents.map((s, idx) => ({
      STT: idx + 1,
      'Mã học sinh': s.code,
      'Họ và tên': s.fullName,
      Tổ: `Tổ ${s.group}`,
      'Phân loại vấn đề': (s.attentionCategories || []).join(', '),
      'Biện pháp hỗ trợ': s.supportMeasure || 'Chưa có',
      'Ghi chú GVCN': s.attentionNote || s.privateTeacherNotes || '',
      'Trạng thái': STATUS_LABELS[s.attentionStatus || 'monitoring']?.label || s.attentionStatus,
      'Ngày bắt đầu': s.attentionStartedAt || '',
      'Cập nhật lần cuối': s.attentionUpdatedAt || ''
    }));

    const cName = classService.getSettings().className || '12A1';
    exportService.exportToExcel(exportData, `Hoc_Vien_Can_Quan_Tam_Dac_Biet_${cName}`, `Quan tâm đặc biệt ${cName}`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Header Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-tight block">
              Tổng số cần quan tâm
            </span>
            <div className="text-2xl font-black text-rose-950 mt-1">{attentionStudents.length}</div>
            <p className="text-[10px] text-rose-600 font-medium">Học viên cần GVCN đồng hành</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-200/80 text-rose-700">
            <HeartHandshake className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-tight block">
              Đang theo dõi / Hỗ trợ
            </span>
            <div className="text-2xl font-black text-amber-950 mt-1">{countMonitoring + countSupporting}</div>
            <p className="text-[10px] text-amber-700 font-medium">Cần hỗ trợ thường xuyên</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200/80 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-tight block">
              Đang có tiến bộ
            </span>
            <div className="text-2xl font-black text-blue-950 mt-1">{countImproving}</div>
            <p className="text-[10px] text-blue-600 font-medium">Có chuyển biến tích cực</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-200/80 text-blue-700">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-tight block">
              Đã ổn định
            </span>
            <div className="text-2xl font-black text-emerald-950 mt-1">{countResolved}</div>
            <p className="text-[10px] text-emerald-600 font-medium">Đạt mục tiêu cải thiện</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-200/80 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mã HS..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-rose-500 focus:outline-hidden"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="monitoring">Đang theo dõi sát sao ({countMonitoring})</option>
            <option value="supporting">Đang can thiệp / Hỗ trợ ({countSupporting})</option>
            <option value="improving">Đang có tiến bộ ({countImproving})</option>
            <option value="resolved">Đã ổn định / Hoàn thành ({countResolved})</option>
            <option value="ended">Đã ngừng theo dõi (Lưu sử) ({countEnded})</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-rose-500 focus:outline-hidden"
          >
            <option value="all">Tất cả phân loại</option>
            <option value="Học tập">Học tập</option>
            <option value="Kỷ luật">Kỷ luật & Nề nếp</option>
            <option value="Chuyên cần">Chuyên cần</option>
            <option value="Gia cảnh">Gia cảnh đặc biệt</option>
            <option value="Tâm lý">Tâm lý / Cảm xúc</option>
            <option value="Sức khỏe">Sức khỏe</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm học viên</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Main Dedicated Management Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-tight">
            <tr>
              <th className="p-3.5 w-12 text-center">STT</th>
              <th className="p-3.5">Học viên</th>
              <th className="p-3.5">Phân loại vấn đề</th>
              <th className="p-3.5">Biện pháp hỗ trợ</th>
              <th className="p-3.5">Ghi chú theo dõi</th>
              <th className="p-3.5">Trạng thái</th>
              <th className="p-3.5">Cập nhật</th>
              <th className="p-3.5 text-right w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAttentionStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-slate-400 italic">
                  Không tìm thấy học viên nào cần quan tâm đặc biệt theo tiêu chí lọc.
                </td>
              </tr>
            ) : (
              filteredAttentionStudents.map((s, idx) => {
                const statusMeta = STATUS_LABELS[s.attentionStatus || 'monitoring'] || STATUS_LABELS.monitoring;

                return (
                  <tr key={`${s.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    
                    {/* Student Info */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={s.avatar}
                          alt={s.fullName}
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-extrabold text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => onOpenProfile(s)}>
                            {s.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {s.code} • Tổ {s.group}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Categories Tags */}
                    <td className="p-3.5 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {s.attentionCategories && s.attentionCategories.length > 0 ? (
                          s.attentionCategories.map(cat => (
                            <span
                              key={cat}
                              className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 shrink-0"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa phân loại</span>
                        )}
                      </div>
                    </td>

                    {/* Support Measure */}
                    <td className="p-3.5 max-w-[220px]">
                      {s.supportMeasure ? (
                        <div className="text-xs text-slate-800 leading-relaxed font-medium line-clamp-2" title={s.supportMeasure}>
                          {s.supportMeasure}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Chưa nhập biện pháp</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="p-3.5 max-w-[220px]">
                      {s.attentionNote || s.privateTeacherNotes ? (
                        <div className="text-xs text-slate-600 leading-relaxed line-clamp-2" title={s.attentionNote || s.privateTeacherNotes}>
                          {s.attentionNote || s.privateTeacherNotes}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Chưa có ghi chú</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-black border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                        {statusMeta.label}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className="p-3.5 text-[10px] text-slate-500 whitespace-nowrap">
                      {s.attentionUpdatedAt || s.attentionStartedAt || 'Chưa rõ'}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenQuickEdit(s)}
                          title="Cập nhật nhanh"
                          className="rounded-lg bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenProfile(s)}
                          title="Xem hồ sơ chi tiết"
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {s.attentionStatus === 'ended' || s.attentionStatus === 'stopped' ? (
                          <button
                            onClick={() => handleResumeAttention(s.id)}
                            title="Tiếp tục theo dõi lại"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleRemoveAttention(s)}
                            title="Ngừng theo dõi (Lưu sử)"
                            className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Edit Modal */}
      {quickEditStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    CẬP NHẬT THEO DÕI: {quickEditStudent.fullName}
                  </h3>
                  <p className="text-[10px] text-slate-400">{quickEditStudent.code} • Tổ {quickEditStudent.group}</p>
                </div>
              </div>
              <button
                onClick={() => setQuickEditStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Categories */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Phân loại vấn đề cần quan tâm:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ATTENTION_CATEGORIES_LIST.map(cat => {
                    const isChecked = editCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`flex items-center gap-2 rounded-xl p-2 border cursor-pointer text-xs font-bold transition-all ${
                          isChecked ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setEditCategories([...editCategories, cat]);
                            } else {
                              setEditCategories(editCategories.filter(c => c !== cat));
                            }
                          }}
                          className="h-3.5 w-3.5 text-rose-600 rounded-sm"
                        />
                        <span className="truncate">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Trạng thái theo dõi:
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as AttentionStatus)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-hidden"
                >
                  <option value="monitoring">Đang theo dõi sát sao</option>
                  <option value="supporting">Đang can thiệp / Hỗ trợ</option>
                  <option value="improving">Đang có tiến bộ</option>
                  <option value="resolved">Đã ổn định / Hoàn thành mục tiêu</option>
                  <option value="continued_support">Duy trì hỗ trợ định kỳ</option>
                </select>
              </div>

              {/* Support Measure */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Biện pháp hỗ trợ / Kế hoạch đồng hành:
                </label>
                <textarea
                  value={editSupportMeasure}
                  onChange={e => setEditSupportMeasure(e.target.value)}
                  placeholder="Ví dụ: Phụ đạo thêm Toán thứ 3, 5; Phân công cán sự kèm cặp; Thường xuyên trao đổi với phụ huynh..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Attention Note */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Ghi chú theo dõi & Diễn biến:
                </label>
                <textarea
                  value={editAttentionNote}
                  onChange={e => setEditAttentionNote(e.target.value)}
                  placeholder="Ghi chú chi tiết về tình hình học tập, thái độ, sự tiến bộ qua từng tuần..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setQuickEditStudent(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveQuickEdit}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Lưu cập nhật</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Attention Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSaveAddModal} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 font-bold">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    THÊM HỌC VIÊN VÀO DIỆN QUAN TÂM ĐẶC BIỆT
                  </h3>
                  <p className="text-[10px] text-slate-400">Theo dõi nội bộ riêng của Giáo viên chủ nhiệm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Select Student */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Chọn học viên <span className="text-rose-500">*</span>:
                </label>
                <select
                  required
                  value={selectedAddStudentId}
                  onChange={e => setSelectedAddStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-hidden"
                >
                  <option value="">-- Chọn học viên từ danh sách lớp --</option>
                  {availableStudentsToAdd.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.fullName} (Tổ {s.group})
                    </option>
                  ))}
                </select>
              </div>

              {/* Categories */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Lĩnh vực cần quan tâm:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ATTENTION_CATEGORIES_LIST.map(cat => {
                    const isChecked = addCategories.includes(cat);
                    return (
                      <label
                        key={`add-${cat}`}
                        className={`flex items-center gap-2 rounded-xl p-2 border cursor-pointer text-xs font-bold transition-all ${
                          isChecked ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setAddCategories([...addCategories, cat]);
                            } else {
                              setAddCategories(addCategories.filter(c => c !== cat));
                            }
                          }}
                          className="h-3.5 w-3.5 text-rose-600 rounded-sm"
                        />
                        <span className="truncate">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Trạng thái khởi tạo:
                </label>
                <select
                  value={addStatus}
                  onChange={e => setAddStatus(e.target.value as AttentionStatus)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-hidden"
                >
                  <option value="monitoring">Đang theo dõi sát sao</option>
                  <option value="supporting">Đang can thiệp / Hỗ trợ</option>
                  <option value="improving">Đang có tiến bộ</option>
                </select>
              </div>

              {/* Support Measure */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Biện pháp hỗ trợ dự kiến:
                </label>
                <textarea
                  value={addSupportMeasure}
                  onChange={e => setAddSupportMeasure(e.target.value)}
                  placeholder="Kế hoạch phụ đạo, bố trí chỗ ngồi, liên hệ phụ huynh..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Attention Note */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase text-[11px] block">
                  Ghi chú ban đầu:
                </label>
                <textarea
                  value={addAttentionNote}
                  onChange={e => setAddAttentionNote(e.target.value)}
                  placeholder="Lý do chi tiết đưa học viên vào danh sách cần quan tâm..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!selectedAddStudentId}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Thêm vào theo dõi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Stopping Special Attention (Preserving History) */}
      <ConfirmDeleteModal
        isOpen={!!studentToRemoveAttention}
        title="Ngừng theo dõi diện quan tâm"
        itemName={studentToRemoveAttention ? `${studentToRemoveAttention.fullName} (Mã: ${studentToRemoveAttention.code})` : undefined}
        message="Thầy/Cô có xác nhận ngừng theo dõi đối với học viên này? Lưu ý: Mọi lịch sử vi phạm, nhật ký và ghi chú trước đây vẫn được lưu trữ nguyên vẹn để GVCN tra cứu lại bất cứ lúc nào."
        confirmText="Xác nhận ngừng theo dõi"
        cancelText="Hủy bỏ"
        onConfirm={confirmRemoveAttention}
        onClose={() => setStudentToRemoveAttention(null)}
      />
    </div>
  );
};
