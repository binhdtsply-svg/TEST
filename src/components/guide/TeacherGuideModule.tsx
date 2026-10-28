/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen,
  Search,
  Sparkles,
  Settings,
  Users,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  ExternalLink,
  Paperclip,
  Video,
  FileText,
  Download,
  RefreshCw,
  FolderOpen,
  HelpCircle,
  Share2,
  Check,
  Calendar,
  Layers,
  Info,
  Laptop
} from 'lucide-react';
import {
  guideService,
  AdminGuideCategory,
  AdminGuideArticle,
  GuideLinkItem
} from '../../services/GuideService';
import { AttachedFile } from '../../types';

interface TeacherGuideModuleProps {
  onNavigateModule?: (moduleId: string, options?: any) => void;
}

export const TeacherGuideModule: React.FC<TeacherGuideModuleProps> = ({
  onNavigateModule
}) => {
  const [categories, setCategories] = useState<AdminGuideCategory[]>([]);
  const [articles, setArticles] = useState<AdminGuideArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active view states
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Collapsible section state inside Reader View
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    content: true,
    video: true,
    attachments: true,
    links: true,
    steps: true,
    expectedResult: true,
    persistence: true,
    commonErrors: true,
    security: true
  });

  const readerTopRef = useRef<HTMLDivElement>(null);

  // Load guide data from persistent backend API
  const loadGuideData = async (force: boolean = false) => {
    if (force) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await guideService.getContent(force);
      if (data && data.success !== false) {
        // Strict Teacher Rule: Only display categories & articles marked as PUBLISHED
        const publishedCats = (data.categories || [])
          .filter((c) => c.isPublished !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const publishedArts = (data.articles || [])
          .filter((a) => a.isPublished !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        setCategories(publishedCats);
        setArticles(publishedArts);

        // Expand all groups by default on initial load
        setExpandedGroups((prev) => {
          if (Object.keys(prev).length === 0) {
            const initialMap: Record<string, boolean> = {};
            publishedCats.forEach((c) => {
              initialMap[c.id] = true;
            });
            return initialMap;
          }
          return prev;
        });
      } else {
        setErrorMessage('Không thể tải danh sách cẩm nang hướng dẫn từ máy chủ.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối máy chủ khi nạp tài liệu hướng dẫn.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadGuideData(false);

    // Auto sync when Admin updates guide content
    const handleGuideUpdate = () => {
      loadGuideData(true);
    };

    window.addEventListener('guide-content-changed', handleGuideUpdate);
    return () => {
      window.removeEventListener('guide-content-changed', handleGuideUpdate);
    };
  }, []);

  // Icon mapping for 5 standard categories
  const getCategoryIcon = (iconName?: string, categoryId?: string) => {
    if (iconName === 'Sparkles' || categoryId === 'group-1-intro') return Sparkles;
    if (iconName === 'Settings' || categoryId === 'group-2-class-setup') return Settings;
    if (iconName === 'ClipboardList' || categoryId === 'group-3-surveys') return ClipboardList;
    if (iconName === 'BookOpen' || categoryId === 'group-4-academic-activities') return BookOpen;
    if (iconName === 'Users' || categoryId === 'group-5-parents') return Users;
    return FolderOpen;
  };

  // Color schemes for the 5 standard categories
  const getCategoryTheme = (categoryId: string) => {
    switch (categoryId) {
      case 'group-1-intro':
        return {
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          hoverBorder: 'hover:border-teal-400',
          text: 'text-teal-800',
          iconBg: 'bg-teal-600',
          badge: 'bg-teal-100 text-teal-800'
        };
      case 'group-2-class-setup':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          hoverBorder: 'hover:border-blue-400',
          text: 'text-blue-800',
          iconBg: 'bg-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'group-3-surveys':
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          hoverBorder: 'hover:border-indigo-400',
          text: 'text-indigo-800',
          iconBg: 'bg-indigo-600',
          badge: 'bg-indigo-100 text-indigo-800'
        };
      case 'group-4-academic-activities':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          hoverBorder: 'hover:border-emerald-400',
          text: 'text-emerald-800',
          iconBg: 'bg-emerald-600',
          badge: 'bg-emerald-100 text-emerald-800'
        };
      case 'group-5-parents':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          hoverBorder: 'hover:border-amber-400',
          text: 'text-amber-800',
          iconBg: 'bg-amber-600',
          badge: 'bg-amber-100 text-amber-800'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          hoverBorder: 'hover:border-slate-400',
          text: 'text-slate-800',
          iconBg: 'bg-slate-600',
          badge: 'bg-slate-100 text-slate-800'
        };
    }
  };

  // Toggle single group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Expand / Collapse all groups
  const setAllGroupsExpanded = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    categories.forEach((c) => {
      updated[c.id] = expand;
    });
    setExpandedGroups(updated);
  };

  // Video embed helper
  const getVideoEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const v = new URL(url).searchParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}` : url;
      }
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      return url;
    } catch {
      return url;
    }
  };

  // Download attachment
  const handleDownloadAttachment = (att: { name: string; url: string }) => {
    try {
      const link = document.createElement('a');
      link.href = att.url;
      link.download = att.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(att.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Filtered articles based on search query and category filter
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory =
        selectedCategoryId === 'all' || article.categoryId === selectedCategoryId;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = (article.title || '').toLowerCase().includes(q);
      const inSummary = (article.summary || '').toLowerCase().includes(q);
      const inContent = (article.content || '').toLowerCase().includes(q);
      const inTags = (article.tags || []).some((t) => t.toLowerCase().includes(q));
      const inCategoryTitle = (
        categories.find((c) => c.id === article.categoryId)?.title || ''
      ).toLowerCase().includes(q);

      return inTitle || inSummary || inContent || inTags || inCategoryTitle;
    });
  }, [articles, categories, selectedCategoryId, searchQuery]);

  // Group articles by category for accordion catalog view
  const groupedArticles = useMemo(() => {
    const map = new Map<string, AdminGuideArticle[]>();
    categories.forEach((c) => map.set(c.id, []));

    filteredArticles.forEach((article) => {
      const list = map.get(article.categoryId) || [];
      list.push(article);
      map.set(article.categoryId, list);
    });

    return map;
  }, [categories, filteredArticles]);

  // Active article being read in Reader View
  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return articles.find((a) => a.id === activeArticleId) || null;
  }, [articles, activeArticleId]);

  const activeCategory = useMemo(() => {
    if (!activeArticle) return null;
    return categories.find((c) => c.id === activeArticle.categoryId) || null;
  }, [categories, activeArticle]);

  // Next / Previous article navigation inside reader
  const { prevArticle, nextArticle } = useMemo(() => {
    if (!activeArticle) return { prevArticle: null, nextArticle: null };
    const currentIndex = articles.findIndex((a) => a.id === activeArticle.id);
    const prev = currentIndex > 0 ? articles[currentIndex - 1] : null;
    const next = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;
    return { prevArticle: prev, nextArticle: next };
  }, [activeArticle, articles]);

  const scrollToTop = () => {
    if (readerTopRef.current) {
      readerTopRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-5 animate-fade-in text-slate-800 font-['Be_Vietnam_Pro',sans-serif]" ref={readerTopRef}>
      {/* 1. Top Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-700 text-white p-5 sm:p-6 shadow-sm border border-teal-800/40">
        <div className="relative z-10 max-w-3xl space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-teal-100 text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Cẩm nang Nghiệp vụ Dành riêng cho Giáo viên chủ nhiệm</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Hướng Dẫn Sử Dụng & Vận Hành Không Gian Chủ Nhiệm Số
          </h1>

          <p className="text-xs sm:text-sm text-teal-100 leading-relaxed max-w-2xl">
            Tài liệu số hóa chính thức do Ban Quản trị xuất bản, hướng dẫn quy trình 5 nhóm nghiệp vụ cốt lõi: cài đặt lớp học, khảo sát, sổ điểm, phong trào thi đua và kết nối phụ huynh.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-teal-200">
            <span className="flex items-center gap-1.5 bg-teal-800/60 px-2.5 py-1 rounded-lg border border-teal-500/30">
              <Layers className="h-3.5 w-3.5 text-teal-300" />
              <span>{categories.length} nhóm nghiệp vụ</span>
            </span>
            <span className="flex items-center gap-1.5 bg-teal-800/60 px-2.5 py-1 rounded-lg border border-teal-500/30">
              <FileText className="h-3.5 w-3.5 text-emerald-300" />
              <span>{articles.length} bài hướng dẫn đã xuất bản</span>
            </span>
          </div>
        </div>

        {/* Action button inside header: Refresh Data */}
        <div className="absolute top-5 right-5 z-20">
          <button
            onClick={() => loadGuideData(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all backdrop-blur-xs border border-white/30 cursor-pointer disabled:opacity-50"
            title="Đồng bộ dữ liệu mới nhất từ Ban Quản trị"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Đang đồng bộ...' : 'Làm mới'}</span>
          </button>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-10 -bottom-10 w-56 h-56 rounded-full bg-white/10 pointer-events-none blur-2xl" />
      </div>

      {/* 2. Loading State */}
      {isLoading && !activeArticle && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Đang tải dữ liệu hướng dẫn sử dụng...</h3>
            <p className="text-xs text-slate-500">Hệ thống đang kết nối kho lưu trữ bền vững để tải nội dung đã xuất bản.</p>
          </div>
        </div>
      )}

      {/* 3. Error State */}
      {errorMessage && !isLoading && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold">Lỗi khi tải tài liệu hướng dẫn:</div>
              <p>{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => loadGuideData(true)}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
      )}

      {/* 4. Main Body: Reader View VS Catalog Accordion View */}
      {!isLoading && !errorMessage && (
        activeArticle ? (
          /* =========================================================================
             READER VIEW (Chi tiết bài hướng dẫn dành cho Giáo viên chủ nhiệm)
             ========================================================================= */
          <div className="space-y-4">
            {/* Top Return & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-600 overflow-x-auto">
                <button
                  onClick={() => setActiveArticleId(null)}
                  className="text-teal-700 hover:text-teal-900 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Quay lại danh mục</span>
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <span className="text-slate-600 font-medium truncate max-w-[200px]">
                  {activeCategory?.title || 'Chuyên mục'}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                <span className="text-slate-900 font-bold truncate max-w-[260px]">
                  {activeArticle.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const allTrue: Record<string, boolean> = {};
                    Object.keys(openSections).forEach((k) => (allTrue[k] = true));
                    setOpenSections(allTrue);
                  }}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Mở rộng tất cả
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => {
                    const allFalse: Record<string, boolean> = {};
                    Object.keys(openSections).forEach((k) => (allFalse[k] = false));
                    setOpenSections(allFalse);
                  }}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Thu gọn
                </button>
              </div>
            </div>

            {/* Article Main Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  {activeCategory?.title}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã xuất bản & Xác minh
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                  <Clock className="h-3.5 w-3.5" />
                  Thời gian đọc: ~{activeArticle.estimatedReadMinutes || 4} phút
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {activeArticle.title}
              </h2>

              {activeArticle.summary && (
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100 text-xs sm:text-sm text-teal-900 leading-relaxed">
                  <div className="font-bold mb-1 text-teal-950 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-teal-700" />
                    <span>Tóm tắt nghiệp vụ:</span>
                  </div>
                  <p>{activeArticle.summary}</p>
                </div>
              )}

              {activeArticle.tags && activeArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Video Guide Section (if present) */}
            {activeArticle.videoUrl && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-600 text-white text-xs">
                      <Video className="h-3.5 w-3.5" />
                    </span>
                    <span>Video Hướng Dẫn Thực Hành</span>
                  </div>
                  <a
                    href={activeArticle.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Mở video trong tab mới</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="p-4 sm:p-6 bg-slate-950 flex justify-center">
                  {activeArticle.videoUrl.includes('youtube.com') || activeArticle.videoUrl.includes('youtu.be') ? (
                    <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-800">
                      <iframe
                        src={getVideoEmbedUrl(activeArticle.videoUrl) || activeArticle.videoUrl}
                        title={activeArticle.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      src={activeArticle.videoUrl}
                      controls
                      className="w-full max-w-4xl rounded-xl shadow-lg border border-slate-800"
                    >
                      Trình duyệt của bạn không hỗ trợ phát trực tiếp video này.
                    </video>
                  )}
                </div>
              </div>
            )}

            {/* Article Detailed Markdown Content */}
            {activeArticle.content && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">
                      <FileText className="h-3.5 w-3.5 text-teal-700" />
                    </span>
                    <span>Nội Dung Hướng Dẫn Chi Tiết</span>
                  </div>
                </div>
                <div className="p-5 sm:p-8 text-sm text-slate-700 leading-relaxed font-sans prose prose-slate max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-slate-900 mt-6 mb-3 border-b border-slate-200 pb-2" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-slate-900 mt-5 mb-2.5 text-teal-900" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-base font-bold text-slate-800 mt-4 mb-2" {...props} />,
                      p: ({ node, ...props }) => <p className="text-sm text-slate-700 leading-relaxed my-2.5" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-slate-700" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-slate-700" {...props} />,
                      li: ({ node, ...props }) => <li className="text-sm leading-relaxed" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                      blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-teal-500 pl-4 py-1 italic bg-teal-50/50 rounded-r-lg my-3 text-slate-700" {...props} />,
                      code: ({ node, ...props }) => <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-teal-800 font-mono text-xs" {...props} />
                    }}
                  >
                    {activeArticle.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Attachments Section (PDF, Word, Excel) */}
            {activeArticle.attachments && activeArticle.attachments.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">
                      <Paperclip className="h-3.5 w-3.5 text-teal-700" />
                    </span>
                    <span>Tài Liệu & Tệp Biểu Mẫu Đính Kèm ({activeArticle.attachments.length})</span>
                  </div>
                  <span className="text-xs text-slate-400">Giáo viên có thể tải về máy tính để sử dụng</span>
                </div>
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeArticle.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-300 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                            {att.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {att.size ? (typeof att.size === 'number' ? `${(att.size / 1024).toFixed(1)} KB` : att.size) : 'Tài liệu hướng dẫn'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadAttachment(att)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Tải về</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Links Section */}
            {activeArticle.externalLinks && activeArticle.externalLinks.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 font-bold text-sm text-slate-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">
                    <ExternalLink className="h-3.5 w-3.5 text-teal-700" />
                  </span>
                  <span>Liên Kết Tham Khảo & Cổng Thông Tin ({activeArticle.externalLinks.length})</span>
                </div>
                <div className="p-4 sm:p-5 flex flex-wrap gap-2.5">
                  {activeArticle.externalLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-slate-700 text-xs font-medium transition-all shadow-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span>{link.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Bottom Footer */}
            <div className="pt-4 pb-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              {prevArticle ? (
                <button
                  onClick={() => {
                    setActiveArticleId(prevArticle.id);
                    scrollToTop();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-teal-600" />
                  <span className="truncate max-w-[200px]">Trước: {prevArticle.title}</span>
                </button>
              ) : <div />}

              <button
                onClick={scrollToTop}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Cuộn về đầu bài viết"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Về đầu trang</span>
              </button>

              {nextArticle ? (
                <button
                  onClick={() => {
                    setActiveArticleId(nextArticle.id);
                    scrollToTop();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span className="truncate max-w-[200px]">Tiếp: {nextArticle.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-teal-600" />
                </button>
              ) : <div />}
            </div>
          </div>
        ) : (
          /* =========================================================================
             CATALOG / ACCORDION VIEW (5 Nhóm Nội Dung Cốt Lõi Có Thể Mở Rộng / Thu Gọn)
             ========================================================================= */
          <div className="space-y-5">
            {/* Search Bar & Quick Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm nội dung hướng dẫn (ví dụ: cấu hình lớp, sổ điểm, khảo sát, phụ huynh...)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAllGroupsExpanded(true)}
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Mở tất cả nhóm
                  </button>
                  <button
                    onClick={() => setAllGroupsExpanded(false)}
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Thu gọn tất cả
                  </button>
                </div>
              </div>

              {/* Status & Category Quick Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategoryId('all')}
                    className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer shrink-0 ${
                      selectedCategoryId === 'all'
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({articles.length})
                  </button>
                  {categories.map((c) => {
                    const count = (groupedArticles.get(c.id) || []).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors cursor-pointer shrink-0 truncate max-w-[170px] ${
                          selectedCategoryId === c.id
                            ? 'bg-teal-600 text-white font-bold shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={c.title}
                      >
                        {c.title.replace(/^\d+\.\s*/, '')} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-teal-700 font-semibold shrink-0">
                  Hiển thị {filteredArticles.length} bài phù hợp
                </div>
              </div>
            </div>

            {/* 5 Main Groups Accordion List */}
            {categories.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Chưa có nội dung hướng dẫn nào được xuất bản</h3>
                <p className="text-xs text-slate-500">
                  Ban Quản trị Nền tảng sẽ cập nhật các bài cẩm nang hướng dẫn trong thời gian sớm nhất.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((cat, idx) => {
                  const catArticles = groupedArticles.get(cat.id) || [];
                  const isExpanded = expandedGroups[cat.id] ?? true;
                  const Icon = getCategoryIcon(cat.iconName, cat.id);
                  const theme = getCategoryTheme(cat.id);

                  // If user selected a specific category filter, hide non-matching groups
                  if (selectedCategoryId !== 'all' && selectedCategoryId !== cat.id) {
                    return null;
                  }

                  return (
                    <div
                      key={cat.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                    >
                      {/* Group Header (Clickable to Expand / Collapse) */}
                      <div
                        onClick={() => toggleGroup(cat.id)}
                        className={`p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors border-b ${
                          isExpanded ? 'bg-slate-50/80 border-slate-200' : 'bg-white border-transparent hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`p-2.5 rounded-xl ${theme.iconBg} text-white shrink-0 shadow-2xs`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                {cat.title}
                              </h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${theme.badge}`}>
                                {catArticles.length} bài
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5 max-w-2xl">
                              {cat.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400 hidden sm:inline">
                            {isExpanded ? 'Thu gọn' : 'Xem các bài'}
                          </span>
                          <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* Group Articles Container (Shown when Expanded) */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-white">
                          {catArticles.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              Chưa có bài viết nào phù hợp trong nhóm này.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {catArticles.map((article) => {
                                const hasVideo = Boolean(article.videoUrl);
                                const hasAttachments = Boolean(article.attachments && article.attachments.length > 0);
                                const hasLinks = Boolean(article.externalLinks && article.externalLinks.length > 0);

                                return (
                                  <div
                                    key={article.id}
                                    onClick={() => {
                                      setActiveArticleId(article.id);
                                      scrollToTop();
                                    }}
                                    className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between gap-2 text-[11px]">
                                        <span className="text-xs font-bold text-slate-400">
                                          Bài {article.order || 1}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          {hasVideo && (
                                            <span className="p-1 rounded-md bg-teal-50 text-teal-700" title="Có video thực hành">
                                              <Video className="h-3 w-3" />
                                            </span>
                                          )}
                                          {hasAttachments && (
                                            <span className="p-1 rounded-md bg-indigo-50 text-indigo-700" title="Có tài liệu biểu mẫu">
                                              <Paperclip className="h-3 w-3" />
                                            </span>
                                          )}
                                          {hasLinks && (
                                            <span className="p-1 rounded-md bg-amber-50 text-amber-700" title="Có liên kết tham khảo">
                                              <ExternalLink className="h-3 w-3" />
                                            </span>
                                          )}
                                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Đã xuất bản
                                          </span>
                                        </div>
                                      </div>

                                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
                                        {article.title}
                                      </h4>

                                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                        {article.summary}
                                      </p>
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        ~{article.estimatedReadMinutes || 4} phút
                                      </span>

                                      <span className="font-bold text-teal-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                        Đọc hướng dẫn chi tiết →
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
