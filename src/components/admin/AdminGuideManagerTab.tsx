/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  FileText,
  Video,
  Paperclip,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Clock,
  Sparkles,
  Settings,
  Users,
  ClipboardList,
  FolderOpen,
  X,
  Upload,
  Link,
  Save,
  Tag,
  ArrowUpDown,
  RefreshCw,
  HelpCircle,
  File
} from 'lucide-react';
import {
  guideService,
  AdminGuideCategory,
  AdminGuideArticle,
  GuideLinkItem
} from '../../services/GuideService';
import { AttachedFile } from '../../types';

export const AdminGuideManagerTab: React.FC = () => {
  const [categories, setCategories] = useState<AdminGuideCategory[]>([]);
  const [articles, setArticles] = useState<AdminGuideArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  // Modals state
  const [editingArticle, setEditingArticle] = useState<Partial<AdminGuideArticle> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<AdminGuideCategory> | null>(null);
  const [previewArticle, setPreviewArticle] = useState<AdminGuideArticle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'article' | 'category';
    id: string;
    title: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadData = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const data = await guideService.getContent(force);
      setCategories(data.categories || []);
      setArticles(data.articles || []);
    } catch (err: any) {
      showToast('Lỗi khi tải danh sách hướng dẫn: ' + (err?.message || 'Không thể kết nối.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleChange = () => {
      loadData(true);
    };

    window.addEventListener('guide-content-changed', handleChange);
    return () => {
      window.removeEventListener('guide-content-changed', handleChange);
    };
  }, []);

  // Filtered articles list
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCat = selectedCategoryId === 'all' || art.categoryId === selectedCategoryId;
      if (!matchesCat) return false;

      if (statusFilter === 'PUBLISHED' && !art.isPublished) return false;
      if (statusFilter === 'DRAFT' && art.isPublished) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = art.title.toLowerCase().includes(q);
      const inSummary = art.summary.toLowerCase().includes(q);
      const inContent = art.content.toLowerCase().includes(q);
      const inTags = (art.tags || []).some((t) => t.toLowerCase().includes(q));

      return inTitle || inSummary || inContent || inTags;
    });
  }, [articles, selectedCategoryId, statusFilter, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalCats = categories.length;
    const totalArts = articles.length;
    const publishedArts = articles.filter((a) => a.isPublished).length;
    const draftArts = totalArts - publishedArts;
    return { totalCats, totalArts, publishedArts, draftArts };
  }, [categories, articles]);

  // Icon selector helper
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Sparkles': return Sparkles;
      case 'Settings': return Settings;
      case 'ClipboardList': return ClipboardList;
      case 'BookOpen': return BookOpen;
      case 'Users': return Users;
      default: return FolderOpen;
    }
  };

  // --- ACTIONS ---

  const handleToggleArticlePublish = async (art: AdminGuideArticle) => {
    try {
      const res = await guideService.updateArticle(art.id, {
        isPublished: !art.isPublished
      });
      if (res.success) {
        showToast(`Đã ${!art.isPublished ? 'xuất bản' : 'chuyển sang bản nháp'}: "${art.title}"`);
        loadData(true);
      } else {
        showToast(res.message || 'Lỗi khi cập nhật trạng thái');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleMoveArticleOrder = async (art: AdminGuideArticle, direction: 'up' | 'down') => {
    const catArticles = articles
      .filter((a) => a.categoryId === art.categoryId)
      .sort((a, b) => a.order - b.order);

    const index = catArticles.findIndex((a) => a.id === art.id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === catArticles.length - 1) return;

    const swapTargetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...catArticles];
    const temp = reordered[index];
    reordered[index] = reordered[swapTargetIndex];
    reordered[swapTargetIndex] = temp;

    const orderedIds = reordered.map((a) => a.id);
    const res = await guideService.reorder('articles', orderedIds, art.categoryId);
    if (res.success) {
      showToast('Đã cập nhật thứ tự bài viết.');
      loadData(true);
    } else {
      showToast(res.message || 'Lỗi khi cập nhật thứ tự');
    }
  };

  const handleMoveCategoryOrder = async (cat: AdminGuideCategory, direction: 'up' | 'down') => {
    const sortedCats = [...categories].sort((a, b) => a.order - b.order);
    const index = sortedCats.findIndex((c) => c.id === cat.id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedCats.length - 1) return;

    const swapTargetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...sortedCats];
    const temp = reordered[index];
    reordered[index] = reordered[swapTargetIndex];
    reordered[swapTargetIndex] = temp;

    const orderedIds = reordered.map((c) => c.id);
    const res = await guideService.reorder('categories', orderedIds);
    if (res.success) {
      showToast('Đã cập nhật thứ tự nhóm hướng dẫn.');
      loadData(true);
    } else {
      showToast(res.message || 'Lỗi khi cập nhật thứ tự');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === 'article') {
        const res = await guideService.deleteArticle(deleteTarget.id);
        if (res.success) {
          showToast(`Đã xóa bài viết: "${deleteTarget.title}"`);
          loadData(true);
        } else {
          showToast(res.message || 'Lỗi khi xóa bài viết');
        }
      } else {
        const res = await guideService.deleteCategory(deleteTarget.id);
        if (res.success) {
          showToast(`Đã xóa nhóm: "${deleteTarget.title}"`);
          if (selectedCategoryId === deleteTarget.id) {
            setSelectedCategoryId('all');
          }
          loadData(true);
        } else {
          showToast(res.message || 'Lỗi khi xóa nhóm');
        }
      }
      setDeleteTarget(null);
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi thực hiện thao tác xóa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Header Banner & Quick Overview Cards */}
      <div className="rounded-3xl p-6 sm:p-7 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" /> QUẢN LÝ NỘI DUNG HƯỚNG DẪN SỬ DỤNG
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Super Admin
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hệ Thống Hướng Dẫn & Tài Liệu Nghiệp Vụ Chủ Nhiệm
            </h2>
            <p className="text-xs text-slate-500 max-w-3xl mt-1 leading-relaxed">
              Quản trị đầy đủ 5 nhóm chuyên mục hướng dẫn, xuất bản bài viết nghiệp vụ, tải lên tệp tài liệu PDF/Word và đính kèm video hướng dẫn cho toàn thể Giáo viên chủ nhiệm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setEditingCategory({
                  title: '',
                  description: '',
                  order: categories.length + 1,
                  isPublished: true,
                  iconName: 'BookOpen'
                });
              }}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-all active:scale-95"
            >
              <FolderPlus className="h-4 w-4 text-slate-500" />
              <span>Thêm Nhóm Mới</span>
            </button>

            <button
              onClick={() => {
                const defaultCat = selectedCategoryId !== 'all' ? selectedCategoryId : (categories[0]?.id || 'group-1-intro');
                setEditingArticle({
                  categoryId: defaultCat,
                  title: '',
                  summary: '',
                  content: '',
                  estimatedReadMinutes: 3,
                  order: articles.filter((a) => a.categoryId === defaultCat).length + 1,
                  isPublished: true,
                  attachments: [],
                  externalLinks: [],
                  tags: []
                });
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Bài Hướng Dẫn</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Nhóm chuyên mục
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{stats.totalCats}</span>
              <span className="text-[10px] font-bold text-amber-600">(5 Nhóm chính)</span>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Tổng số bài viết
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{stats.totalArts}</span>
              <span className="text-[10px] text-slate-500">Bài hướng dẫn</span>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 bg-emerald-50/60 border border-emerald-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Đã xuất bản (Live)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-800">{stats.publishedArts}</span>
              <span className="text-[10px] text-emerald-600">Hiển thị cho GVCN</span>
            </div>
          </div>

          <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Bản nháp (Draft)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{stats.draftArts}</span>
              <span className="text-[10px] text-slate-500">Chờ duyệt</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Selector & Management Cards */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-amber-500" /> DANH SÁCH 5 NHÓM HƯỚNG DẪN CỐT LÕI
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Chọn nhóm để lọc bài viết hoặc nhấp chỉnh sửa nhóm
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-500">TẤT CẢ</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-800">
                {articles.length}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 mt-2 truncate">Toàn bộ hướng dẫn</p>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">Xem tất cả các bài viết</p>
          </button>

          {categories.map((cat, idx) => {
            const IconComponent = getCategoryIcon(cat.iconName);
            const count = articles.filter((a) => a.categoryId === cat.id).length;
            const isSelected = selectedCategoryId === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative group cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <IconComponent className={`h-4 w-4 ${isSelected ? 'text-amber-600' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-bold text-slate-400">#{cat.order || idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {count}
                    </span>
                    {/* Action buttons inside category card */}
                    <button
                      type="button"
                      title="Chỉnh sửa nhóm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(cat);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    {categories.length > 5 && (
                      <button
                        type="button"
                        title="Xóa nhóm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'category', id: cat.id, title: cat.title });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-900 mt-2 line-clamp-2 leading-snug">
                  {cat.title}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>

                {/* Move order buttons */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className={cat.isPublished ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {cat.isPublished ? '● Đang bật' : '○ Đang ẩn'}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveCategoryOrder(cat, 'up');
                      }}
                      className="p-0.5 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveCategoryOrder(cat, 'down');
                      }}
                      className="p-0.5 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Article List Workspace */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        {/* Search, Category Filter, and Status Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết theo tiêu đề, nội dung, từ khóa..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({articles.length})
              </button>
              <button
                onClick={() => setStatusFilter('PUBLISHED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'PUBLISHED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã xuất bản ({stats.publishedArts})
              </button>
              <button
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'DRAFT' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bản nháp ({stats.draftArts})
              </button>
            </div>

            <button
              onClick={() => loadData(true)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200 cursor-pointer"
              title="Tải lại dữ liệu từ máy chủ"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table / List of Articles */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Chưa có bài viết nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Không tìm thấy bài viết nào theo bộ lọc hoặc chuyên mục đã chọn. Bạn có thể nhấn tạo bài hướng dẫn mới ngay bây giờ.
            </p>
            <button
              onClick={() => {
                const defaultCat = selectedCategoryId !== 'all' ? selectedCategoryId : (categories[0]?.id || 'group-1-intro');
                setEditingArticle({
                  categoryId: defaultCat,
                  title: '',
                  summary: '',
                  content: '',
                  estimatedReadMinutes: 3,
                  order: articles.length + 1,
                  isPublished: true,
                  attachments: [],
                  externalLinks: [],
                  tags: []
                });
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" /> Thêm Bài Hướng Dẫn Mới
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((art) => {
              const category = categories.find((c) => c.id === art.categoryId);
              const attachmentsCount = (art.attachments || []).length;
              const hasVideo = Boolean(art.videoUrl && art.videoUrl.trim());
              const linksCount = (art.externalLinks || []).length;

              return (
                <div
                  key={art.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Article info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        #{art.order}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {category?.title || 'Chưa phân nhóm'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          art.isPublished
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {art.isPublished ? '● Đã xuất bản' : '○ Bản nháp'}
                      </span>
                      {art.estimatedReadMinutes && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {art.estimatedReadMinutes} phút đọc
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 hover:text-amber-700 transition-colors cursor-pointer" onClick={() => setPreviewArticle(art)}>
                      {art.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {art.summary || 'Không có mô tả tóm tắt.'}
                    </p>

                    {/* Indicators: Attachments, Video, Links, Tags */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                      {attachmentsCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                          <Paperclip className="h-3.5 w-3.5" /> {attachmentsCount} tệp đính kèm
                        </span>
                      )}
                      {hasVideo && (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          <Video className="h-3.5 w-3.5" /> Có video hướng dẫn
                        </span>
                      )}
                      {linksCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <Link className="h-3.5 w-3.5" /> {linksCount} liên kết
                        </span>
                      )}
                      {(art.tags || []).length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">{(art.tags || []).slice(0, 3).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
                    {/* Reorder Buttons */}
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                      <button
                        type="button"
                        title="Đẩy lên trên"
                        onClick={() => handleMoveArticleOrder(art, 'up')}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Đẩy xuống dưới"
                        onClick={() => handleMoveArticleOrder(art, 'down')}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Publish Toggle Button */}
                    <button
                      onClick={() => handleToggleArticlePublish(art)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        art.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {art.isPublished ? 'Gỡ xuất bản' : 'Xuất bản'}
                    </button>

                    {/* Preview Button */}
                    <button
                      onClick={() => setPreviewArticle(art)}
                      className="p-2 text-slate-600 hover:text-blue-600 rounded-xl hover:bg-blue-50 border border-slate-200 transition-all cursor-pointer"
                      title="Xem trước bài viết"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingArticle(art)}
                      className="p-2 text-slate-600 hover:text-amber-600 rounded-xl hover:bg-amber-50 border border-slate-200 transition-all cursor-pointer"
                      title="Chỉnh sửa nội dung"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteTarget({ type: 'article', id: art.id, title: art.title })}
                      className="p-2 text-slate-600 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
                      title="Xóa bài viết"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: CREATE / EDIT ARTICLE */}
      {/* ========================================================================= */}
      {editingArticle && (
        <ArticleEditModal
          article={editingArticle}
          categories={categories}
          onClose={() => setEditingArticle(null)}
          onSave={async (articleData) => {
            setIsSubmitting(true);
            try {
              if (editingArticle.id) {
                const res = await guideService.updateArticle(editingArticle.id, articleData);
                if (res.success) {
                  showToast('Cập nhật bài viết hướng dẫn thành công!');
                  setEditingArticle(null);
                  loadData(true);
                } else {
                  showToast(res.message || 'Lỗi khi cập nhật bài viết');
                }
              } else {
                const res = await guideService.createArticle(articleData);
                if (res.success) {
                  showToast('Tạo bài viết hướng dẫn mới thành công!');
                  setEditingArticle(null);
                  loadData(true);
                } else {
                  showToast(res.message || 'Lỗi khi tạo bài viết');
                }
              }
            } catch (err: any) {
              showToast(err?.message || 'Lỗi khi lưu bài viết');
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: CREATE / EDIT CATEGORY */}
      {/* ========================================================================= */}
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={async (catData) => {
            setIsSubmitting(true);
            try {
              if (editingCategory.id) {
                const res = await guideService.updateCategory(editingCategory.id, catData);
                if (res.success) {
                  showToast('Cập nhật nhóm hướng dẫn thành công!');
                  setEditingCategory(null);
                  loadData(true);
                } else {
                  showToast(res.message || 'Lỗi khi cập nhật nhóm');
                }
              } else {
                const res = await guideService.createCategory(catData);
                if (res.success) {
                  showToast('Tạo nhóm hướng dẫn mới thành công!');
                  setEditingCategory(null);
                  loadData(true);
                } else {
                  showToast(res.message || 'Lỗi khi tạo nhóm');
                }
              }
            } catch (err: any) {
              showToast(err?.message || 'Lỗi khi lưu nhóm');
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: PREVIEW ARTICLE */}
      {/* ========================================================================= */}
      {previewArticle && (
        <ArticlePreviewModal
          article={previewArticle}
          categories={categories}
          onClose={() => setPreviewArticle(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Xác nhận xóa {deleteTarget.type === 'category' ? 'nhóm' : 'bài viết'}</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa {deleteTarget.type === 'category' ? 'nhóm hướng dẫn' : 'bài viết'}{' '}
              <strong className="text-slate-900">"{deleteTarget.title}"</strong>?
              {deleteTarget.type === 'category' && (
                <span className="block mt-2 font-bold text-rose-600">
                  Lưu ý: Mọi bài viết thuộc nhóm này cũng sẽ bị xóa vĩnh viễn khỏi hệ thống!
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: ARTICLE EDIT MODAL
// ============================================================================

interface ArticleEditModalProps {
  article: Partial<AdminGuideArticle>;
  categories: AdminGuideCategory[];
  onClose: () => void;
  onSave: (data: Partial<AdminGuideArticle>) => Promise<void>;
}

const ArticleEditModal: React.FC<ArticleEditModalProps> = ({
  article,
  categories,
  onClose,
  onSave
}) => {
  const [categoryId, setCategoryId] = useState(article.categoryId || (categories[0]?.id || 'group-1-intro'));
  const [title, setTitle] = useState(article.title || '');
  const [summary, setSummary] = useState(article.summary || '');
  const [content, setContent] = useState(article.content || '');
  const [estimatedReadMinutes, setEstimatedReadMinutes] = useState(article.estimatedReadMinutes ?? 3);
  const [isPublished, setIsPublished] = useState(article.isPublished !== false);
  const [videoUrl, setVideoUrl] = useState(article.videoUrl || '');
  const [attachments, setAttachments] = useState<AttachedFile[]>(article.attachments || []);
  const [externalLinks, setExternalLinks] = useState<GuideLinkItem[]>(article.externalLinks || []);
  const [tagsInput, setTagsInput] = useState((article.tags || []).join(', '));

  // Attachment upload state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Tệp đính kèm vượt quá giới hạn 8MB.');
      return;
    }

    setIsUploadingFile(true);
    try {
      let type: AttachedFile['type'] = 'other';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type === 'application/pdf') type = 'pdf';
      else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'doc';
      else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) type = 'sheet';
      else if (file.type.startsWith('video/')) type = 'video';

      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      // Convert to Base64 Data URL so it is permanently durable in database
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const newAtt: AttachedFile = {
        id: `att-${Date.now()}`,
        name: file.name,
        url: dataUrl || '#',
        type,
        size: sizeFormatted
      };

      setAttachments((prev) => [...prev, newAtt]);
    } catch {
      alert('Lỗi khi tải tệp.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    setExternalLinks((prev) => [
      ...prev,
      {
        id: `link-${Date.now()}`,
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim()
      }
    ]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Vui lòng chọn nhóm hướng dẫn.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await onSave({
      categoryId,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      estimatedReadMinutes: Number(estimatedReadMinutes) || 3,
      isPublished,
      videoUrl: videoUrl.trim() || undefined,
      attachments,
      externalLinks,
      tags
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {article.id ? 'Chỉnh Sửa Bài Viết Hướng Dẫn' : 'Tạo Bài Hướng Dẫn Mới'}
              </h3>
              <p className="text-xs text-slate-500">Nội dung sẽ được lưu bền vững trên hệ thống</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Nhóm Hướng Dẫn <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Read Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Thời gian đọc (phút)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={estimatedReadMinutes}
                onChange={(e) => setEstimatedReadMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Tiêu Đề Bài Hướng Dẫn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Hướng dẫn cấu hình môn học GDPT 2018..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
            />
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Tóm Tắt Ngắn Gọn
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Tóm tắt ngắn gọn 1-2 câu để hiển thị ngoài danh sách..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Content (Markdown / Textarea) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 block">
                Nội Dung Hướng Dẫn Chi Tiết
              </label>
              <span className="text-[10px] text-slate-400">Hỗ trợ tiêu đề Markdown (###), danh sách gạch đầu dòng (-)</span>
            </div>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung bài hướng dẫn chi tiết theo các mục:&#10;### 1. Mục đích&#10;### 2. Các bước thực hiện&#10;### 3. Kết quả mong đợi..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Video URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Video className="h-4 w-4 text-rose-500" /> Đường dẫn Video Hướng Dẫn (YouTube, Vimeo, Google Drive, MP4)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... hoặc link video trực tiếp"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-blue-500" /> Tệp Đính Kèm (PDF, Word, Excel, Hình ảnh)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{isUploadingFile ? 'Đang nạp...' : 'Tải lên tệp'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
              />
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate text-[11px]">{att.name}</p>
                        <p className="text-[10px] text-slate-400">{att.size || 'Tài liệu'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">Chưa có tệp đính kèm nào được tải lên.</p>
            )}
          </div>

          {/* External Links Section */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Link className="h-4 w-4 text-emerald-500" /> Liên Kết Tham Khảo / Hướng Dẫn Ngoại Bộ
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder="Tiêu đề liên kết (VD: Cổng TT Bộ GD&ĐT)"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
              >
                + Thêm link
              </button>
            </div>

            {externalLinks.length > 0 && (
              <div className="space-y-1.5">
                {externalLinks.map((lk, idx) => (
                  <div
                    key={lk.id || idx}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{lk.title}:</span>
                      <span className="text-slate-500 truncate text-[11px]">{lk.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExternalLinks((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags & Publish switch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Từ khóa (Tags, phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="VD: GDPT 2018, Sổ điểm, TT22..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 sm:pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded-lg h-4 w-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-900">
                  Xuất bản ngay (Hiển thị cho Giáo viên chủ nhiệm)
                </span>
              </label>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer transition-all"
            >
              <Save className="h-4 w-4" />
              <span>Lưu Bài Viết</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: CATEGORY EDIT MODAL
// ============================================================================

interface CategoryEditModalProps {
  category: Partial<AdminGuideCategory>;
  onClose: () => void;
  onSave: (data: Partial<AdminGuideCategory>) => Promise<void>;
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  category,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState(category.title || '');
  const [description, setDescription] = useState(category.description || '');
  const [iconName, setIconName] = useState(category.iconName || 'BookOpen');
  const [order, setOrder] = useState(category.order ?? 1);
  const [isPublished, setIsPublished] = useState(category.isPublished !== false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên nhóm hướng dẫn.');
      return;
    }
    await onSave({
      title: title.trim(),
      description: description.trim(),
      iconName,
      order: Number(order) || 1,
      isPublished
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {category.id ? 'Chỉnh Sửa Nhóm Hướng Dẫn' : 'Thêm Nhóm Hướng Dẫn Mới'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Tên Nhóm Hướng Dẫn *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: 1. Giới thiệu về trang web..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Mô Tả Nhóm</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tóm tắt mục tiêu của nhóm tài liệu này..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Biểu tượng</label>
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Sparkles">Sparkles (Giới thiệu)</option>
                <option value="Settings">Settings (Cài đặt)</option>
                <option value="ClipboardList">ClipboardList (Khảo sát)</option>
                <option value="BookOpen">BookOpen (Học tập)</option>
                <option value="Users">Users (Phụ huynh)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Thứ tự hiển thị</label>
              <input
                type="number"
                min="1"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded-lg h-4 w-4 text-amber-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">Hiển thị nhóm này trên giao diện GVCN</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
            >
              Lưu Nhóm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: ARTICLE PREVIEW MODAL
// ============================================================================

interface ArticlePreviewModalProps {
  article: AdminGuideArticle;
  categories: AdminGuideCategory[];
  onClose: () => void;
}

const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({
  article,
  categories,
  onClose
}) => {
  const category = categories.find((c) => c.id === article.categoryId);

  // Helper to extract YouTube video embed URL if applicable
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(article.videoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {category?.title || 'Tài liệu hướng dẫn'}
            </span>
            <span className="text-[10px] text-slate-400">● Chế độ xem trước của GVCN</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content View */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {article.title}
            </h1>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-3">
              <span>{article.estimatedReadMinutes || 3} phút đọc</span>
              <span>•</span>
              <span>Cập nhật: {new Date(article.updatedAt).toLocaleDateString('vi-VN')}</span>
            </p>
          </div>

          {article.summary && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 leading-relaxed font-medium">
              {article.summary}
            </div>
          )}

          {/* Video Player */}
          {embedUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video">
              {embedUrl.includes('youtube.com/embed') ? (
                <iframe
                  src={embedUrl}
                  title={article.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={embedUrl} controls className="w-full h-full" />
              )}
            </div>
          )}

          {/* Content Body */}
          <div className="prose prose-slate text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line font-sans">
            {article.content}
          </div>

          {/* Attachments list */}
          {(article.attachments || []).length > 0 && (
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-blue-600" /> TỆP ĐÍNH KÈM & TÀI LIỆU
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(article.attachments || []).map((att, idx) => (
                  <a
                    key={att.id || idx}
                    href={att.url}
                    download={att.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/40 transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <File className="h-4 w-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400">{att.size}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 shrink-0">Tải về</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* External links list */}
          {(article.externalLinks || []).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 text-emerald-600" /> LIÊN KẾT HỮU ÍCH
              </h4>
              <div className="flex flex-wrap gap-2">
                {(article.externalLinks || []).map((lk, idx) => (
                  <a
                    key={lk.id || idx}
                    href={lk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all"
                  >
                    <span>{lk.title}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
