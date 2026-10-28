/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  User,
  Calendar,
  Phone,
  MapPin,
  Heart,
  Shield,
  Check,
  AlertCircle,
  Users
} from 'lucide-react';
import { Student } from '../../types';
import { studentService } from '../../services/StudentService';

interface StudentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStudent: Student) => void;
}

export const StudentAddModal: React.FC<StudentAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [dob, setDob] = useState('01/01/2009');
  const [group, setGroup] = useState<number>(1);
  const [officerRole, setOfficerRole] = useState('');
  const [ethnicity, setEthnicity] = useState('Kinh');
  const [isUnionMember, setIsUnionMember] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');

  // Parent info
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [address, setAddress] = useState('TP. Hồ Chí Minh');

  // Special attention notes
  const [needsSpecialAttention, setNeedsSpecialAttention] = useState(false);
  const [attentionNote, setAttentionNote] = useState('');

  // Validation state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên học sinh.');
      return;
    }

    try {
      const created = studentService.addStudent({
        fullName: fullName.trim(),
        gender,
        dob: dob.trim() || '01/01/2009',
        group: Number(group) || 1,
        officerRole: officerRole.trim() || undefined,
        ethnicity: ethnicity.trim() || 'Kinh',
        isUnionMember,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        fatherName: fatherName.trim() || undefined,
        fatherPhone: fatherPhone.trim() || undefined,
        motherName: motherName.trim() || undefined,
        motherPhone: motherPhone.trim() || undefined,
        address: address.trim() || 'TP. Hồ Chí Minh',
        parent: {
          fatherName: fatherName.trim() || '',
          fatherPhone: fatherPhone.trim() || '',
          motherName: motherName.trim() || '',
          motherPhone: motherPhone.trim() || '',
          address: address.trim() || 'TP. Hồ Chí Minh',
          zaloConnected: true
        },
        needsSpecialAttention,
        attentionNote: needsSpecialAttention ? attentionNote.trim() : undefined,
        status: 'Đang học'
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi thêm học sinh.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">THÊM HỌC VIÊN MỚI</h3>
              <p className="text-xs text-slate-500">
                Nhập thông tin hồ sơ học sinh và tự động tạo mã kích hoạt tài khoản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Basic Student Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <User className="h-4 w-4 text-blue-600" />
              <span>1. Thông tin cơ bản học sinh</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giới tính <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Nam' | 'Nữ')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden cursor-pointer"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày sinh (dd/mm/yyyy)
                </label>
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="01/01/2009"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phân vào Tổ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={group}
                  onChange={(e) => setGroup(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden cursor-pointer"
                >
                  <option value={1}>Tổ 1</option>
                  <option value={2}>Tổ 2</option>
                  <option value={3}>Tổ 3</option>
                  <option value={4}>Tổ 4</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức vụ cán sự (Nếu có)
                </label>
                <input
                  type="text"
                  value={officerRole}
                  onChange={(e) => setOfficerRole(e.target.value)}
                  placeholder="Ví dụ: Lớp trưởng, Bí thư, Tổ trưởng..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dân tộc
                </label>
                <input
                  type="text"
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  placeholder="Kinh, Tày, Mường, Thái, Hoa..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div className="flex flex-col justify-center">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Đoàn thể
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isUnionMember}
                    onChange={(e) => setIsUnionMember(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Đoàn viên Đoàn TNCS Hồ Chí Minh</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại học sinh
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email học sinh
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hocsinh@gmail.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 2. Parent Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
              <Users className="h-4 w-4 text-emerald-600" />
              <span>2. Thông tin Phụ huynh & Liên lạc</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ tên Cha
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Họ tên Cha"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SĐT Cha
                </label>
                <input
                  type="text"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  placeholder="0901 234 567"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ tên Mẹ
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Họ tên Mẹ"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SĐT Mẹ
                </label>
                <input
                  type="text"
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                  placeholder="0909 876 543"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ thường trú / liên hệ
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 3. Special Attention (Teacher internal) */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-800 flex items-center gap-2 uppercase tracking-wide">
                <Heart className="h-4 w-4 text-rose-600" />
                <span>3. Danh mục quan tâm sư phạm đặc biệt</span>
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsSpecialAttention}
                  onChange={(e) => setNeedsSpecialAttention(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {needsSpecialAttention && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú quan tâm riêng của GVCN (Bảo mật, chỉ GVCN thấy)
                </label>
                <textarea
                  rows={2}
                  value={attentionNote}
                  onChange={(e) => setAttentionNote(e.target.value)}
                  placeholder="Ghi chú hoàn cảnh gia đình, sức khỏe hoặc điểm cần đồng hành hỗ trợ..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-500 outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Xác nhận thêm học viên</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
