/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Phone, MapPin, Sparkles, HeartHandshake, ShieldAlert, CheckSquare, Square, Calendar, Trash2 } from 'lucide-react';
import { Student, AttentionStatus } from '../../types';
import { studentService } from '../../services/StudentService';
import { authService } from '../../services/AuthService';

const ATTENTION_CATEGORIES = [
  'Học tập',
  'Chuyên cần',
  'Nề nếp',
  'Tâm lý / cảm xúc',
  'Quan hệ bạn bè',
  'Hoàn cảnh gia đình',
  'Sức khỏe / thể chất',
  'Định hướng nghề nghiệp',
  'Nguy cơ bỏ học',
  'Khác'
];

interface StudentEditModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onDeleteStudent?: (student: Student) => void;
}

export const StudentEditModal: React.FC<StudentEditModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaved,
  onDeleteStudent
}) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  const [formData, setFormData] = useState<Student>(student ? { ...student } : ({} as Student));

  useEffect(() => {
    if (student) {
      setFormData({
        ...student,
        needsSpecialAttention: student.needsSpecialAttention || false,
        attentionCategories: student.attentionCategories || [],
        attentionNote: student.attentionNote || '',
        attentionStatus: student.attentionStatus || 'monitoring',
        attentionStartedAt: student.attentionStartedAt || new Date().toLocaleDateString('vi-VN')
      });
    }
  }, [student]);

  if (!isOpen || !student || typeof document === 'undefined') return null;

  const handleChange = (field: keyof Student, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleAttentionCategory = (cat: string) => {
    const current = formData.attentionCategories || [];
    const updated = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat];
    setFormData(prev => ({ ...prev, attentionCategories: updated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...formData };
    if (isTeacher) {
      finalData.attentionUpdatedAt = new Date().toLocaleDateString('vi-VN');
      finalData.attentionUpdatedBy = currentUser.name;
    }
    studentService.updateStudent(student.id, finalData);
    if (onSaved) onSaved();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Chỉnh Sửa Hồ Sơ Học Viên</h3>
              <p className="text-xs text-slate-500">{student.code} — {student.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 cursor-pointer transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Học sinh</label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên</label>
              <input
                type="text"
                value={formData.fullName || ''}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 outline-hidden"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Giới tính</label>
              <select
                value={formData.gender || 'Nam'}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày sinh</label>
              <input
                type="text"
                value={formData.dob || ''}
                onChange={(e) => handleChange('dob', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tổ sinh hoạt</label>
              <select
                value={formData.group || 1}
                onChange={(e) => handleChange('group', Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden bg-white"
              >
                <option value={1}>Tổ 1</option>
                <option value={2}>Tổ 2</option>
                <option value={3}>Tổ 3</option>
                <option value={4}>Tổ 4</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dân tộc</label>
              <input
                type="text"
                value={formData.ethnicity || ''}
                onChange={(e) => handleChange('ethnicity', e.target.value)}
                placeholder="Kinh, Tày, Mường, Thái, Hoa, Khmer..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
              />
            </div>
            <div className="flex flex-col justify-center">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Đoàn thể</label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!formData.isUnionMember}
                  onChange={(e) => handleChange('isUnionMember', e.target.checked)}
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Đoàn viên TNCS Hồ Chí Minh</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chức vụ Ban cán sự</label>
              <input
                type="text"
                value={formData.officerRole || ''}
                onChange={(e) => handleChange('officerRole', e.target.value)}
                placeholder="Lớp trưởng, Bí thư, Tổ trưởng..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại học sinh</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ tên Cha & SĐT</label>
              <input
                type="text"
                value={formData.fatherName || ''}
                onChange={(e) => handleChange('fatherName', e.target.value)}
                placeholder="Họ tên Cha"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 mb-1"
              />
              <input
                type="text"
                value={formData.fatherPhone || ''}
                onChange={(e) => handleChange('fatherPhone', e.target.value)}
                placeholder="SĐT Cha"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ tên Mẹ & SĐT</label>
              <input
                type="text"
                value={formData.motherName || ''}
                onChange={(e) => handleChange('motherName', e.target.value)}
                placeholder="Họ tên Mẹ"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 mb-1"
              />
              <input
                type="text"
                value={formData.motherPhone || ''}
                onChange={(e) => handleChange('motherPhone', e.target.value)}
                placeholder="SĐT Mẹ"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ thường trú</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-hidden"
            />
          </div>

          {/* THEO DÕI NỘI BỘ CỦA GVCN (BẢO MẬT DÀNH RIÊNG CHO GVCN) */}
          {isTeacher && (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      THEO DÕI NỘI BỘ CỦA GVCN (BẢO MẬT)
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Chỉ GVCN xem và chỉnh sửa • Học sinh / Phụ huynh / Cán sự không thể truy cập
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={!!formData.needsSpecialAttention}
                    onChange={(e) => handleChange('needsSpecialAttention', e.target.checked)}
                    className="h-4 w-4 rounded-md border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-black text-amber-900">
                    Học viên cần quan tâm đặc biệt
                  </span>
                </label>
              </div>

              {formData.needsSpecialAttention && (
                <div className="space-y-3 pt-1 animate-fade-in">
                  {/* Category Multi-select */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1.5">
                      Nhóm vấn đề cần lưu tâm (chọn nhiều mục phù hợp):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ATTENTION_CATEGORIES.map((cat) => {
                        const isSelected = (formData.attentionCategories || []).includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleToggleAttentionCategory(cat)}
                            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-600'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-100/60'
                            }`}
                          >
                            {isSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3 text-slate-400" />}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attention Note */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Ghi chú chi tiết & Biện pháp hỗ trợ:
                    </label>
                    <textarea
                      value={formData.attentionNote || ''}
                      onChange={(e) => handleChange('attentionNote', e.target.value)}
                      rows={2}
                      placeholder="Ghi lại hoàn cảnh, diễn biến tâm lý, biểu hiện học tập hoặc thỏa thuận phối hợp với gia đình..."
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 outline-hidden"
                    />
                  </div>

                  {/* Status & Start Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1">
                        Trạng thái theo dõi:
                      </label>
                      <select
                        value={formData.attentionStatus || 'monitoring'}
                        onChange={(e) => handleChange('attentionStatus', e.target.value as AttentionStatus)}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-hidden"
                      >
                        <option value="monitoring">🟡 Đang theo dõi & hỗ trợ</option>
                        <option value="improving">🔵 Đang có tiến bộ</option>
                        <option value="stable">🟢 Đã ổn định / có tiến bộ</option>
                        <option value="continued_support">🟠 Cần tiếp tục hỗ trợ đặc biệt</option>
                        <option value="ended">⚪ Đã ngừng theo dõi (Lưu sử)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-amber-700" />
                        <span>Ngày bắt đầu theo dõi:</span>
                      </label>
                      <input
                        type="text"
                        value={formData.attentionStartedAt || ''}
                        onChange={(e) => handleChange('attentionStartedAt', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Private Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhật ký riêng khác của GVCN:
                </label>
                <textarea
                  value={formData.privateTeacherNotes || ''}
                  onChange={(e) => handleChange('privateTeacherNotes', e.target.value)}
                  rows={2}
                  placeholder="Ghi chú bảo mật khác của giáo viên chủ nhiệm..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-hidden"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div>
              {isTeacher && onDeleteStudent && student && (
                <button
                  type="button"
                  onClick={() => onDeleteStudent(student)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Xóa học sinh này khỏi lớp"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa học sinh</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
