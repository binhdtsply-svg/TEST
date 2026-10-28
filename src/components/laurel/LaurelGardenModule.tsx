/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TreePine, Sparkles, Filter, Award, Trophy, Info, Heart, Gift, ShieldCheck } from 'lucide-react';
import { StudentLaurelTree } from '../../types';
import { trainingService } from '../../services/TrainingService';
import { authService } from '../../services/AuthService';
import { studentService } from '../../services/StudentService';
import { classService } from '../../services/ClassService';
import { PodiumLeaderboard } from './PodiumLeaderboard';
import { StudentTreeCard } from './StudentTreeCard';
import { TreeStageIllustration } from './TreeStageIllustration';

interface LaurelGardenModuleProps {
  onSelectStudentProfile?: (studentId: string) => void;
}

export const LaurelGardenModule: React.FC<LaurelGardenModuleProps> = ({
  onSelectStudentProfile
}) => {
  const [trees, setTrees] = useState<StudentLaurelTree[]>(trainingService.getTrees());
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';
  const isStudent = currentUser.role === 'STUDENT' || currentUser.role === 'CLASS_OFFICER';
  const isParent = currentUser.role === 'PARENT';

  const allStudents = studentService.getStudents();
  const defaultFallbackId = allStudents.length > 0 ? allStudents[0].id : '';
  const linkedStudentId = isParent
    ? (currentUser.childStudentId || currentUser.studentId || defaultFallbackId)
    : (currentUser.studentId || defaultFallbackId);

  const studentInfo = studentService.getById(linkedStudentId);

  useEffect(() => {
    const unsubTraining = trainingService.subscribe(() => {
      setTrees(trainingService.getTrees());
    });
    const unsubStudent = studentService.subscribe(() => {
      setTrees(trainingService.getTrees());
    });
    return () => {
      unsubTraining();
      unsubStudent();
    };
  }, []);

  const totalCompletedTrees = trees.reduce((sum, t) => sum + t.completedTrees, 0);
  const totalPoints = trees.reduce((sum, t) => sum + (t.totalPointsEarned || t.totalLifetimePoints || 0), 0);

  const filteredTrees = trees.filter((t) => {
    if (selectedGroup === 'all') return true;
    return (t.studentGroup || t.group) === Number(selectedGroup);
  });

  const myTree = trees.find(t => t.studentId === linkedStudentId);

  // Unified render
  return (
    <div className="space-y-6 animate-fade-in">
      {/* If PARENT: Isolated view for their child only */}
      {isParent && (
        <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-md">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-black uppercase backdrop-blur-xs">
                Mô hình Rèn luyện tích cực
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              CÂY NGUYỆT QUẾ CỦA CON ({studentInfo?.fullName})
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mt-1">
              Theo dõi quá trình tích lũy điểm thưởng, việc tốt và các chặng phát triển Cây Nguyệt Quế của con
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/20">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <div className="text-left">
              <div className="text-xs font-bold text-white">Dữ liệu chính thức</div>
              <div className="text-[11px] text-emerald-100">Cập nhật theo thời gian thực</div>
            </div>
          </div>
        </div>

        {/* Spotlight Card */}
        {myTree ? (
          <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-tr from-emerald-50 via-white to-teal-50 p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-900">
                <Sparkles className="h-5 w-5 text-amber-500 animate-spin" />
                <h3 className="text-base font-black">CÂY NGUYỆT QUẾ: {studentInfo?.fullName}</h3>
              </div>
              <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-black">
                Đã thu hoạch: {myTree.completedTrees} Cây
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <TreeStageIllustration stage={myTree.stage} className="h-36 w-36" />
              <div className="flex-1 w-full space-y-3">
                <div>
                  <div className="text-sm font-black text-slate-800">
                    Giai đoạn hiện tại: <span className="text-emerald-700">{myTree.stageName}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Con đang có <b>{myTree.currentPoints}/100 điểm</b> trong chu kỳ nuôi cây này.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                      style={{ width: `${myTree.currentPoints}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Hạt giống (0đ)</span>
                    <span>Nảy mầm (20đ)</span>
                    <span>Cây con (40đ)</span>
                    <span>Cây lớn (70đ)</span>
                    <span>Trổ hoa (100đ)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Chưa có thông tin Cây Nguyệt Quế.
          </div>
        )}

        {/* 5 Growth Stages Legend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            5 Giai đoạn phát triển của Cây Nguyệt Quế (100 điểm = 1 chu kỳ hoàn thành)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
              <span className="text-2xl">🌰</span>
              <div className="text-xs font-bold text-slate-800 mt-1">1. Hạt giống</div>
              <span className="text-[10px] text-slate-400">0 - 19 điểm</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
              <span className="text-2xl">🌱</span>
              <div className="text-xs font-bold text-slate-800 mt-1">2. Nảy mầm</div>
              <span className="text-[10px] text-slate-400">20 - 39 điểm</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
              <span className="text-2xl">🌿</span>
              <div className="text-xs font-bold text-slate-800 mt-1">3. Cây con</div>
              <span className="text-[10px] text-slate-400">40 - 69 điểm</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
              <span className="text-2xl">🌳</span>
              <div className="text-xs font-bold text-slate-800 mt-1">4. Cây lớn</div>
              <span className="text-[10px] text-slate-400">70 - 99 điểm</span>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-300 text-center shadow-xs">
              <span className="text-2xl">🌼</span>
              <div className="text-xs font-black text-amber-900 mt-1">5. Trổ hoa</div>
              <span className="text-[10px] text-amber-700 font-bold">100 điểm (Hoàn thành)</span>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* View for Student & Teacher */}
      {!isParent && (
        <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-black uppercase backdrop-blur-xs">
              Mô hình Rèn luyện tích cực
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            VƯỜN NGUYỆT QUẾ LỚP {classService.getSettings().className || '12A1'}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mt-1">
            Mỗi điểm tích cực, việc tốt và nỗ lực học tập đều là nguồn dưỡng chất giúp Cây Nguyệt Quế của từng học viên lớn lên và trổ hoa vinh danh.
          </p>
        </div>

        {/* Global stats */}
        <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/20">
          <div className="text-center">
            <div className="text-2xl font-black text-amber-300">🌼 {totalCompletedTrees}</div>
            <div className="text-[11px] text-emerald-100 font-medium">Cây đã trổ hoa</div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-black text-white">{totalPoints}</div>
            <div className="text-[11px] text-emerald-100 font-medium">Tổng điểm tích lũy</div>
          </div>
        </div>
      </div>

      {/* If logged in user is Student, show "CÂY NGUYỆT QUẾ CỦA BẠN" prominently */}
      {isStudent && myTree && (
        <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-tr from-emerald-50 via-white to-teal-50 p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-emerald-900">
              <Sparkles className="h-5 w-5 text-amber-500 animate-spin" />
              <h3 className="text-base font-black">CÂY NGUYỆT QUẾ CỦA BẠN ({studentInfo?.fullName || currentUser.name})</h3>
            </div>
            <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-black">
              Đã thu hoạch: {myTree.completedTrees} Cây
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <TreeStageIllustration stage={myTree.stage} className="h-32 w-32" />
            <div className="flex-1 w-full space-y-3">
              <div>
                <div className="text-sm font-black text-slate-800">
                  Giai đoạn hiện tại: <span className="text-emerald-700">{myTree.stageName}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bạn đang có <b>{myTree.currentPoints}/100 điểm</b> trong chu kỳ nuôi cây này. Hãy tiếp tục phát biểu và giúp đỡ bạn bè!
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                    style={{ width: `${myTree.currentPoints}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Hạt giống (0đ)</span>
                  <span>Trổ hoa (100đ)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5 Growth Stages Legend */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          5 Giai đoạn phát triển của Cây Nguyệt Quế (100 điểm = 1 chu kỳ hoàn thành)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
            <span className="text-2xl">🌰</span>
            <div className="text-xs font-bold text-slate-800 mt-1">1. Hạt giống</div>
            <span className="text-[10px] text-slate-400">0 - 19 điểm</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
            <span className="text-2xl">🌱</span>
            <div className="text-xs font-bold text-slate-800 mt-1">2. Nảy mầm</div>
            <span className="text-[10px] text-slate-400">20 - 39 điểm</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
            <span className="text-2xl">🌿</span>
            <div className="text-xs font-bold text-slate-800 mt-1">3. Cây con</div>
            <span className="text-[10px] text-slate-400">40 - 69 điểm</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-center">
            <span className="text-2xl">🌳</span>
            <div className="text-xs font-bold text-slate-800 mt-1">4. Cây lớn</div>
            <span className="text-[10px] text-slate-400">70 - 99 điểm</span>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 border border-amber-300 text-center shadow-xs">
            <span className="text-2xl">🌼</span>
            <div className="text-xs font-black text-amber-900 mt-1">5. Trổ hoa</div>
            <span className="text-[10px] text-amber-700 font-bold">100 điểm (Hoàn thành)</span>
          </div>
        </div>
      </div>

      {/* Podium Leaderboard */}
      <PodiumLeaderboard
        trees={trees}
        onSelectStudent={onSelectStudentProfile}
      />

      {/* All Class Trees Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TreePine className="h-5 w-5 text-emerald-600" />
            <span>KHU VƯỜN RÈN LUYỆN TOÀN LỚP</span>
          </h3>

          {/* Group filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả (14)' },
              { id: '1', label: 'Tổ 1' },
              { id: '2', label: 'Tổ 2' },
              { id: '3', label: 'Tổ 3' },
              { id: '4', label: 'Tổ 4' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedGroup(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedGroup === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTrees.map((tree) => (
            <StudentTreeCard
              key={tree.studentId}
              tree={tree}
              onOpenDetails={(id) => onSelectStudentProfile && onSelectStudentProfile(id)}
            />
          ))}
        </div>
      </div>
        </div>
      )}
    </div>
  );
};
