/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  MessageSquare,
  Award,
  Users,
  User,
  Filter,
  Trash2,
  Edit3,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Search,
  Check,
  X
} from 'lucide-react';
import { ClassGoal, PersonalGoal } from '../../types';
import { classService } from '../../services/ClassService';
import { studentService } from '../../services/StudentService';
import { useStudents } from '../../hooks/useStudents';
import { authService } from '../../services/AuthService';

export const GoalsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'class' | 'personal'>('class');
  const [classGoals, setClassGoals] = useState<ClassGoal[]>(classService.getClassGoals());
  const [personalGoals, setPersonalGoals] = useState<PersonalGoal[]>(classService.getPersonalGoals());
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isClassGoalModalOpen, setIsClassGoalModalOpen] = useState<boolean>(false);
  const [isPersonalGoalModalOpen, setIsPersonalGoalModalOpen] = useState<boolean>(false);
  const [editingClassGoal, setEditingClassGoal] = useState<ClassGoal | null>(null);
  const [editingPersonalGoal, setEditingPersonalGoal] = useState<PersonalGoal | null>(null);

  // Feedback state
  const [feedbackGoalId, setFeedbackGoalId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');

  const students = useStudents();
  const isTeacher = currentUser.role === 'TEACHER';
  const isParent = currentUser.role === 'PARENT';
  const isStudent = currentUser.role === 'STUDENT';
  const isOfficer = currentUser.role === 'CLASS_OFFICER';

  useEffect(() => {
    const unsubAuth = authService.subscribe(setCurrentUser);
    const unsubClass = classService.subscribe(() => {
      setClassGoals(classService.getClassGoals());
      setPersonalGoals(classService.getPersonalGoals());
    });
    return () => {
      unsubAuth();
      unsubClass();
    };
  }, []);

  // Filter personal goals based on role
  const visiblePersonalGoals = personalGoals.filter(goal => {
    if (isTeacher) {
      if (selectedStudentFilter !== 'all' && goal.studentId !== selectedStudentFilter) return false;
      if (searchQuery.trim()) {
        const student = students.find(s => s.id === goal.studentId);
        const name = student?.fullName?.toLowerCase() || '';
        const title = goal.title.toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || title.includes(q);
      }
      return true;
    }
    if (isParent) {
      // Linked student only
      return goal.studentId === (currentUser.studentId || 'hs-01');
    }
    if (isStudent || isOfficer) {
      // Linked student only
      return goal.studentId === (currentUser.studentId || 'hs-02');
    }
    return true;
  });

  const handleSaveClassGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const category = formData.get('category') as ClassGoal['category'];
    const description = formData.get('description') as string;
    const deadline = formData.get('deadline') as string;
    const progress = Number(formData.get('progress') || 0);
    const status = formData.get('status') as ClassGoal['status'];
    const targetMetric = formData.get('targetMetric') as string;

    if (editingClassGoal) {
      classService.updateClassGoal(editingClassGoal.id, {
        title,
        category,
        description,
        deadline,
        progress,
        status,
        targetMetric
      });
    } else {
      classService.addClassGoal({
        title,
        category,
        description,
        deadline,
        progress,
        status: progress >= 100 ? 'completed' : status || 'in_progress',
        targetMetric,
        currentMetric: 'Đang theo dõi'
      });
    }
    setIsClassGoalModalOpen(false);
    setEditingClassGoal(null);
  };

  const handleSavePersonalGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const targetStudentId = isTeacher
      ? (formData.get('studentId') as string) || students[0]?.id
      : currentUser.studentId || 'hs-02';

    const studentObj = students.find(s => s.id === targetStudentId);
    const title = formData.get('title') as string;
    const target = formData.get('target') as string;
    const category = (formData.get('category') as any) || 'Học tập';
    const deadline = formData.get('deadline') as string;
    const progress = Number(formData.get('progress') || 0);
    const notes = formData.get('notes') as string;

    if (editingPersonalGoal) {
      classService.updatePersonalGoal(editingPersonalGoal.id, {
        title,
        target,
        category,
        deadline,
        progress,
        notes,
        status: progress >= 100 ? 'completed' : 'in_progress'
      });
    } else {
      classService.savePersonalGoal({
        studentId: targetStudentId,
        studentName: studentObj?.fullName || 'Học sinh',
        title,
        target,
        category,
        deadline,
        progress,
        notes,
        semester: 'HK1',
        status: progress >= 100 ? 'completed' : 'in_progress',
        parentVisible: true
      });
    }
    setIsPersonalGoalModalOpen(false);
    setEditingPersonalGoal(null);
  };

  const handleSendFeedback = (goalId: string) => {
    if (feedbackText.trim()) {
      classService.addTeacherFeedbackToGoal(goalId, feedbackText.trim());
      setFeedbackGoalId(null);
      setFeedbackText('');
    }
  };

  const averageClassProgress = classGoals.length > 0
    ? Math.round(classGoals.reduce((sum, g) => sum + g.progress, 0) / classGoals.length)
    : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 font-bold">
              <Target className="h-5 w-5" />
            </span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              MỤC TIÊU NĂM HỌC 2025 - 2026
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Xây dựng và cam kết lộ trình thi đua tập thể & phát triển tiềm năng từng cá nhân học sinh
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {activeTab === 'class' && isTeacher && (
            <button
              onClick={() => {
                setEditingClassGoal(null);
                setIsClassGoalModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm Mục tiêu Tập thể</span>
            </button>
          )}

          {activeTab === 'personal' && (isStudent || isOfficer || isTeacher) && (
            <button
              onClick={() => {
                setEditingPersonalGoal(null);
                setIsPersonalGoalModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isTeacher ? 'Tạo Mục tiêu cho Học sinh' : 'Đặt Mục tiêu Cá nhân'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-3 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab('class')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'class'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Mục tiêu Tập thể Lớp ({classGoals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-all ${
            activeTab === 'personal'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="h-4 w-4" />
          <span>
            {isParent ? 'Mục tiêu của Con' : isStudent || isOfficer ? 'Mục tiêu Cá nhân' : `Mục tiêu Từng Học sinh (${visiblePersonalGoals.length})`}
          </span>
        </button>
      </div>

      {/* TAB 1: Class Goals */}
      {activeTab === 'class' && (
        <div className="space-y-4">
          {/* Progress summary banner */}
          <div className="rounded-2xl border border-indigo-100 bg-linear-to-r from-indigo-50/70 via-blue-50/50 to-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-sm">
                {averageClassProgress}%
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Tiến độ Hoàn thành Mục tiêu Lớp</h4>
                <p className="text-[11px] text-slate-500">
                  {classGoals.filter(g => g.progress >= 100).length} / {classGoals.length} mục tiêu đã hoàn thành chỉ tiêu năm học
                </p>
              </div>
            </div>
            <div className="w-full sm:w-64 bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${averageClassProgress}%` }}
              />
            </div>
          </div>

          {/* Grid of Class Goals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                      {goal.category}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      goal.progress >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : goal.status === 'behind'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {goal.progress >= 100 ? 'Đã đạt' : `${goal.progress}%`}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{goal.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{goal.description}</p>

                  {goal.targetMetric && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 font-medium border border-slate-100">
                      🎯 Chỉ tiêu: <span className="font-bold text-indigo-700">{goal.targetMetric}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Hạn: {goal.deadline}</span>
                  </div>

                  {isTeacher && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingClassGoal(goal);
                          setIsClassGoalModalOpen(true);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => classService.deleteClassGoal(goal.id)}
                        className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Personal Goals */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          {/* Teacher Filters */}
          {isTeacher && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm học sinh, mục tiêu..."
                  className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-600 shrink-0">Lọc học viên:</span>
                <select
                  value={selectedStudentFilter}
                  onChange={(e) => setSelectedStudentFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 outline-hidden"
                >
                  <option value="all">Tất cả ({students.length} học viên)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.fullName} (Tổ {s.group})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* List of Personal Goals */}
          <div className="space-y-3">
            {visiblePersonalGoals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <Target className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Chưa có mục tiêu cá nhân nào được ghi nhận</p>
                <p className="text-[11px] text-slate-400 mt-1">Nhấp "Đặt Mục tiêu Cá nhân" để bắt đầu lộ trình phấn đấu.</p>
              </div>
            ) : (
              visiblePersonalGoals.map((goal) => {
                const student = students.find(s => s.id === goal.studentId);

                return (
                  <div
                    key={goal.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:border-emerald-200 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={student?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-500/20"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{student?.fullName || goal.studentName}</span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              Tổ {student?.group || 1}
                            </span>
                            {goal.category && (
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                {goal.category}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-indigo-900 mt-0.5">{goal.title}</h4>
                        </div>
                      </div>

                      {/* Progress Badge */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-emerald-700">{goal.progress}%</span>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Target Detail */}
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                      <span className="font-semibold text-slate-900">Cam kết thực hiện: </span>
                      <span>{goal.target}</span>
                      {goal.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">Ghi chú: {goal.notes}</p>
                      )}
                    </div>

                    {/* Teacher Feedback Section */}
                    {goal.teacherFeedback && (
                      <div className="rounded-xl bg-indigo-50/80 p-3 text-xs border border-indigo-100 flex items-start gap-2.5">
                        <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-indigo-900">Lời nhắn & Nhận xét của GVCN: </span>
                          <span className="text-indigo-800">{goal.teacherFeedback}</span>
                        </div>
                      </div>
                    )}

                    {/* Teacher feedback form toggle */}
                    {isTeacher && feedbackGoalId === goal.id && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Nhập nhận xét / lời động viên của GVCN..."
                          className="flex-1 rounded-xl border border-indigo-200 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 outline-hidden"
                        />
                        <button
                          onClick={() => handleSendFeedback(goal.id)}
                          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                          Gửi
                        </button>
                        <button
                          onClick={() => setFeedbackGoalId(null)}
                          className="rounded-xl px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          Đóng
                        </button>
                      </div>
                    )}

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Hạn hoàn thành: {goal.deadline || 'Cuối HK1'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isTeacher && feedbackGoalId !== goal.id && (
                          <button
                            onClick={() => {
                              setFeedbackGoalId(goal.id);
                              setFeedbackText(goal.teacherFeedback || '');
                            }}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>{goal.teacherFeedback ? 'Sửa nhận xét' : 'Nhận xét'}</span>
                          </button>
                        )}

                        {(isTeacher || (goal.studentId === currentUser.studentId)) && (
                          <>
                            <button
                              onClick={() => {
                                setEditingPersonalGoal(goal);
                                setIsPersonalGoalModalOpen(true);
                              }}
                              className="text-slate-500 hover:text-indigo-600 font-medium"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => classService.deletePersonalGoal(goal.id)}
                              className="text-slate-400 hover:text-rose-600 font-medium"
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: Class Goal */}
      {isClassGoalModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              {editingClassGoal ? 'Chỉnh sửa Mục tiêu Tập thể' : 'Tạo Mục tiêu Tập thể Mới'}
            </h3>
            <form onSubmit={handleSaveClassGoal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề mục tiêu *</label>
                <input
                  name="title"
                  defaultValue={editingClassGoal?.title || ''}
                  required
                  placeholder="VD: 100% Học sinh tham gia đủ phong trào..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chuyên mục</label>
                  <select
                    name="category"
                    defaultValue={editingClassGoal?.category || 'Học tập'}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                  >
                    <option value="Học tập">Học tập</option>
                    <option value="Rèn luyện">Rèn luyện</option>
                    <option value="Nề nếp">Nề nếp</option>
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Đoàn kết tập thể">Đoàn kết tập thể</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn chót</label>
                  <input
                    name="deadline"
                    defaultValue={editingClassGoal?.deadline || '31/12/2025'}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chỉ tiêu / Số liệu cụ thể</label>
                <input
                  name="targetMetric"
                  defaultValue={editingClassGoal?.targetMetric || ''}
                  placeholder="VD: GPA >= 8.0, 0 vi phạm nề nếp..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingClassGoal?.description || ''}
                  placeholder="Mô tả hành động và tiêu chí..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiến độ hiện tại (%)</label>
                <input
                  type="number"
                  name="progress"
                  min="0"
                  max="100"
                  defaultValue={editingClassGoal?.progress || 0}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassGoalModalOpen(false)}
                  className="rounded-xl px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                >
                  Lưu Mục tiêu
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Personal Goal */}
      {isPersonalGoalModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              {editingPersonalGoal ? 'Chỉnh sửa Mục tiêu Cá nhân' : 'Đặt Mục tiêu Cá nhân Mới'}
            </h3>
            <form onSubmit={handleSavePersonalGoal} className="space-y-3.5 text-xs">
              {isTeacher && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Học sinh *</label>
                  <select
                    name="studentId"
                    defaultValue={editingPersonalGoal?.studentId || students[0]?.id}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên mục tiêu *</label>
                <input
                  name="title"
                  defaultValue={editingPersonalGoal?.title || ''}
                  required
                  placeholder="VD: Đạt điểm 9.0 môn Toán HK1..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chuyên mục</label>
                <select
                  name="category"
                  defaultValue={editingPersonalGoal?.category || 'Học tập'}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                >
                  <option value="Học tập">Học tập</option>
                  <option value="Rèn luyện">Rèn luyện</option>
                  <option value="Kỹ năng">Kỹ năng mềm</option>
                  <option value="Thói quen">Thói quen tích cực</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hành động cam kết thực hiện *</label>
                <textarea
                  name="target"
                  rows={2}
                  defaultValue={editingPersonalGoal?.target || ''}
                  required
                  placeholder="VD: Làm thêm 5 bài tập nâng cao mỗi tuần..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                />
              </div>

              <div className={isTeacher ? "grid grid-cols-2 gap-2.5" : "block"}>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn chót</label>
                  <input
                    name="deadline"
                    defaultValue={editingPersonalGoal?.deadline || 'Cuối HK1'}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                  />
                </div>
                {isTeacher && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tiến độ (%)</label>
                    <input
                      type="number"
                      name="progress"
                      min="0"
                      max="100"
                      defaultValue={editingPersonalGoal?.progress || 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú bổ sung</label>
                <input
                  name="notes"
                  defaultValue={editingPersonalGoal?.notes || ''}
                  placeholder="Ghi chú thêm..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPersonalGoalModalOpen(false)}
                  className="rounded-xl px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Lưu Mục tiêu
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
