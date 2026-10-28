/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  Lightbulb,
  Bug,
  BarChart3,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Search,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Users,
  Layers,
  Sparkles
} from 'lucide-react';
import { supportService } from '../../services/SupportService';
import {
  UserFeedback,
  FeedbackType,
  FeedbackCategory,
  FeedbackStatus,
  SupportFeedbackStats
} from '../../types';

export const AdminFeedbackCenter: React.FC = () => {
  const [subTab, setSubTab] = useState<'ratings' | 'suggestions' | 'bugs' | 'stats'>('ratings');
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [stats, setStats] = useState<SupportFeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Detail Modal
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [newStatus, setNewStatus] = useState<FeedbackStatus>('UNDER_REVIEW');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const unsub = supportService.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedFeedbacks, fetchedStats] = await Promise.all([
        supportService.fetchAllFeedbacks(),
        supportService.fetchStats()
      ]);
      setFeedbacks(fetchedFeedbacks);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Error loading feedback data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = async () => {
    setIsLoading(true);
    let typeParam: string | undefined = undefined;
    if (subTab === 'ratings') typeParam = 'RATING_FEEDBACK';
    else if (subTab === 'suggestions') typeParam = 'FEATURE_SUGGESTION';
    else if (subTab === 'bugs') typeParam = 'BUG_REPORT';

    const filtered = await supportService.fetchAllFeedbacks({
      type: typeParam,
      status: statusFilter,
      category: categoryFilter,
      module: moduleFilter,
      search: searchQuery
    });
    setFeedbacks(filtered);
    setIsLoading(false);
  };

  const handleOpenDetail = (f: UserFeedback) => {
    setSelectedFeedback(f);
    setNewStatus(f.status);
    setAdminNotes(f.adminNotes || '');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    setIsUpdating(true);
    const res = await supportService.updateFeedbackStatus(
      selectedFeedback.id,
      newStatus,
      adminNotes.trim() || undefined
    );

    setIsUpdating(false);
    if (res.success && res.feedback) {
      setSelectedFeedback(res.feedback);
      showActionMsg(`Đã cập nhật trạng thái sang "${newStatus}"!`);
      loadData();
    } else {
      alert(res.message || 'Lỗi cập nhật');
    }
  };

  const showActionMsg = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const renderStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Mới nhận</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Đang xem xét</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">Đã duyệt</span>;
      case 'IN_DEVELOPMENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Đang phát triển</span>;
      case 'IMPLEMENTED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Đã triển khai</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Không thực hiện</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">Đã giải quyết</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const filteredItems = feedbacks.filter(f => {
    if (subTab === 'ratings') return f.type === 'RATING_FEEDBACK';
    if (subTab === 'suggestions') return f.type === 'FEATURE_SUGGESTION';
    if (subTab === 'bugs') return f.type === 'BUG_REPORT';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold animate-slide-up">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Real Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase block">Điểm hài lòng TB</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-500 flex items-center gap-1">
              <Star className="w-5 h-5 fill-amber-400" />
              {stats?.feedbacks.averageRating ? stats.feedbacks.averageRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-xs text-slate-400">/ 5.0 ({stats?.feedbacks.ratingsCount || 0} lượt)</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-xs bg-purple-50/30">
          <span className="text-xs font-bold text-purple-700 uppercase block">Đề xuất Chức năng</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{stats?.feedbacks.suggestionsCount || 0}</span>
            <span className="text-xs font-bold text-purple-500">Ý tưởng mới</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-xs bg-rose-50/30">
          <span className="text-xs font-bold text-rose-700 uppercase block">Báo cáo Lỗi</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{stats?.feedbacks.bugsCount || 0}</span>
            <span className="text-xs font-bold text-rose-500">Báo cáo</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs bg-blue-50/30">
          <span className="text-xs font-bold text-blue-700 uppercase block">Tổng Phản hồi</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">{stats?.feedbacks.total || feedbacks.length}</span>
            <span className="text-xs font-bold text-blue-500">Lượt đóng góp</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setSubTab('ratings'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            subTab === 'ratings'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Star className="w-4 h-4 text-amber-400" />
          Đánh Giá & Trải Nghiệm ({feedbacks.filter(f => f.type === 'RATING_FEEDBACK').length})
        </button>

        <button
          onClick={() => { setSubTab('suggestions'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            subTab === 'suggestions'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-amber-300" />
          Đề Xuất Chức Năng Mới ({feedbacks.filter(f => f.type === 'FEATURE_SUGGESTION').length})
        </button>

        <button
          onClick={() => { setSubTab('bugs'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            subTab === 'bugs'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bug className="w-4 h-4 text-white" />
          Báo Lỗi Kỹ Thuật ({feedbacks.filter(f => f.type === 'BUG_REPORT').length})
        </button>

        <button
          onClick={() => { setSubTab('stats'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            subTab === 'stats'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Thống Kê Chi Tiết
        </button>
      </div>

      {/* 1. RATINGS, SUGGESTIONS & BUGS LIST */}
      {subTab !== 'stats' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nội dung, tên người gửi, tiêu đề..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Mới nhận</option>
              <option value="UNDER_REVIEW">Đang xem xét</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="IN_DEVELOPMENT">Đang phát triển</option>
              <option value="IMPLEMENTED">Đã triển khai</option>
              <option value="REJECTED">Không thực hiện</option>
            </select>

            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" /> Lọc
            </button>

            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Cards Grid / List */}
          {isLoading ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải danh sách...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Chưa có phản hồi nào trong mục này</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Các đánh giá và đề xuất từ người dùng sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.type === 'FEATURE_SUGGESTION' ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-md text-[11px]">
                            💡 Đề xuất Chức năng
                          </span>
                        ) : item.type === 'BUG_REPORT' ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[11px]">
                            🐛 Báo lỗi kỹ thuật
                          </span>
                        ) : (
                          <div className="flex items-center text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                            {item.rating ? `${item.rating}/5` : 'Góp ý'}
                          </div>
                        )}

                        <span className="text-[11px] font-semibold text-slate-500">
                          {item.relatedModule || 'Chung'}
                        </span>
                      </div>

                      {renderStatusBadge(item.status)}
                    </div>

                    {item.title && (
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                    )}

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
                      {item.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="text-slate-500">
                      {item.isAnonymous ? (
                        <span className="font-semibold text-slate-500">🔒 Người dùng Ẩn danh</span>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {item.userName} <span className="text-indigo-600">({item.userRole})</span>
                        </span>
                      )}
                      <span className="ml-2 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenDetail(item)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Chi tiết & Xử lý
                    </button>
                  </div>

                  {item.adminNotes && (
                    <div className="p-2 bg-indigo-50/70 border-l-2 border-indigo-600 rounded-r-md text-[11px] text-indigo-900">
                      <b>Ghi chú Admin:</b> {item.adminNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. STATS TAB */}
      {subTab === 'stats' && (
        <div className="space-y-6">
          {/* Star Distribution */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              Phân bố Đánh giá Sao của Người dùng (Dữ liệu thực từ SQLite)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = stats?.feedbacks.byRating?.[star] || 0;
                const total = stats?.feedbacks.ratingsCount || 1;
                const percent = Math.round((count / total) * 100);

                return (
                  <div key={star} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div className="flex items-center justify-center text-amber-500 font-black text-sm">
                      {star} <Star className="w-3.5 h-3.5 fill-amber-400 ml-1" />
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">{count}</div>
                    <div className="text-[10px] text-slate-400">{percent}% lượt đánh giá</div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown by Role & Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Phản hồi theo Vai trò Người dùng
              </h4>
              <div className="space-y-2 pt-1">
                {Object.entries(stats?.feedbacks.byRole || { TEACHER: 0, STUDENT: 0, PARENT: 0 }).map(([role, cnt]) => (
                  <div key={role} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <span className="font-bold text-slate-700">
                      {role === 'TEACHER' ? 'Giáo viên chủ nhiệm (TEACHER)' :
                       role === 'STUDENT' ? 'Học sinh (STUDENT)' :
                       role === 'PARENT' ? 'Phụ huynh học sinh (PARENT)' : role}
                    </span>
                    <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{cnt} phản hồi</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Phân bố theo Phân hệ / Module
              </h4>
              <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                {Object.entries(stats?.feedbacks.byModule || { 'Tổng quan': 0 }).map(([mod, cnt]) => (
                  <div key={mod} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <span className="font-bold text-slate-700 truncate max-w-xs">{mod}</span>
                    <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL & STATUS UPDATE */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Xử lý Phản hồi / Đề xuất</h3>
                  <p className="text-[11px] text-slate-300">
                    Phân loại: {selectedFeedback.type} • {selectedFeedback.relatedModule || 'Chung'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                {selectedFeedback.title && (
                  <h4 className="text-sm font-bold text-slate-900">{selectedFeedback.title}</h4>
                )}
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedFeedback.content}</p>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Người gửi:{' '}
                    <b className="text-slate-800">
                      {selectedFeedback.isAnonymous ? '🔒 Ẩn danh' : selectedFeedback.userName}
                    </b>
                  </span>
                  <span>{new Date(selectedFeedback.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Cập nhật Trạng thái Xử lý *
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as FeedbackStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NEW">MỚI TIẾP NHẬN (NEW)</option>
                    <option value="UNDER_REVIEW">ĐANG XEM XÉT (UNDER_REVIEW)</option>
                    <option value="APPROVED">ĐÃ DUYỆT (APPROVED)</option>
                    <option value="IN_DEVELOPMENT">ĐANG PHÁT TRIỂN (IN_DEVELOPMENT)</option>
                    <option value="IMPLEMENTED">ĐÃ TRIỂN KHAI HOÀN TẤT (IMPLEMENTED)</option>
                    <option value="RESOLVED">ĐÃ GIẢI QUYẾT (RESOLVED)</option>
                    <option value="REJECTED">KHÔNG THỰC HIỆN / TỪ CHỐI (REJECTED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ghi chú / Đánh giá của Ban Quản trị
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Nhập ghi chú xem xét, kế hoạch triển khai hoặc lý do..."
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFeedback(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Lưu Trạng Thái
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
