/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Info,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  Award,
  BookOpen,
  Plus,
  Pin,
  Search,
  Filter,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Clock,
  Globe,
  Archive,
  Layers,
  GraduationCap
} from 'lucide-react';
import { OfficialGraduationArticle, GraduationArticleCategory } from '../../types';
import { officialGraduationExamService } from '../../services/OfficialGraduationExamService';
import { authService } from '../../services/AuthService';

interface GraduationGeneralInfoTabProps {
  onOpenCreateArticleModal: () => void;
  onOpenEditArticleModal: (art: OfficialGraduationArticle) => void;
}

const CATEGORIES: Array<'Tất cả' | GraduationArticleCategory> = [
  'Tất cả',
  'Tuyển sinh',
  'Quy chế',
  'Lịch thi',
  'Đăng ký dự thi',
  'Hướng dẫn',
  'Ưu tiên',
  'Khuyến khích',
  'Thông báo',
  'Khác'
];

export const GraduationGeneralInfoTab: React.FC<GraduationGeneralInfoTabProps> = ({
  onOpenCreateArticleModal,
  onOpenEditArticleModal
}) => {
  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN' || (currentUser as any).role === 'ADMIN';
  const isTeacher = currentUser.role === 'TEACHER';
  const canCreate = isSuperAdmin || isTeacher;

  const [articles, setArticles] = useState<OfficialGraduationArticle[]>(officialGraduationExamService.getAll(true));
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [readingArticle, setReadingArticle] = useState<OfficialGraduationArticle | null>(null);

  useEffect(() => {
    const unsub = officialGraduationExamService.subscribe(() => {
      setArticles(officialGraduationExamService.getAll(true));
    });
    return unsub;
  }, []);

  const availableYears = officialGraduationExamService.getAvailableYears();

  const filteredArticles = officialGraduationExamService.getArticles({
    category: selectedCategory,
    query: searchQuery,
    year: selectedYear,
    statusFilter: statusFilter
  });

  const handleDeleteArticle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bài viết thông tin này?')) {
      officialGraduationExamService.deleteArticle(id);
    }
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    officialGraduationExamService.togglePin(id);
  };

  const handleToggleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    officialGraduationExamService.toggleArchive(id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Portal Hero Header */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                Cổng Thông Tin Tuyển Sinh &amp; Kỳ Thi
              </span>
              <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                Cập nhật thường xuyên
              </span>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Nguồn chính thống
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Quy chế, Lịch thi, Hướng dẫn Xét Tốt nghiệp &amp; Thông tin Tuyển sinh ĐH/CĐ
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thông tin được đồng bộ trực tiếp từ Bộ Giáo dục và Đào tạo, Cục Quản lý chất lượng, Cổng Thông tin điện tử Chính phủ và thông báo từ nhà trường.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => officialGraduationExamService.syncFromOfficialSources()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Đồng bộ lại dữ liệu nguồn chính thống"
            >
              <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
              <span>Làm mới tin</span>
            </button>

            {canCreate && (
              <button
                onClick={onOpenCreateArticleModal}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{isSuperAdmin ? '+ Thêm thông tin hệ thống' : '+ Thêm thông tin tuyển sinh / kỳ thi'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Mandatory Rule Card: "ĐIỀU KIỆN CÔNG NHẬN TỐT NGHIỆP" */}
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-tight">
                ĐIỀU KIỆN CÔNG NHẬN TỐT NGHIỆP THPT
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Quy chế thi hiện hành
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Áp dụng theo Quy chế thi tốt nghiệp THPT hiện hành của Bộ Giáo dục và Đào tạo:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="flex items-start gap-2 rounded-xl bg-white/80 p-3 border border-emerald-200">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800 text-[11px]">
                  1
                </span>
                <span className="text-slate-800 font-medium">Thí sinh đủ điều kiện dự thi theo quy định.</span>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-white/80 p-3 border border-emerald-200">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800 text-[11px]">
                  2
                </span>
                <span className="text-slate-800 font-medium">Không bị kỷ luật hủy kết quả thi.</span>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-white/80 p-3 border border-emerald-200">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800 text-[11px]">
                  3
                </span>
                <span className="text-slate-800 font-medium">
                  Tất cả các môn thi dùng để xét công nhận tốt nghiệp phải đạt <strong className="text-emerald-900 font-extrabold underline">TRÊN 1,0 điểm</strong> theo thang điểm 10 (&gt; 1.0đ).
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-white/80 p-3 border border-emerald-200">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800 text-[11px]">
                  4
                </span>
                <span className="text-slate-800 font-medium">
                  Điểm xét tốt nghiệp (ĐXTN) phải đạt từ <strong className="text-emerald-900 font-extrabold underline">5,00 điểm trở lên</strong> (≥ 5.00đ).
                </span>
              </div>
            </div>

            {/* Red warning notice */}
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-rose-50 p-3 border border-rose-200 text-xs font-bold text-rose-800">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>
                CẢNH BÁO: Nếu có môn thi dùng để xét tốt nghiệp đạt 1,0 điểm hoặc thấp hơn (≤ 1.0đ), thí sinh không đủ điều kiện công nhận tốt nghiệp theo điều kiện thông thường.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Official External Lookup Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="https://moet.gov.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">Bộ Giáo dục &amp; Đào tạo</div>
              <div className="text-[10px] text-slate-400">moet.gov.vn</div>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
        </a>

        <a
          href="https://thisinh.thitotnghiepthpt.edu.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">Cổng Quản lý thi THPT</div>
              <div className="text-[10px] text-slate-400">thisinh.thitotnghiepthpt.edu.vn</div>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
        </a>

        <a
          href="https://baochinhphu.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-slate-200 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-amber-600">Cổng TTĐT Chính phủ</div>
              <div className="text-[10px] text-slate-400">baochinhphu.vn</div>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600" />
        </a>
      </div>

      {/* 4. Filter & Search Bar for Articles */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Top filter row: Categories */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Bottom filter row: Year, Archive Status, Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Year selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Năm:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Tất cả các năm</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Status selector */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang phát hành
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ARCHIVED')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                  statusFilter === 'ARCHIVED'
                    ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã lưu trữ
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm quy chế, tuyển sinh, lịch thi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 5. Articles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredArticles.map(art => {
          const userCanEdit = officialGraduationExamService.canEditArticle(currentUser, art);
          const isSystem = art.scope === 'SYSTEM';

          return (
            <div
              key={art.id}
              onClick={() => setReadingArticle(art)}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all hover:shadow-md cursor-pointer group bg-white ${
                art.isPinned ? 'border-blue-300 ring-1 ring-blue-100 shadow-2xs' : 'border-slate-200 shadow-2xs'
              } ${art.status === 'ARCHIVED' ? 'opacity-75 bg-slate-50/70' : ''}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-100">
                      {art.category}
                    </span>

                    {(art.admissionYear || art.examYear) && (
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                        Năm {art.admissionYear || art.examYear}
                      </span>
                    )}

                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                        isSystem
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}
                    >
                      {isSystem ? 'Toàn trường' : 'Cấp lớp'}
                    </span>

                    {art.isOfficial ? (
                      <span className="flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Nguồn chính thức</span>
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                        Tham khảo
                      </span>
                    )}

                    {art.isPinned && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        <Pin className="h-2.5 w-2.5 fill-blue-600" /> Ghim
                      </span>
                    )}

                    {art.status === 'ARCHIVED' && (
                      <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        Đã lưu trữ
                      </span>
                    )}
                  </div>

                  {userCanEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={e => handleTogglePin(art.id, e)}
                        className={`p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 ${
                          art.isPinned ? 'text-blue-600' : ''
                        }`}
                        title={art.isPinned ? 'Gỡ ghim' : 'Ghim lên đầu'}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={e => handleToggleArchive(art.id, e)}
                        className={`p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 ${
                          art.status === 'ARCHIVED' ? 'text-amber-600' : ''
                        }`}
                        title={art.status === 'ARCHIVED' ? 'Khôi phục phát hành' : 'Lưu trữ thông tin'}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenEditArticleModal(art);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        title="Sửa thông tin"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={e => handleDeleteArticle(art.id, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        title="Xóa bài viết"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {art.title}
                </h4>

                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{art.summary}</p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] text-slate-400">
                <span className="font-medium truncate max-w-[180px]">
                  Nguồn: <strong className="text-slate-700">{art.sourceName}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {art.sourceUrl && (
                    <a
                      href={art.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-0.5 font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      <span>Xem nguồn</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  <span>{art.publishedAt}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredArticles.length === 0 && (
          <div className="col-span-2 rounded-2xl bg-white p-8 text-center border border-dashed border-slate-200 text-slate-400 text-xs">
            Không tìm thấy thông tin phù hợp với từ khóa, năm hoặc danh mục đã chọn.
          </div>
        )}
      </div>

      {/* 6. Modal View Full Article */}
      {readingArticle && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {readingArticle.category}
                </span>
                {(readingArticle.admissionYear || readingArticle.examYear) && (
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    Năm {readingArticle.admissionYear || readingArticle.examYear}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-700">Chi tiết văn bản / thông báo tuyển sinh</span>
              </div>
              <button
                onClick={() => setReadingArticle(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Ban hành: {readingArticle.publishedAt}</span>
                  <span>•</span>
                  <span>
                    Nguồn: <strong className="text-slate-700">{readingArticle.sourceName}</strong>
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-slate-600">
                    {readingArticle.scope === 'SYSTEM' ? 'Cấp hệ thống' : 'Cấp lớp'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{readingArticle.title}</h3>
              </div>

              <div className="rounded-xl bg-blue-50/60 p-3 text-slate-700 font-medium leading-relaxed border border-blue-100">
                {readingArticle.summary}
              </div>

              {readingArticle.content && (
                <div className="whitespace-pre-line text-slate-800 leading-relaxed font-normal bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  {readingArticle.content}
                </div>
              )}

              {/* Attachments if any */}
              {readingArticle.attachments && readingArticle.attachments.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="font-bold text-slate-700">Tệp đính kèm văn bản:</span>
                  <div className="space-y-1">
                    {readingArticle.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg bg-slate-100 p-2 text-[11px] text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        <span className="font-bold truncate">{att.name}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
              {readingArticle.sourceUrl ? (
                <a
                  href={readingArticle.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  <span>Xem thông tin chính thức trên trang gốc ({readingArticle.sourceDomain || 'Chính thức'})</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">Nguồn thông tin nội bộ</span>
              )}

              <button
                onClick={() => setReadingArticle(null)}
                className="rounded-xl bg-slate-200 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

