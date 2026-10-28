/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Star,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Download,
  Printer,
  Edit3,
  Lock,
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  Layers,
  Save,
  X,
  PlusCircle,
  FileSpreadsheet,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ActivityPost,
  ActivityRegistration,
  ParticipationEvaluationLevel,
  UserAccount
} from '../../types';
import { activityService } from '../../services/ActivityService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';

const EVALUATION_LEVEL_CONFIG: Record<
  ParticipationEvaluationLevel,
  { label: string; badge: string; icon: string; score: number }
> = {
  XUAT_SAC: {
    label: 'Xuất sắc',
    badge: 'bg-amber-50 text-amber-800 border-amber-300 font-black',
    icon: '⭐',
    score: 5
  },
  TICH_CUC: {
    label: 'Tích cực',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    icon: '✨',
    score: 3
  },
  HOAN_THANH: {
    label: 'Hoàn thành',
    badge: 'bg-blue-50 text-blue-800 border-blue-300 font-semibold',
    icon: '✔️',
    score: 2
  },
  CHUA_HOAN_THANH: {
    label: 'Chưa hoàn thành',
    badge: 'bg-rose-50 text-rose-800 border-rose-300 font-medium',
    icon: '⚠️',
    score: 0
  },
  VANG_MAT: {
    label: 'Vắng mặt',
    badge: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
    icon: '❌',
    score: 0
  },
  CHUA_DANH_GIA: {
    label: 'Chưa đánh giá',
    badge: 'bg-slate-50 text-slate-500 border-slate-200 font-medium',
    icon: '⏳',
    score: 0
  }
};

