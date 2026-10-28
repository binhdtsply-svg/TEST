/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  History,
  Calendar,
  CheckCircle2,
  Eye,
  BarChart3,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers
} from 'lucide-react';

export interface HistoryItem {
  id: string;
  attemptNumber: number;
  dateStr: string;
  codeOrTitle: string;
  subSummary?: string;
  isLatest: boolean;
  isSelectedForView: boolean;
  rawItem: any;
}

interface Props {
  title: string;
  testType: 'holland' | 'mbti' | 'work_values';
  items: HistoryItem[];
  onSelectAttemptToView: (item: any) => void;
  onStartNewAttempt: () => void;
  onOpenCompareModal: () => void;
  isTakingQuiz: boolean;
  themeColor?: 'amber' | 'indigo' | 'teal';
}

export const AssessmentHistoryCardList: React.FC<Props> = ({
  title,
  testType,
  items,
  onSelectAttemptToView,
  onStartNewAttempt,
  onOpenCompareModal,
  isTakingQuiz,
  themeColor = 'amber'
}) => {
  if (items.length === 0) return null;

  const colorStyles = {
    amber: {
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      activeBorder: 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/20',
      activeBadge: 'bg-amber-600 text-white',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      accentText: 'text-amber-800'
    },
    indigo: {
      badge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      activeBorder: 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-400/20',
      activeBadge: 'bg-indigo-600 text-white',
      button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      accentText: 'text-indigo-800'
    },
    teal: {
      badge: 'bg-teal-100 text-teal-900 border-teal-200',
      activeBorder: 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-400/20',
      activeBadge: 'bg-teal-600 text-white',
      button: 'bg-teal-600 hover:bg-teal-700 text-white',
      accentText: 'text-teal-800'
    }
  }[themeColor];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                LỊCH SỬ KẾT QUẢ – {title}
              </h4>
              <span className="rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5">
                {items.length} lần làm
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Mỗi lần làm bài là một phiên kết quả riêng biệt, được bảo toàn toàn vẹn và có thể đối chiếu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length >= 2 && (
            <button
              type="button"
              onClick={onOpenCompareModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <BarChart3 className="h-3.5 w-3.5 text-slate-600" />
              <span>So sánh các lần làm ({items.length})</span>
            </button>
          )}

          {!isTakingQuiz && (
            <button
              type="button"
              onClick={onStartNewAttempt}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${colorStyles.button}`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>+ Làm lại bài</span>
            </button>
          )}
        </div>
      </div>

      {/* List of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 ${
              item.isSelectedForView
                ? colorStyles.activeBorder
                : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="space-y-2">
              {/* Attempt number and tags */}
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-lg bg-slate-900 text-white px-2.5 py-0.5 text-xs font-black">
                  Lần {item.attemptNumber}
                </span>

                <div className="flex items-center gap-1.5">
                  {item.isLatest && (
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                      Kết quả gần nhất
                    </span>
                  )}
                  {item.isSelectedForView && (
                    <span className={`rounded-full text-[10px] font-bold px-2 py-0.5 ${colorStyles.activeBadge}`}>
                      Đang xem
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Calendar className="h-3 w-3" />
                <span>{item.dateStr}</span>
              </div>

              {/* Summary */}
              <div className="pt-1">
                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>Kết quả:</span>
                  <span className={`font-black ${colorStyles.accentText}`}>{item.codeOrTitle}</span>
                </div>
                {item.subSummary && (
                  <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium">
                    {item.subSummary}
                  </p>
                )}
              </div>
            </div>

            {/* Action */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectAttemptToView(item.rawItem)}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  item.isSelectedForView
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{item.isSelectedForView ? 'Đang hiển thị' : 'Xem kết quả'}</span>
              </button>

              <span className="text-[10px] text-slate-400 italic">Bản ghi độc lập</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
