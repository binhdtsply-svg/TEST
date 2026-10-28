/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  School,
  UserCheck,
  BookOpen,
  Calendar,
  Users,
  Award,
  Palette,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Trash2,
  FileText
} from 'lucide-react';
import { initialSubjects, initialPointRules } from '../../data/demoData';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';
import { auditService } from '../../services/AuditService';
import { Student, SubjectConfig, PointRuleConfig } from '../../types';

interface SetupWizardModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('THPT Chuyên Lê Hồng Phong');
  const [educationTrack, setEducationTrack] = useState('Khối 11 - Ban KHTN (Khoa học Tự nhiên)');

  // Step 2: Teacher Info
  const [teacherName, setTeacherName] = useState('Cô Nguyễn Thị Mai Lan');
  const [teacherPhone, setTeacherPhone] = useState('0912 345 678');
  const [teacherEmail, setTeacherEmail] = useState('mailan.nguyen@lehongphong.edu.vn');

  // Step 3: Class Name & Slogan
  const [className, setClassName] = useState('11A1');
  const [slogan, setSlogan] = useState('Vững tri thức - Sáng tương lai - Đoàn kết là sức mạnh!');

  // Step 4: Academic Year & Stream
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [semester, setSemester] = useState<'HK1' | 'HK2'>('HK1');
  const [stream, setStream] = useState('Ban KHTN (Khoa học Tự nhiên)');

  // Step 5: Students Import
  const [studentInputText, setStudentInputText] = useState(
    'Nguyễn Gia Huy\nTrần Phương Linh\nLê Hoàng Long\nPhạm Minh Châu\nVũ Đức Anh\nĐỗ Thảo Vy\nBùi Tuấn Kiệt\nHoàng Mai Trang\nĐặng Quốc Bảo\nNgô Khánh An'
  );

  // Step 6: Point Rules
  const [pointRules, setPointRules] = useState<PointRuleConfig[]>(initialPointRules);

  // Step 7: Subjects
  const [subjects, setSubjects] = useState<SubjectConfig[]>(initialSubjects);

  const steps = [
    { num: 1, title: 'Trường học', icon: School },
    { num: 2, title: 'GVCN', icon: UserCheck },
    { num: 3, title: 'Lớp học', icon: BookOpen },
    { num: 4, title: 'Năm học', icon: Calendar },
    { num: 5, title: 'Học sinh', icon: Users },
    { num: 6, title: 'Quy tắc điểm', icon: Award },
    { num: 7, title: 'Môn học TT22', icon: BookOpen },
    { num: 8, title: 'Xác nhận', icon: CheckCircle2 }
  ];

  const handleFinish = () => {
    // 1. Update class settings
    classService.updateSettings({
      schoolName,
      className,
      slogan,
      academicYear,
      semester,
      stream,
      educationTrack,
      teacherName,
      teacherPhone,
      teacherEmail
    });

    // 2. Parse and seed students if provided
    const names = studentInputText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (names.length > 0) {
      const newStudents: Student[] = names.map((name, idx) => ({
        id: `hs-wiz-${idx + 1}`,
        code: `HV${className.replace(/\s+/g, '')}${String(idx + 1).padStart(2, '0')}`,
        fullName: name,
        avatar: idx % 2 === 0
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        gender: idx % 2 === 0 ? 'Nam' : 'Nữ',
        dob: '15/05/2009',
        group: (idx % 4) + 1,
        officerRole: idx === 0 ? 'Lớp trưởng' : idx === 1 ? 'Lớp phó học tập' : 'Thành viên',
        status: 'Đang học',
        studentActivationToken: `STU-WIZ-${idx + 101}`,
        parentActivationToken: `PAR-WIZ-${idx + 101}`,
        parent: {
          fatherName: `Phụ huynh em ${name}`,
          fatherPhone: '0903 000 ' + String(100 + idx),
          zaloConnected: true
        }
      }));

      studentService.saveAllStudents(newStudents);
    }

    auditService.log(
      'Hoàn thành Setup Wizard',
      'TEACHER',
      `Lớp ${className}`,
      `Thiết lập không gian lớp ${className} năm học ${academicYear}`
    );

    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Wizard Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-tight text-white">
                TRỢ LÝ KHỞI TẠO KHÔNG GIAN LỚP HỌC (SETUP WIZARD)
              </h3>
              <p className="text-[11px] text-slate-300">
                Bước {currentStep} / {steps.length}: {steps[currentStep - 1]?.title}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-6 py-2.5 gap-2 scrollbar-none">
          {steps.map(s => {
            const Icon = s.icon;
            const isCurrent = s.num === currentStep;
            const isCompleted = s.num < currentStep;
            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{s.num}. {s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* STEP 1: School */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 text-blue-900">
                <h4 className="font-bold text-xs">Bước 1: Thông tin Trường & Đơn vị đào tạo</h4>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Nhập tên trường học và chương trình giáo dục áp dụng cho lớp chủ nhiệm.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tên Trường học *</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Chương trình / Khối Ban *</label>
                <input
                  type="text"
                  value={educationTrack}
                  onChange={e => setEducationTrack(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-900"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Teacher */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 text-blue-900">
                <h4 className="font-bold text-xs">Bước 2: Thông tin Giáo viên chủ nhiệm</h4>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Thông tin này sẽ hiển thị trang trọng trên hồ sơ lớp và góc phụ huynh.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Họ và tên GVCN *</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={teacherPhone}
                    onChange={e => setTeacherPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={e => setTeacherEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Class & Slogan */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 text-blue-900">
                <h4 className="font-bold text-xs">Bước 3: Tên Lớp & Khẩu hiệu Tập thể</h4>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Khẩu hiệu và tên lớp sẽ xuất hiện trên trang chủ bảng tin lớp học.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tên Lớp (Ví dụ: 11A1) *</label>
                <input
                  type="text"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-black text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Khẩu hiệu Lớp (Slogan)</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={e => setSlogan(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-900"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Academic Year */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 text-blue-900">
                <h4 className="font-bold text-xs">Bước 4: Năm học & Ban đào tạo</h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Năm học</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Học kỳ hiện tại</label>
                  <select
                    value={semester}
                    onChange={e => setSemester(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900"
                  >
                    <option value="HK1">Học kỳ I (HK1)</option>
                    <option value="HK2">Học kỳ II (HK2)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tổ hợp Ban</label>
                <input
                  type="text"
                  value={stream}
                  onChange={e => setStream(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-medium text-slate-900"
                />
              </div>
            </div>
          )}

          {/* STEP 5: Students Import */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 text-blue-900">
                <h4 className="font-bold text-xs">Bước 5: Nhập danh sách Học viên</h4>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Dán danh sách họ và tên học sinh (mỗi dòng 1 học sinh). Hệ thống sẽ tự động tạo mã học viên và mã kích hoạt cho phụ huynh.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Danh sách họ tên (mỗi dòng một bạn):
                </label>
                <textarea
                  rows={8}
                  value={studentInputText}
                  onChange={e => setStudentInputText(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 6: Point Rules */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 text-blue-900">
                <h4 className="font-bold text-xs">Bước 6: Cấu hình Điểm Rèn luyện & Vườn Nguyệt Quế</h4>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Bộ quy tắc chuẩn bị sẵn giúp thúc đẩy động lực rèn luyện, khen thưởng việc tốt và uốn nắn vi phạm.
                </p>
              </div>

              <div className="space-y-2">
                {pointRules.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
                    <span className="font-semibold text-slate-800">{r.icon} {r.title}</span>
                    <span className={`font-black ${r.points > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {r.points > 0 ? `+${r.points}` : r.points} điểm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: Subjects TT22 */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 text-blue-900">
                <h4 className="font-bold text-xs">Bước 7: Cấu hình Môn học theo Thông tư 22 & GDPT 2018</h4>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  17 môn học chuẩn hóa theo quy chế của Bộ Giáo dục & Đào tạo.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subjects.slice(0, 9).map(s => (
                  <div key={s.id} className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs">
                    <div className="font-bold text-slate-800">{s.name}</div>
                    <div className="text-[10px] text-slate-400">{s.annualPeriods} tiết/năm • {s.txColumnCount} cột ĐGTX</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 8: Confirmation */}
          {currentStep === 8 && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-black text-slate-900 uppercase">SẴN SÀNG KÍCH HOẠT KHÔNG GIAN LỚP HỌC!</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Không gian lớp <strong>{className}</strong> tại <strong>{schoolName}</strong> đã được khởi tạo hoàn chỉnh với đầy đủ danh sách học viên, môn học và quy chế rèn luyện.
              </p>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
            disabled={currentStep === 1}
            className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold ${
              currentStep === 1
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <ChevronLeft className="h-4 w-4" /> Quay lại
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(prev + 1, steps.length))}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white hover:bg-blue-500 shadow-md cursor-pointer"
            >
              Tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-black text-white hover:bg-emerald-500 shadow-lg cursor-pointer animate-bounce-short"
            >
              <CheckCircle2 className="h-4 w-4" /> Hoàn tất & Mở Không gian Lớp
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
