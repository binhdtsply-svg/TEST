/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  User,
  Shield,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  AlertTriangle,
  Lock,
  X,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Compass,
  FileCheck,
  Clock,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { AIDataPermissions, Student } from '../../types';
import { aiContextService, AnalysisScope, TimeframeFilter } from '../../services/AIContextService';
import { studentService } from '../../services/StudentService';
import { schoolWeekService } from '../../services/SchoolWeekService';
import { useStudents } from '../../hooks/useStudents';

interface AIScopeSelectorProps {
  scope: AnalysisScope;
  onChangeScope: (scope: AnalysisScope) => void;
  selectedStudentId?: string;
  onSelectStudentId: (id: string) => void;
  selectedStudentIds?: string[];
  onSelectStudentIds: (ids: string[]) => void;
  timeframe: TimeframeFilter;
  onChangeTimeframe: (tf: TimeframeFilter) => void;
  permissions: AIDataPermissions;
  onChangePermissions: (perms: AIDataPermissions) => void;
}

export const AIScopeSelector: React.FC<AIScopeSelectorProps> = ({
  scope,
  onChangeScope,
  selectedStudentId,
  onSelectStudentId,
  selectedStudentIds = [],
  onSelectStudentIds,
  timeframe,
  onChangeTimeframe,
  permissions,
  onChangePermissions
}) => {
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<number | null>(null);

  const allStudents = useStudents();
  const currentStudyPeriod = schoolWeekService.getCurrentStudyPeriod();
  const currentWeekNum = currentStudyPeriod.weekNumber || 1;
  const currentMonthNum = new Date().getMonth() + 1;

  const filteredStudents = useMemo(() => {
    let list = aiContextService.searchStudents(searchQuery);
    if (selectedGroupFilter !== null) {
      list = list.filter((s) => s.group === selectedGroupFilter);
    }
    return list;
  }, [searchQuery, selectedGroupFilter]);

  const selectedStudentObj = allStudents.find((s) => s.id === selectedStudentId);

  const handleTogglePermission = (key: keyof AIDataPermissions) => {
    onChangePermissions({
      ...permissions,
      [key]: !permissions[key]
    });
  };

  const handleToggleMultiStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      onSelectStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      onSelectStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleSelectGroup = (groupNum: number) => {
    const groupStudentIds = allStudents.filter((s) => s.group === groupNum).map((s) => s.id);
    onChangeScope('multi_student');
    onSelectStudentIds(groupStudentIds);
    setSelectedGroupFilter(groupNum);
  };

  // Presets for quick selection
  const handleApplyPreset = (preset: 'all' | 'discipline' | 'academic' | 'career' | 'none') => {
    if (preset === 'all') {
      onChangePermissions({
        academicGrades: true,
        conductResults: true,
        pointsPlusMinus: true,
        attendance: true,
        violations: true,
        rewards: true,
        schoolYearGoals: true,
        journeyMilestones: true,
        activities: true,
        laurelGarden: true,
        careerRiasec: true,
        graduationExam: true,
        includeSensitiveInternalInfo: permissions.includeSensitiveInternalInfo
      });
    } else if (preset === 'discipline') {
      onChangePermissions({
        academicGrades: false,
        conductResults: true,
        pointsPlusMinus: true,
        attendance: true,
        violations: true,
        rewards: true,
        schoolYearGoals: false,
        journeyMilestones: false,
        activities: false,
        laurelGarden: true,
        careerRiasec: false,
        graduationExam: false,
        includeSensitiveInternalInfo: permissions.includeSensitiveInternalInfo
      });
    } else if (preset === 'academic') {
      onChangePermissions({
        academicGrades: true,
        conductResults: false,
        pointsPlusMinus: false,
        attendance: false,
        violations: false,
        rewards: false,
        schoolYearGoals: true,
        journeyMilestones: false,
        activities: false,
        laurelGarden: false,
        careerRiasec: false,
        graduationExam: true,
        includeSensitiveInternalInfo: false
      });
    } else if (preset === 'career') {
      onChangePermissions({
        academicGrades: true,
        conductResults: false,
        pointsPlusMinus: false,
        attendance: false,
        violations: false,
        rewards: false,
        schoolYearGoals: false,
        journeyMilestones: false,
        activities: false,
        laurelGarden: false,
        careerRiasec: true,
        graduationExam: true,
        includeSensitiveInternalInfo: false
      });
    } else if (preset === 'none') {
      onChangePermissions({
        academicGrades: false,
        conductResults: false,
        pointsPlusMinus: false,
        attendance: false,
        violations: false,
        rewards: false,
        schoolYearGoals: false,
        journeyMilestones: false,
        activities: false,
        laurelGarden: false,
        careerRiasec: false,
        graduationExam: false,
        includeSensitiveInternalInfo: false
      });
    }
  };

  // Timeframe summary text
  const timeframeSummary = useMemo(() => {
    return aiContextService.normalizeTimeframe(timeframe).label;
  }, [timeframe]);

  // Active categories count
  const activeCategoriesCount = useMemo(() => {
    return Object.entries(permissions).filter(([k, v]) => v && k !== 'includeSensitiveInternalInfo').length;
  }, [permissions]);

  return (
    <div
      id="ai-scope-selector"
      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5"
    >
      {/* SECTION 1: Scope & Entity Selector */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            1. Phạm vi đối tượng phân tích:
          </span>

          {/* Quick Group Select Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-slate-500 font-medium mr-1">Chọn nhanh:</span>
            {[1, 2, 3, 4].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleSelectGroup(g)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                  scope === 'multi_student' && selectedGroupFilter === g
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                Tổ {g}
              </button>
            ))}
          </div>
        </div>

        {/* Scope Mode Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            id="scope-btn-none"
            onClick={() => {
              onChangeScope('none');
              setSelectedGroupFilter(null);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              scope === 'none'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            Chung (Không dùng dữ liệu)
          </button>
          <button
            type="button"
            id="scope-btn-class"
            onClick={() => {
              onChangeScope('class');
              setSelectedGroupFilter(null);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scope === 'class'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Toàn lớp ({allStudents.length} HS)</span>
          </button>
          <button
            type="button"
            id="scope-btn-single"
            onClick={() => {
              onChangeScope('single_student');
              setSelectedGroupFilter(null);
              if (!selectedStudentId && allStudents.length > 0) {
                onSelectStudentId(allStudents[0].id);
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scope === 'single_student'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1 Học viên</span>
          </button>
          <button
            type="button"
            id="scope-btn-multi"
            onClick={() => onChangeScope('multi_student')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              scope === 'multi_student'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Nhóm ({selectedStudentIds.length} HS)</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Single Student Picker Dropdown */}
      {scope === 'single_student' && (
        <div
          id="single-student-picker"
          className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2.5 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Chọn học sinh cần phân tích:
            </span>
            {selectedStudentObj && (
              <span className="text-xs font-medium text-indigo-700">
                Đang chọn: <strong>{selectedStudentObj.fullName}</strong> ({selectedStudentObj.code} · Tổ {selectedStudentObj.group})
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="student-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh (không dấu: gia huy, minh anh), mã số hoặc tổ..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white rounded-lg border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Student list */}
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredStudents.map((s) => {
              const isSelected = s.id === selectedStudentId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStudentId(s.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-medium shadow-2xs'
                      : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{s.fullName}</span>
                    <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>
                      ({s.code})
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-sm ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Tổ {s.group}
                    </span>
                    {s.officerRole && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-sm ${isSelected ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800 font-semibold'}`}>
                        {s.officerRole}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2B: Multi-Student Selector */}
      {scope === 'multi_student' && (
        <div
          id="multi-student-picker"
          className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2.5 animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Chọn danh sách học sinh (Đã chọn: <strong>{selectedStudentIds.length}</strong> em):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectStudentIds(allStudents.map((s) => s.id))}
                className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Chọn tất cả
              </button>
              {selectedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectStudentIds([]);
                    setSelectedGroupFilter(null);
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh học sinh để thêm vào nhóm..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white rounded-lg border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredStudents.map((s) => {
              const isChecked = selectedStudentIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleToggleMultiStudent(s.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-indigo-100/90 text-indigo-900 border border-indigo-300 font-medium'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 pointer-events-none"
                    />
                    <span className="font-semibold">{s.fullName}</span>
                    <span className="text-slate-400">({s.code})</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-sm text-slate-600">
                      Tổ {s.group}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: Timeframe Selector */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            2. Phạm vi thời gian phân tích:
          </span>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            {timeframeSummary}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Timeframe Type: Week */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChangeTimeframe({ type: 'week', weekNumber: currentWeekNum })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                timeframe.type === 'week'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Theo Tuần</span>
              {timeframe.type === 'week' && <Check className="w-3.5 h-3.5" />}
            </button>
            {timeframe.type === 'week' && (
              <select
                value={timeframe.weekNumber || currentWeekNum}
                onChange={(e) => onChangeTimeframe({ type: 'week', weekNumber: Number(e.target.value) })}
                className="w-full text-xs font-bold p-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w === currentWeekNum ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Timeframe Type: Month */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChangeTimeframe({ type: 'month', month: currentMonthNum })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                timeframe.type === 'month'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Theo Tháng</span>
              {timeframe.type === 'month' && <Check className="w-3.5 h-3.5" />}
            </button>
            {timeframe.type === 'month' && (
              <select
                value={timeframe.month || currentMonthNum}
                onChange={(e) => onChangeTimeframe({ type: 'month', month: Number(e.target.value) })}
                className="w-full text-xs font-bold p-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer"
              >
                {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    Tháng {m} {m === currentMonthNum ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Timeframe Type: Semester */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChangeTimeframe({ type: 'semester', semester: 'HK1' })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                timeframe.type === 'semester'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Học kỳ</span>
              {timeframe.type === 'semester' && <Check className="w-3.5 h-3.5" />}
            </button>
            {timeframe.type === 'semester' && (
              <select
                value={timeframe.semester || 'HK1'}
                onChange={(e) => onChangeTimeframe({ type: 'semester', semester: e.target.value as any })}
                className="w-full text-xs font-bold p-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer"
              >
                <option value="HK1">Học kỳ I</option>
                <option value="HK2">Học kỳ II</option>
              </select>
            )}
          </div>

          {/* Timeframe Type: All Year */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onChangeTimeframe({ type: 'all' })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between cursor-pointer ${
                timeframe.type === 'all'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Cả năm học</span>
              {timeframe.type === 'all' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: Data Permissions & Categories Selector */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5">
          <button
            type="button"
            id="btn-toggle-data-permissions"
            onClick={() => setShowDataDetails(!showDataDetails)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider hover:text-indigo-600 transition-colors cursor-pointer text-left"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Loại dữ liệu gửi AI ({activeCategoriesCount}/12 mục đã bật)</span>
            {showDataDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('discipline')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
            >
              Nề nếp & Chuyên cần
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('academic')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
            >
              Học tập
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('career')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
            >
              Hướng nghiệp
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('none')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              Bỏ chọn hết
            </button>
          </div>
        </div>

        {showDataDetails && (
          <div
            id="data-permissions-panel"
            className="mt-2.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 animate-fade-in"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.attendance}
                  onChange={() => handleTogglePermission('attendance')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Chuyên cần (Đi trễ, Vắng)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.violations}
                  onChange={() => handleTogglePermission('violations')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Vi phạm & Lịch sử xử lý</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.pointsPlusMinus}
                  onChange={() => handleTogglePermission('pointsPlusMinus')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Điểm thưởng (+ / -)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.conductResults}
                  onChange={() => handleTogglePermission('conductResults')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Tổng điểm rèn luyện</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.academicGrades}
                  onChange={() => handleTogglePermission('academicGrades')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Kết quả học tập & Bảng điểm</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.rewards}
                  onChange={() => handleTogglePermission('rewards')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Khen thưởng & Việc tốt</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.laurelGarden}
                  onChange={() => handleTogglePermission('laurelGarden')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Cây Nguyệt Quế & Thi đua</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.activities}
                  onChange={() => handleTogglePermission('activities')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Hoạt động phong trào</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.careerRiasec}
                  onChange={() => handleTogglePermission('careerRiasec')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Hướng nghiệp RIASEC</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.graduationExam}
                  onChange={() => handleTogglePermission('graduationExam')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Dự thi tốt nghiệp THPT</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.schoolYearGoals}
                  onChange={() => handleTogglePermission('schoolYearGoals')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Mục tiêu năm học</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.journeyMilestones}
                  onChange={() => handleTogglePermission('journeyMilestones')}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-slate-700">Hành trình năm học</span>
              </label>
            </div>

            {/* Sensitive Data Protection Toggle */}
            <div className="pt-2 border-t border-slate-200">
              <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                permissions.includeSensitiveInternalInfo
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  id="checkbox-sensitive-info"
                  checked={permissions.includeSensitiveInternalInfo}
                  onChange={() => handleTogglePermission('includeSensitiveInternalInfo')}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Bao gồm thông tin nội bộ nhạy cảm (Diện theo dõi đặc biệt, Gia đình)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mặc định tắt để bảo vệ quyền riêng tư học viên. Chỉ kích hoạt khi GVCN cần phân tích cá biệt chuyên sâu.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* LIVE DATA EXTRACTION PREVIEW BANNER */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-2 truncate">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="truncate">
            Dữ liệu trích xuất: <strong>{scope === 'class' ? `Toàn lớp (${allStudents.length} HS)` : scope === 'single_student' ? (selectedStudentObj ? selectedStudentObj.fullName : '1 Học viên') : scope === 'multi_student' ? `${selectedStudentIds.length} học viên` : 'Chung'}</strong> • <strong>{timeframeSummary}</strong> • <strong>{activeCategoriesCount} nhóm dữ liệu</strong>
          </span>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
          Chỉ gửi dữ liệu đã chọn
        </span>
      </div>
    </div>
  );
};
