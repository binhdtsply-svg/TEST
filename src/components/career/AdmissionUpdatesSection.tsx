/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Bell,
  Search,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Plus,
  Filter,
  X,
  Info,
  AlertCircle
} from 'lucide-react';
import { CareerAdmissionUpdate } from '../../types';
import { careerService } from '../../services/CareerService';

interface Props {
  isTeacherOrAdmin: boolean;
  onNavigateToUnis?: () => void;
}

export const AdmissionUpdatesSection: React.FC<Props> = ({
  isTeacherOrAdmin,
  onNavigateToUnis
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Update Form
  const [newTitle, setNewTitle] = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [newYear, setNewYear] = useState('2025 - 2026');
  const [newUrl, setNewUrl] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newSourceType, setNewSourceType] = useState('Trang tuyển sinh chính thức của trường');

  const updates = careerService.getAdmissionUpdates();

  const filteredUpdates = useMemo(() => {
    return updates.filter(item => {
      const matchSearch =
        !searchTerm.trim() ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase());

      const matchYear = selectedYear === 'all' || item.academicYear === selectedYear;

      return matchSearch && matchYear;
    });
  }, [updates, searchTerm, selectedYear]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstName.trim() || !newUrl.trim()) {
      alert('Vui lòng điền đầy đủ tiêu đề, tên cơ sở đào tạo và liên kết thông tin chính thức.');
      return;
    }

    careerService.addAdmissionUpdate({
      institutionId: `inst-custom-${Date.now()}`,
      institutionName: newInstName.trim(),
      title: newTitle.trim(),
      academicYear: newYear,
      contentUrl: newUrl.trim(),
      publishedDate: new Date().toISOString().slice(0, 10),
      sourceType: newSourceType.trim(),
      summary: newSummary.trim() || 'Thông báo tuyển sinh chính thức.',
      status: 'active',
      verifiedSource: true
    });

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewInstName('');
    setNewUrl('');
    setNewSummary('');
    setSuccessMsg('Đã thêm thông tin tuyển sinh chính thức thành công!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Banner Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-100">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                THEO DÕI THÔNG TIN TUYỂN SINH CHÍNH THỨC
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Cập nhật đề án tuyển sinh, phương thức xét tuyển học bạ THPT và chỉ tiêu từ cổng thông tin chính thức của các trường
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeacherOrAdmin && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm thông báo tuyển sinh</span>
              </button>
            )}

            {onNavigateToUnis && (
              <button
                type="button"
                onClick={onNavigateToUnis}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Building2 className="h-4 w-4 text-slate-500" />
                <span>Tra cứu trường & điểm chuẩn</span>
              </button>
            )}
          </div>
        </div>

        {/* Verification Rule Alert */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Nguyên tắc minh bạch & nguồn chính thức:</span>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Mọi thông báo đều dẫn trực tiếp đến cổng tuyển sinh của cơ sở đào tạo hoặc Bộ GD&ĐT. Hệ thống không sử dụng dữ liệu không rõ nguồn gốc và luôn ghi rõ ngày kiểm tra dữ liệu gần nhất.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-2/3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên trường, phương thức xét tuyển, từ khóa thông báo..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-colors"
            />
          </div>

          <div className="w-full sm:w-1/3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white outline-none cursor-pointer"
            >
              <option value="all">Tất cả năm tuyển sinh</option>
              <option value="2025 - 2026">Năm 2025 - 2026</option>
              <option value="2024 - 2025">Năm 2024 - 2025</option>
            </select>
          </div>
        </div>

        {/* Updates List */}
        <div className="space-y-4 pt-2">
          {filteredUpdates.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-blue-100 text-blue-900 font-extrabold px-2.5 py-0.5 text-xs">
                      {item.institutionName}
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                      Năm học: {item.academicYear}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Ngày đăng: {item.publishedDate}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug pt-0.5">
                    {item.title}
                  </h3>
                </div>

                <a
                  href={item.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white text-blue-700 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <span>Xem thông tin chính thức</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                {item.summary}
              </p>

              {/* Bottom Metadata bar: MUST include "Cập nhật lần cuối" */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-semibold text-slate-700">Nguồn: {item.sourceType}</span>
                </div>

                <div className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <Clock className="h-3 w-3 text-emerald-600" />
                  <span>Cập nhật lần cuối: {item.checkedAt}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredUpdates.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Bell className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Không tìm thấy thông báo tuyển sinh phù hợp.</p>
              <p className="text-[11px] text-slate-400">Hãy thử nhập từ khóa khác hoặc chuyển năm tuyển sinh.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD ADMISSION UPDATE MODAL (TEACHER/ADMIN) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                <span>THÊM THÔNG BÁO TUYỂN SINH CHÍNH THỨC</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên trường / Cơ sở đào tạo (*):</label>
                <input
                  type="text"
                  required
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder="Ví dụ: Trường Cao đẳng Kỹ thuật Cao Thắng"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tiêu đề thông báo (*):</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Thông báo xét tuyển học bạ THPT năm 2025"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Năm tuyển sinh:</label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800"
                  >
                    <option value="2025 - 2026">2025 - 2026</option>
                    <option value="2024 - 2025">2024 - 2025</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nguồn thông tin:</label>
                  <input
                    type="text"
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Liên kết website tuyển sinh chính thức (*):</label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://tuyensinh.caothang.edu.vn"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tóm tắt nội dung phương thức & chỉ tiêu (*):</label>
                <textarea
                  required
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Ghi rõ điều kiện xét học bạ, hạn nộp hồ sơ, ngành tuyển sinh nổi bật..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Lưu thông báo tuyển sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
