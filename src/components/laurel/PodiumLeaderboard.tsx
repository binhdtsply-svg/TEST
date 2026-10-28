/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Sparkles, Star } from 'lucide-react';
import { StudentLaurelTree } from '../../types';

interface PodiumLeaderboardProps {
  trees: StudentLaurelTree[];
  onSelectStudent?: (studentId: string) => void;
}

export const PodiumLeaderboard: React.FC<PodiumLeaderboardProps> = ({
  trees,
  onSelectStudent
}) => {
  const sorted = [...trees].sort((a, b) => b.totalPointsEarned - a.totalPointsEarned);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const rest = sorted.slice(3, 8);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">BẢNG VINH DANH HOA NGUYỆT QUẾ</h3>
            <p className="text-[11px] text-slate-500">Biểu dương các gương mặt tích cực rèn luyện và tiến bộ nhất lớp</p>
          </div>
        </div>

        <button
          onClick={triggerConfetti}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:from-amber-600 hover:to-yellow-600 active:scale-95 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Tung hoa vinh danh</span>
        </button>
      </div>

      {/* Podium 3 Ranks */}
      <div className="grid grid-cols-3 gap-3 items-end max-w-lg mx-auto mb-8 pt-4">
        {/* 2nd Place */}
        {second && (
          <div
            onClick={() => onSelectStudent && onSelectStudent(second.studentId)}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div className="relative mb-2">
              <img
                src={second.studentAvatar}
                alt={second.studentName}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-2xl object-cover ring-3 ring-slate-300 shadow-md group-hover:scale-105 transition-transform"
              />
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 font-black text-xs text-slate-800 border-2 border-white shadow-xs">
                2
              </span>
            </div>
            <div className="text-center">
              <h4 className="text-xs font-bold text-slate-800 truncate max-w-[90px]">{second.studentName}</h4>
              <span className="text-[10px] font-extrabold text-blue-600">{second.totalPointsEarned} đ</span>
            </div>
            {/* Podium Stand */}
            <div className="mt-2 w-full h-20 rounded-t-2xl bg-gradient-to-t from-slate-200 to-slate-100 flex flex-col items-center justify-center border-t border-slate-300">
              <span className="text-xs font-bold text-slate-600">🥈 HẠNG 2</span>
              <span className="text-[10px] text-slate-500">{second.completedTrees} cây hoa</span>
            </div>
          </div>
        )}

        {/* 1st Place (Champion) */}
        {first && (
          <div
            onClick={() => onSelectStudent && onSelectStudent(first.studentId)}
            className="flex flex-col items-center cursor-pointer group -mt-4"
          >
            <div className="relative mb-2">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
                👑
              </div>
              <img
                src={first.studentAvatar}
                alt={first.studentName}
                referrerPolicy="no-referrer"
                className="h-18 w-18 rounded-2xl object-cover ring-4 ring-amber-400 shadow-xl group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 font-black text-xs text-amber-950 border-2 border-white shadow-md">
                1
              </span>
            </div>
            <div className="text-center">
              <h4 className="text-xs font-black text-slate-900 truncate max-w-[110px]">{first.studentName}</h4>
              <span className="text-xs font-black text-amber-600">{first.totalPointsEarned} điểm</span>
            </div>
            {/* Podium Stand */}
            <div className="mt-2 w-full h-28 rounded-t-2xl bg-gradient-to-t from-amber-200 via-amber-100 to-amber-50 flex flex-col items-center justify-center border-t-2 border-amber-400 shadow-md">
              <span className="text-xs font-black text-amber-900">🥇 QUÁN QUÂN</span>
              <span className="text-[11px] font-bold text-amber-700">🌼 {first.completedTrees} Cây nở hoa</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div
            onClick={() => onSelectStudent && onSelectStudent(third.studentId)}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div className="relative mb-2">
              <img
                src={third.studentAvatar}
                alt={third.studentName}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-2xl object-cover ring-3 ring-amber-700/50 shadow-md group-hover:scale-105 transition-transform"
              />
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-white font-black text-xs border-2 border-white shadow-xs">
                3
              </span>
            </div>
            <div className="text-center">
              <h4 className="text-xs font-bold text-slate-800 truncate max-w-[90px]">{third.studentName}</h4>
              <span className="text-[10px] font-extrabold text-blue-600">{third.totalPointsEarned} đ</span>
            </div>
            {/* Podium Stand */}
            <div className="mt-2 w-full h-16 rounded-t-2xl bg-gradient-to-t from-amber-100 to-amber-50/50 flex flex-col items-center justify-center border-t border-amber-200">
              <span className="text-xs font-bold text-amber-800">🥉 HẠNG 3</span>
              <span className="text-[10px] text-amber-600">{third.completedTrees} cây hoa</span>
            </div>
          </div>
        )}
      </div>

      {/* Rest of Leaderboard */}
      <div className="border-t border-slate-100 pt-4">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Top vinh danh tiếp theo</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          {rest.map((tree, idx) => (
            <div
              key={tree.studentId}
              onClick={() => onSelectStudent && onSelectStudent(tree.studentId)}
              className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100 hover:bg-blue-50/50 transition-colors cursor-pointer"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                {idx + 4}
              </span>
              <img src={tree.studentAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800 truncate">{tree.studentName}</div>
                <div className="text-[10px] text-slate-400">{tree.totalPointsEarned} điểm · {tree.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