export const ActivitySummaryEvaluationView: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const classSettings = classService.getSettings();
  const isTeacher = currentUser.role === 'TEACHER' || currentUser.role === 'SUPER_ADMIN';
  const canEvaluate = isTeacher;
  const canExport = isTeacher;
  const canPraise = isTeacher;

  const [activities, setActivities] = useState<ActivityPost[]>(activityService.getAll());
  const [selectedActivityId, setSelectedActivityId] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Evaluation Modal
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [activeReg, setActiveReg] = useState<{
    activityId: string;
    activityTitle: string;
    reg: ActivityRegistration;
  } | null>(null);

  const [formLevel, setFormLevel] = useState<ParticipationEvaluationLevel>('HOAN_THANH');
  const [formPraise, setFormPraise] = useState<string>('');
  const [formBonusPoints, setFormBonusPoints] = useState<number>(3);
  const [formPrivateNote, setFormPrivateNote] = useState<string>('');
  const [formStatus, setFormStatus] = useState<ActivityRegistration['status']>('attended');

  // Batch Evaluation Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchActivityId, setBatchActivityId] = useState<string>('');
  const [batchItems, setBatchItems] = useState<
    Array<{
      regId: string;
      studentName: string;
      group: string;
      level: ParticipationEvaluationLevel;
      praise: string;
      points: number;
      privateNote: string;
      status: ActivityRegistration['status'];
    }>
  >([]);

  useEffect(() => {
    const unsub = activityService.subscribe(() => {
      setActivities(activityService.getAll());
    });
    return unsub;
  }, []);

  // Filtered registrations list
  const registrationsWithActivity = useMemo(() => {
    return activityService.getAllRegistrationsWithActivity({
      activityId: selectedActivityId,
      groupOrTeam: selectedGroup,
      evaluationLevel: selectedLevel,
      search: searchQuery
    });
  }, [activities, selectedActivityId, selectedGroup, selectedLevel, searchQuery]);

  // Overall class statistics
  const summaryStats = useMemo(() => {
    return activityService.getClassActivitySummaryStats();
  }, [activities]);

  // Student perspective stats
  const studentStats = useMemo(() => {
    const sId = currentUser.studentId || currentUser.childStudentId;
    if (sId) {
      return activityService.getStudentActivityStats(sId);
    }
    return null;
  }, [activities, currentUser]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(registrationsWithActivity.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return registrationsWithActivity.slice(start, start + itemsPerPage);
  }, [registrationsWithActivity, currentPage]);

  const handleOpenEvaluate = (
    activityId: string,
    activityTitle: string,
    reg: ActivityRegistration
  ) => {
    if (!canEvaluate) return;
    setActiveReg({ activityId, activityTitle, reg });
    setFormLevel(reg.evaluationLevel || 'HOAN_THANH');
    setFormPraise(reg.praiseOrReward || '');
    setFormBonusPoints(reg.trainingBonusPoints ?? 3);
    setFormPrivateNote(reg.teacherPrivateNote || '');
    setFormStatus(reg.status || 'attended');
    setEvalModalOpen(true);
  };

  const handleTogglePraise = (activityId: string, registrationId: string) => {
    if (!canPraise) return;
    activityService.toggleActivityPraise(activityId, registrationId, currentUser);
  };

  const handleSaveEvaluation = () => {
    if (!activeReg || !canEvaluate) return;

    activityService.updateRegistrationEvaluation(
      activeReg.activityId,
      activeReg.reg.id,
      {
        evaluationLevel: formLevel,
        praiseOrReward: formPraise.trim(),
        trainingBonusPoints: formLevel === 'XUAT_SAC' ? 5 : (Number(formBonusPoints) || 0),
        teacherPrivateNote: formPrivateNote.trim(),
        status: formStatus
      },
      currentUser
    );

    setEvalModalOpen(false);
    setActiveReg(null);
  };

  const handleOpenBatchEvaluate = (actId: string) => {
    if (!canEvaluate) return;
    const act = activities.find((a) => a.id === actId) || activities[0];
    if (!act) return;

    setBatchActivityId(act.id);
    const initialBatch = (act.registrations || [])
      .filter((r) => r.status !== 'cancelled')
      .map((r) => ({
        regId: r.id,
        studentName: r.studentName,
        group: r.groupOrTeam || 'Tổ 1',
        level: r.evaluationLevel || 'HOAN_THANH',
        praise: r.praiseOrReward || '',
        points: r.trainingBonusPoints ?? 3,
        privateNote: r.teacherPrivateNote || '',
        status: r.status || 'attended'
      }));
    setBatchItems(initialBatch);
    setBatchModalOpen(true);
  };

  const handleSaveBatchEvaluation = () => {
    if (!canEvaluate || !batchActivityId || batchItems.length === 0) return;

    activityService.batchUpdateEvaluations(
      batchActivityId,
      batchItems.map((item) => ({
        registrationId: item.regId,
        evaluationLevel: item.level,
        praiseOrReward: item.praise.trim(),
        trainingBonusPoints: item.level === 'XUAT_SAC' ? 5 : (Number(item.points) || 0),
        teacherPrivateNote: item.privateNote.trim(),
        status: item.status
      })),
      currentUser
    );

    setBatchModalOpen(false);
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (!canExport) return;
    const headers = [
      'STT',
      'Mã Học Viên',
      'Họ Và Tên',
      'Tổ',
      'Tên Hoạt Động',
      'Thể Loại',
      'Ngày Diễn Ra',
      'Trạng Thái Tham Gia',
      'Mức Độ Đánh Giá',
      'Khen Thưởng / Tuyên Dương',
      'Điểm Cộng Rèn Luyện'
    ];

    if (isTeacher) {
      headers.push('Ghi Chú Nội Bộ GVCN');
    }

    const rows = registrationsWithActivity.map((item, idx) => {
      const levelLabel = EVALUATION_LEVEL_CONFIG[item.evaluationLevel || 'CHUA_DANH_GIA']?.label || 'Chưa đánh giá';
      const statusLabel = item.status === 'attended' ? 'Đã tham gia' : item.status === 'absent' ? 'Vắng mặt' : 'Đã đăng ký';
      const rowData = [
        idx + 1,
        `"${item.studentCode || ''}"`,
        `"${item.studentName}"`,
        `"${item.groupOrTeam || ''}"`,
        `"${item.activityTitle}"`,
        `"${item.activityCategory}"`,
        `"${item.activityStartDate}"`,
        `"${statusLabel}"`,
        `"${levelLabel}"`,
        `"${item.praiseOrReward || ''}"`,
        item.trainingBonusPoints || 0
      ];

      if (isTeacher) {
        rowData.push(`"${item.teacherPrivateNote || ''}"`);
      }

      return rowData.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bang_Tong_Hop_Danh_Gia_Hoat_Dong_${classSettings.className}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!canExport) return;
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                TỔNG HỢP & ĐÁNH GIÁ THAM GIA HOẠT ĐỘNG
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi mức độ tham gia, tuyên dương thành tích và cộng điểm rèn luyện cho học sinh lớp {classSettings.className}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEvaluate && (
            <button
              onClick={() => handleOpenBatchEvaluate(selectedActivityId !== 'ALL' ? selectedActivityId : activities[0]?.id || '')}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Đánh giá nhanh theo đợt</span>
            </button>
          )}

          {canExport && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-600" />
                <span>In danh sách</span>
              </button>
            </>
          )}

          {!isTeacher && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Chế độ xem (Chỉ đọc)</span>
            </span>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng hoạt động</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summaryStats.totalActivities}</div>
          <div className="text-xs text-slate-500 mt-0.5">Đã và đang triển khai</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lượt học sinh tham gia</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summaryStats.totalAttended} / {summaryStats.totalRegistrations}</div>
          <div className="text-xs text-teal-700 font-semibold mt-0.5">
            {summaryStats.totalRegistrations > 0 ? Math.round((summaryStats.totalAttended / summaryStats.totalRegistrations) * 100) : 100}% tham gia thực tế
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tuyên dương & Xuất sắc</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Star className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{summaryStats.levelCounts['XUAT_SAC'] || 0} lượt</div>
          <div className="text-xs text-slate-500 mt-0.5">{summaryStats.totalPraises} danh hiệu & lời khen</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Điểm rèn luyện đã cộng</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">+{summaryStats.totalBonusPoints} điểm</div>
          <div className="text-xs text-slate-500 mt-0.5">Quy đổi vào hồ sơ rèn luyện</div>
        </div>
      </div>

      {/* Student Personal Banner (If student or parent viewing) */}
      {studentStats && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-blue-900">🌟 Thành tích hoạt động của bạn ({currentUser.name})</span>
              </div>
              <p className="text-xs text-blue-700 mt-0.5">
                Đã tham gia {studentStats.totalJoined} hoạt động • Nhận {studentStats.totalPraised} lượt khen ngợi/tuyên dương • Được cộng +{studentStats.totalPoints} điểm rèn luyện
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-200 px-3 py-1 text-xs font-black text-blue-900">
                ⭐ Tích cực tham gia phong trào
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên học sinh, mã số..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Filter by Activity */}
        <div>
          <select
            value={selectedActivityId}
            onChange={(e) => {
              setSelectedActivityId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">Tất cả hoạt động ({activities.length})</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.registrations?.length || 0} HS)
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Group */}
        <div>
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">Tất cả các tổ (Tổ 1 - 4)</option>
            <option value="Tổ 1">Tổ 1</option>
            <option value="Tổ 2">Tổ 2</option>
            <option value="Tổ 3">Tổ 3</option>
            <option value="Tổ 4">Tổ 4</option>
          </select>
        </div>

        {/* Filter by Level */}
        <div>
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">Tất cả mức độ đánh giá</option>
            <option value="XUAT_SAC">⭐ Xuất sắc</option>
            <option value="TICH_CUC">✨ Tích cực</option>
            <option value="HOAN_THANH">✔️ Hoàn thành</option>
            <option value="CHUA_HOAN_THANH">⚠️ Chưa hoàn thành</option>
            <option value="VANG_MAT">❌ Vắng mặt</option>
            <option value="CHUA_DANH_GIA">⏳ Chưa đánh giá</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 text-center w-12">STT</th>
                <th className="py-3 px-4">Học viên</th>
                <th className="py-3 px-3 text-center">Tổ</th>
                <th className="py-3 px-4">Hoạt động & Thể loại</th>
                <th className="py-3 px-3">Ngày diễn ra</th>
                <th className="py-3 px-3 text-center">Tham gia</th>
                <th className="py-3 px-3">Mức độ đánh giá</th>
                <th className="py-3 px-3">Khen thưởng & Điểm cộng</th>
                {isTeacher && <th className="py-3 px-3">Ghi chú GVCN (🔒)</th>}
                {canEvaluate && <th className="py-3 px-4 text-center">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 10 : 9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Award className="h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">Không tìm thấy dữ liệu đăng ký hoặc đánh giá nào.</p>
                      <p className="text-xs text-slate-400">Hãy thử điều chỉnh lại bộ lọc tìm kiếm phía trên.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const levelConf = EVALUATION_LEVEL_CONFIG[item.evaluationLevel || 'CHUA_DANH_GIA'] || EVALUATION_LEVEL_CONFIG.CHUA_DANH_GIA;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{itemIndex}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                            alt={item.studentName}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{item.studentName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{item.studentCode || 'HS-11A1'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          {item.groupOrTeam || 'Tổ 1'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="font-bold text-slate-800 line-clamp-1" title={item.activityTitle}>
                          {item.activityTitle}
                        </div>
                        <span className="inline-block rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 mt-0.5">
                          {item.activityCategory}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {item.activityStartDate}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.status === 'attended' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <Check className="h-3 w-3" /> Có mặt
                          </span>
                        ) : item.status === 'absent' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                            Vắng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Đã đăng ký
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs ${levelConf.badge}`}>
                          <span>{levelConf.icon}</span>
                          <span>{levelConf.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {item.praiseOrReward ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-amber-900 text-xs flex items-center gap-1">
                              <span>{item.praiseOrReward}</span>
                            </div>
                            {item.trainingBonusPoints ? (
                              <span className="inline-block rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-black">
                                +{item.trainingBonusPoints} điểm rèn luyện
                              </span>
                            ) : null}
                          </div>
                        ) : item.trainingBonusPoints ? (
                          <span className="inline-block rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-black">
                            +{item.trainingBonusPoints} điểm rèn luyện
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>
                      {isTeacher && (
                        <td className="py-3 px-3 max-w-[180px]">
                          {item.teacherPrivateNote ? (
                            <div className="flex items-start gap-1 rounded-lg bg-amber-50/70 p-1.5 border border-amber-200/60 text-[11px] text-amber-900">
                              <Lock className="h-3 w-3 shrink-0 text-amber-700 mt-0.5" />
                              <span className="line-clamp-2">{item.teacherPrivateNote}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[11px] italic">Không có</span>
                          )}
                        </td>
                      )}
                      {canEvaluate && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePraise(item.activityId, item.id)}
                              title={
                                item.evaluationLevel === 'XUAT_SAC' || (item.praiseOrReward && item.praiseOrReward.includes('Tuyên dương'))
                                  ? 'Bấm để hủy tuyên dương (-5 điểm rèn luyện)'
                                  : 'Bấm để tuyên dương xuất sắc (+5 điểm rèn luyện vào Cây Nguyệt Quế)'
                              }
                              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                item.evaluationLevel === 'XUAT_SAC' || (item.praiseOrReward && item.praiseOrReward.includes('Tuyên dương'))
                                  ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              <Star className={`h-3.5 w-3.5 ${item.evaluationLevel === 'XUAT_SAC' || (item.praiseOrReward && item.praiseOrReward.includes('Tuyên dương')) ? 'fill-white' : 'fill-amber-400'}`} />
                              <span>{item.evaluationLevel === 'XUAT_SAC' || (item.praiseOrReward && item.praiseOrReward.includes('Tuyên dương')) ? 'Đã sao' : 'Sao +5đ'}</span>
                            </button>

                            <button
                              onClick={() => handleOpenEvaluate(item.activityId, item.activityTitle, item)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Sửa</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium">
              Hiển thị {paginatedItems.length} trên tổng số {registrationsWithActivity.length} kết quả
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Individual Evaluation Modal */}
      {evalModalOpen && activeReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📝 ĐÁNH GIÁ THAM GIA HOẠT ĐỘNG</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Học sinh: <strong className="text-slate-900">{activeReg.reg.studentName}</strong> • {activeReg.activityTitle}
                </p>
              </div>
              <button
                onClick={() => setEvalModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              {/* Attendance Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Trạng thái tham gia thực tế</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus('attended')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      formStatus === 'attended'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    ✔️ Có mặt tham gia
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('absent')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      formStatus === 'absent'
                        ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    ❌ Vắng mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('registered')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      formStatus === 'registered'
                        ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    ⏳ Chờ duyệt
                  </button>
                </div>
              </div>

              {/* Evaluation Level */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mức độ hoàn thành & Đánh giá</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['XUAT_SAC', 'TICH_CUC', 'HOAN_THANH', 'CHUA_HOAN_THANH', 'VANG_MAT'] as ParticipationEvaluationLevel[]).map((lvl) => {
                    const conf = EVALUATION_LEVEL_CONFIG[lvl];
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          setFormLevel(lvl);
                          if (lvl === 'XUAT_SAC') setFormBonusPoints(5);
                          else if (lvl === 'TICH_CUC') setFormBonusPoints(3);
                          else if (lvl === 'HOAN_THANH') setFormBonusPoints(2);
                          else setFormBonusPoints(0);
                        }}
                        className={`py-2 px-2.5 rounded-xl font-bold border text-left transition-all cursor-pointer ${
                          formLevel === lvl
                            ? 'bg-amber-50 text-amber-900 border-amber-400 shadow-2xs ring-2 ring-amber-300/40'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{conf.icon}</span>
                          <span>{conf.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Praise & Reward */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Khen thưởng / Tuyên dương (Công khai)</label>
                <input
                  type="text"
                  value={formPraise}
                  onChange={(e) => setFormPraise(e.target.value)}
                  placeholder="VD: 🏆 Cầu thủ xuất sắc / 🌸 Tuyên dương tinh thần nhiệt tình..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Training Bonus Points */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Điểm cộng rèn luyện</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formBonusPoints}
                    onChange={(e) => setFormBonusPoints(Number(e.target.value))}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden font-bold"
                  />
                  <span className="text-xs text-slate-500">Điểm sẽ được tự động đồng bộ vào kết quả rèn luyện</span>
                </div>
              </div>

              {/* Private Note (Teacher Only) */}
              <div>
                <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-amber-700" />
                  <span>Ghi chú nội bộ dành riêng cho GVCN (Bảo mật)</span>
                </label>
                <textarea
                  value={formPrivateNote}
                  onChange={(e) => setFormPrivateNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú nội bộ: Thái độ, sự chủ động, điểm cần nhắc nhở kín... (Học sinh và PH không nhìn thấy)"
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/40 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setEvalModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEvaluation}
                className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Lưu đánh giá & Đồng bộ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Evaluation Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>⚡ ĐÁNH GIÁ HÀNG LOẠT THEO ĐỢT HOẠT ĐỘNG</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đánh giá nhanh toàn bộ danh sách học sinh tham gia hoạt động
                </p>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Select activity selector in batch modal */}
            <div className="py-3 border-b border-slate-100 flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Chọn hoạt động:</span>
              <select
                value={batchActivityId}
                onChange={(e) => handleOpenBatchEvaluate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900"
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.registrations?.length || 0} học viên)
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Table */}
            <div className="overflow-y-auto flex-1 py-4 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Học viên</th>
                    <th className="py-2.5 px-2 text-center">Tổ</th>
                    <th className="py-2.5 px-3">Mức độ</th>
                    <th className="py-2.5 px-3">Khen thưởng / Tuyên dương</th>
                    <th className="py-2.5 px-2 text-center">Điểm +</th>
                    <th className="py-2.5 px-3">Ghi chú kín GVCN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchItems.map((item, idx) => (
                    <tr key={item.regId} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-bold text-slate-900">{item.studentName}</td>
                      <td className="py-2 px-2 text-center text-slate-500 font-bold">{item.group}</td>
                      <td className="py-2 px-3">
                        <select
                          value={item.level || 'HOAN_THANH'}
                          onChange={(e) => {
                            const newLevel = e.target.value as ParticipationEvaluationLevel;
                            setBatchItems((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? {
                                      ...it,
                                      level: newLevel,
                                      points: newLevel === 'XUAT_SAC' ? 5 : newLevel === 'TICH_CUC' ? 3 : newLevel === 'HOAN_THANH' ? 2 : 0
                                    }
                                  : it
                              )
                            );
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800"
                        >
                          <option value="XUAT_SAC">⭐ Xuất sắc (+5đ)</option>
                          <option value="TICH_CUC">✨ Tích cực (+3đ)</option>
                          <option value="HOAN_THANH">✔️ Hoàn thành (+2đ)</option>
                          <option value="CHUA_HOAN_THANH">⚠️ Chưa HT</option>
                          <option value="VANG_MAT">❌ Vắng mặt</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.praise || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBatchItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, praise: val } : it))
                            );
                          }}
                          placeholder="Lời khen / Tuyên dương..."
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={item.points ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBatchItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, points: val } : it))
                            );
                          }}
                          className="w-12 rounded-lg border border-slate-200 px-1 py-1 text-xs font-bold text-center"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.privateNote || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBatchItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, privateNote: val } : it))
                            );
                          }}
                          placeholder="Ghi chú nội bộ..."
                          className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-2 py-1 text-xs text-slate-800"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setBatchModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveBatchEvaluation}
                className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Lưu toàn bộ đánh giá ({batchItems.length} học sinh)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
