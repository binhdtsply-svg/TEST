/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Star,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { AdminSupportCenter } from './AdminSupportCenter';
import { AdminFeedbackCenter } from './AdminFeedbackCenter';
import { supportService } from '../../services/SupportService';
import { SupportFeedbackStats } from '../../types';

export const AdminSupportFeedbackHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'ratings' | 'suggestions'>('tickets');
  const [stats, setStats] = useState<SupportFeedbackStats | null>(null);

  useEffect(() => {
    const s = supportService.getStats();
    setStats(s);
    supportService.fetchStats().then((asyncStats) => {
      if (asyncStats) setStats(asyncStats);
    }).catch((err) => console.warn('[AdminSupportFeedbackHub] Error fetching stats:', err));
  }, []);

  const suggestionsCount = stats?.feedbacks?.suggestionsCount ?? (stats?.feedbacks as any)?.suggestions ?? 0;
  const ratingsCount = stats?.feedbacks?.ratingsCount ?? (stats?.feedbacks as any)?.ratings ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
              Khu vực Quản trị Hệ thống
            </span>
          </div>
          <h2 className="text-xl font-black mt-1.5 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-blue-200" />
            Trung tâm Hỗ trợ & Đóng góp Ý kiến
          </h2>
          <p className="text-xs text-blue-100 max-w-2xl mt-1 leading-relaxed">
            Tiếp nhận, phân loại và xử lý tập trung mọi yêu cầu hỗ trợ kỹ thuật, đánh giá trải nghiệm người dùng và đề xuất phát triển tính năng từ GVCN, học sinh và phụ huynh.
          </p>
        </div>

        {/* Quick KPI pills */}
        {stats && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-center backdrop-blur-xs">
              <span className="text-[11px] text-blue-200 block font-medium">Tickets mới</span>
              <span className="text-lg font-black text-amber-300">{stats.tickets.new}</span>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-center backdrop-blur-xs">
              <span className="text-[11px] text-blue-200 block font-medium">Điểm đánh giá</span>
              <span className="text-lg font-black text-emerald-300">
                {stats.feedbacks.averageRating > 0 ? `${stats.feedbacks.averageRating}/5` : 'N/A'}
              </span>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-center backdrop-blur-xs">
              <span className="text-[11px] text-blue-200 block font-medium">Đề xuất</span>
              <span className="text-lg font-black text-purple-300">{suggestionsCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Subtab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'tickets'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>1. Yêu cầu Hỗ trợ (Tickets)</span>
          {stats && stats.tickets.new > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
              {stats.tickets.new}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('ratings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'ratings'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>2. Đánh giá & Góp ý</span>
          {ratingsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
              {ratingsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('suggestions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'suggestions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>3. Đề xuất Tính năng</span>
          {suggestionsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
              {suggestionsCount}
            </span>
          )}
        </button>
      </div>

      {/* Subtab Content */}
      <div>
        {activeSubTab === 'tickets' && (
          <AdminSupportCenter />
        )}
        {activeSubTab === 'ratings' && (
          <AdminFeedbackCenter />
        )}
        {activeSubTab === 'suggestions' && (
          <AdminFeedbackCenter />
        )}
      </div>
    </div>
  );
};
