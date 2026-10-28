/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Trophy, PlusCircle, CheckCircle } from 'lucide-react';
import { StudentLaurelTree } from '../../types';
import { TreeStageIllustration } from './TreeStageIllustration';

interface StudentTreeCardProps {
  tree: StudentLaurelTree;
  onOpenDetails: (studentId: string) => void;
  onWaterTree?: (studentId: string) => void;
}

export const StudentTreeCard: React.FC<StudentTreeCardProps> = ({
  tree,
  onOpenDetails,
  onWaterTree
}) => {
  const pointsToNext = 100 - tree.currentCyclePoints;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all">
      <div>
        {/* Top bar with student name and group */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img
              src={tree.studentAvatar}
              alt={tree.studentName}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
            />
            <div>
              <h4 className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{tree.studentName}</h4>
              <span className="text-[10px] text-slate-400">Tổ {tree.studentGroup}</span>
            </div>
          </div>

          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
            🌼 {tree.completedTrees} Cây
          </span>
        </div>

        {/* Tree Visual */}
        <div className="flex flex-col items-center py-2">
          <TreeStageIllustration stage={tree.stage} className="h-20 w-20" />
          <div className="mt-2 text-center">
            <div className="text-xs font-extrabold text-slate-800">{tree.stageName}</div>
            <div className="text-[11px] text-slate-500">{tree.currentCyclePoints}/100 điểm chu kỳ</div>
          </div>
        </div>

        {/* Progress Bar to next stage */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 mb-1">
            <span>Tiến độ trổ hoa</span>
            <span className="text-emerald-700 font-bold">{tree.currentCyclePoints}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
              style={{ width: `${tree.currentCyclePoints}%` }}
            />
          </div>
          <div className="mt-1 text-center text-[10px] text-slate-400">
            {pointsToNext > 0 ? `Còn ${pointsToNext} điểm để trổ hoa` : 'Đã đủ điểm trổ hoa!'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
        <span className="text-[11px] text-slate-500 font-medium">
          Tổng: <b className="text-slate-800">{tree.totalPointsEarned} đ</b>
        </span>
        <button
          onClick={() => onOpenDetails(tree.studentId)}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Nhật ký rèn luyện →
        </button>
      </div>
    </div>
  );
};
