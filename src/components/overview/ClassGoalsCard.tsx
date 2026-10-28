/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, TrendingUp, Sparkles, X } from 'lucide-react';
import { ClassGoal } from '../../types';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';

interface ClassGoalsCardProps {
  onNavigate?: (module: string) => void;
}

export const ClassGoalsCard: React.FC<ClassGoalsCardProps> = ({ onNavigate }) => {
  const [goals, setGoals] = useState<ClassGoal[]>(classService.getClassGoals());
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMetric, setNewMetric] = useState('100%');
  const [newCategory, setNewCategory] = useState<ClassGoal['category']>('Học tập');

  React.useEffect(() => {
    return classService.subscribe(() => {
      setGoals(classService.getClassGoals());
    });
  }, []);

  const handleToggle = (id: string, completed: boolean) => {
    classService.updateClassGoal(id, {
      progress: completed ? 100 : 0,
      status: completed ? 'completed' : 'in_progress'
    });
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    classService.addClassGoal({
      title: newTitle.trim(),
      description: `Mục tiêu thi đua: ${newTitle.trim()}`,
      category: newCategory,
      deadline: 'Cuối HK1',
      progress: 0,
      targetMetric: newMetric,
      currentMetric: '0%',
      status: 'in_progress'
    });

    setIsAddOpen(false);
    setNewTitle('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">MỤC TIÊU NĂM HỌC & TIẾN BỘ TẬP THỂ</h3>
            <p className="text-[11px] text-slate-500">Chỉ tiêu thi đua, học lực và xây dựng Vườn Nguyệt Quế {classService.getSettings().className || 'Lớp'}</p>
          </div>
        </div>

        {isTeacher && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm mục tiêu</span>
          </button>
        )}
      </div>

      {/* Goal Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const isDone = goal.progress >= 100;

          return (
            <div
              key={goal.id}
              className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-800 leading-snug">{goal.title}</span>
                  {isTeacher && (
                    <button
                      onClick={() => handleToggle(goal.id, !isDone)}
                      className={`shrink-0 rounded-lg p-1 transition-colors ${
                        isDone ? 'text-emerald-600 bg-emerald-100' : 'text-slate-400 hover:bg-slate-200'
                      }`}
                      title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span>Chỉ tiêu: <b className="text-slate-800">{goal.targetMetric || '100%'}</b></span>
                  <span className={`font-bold ${isDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {goal.progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDone ? 'bg-emerald-500' : 'bg-linear-to-r from-indigo-500 to-blue-600'
                    }`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-2">
                <span>Hạn chót: {goal.deadline}</span>
                <span className="font-medium text-slate-600">
                  {goal.category}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {onNavigate && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Bao gồm mục tiêu thi đua lớp và kế hoạch phấn đấu cá nhân
          </span>
          <button
            onClick={() => onNavigate('goals')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Xem chi tiết & Mục tiêu cá nhân →</span>
          </button>
        </div>
      )}

      {/* Add Goal Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Thêm Mục Tiêu Năm Học Mới</h3>
              <button onClick={() => setIsAddOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên mục tiêu phấn đấu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: 100% học sinh đạt danh hiệu Học sinh Giỏi..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chỉ tiêu / Mục tiêu số liệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  placeholder="VD: 100%, GPA >= 8.0, 42 học viên..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phân loại
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden bg-white"
                >
                  <option value="Học tập">Học tập & Điểm số</option>
                  <option value="Rèn luyện">Rèn luyện & Nề nếp</option>
                  <option value="Hoạt động">Phong trào & Kỷ niệm</option>
                  <option value="Đoàn kết tập thể">Đoàn kết tập thể</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-xs"
                >
                  Lưu mục tiêu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
