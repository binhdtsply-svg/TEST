/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  Plus,
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  TrendingDown,
  TreePine,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  User,
  Users,
  AlertCircle,
  HelpCircle,
  Paperclip,
  Send,
  X,
  Calendar,
  MessageSquare,
  CheckSquare,
  XCircle,
  Edit3,
  BookOpen,
  BarChart3,
  ListOrdered
} from 'lucide-react';
import {
  PointTransaction,
  Student,
  TrainingCategory,
  LaurelTree,
  AttachedFile,
  PointRuleConfig,
  ConductEvaluationPeriodType
} from '../../types';
import { trainingService } from '../../services/TrainingService';
import { studentService } from '../../services/StudentService';
import { exportService } from '../../services/ExportService';
import { authService } from '../../services/AuthService';
import { classService } from '../../services/ClassService';
import { conductEvaluationService } from '../../services/ConductEvaluationService';
import { QuickScoreModal } from './QuickScoreModal';
import { SendParentTrainingReportModal } from './SendParentTrainingReportModal';
import { ReviewTrainingModal } from './ReviewTrainingModal';
import { TreeStageIllustration } from '../laurel/TreeStageIllustration';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { ConductEvaluationTab } from './ConductEvaluationTab';
import { StudentConductSelfAssessmentModal } from './StudentConductSelfAssessmentModal';

type TeacherTabType = 'journal' | 'pending' | 'summary' | 'evaluation' | 'trees' | 'rules';

export const TrainingModule: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const role = currentUser.role;
  const isTeacher = role === 'TEACHER' || role === 'SUPER_ADMIN';
  const isOfficer = role === 'CLASS_OFFICER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // Teacher active tab
  const [teacherTab, setTeacherTab] = useState<TeacherTabType>('journal');

  // Specific student ID linked to this account
  const myStudentId = isParent
    ? (currentUser.childStudentId || currentUser.studentId || 'hs-01')
    : (currentUser.studentId || 'hs-02');

  const myStudentInfo = studentService.getById(myStudentId);

  // Student / Officer Tab: 'personal' (Rèn luyện của tôi / của con) | 'class' (Rèn luyện lớp)
  const [studentTab, setStudentTab] = useState<'personal' | 'class'>('personal');

  // Week Selector state (Academic Year 2026-2027)
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [activeWeekDetailModal, setActiveWeekDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'positive' | 'negative' | 'all';
  }>({
    isOpen: false,
    title: '',
    type: 'all'
  });

  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [trees, setTrees] = useState<LaurelTree[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rules, setRules] = useState<PointRuleConfig[]>([]);
  
  // Modals
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isSendReportModalOpen, setIsSendReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string | undefined>(undefined);
  const [reviewingTx, setReviewingTx] = useState<PointTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<PointTransaction | null>(null);

  // Adjustment report modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentCategory, setAdjustmentCategory] = useState<'Học tập' | 'Rèn luyện' | 'Khen thưởng' | 'Khác'>('Rèn luyện');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [adjustmentSubmitted, setAdjustmentSubmitted] = useState(false);

  // Point Rules Configuration states
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PointRuleConfig | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<PointRuleConfig | null>(null);
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState<string>('all');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [ruleFormTitle, setRuleFormTitle] = useState('');
  const [ruleFormCategory, setRuleFormCategory] = useState<string>('Học tập');
  const [ruleFormPointsType, setRuleFormPointsType] = useState<'plus' | 'minus'>('plus');
  const [ruleFormPointsValue, setRuleFormPointsValue] = useState<number>(5);
  const [ruleFormIcon, setRuleFormIcon] = useState('📌');

  // Student Conduct Self-Assessment Modal state
  const [isSelfAssessmentModalOpen, setIsSelfAssessmentModalOpen] = useState<boolean>(false);
  const [selfAssessmentPeriod, setSelfAssessmentPeriod] = useState<ConductEvaluationPeriodType>('SEMESTER_1');

  // Filters for Teacher Journal
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'positive' | 'negative'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedNotificationStatus, setSelectedNotificationStatus] = useState<'all' | 'NOT_NOTIFIED' | 'SENT'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate Date Range for Academic Weeks
  const getWeekDateRange = (weekNum: number) => {
    const startAcademic = new Date(2026, 7, 24); // Aug 24, 2026 (Monday)
    const startDate = new Date(startAcademic);
    startDate.setDate(startAcademic.getDate() + (weekNum - 1) * 7);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const formatD = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${d.getFullYear()}`;
    };

    return {
      start: startDate,
      end: endDate,
      label: `${formatD(startDate)} – ${formatD(endDate)}`
    };
  };

  const weekRange = useMemo(() => getWeekDateRange(currentWeek), [currentWeek]);

  const loadData = () => {
    setTransactions(trainingService.getAllTransactions());
    setTrees(trainingService.getTrees());
    setStudents(studentService.getAll());
    setRules(trainingService.getRules());
  };

  useEffect(() => {
    loadData();
    const unsubTraining = trainingService.subscribe(loadData);
    const unsubStudent = studentService.subscribe(loadData);
    const unsubConduct = conductEvaluationService.subscribe(loadData);
    return () => {
      unsubTraining();
      unsubStudent();
      unsubConduct();
    };
  }, []);

  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  // Categories list
  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Tất cả danh mục' },
    { id: 'Học tập', label: 'Học tập' },
    { id: 'Nề nếp & Kỷ luật', label: 'Nề nếp & Kỷ luật' },
    { id: 'Phong trào & Hoạt động', label: 'Phong trào & Hoạt động' },
    { id: 'Việc tốt & Giúp đỡ', label: 'Việc tốt & Giúp đỡ' }
  ];

  // Approved transactions (Official Journal)
  const approvedTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'approved' || t.reviewStatus === 'approved');
  }, [transactions]);

  // Pending transactions (Awaiting Teacher Approval)
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'pending' || t.reviewStatus === 'pending');
  }, [transactions]);

  // Filtered official transactions for Teacher Journal
  const filteredJournal = useMemo(() => {
    return approvedTransactions.filter((t) => {
      const student = studentMap.get(t.studentId || '');

      // Specific Student filter
      if (selectedStudentId !== 'all' && t.studentId !== selectedStudentId) {
        return false;
      }

      // Group filter
      if (selectedGroup !== 'all' && student?.group !== Number(selectedGroup)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false;
      }

      // Type filter (+ / -)
      if (selectedType === 'positive' && t.points <= 0) return false;
      if (selectedType === 'negative' && t.points >= 0) return false;

      // Notification status filter
      if (selectedNotificationStatus === 'NOT_NOTIFIED' && t.parentNotificationStatus === 'SENT') return false;
      if (selectedNotificationStatus === 'SENT' && t.parentNotificationStatus !== 'SENT') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.studentName?.toLowerCase().includes(q);
        const matchReason = t.reason?.toLowerCase().includes(q);
        const matchCode = student?.code?.toLowerCase().includes(q);
        if (!matchName && !matchReason && !matchCode) return false;
      }

      return true;
    });
  }, [approvedTransactions, studentMap, selectedStudentId, selectedGroup, selectedCategory, selectedType, selectedNotificationStatus, searchQuery]);

  // Specific transactions for Student / Parent
  const myPersonalTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.studentId !== myStudentId) return false;
      if (isParent && !t.parentVisible) return false;
      return true;
    });
  }, [transactions, myStudentId, isParent]);

  const myTree = useMemo(() => {
    return trainingService.getStudentTree(myStudentId);
  }, [myStudentId, transactions]);

  // Overall Statistics for Teacher Journal
  const stats = useMemo(() => {
    let totalPositive = 0;
    let totalNegative = 0;
    let countPositive = 0;
    let countNegative = 0;
    let unnotifiedCount = 0;

    approvedTransactions.forEach((t) => {
      if (t.points > 0) {
        totalPositive += t.points;
        countPositive++;
      } else {
        totalNegative += Math.abs(t.points);
        countNegative++;
      }
      if (t.parentNotificationStatus !== 'SENT') {
        unnotifiedCount++;
      }
    });

    return {
      totalCount: approvedTransactions.length,
      totalPositive,
      totalNegative,
      countPositive,
      countNegative,
      unnotifiedCount,
      netScore: totalPositive - totalNegative
    };
  }, [approvedTransactions]);

  // Personal statistics for Student / Parent
  const personalStats = useMemo(() => {
    let totalPositive = 0;
    let totalNegative = 0;
    let countPositive = 0;
    let countNegative = 0;

    myPersonalTransactions.forEach((t) => {
      if (t.points > 0) {
        totalPositive += t.points;
        countPositive++;
      } else {
        totalNegative += Math.abs(t.points);
        countNegative++;
      }
    });

    return {
      totalCount: myPersonalTransactions.length,
      totalPositive,
      totalNegative,
      countPositive,
      countNegative,
      netScore: totalPositive - totalNegative
    };
  }, [myPersonalTransactions]);

  // Class Collective stats
  const classCollectiveStats = useMemo(() => {
    let totalClassPlus = 0;
    let totalClassMinus = 0;
    approvedTransactions.forEach(t => {
      if (t.points > 0) totalClassPlus += t.points;
      else totalClassMinus += Math.abs(t.points);
    });

    // Group scores
    const groupScores: { [key: number]: { plus: number; minus: number; total: number; count: number } } = {
      1: { plus: 0, minus: 0, total: 0, count: 0 },
      2: { plus: 0, minus: 0, total: 0, count: 0 },
      3: { plus: 0, minus: 0, total: 0, count: 0 },
      4: { plus: 0, minus: 0, total: 0, count: 0 }
    };

    approvedTransactions.forEach(t => {
      const stu = studentMap.get(t.studentId || '');
      const grp = stu?.group || 1;
      if (groupScores[grp]) {
        if (t.points > 0) groupScores[grp].plus += t.points;
        else groupScores[grp].minus += Math.abs(t.points);
        groupScores[grp].total += t.points;
        groupScores[grp].count++;
      }
    });

    // Top blooming trees
    const topTrees = [...trees].sort((a, b) => b.totalLifetimePoints - a.totalLifetimePoints).slice(0, 6);

    return {
      totalClassPlus,
      totalClassMinus,
      groupScores,
      topTrees
    };
  }, [approvedTransactions, studentMap, trees]);

  // Students with unnotified records summary
  const studentsWithUnnotified = useMemo(() => {
    const map = new Map<string, { student: Student; unnotifiedTxs: PointTransaction[]; plus: number; minus: number; net: number }>();

    approvedTransactions.forEach(tx => {
      if (tx.parentNotificationStatus !== 'SENT' && tx.studentId) {
        const s = studentMap.get(tx.studentId);
        if (s) {
          if (!map.has(s.id)) {
            map.set(s.id, { student: s, unnotifiedTxs: [], plus: 0, minus: 0, net: 0 });
          }
          const item = map.get(s.id)!;
          item.unnotifiedTxs.push(tx);
          if (tx.points > 0) item.plus += tx.points;
          else item.minus += Math.abs(tx.points);
          item.net += tx.points;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.unnotifiedTxs.length - a.unnotifiedTxs.length);
  }, [approvedTransactions, studentMap]);

  // Weekly Statistics
  const weeklyData = useMemo(() => {
    const weekStart = weekRange.start.getTime();
    const weekEnd = weekRange.end.getTime() + 86400000;

    const weekList = approvedTransactions.filter((t) => {
      if (t.timestamp) {
        const time = new Date(t.timestamp).getTime();
        if (!isNaN(time)) return time >= weekStart && time <= weekEnd;
      }
      if (t.createdAt) {
        const parsed = new Date(t.createdAt).getTime();
        if (!isNaN(parsed)) return parsed >= weekStart && parsed <= weekEnd;
      }
      return currentWeek === 1;
    });

    let totalPlus = 0;
    let totalMinus = 0;
    let countPlus = 0;
    let countMinus = 0;
    const studentsPlus = new Set<string>();
    const studentsMinus = new Set<string>();

    weekList.forEach((t) => {
      if (t.points > 0) {
        totalPlus += t.points;
        countPlus++;
        if (t.studentId) studentsPlus.add(t.studentId);
      } else {
        totalMinus += Math.abs(t.points);
        countMinus++;
        if (t.studentId) studentsMinus.add(t.studentId);
      }
    });

    const bloomedTreesCount = trees.filter(tr => tr.completedTrees > 0 || tr.stage === 'BLOOMING').length;

    return {
      weekList,
      totalPlus,
      totalMinus,
      countPlus,
      countMinus,
      studentsPlusCount: studentsPlus.size,
      studentsMinusCount: studentsMinus.size,
      bloomedTreesCount,
      positiveTransactions: weekList.filter(t => t.points > 0),
      negativeTransactions: weekList.filter(t => t.points < 0)
    };
  }, [approvedTransactions, currentWeek, weekRange, trees]);

  const handleExport = () => {
    const data = filteredJournal.map((t, idx) => {
      const stu = studentMap.get(t.studentId || '');
      return {
        'STT': idx + 1,
        'Mã học sinh': stu?.code || '',
        'Họ và tên': t.studentName,
        'Tổ': stu?.group ? `Tổ ${stu.group}` : '',
        'Điểm rèn luyện': t.points > 0 ? `+${t.points}` : t.points,
        'Loại điểm': t.points > 0 ? 'Khen thưởng (+)' : 'Trừ điểm (-)',
        'Danh mục': t.category,
        'Lý do ghi nhận': t.reason,
        'Người ghi nhận': t.recordedBy || t.proposedByName || '',
        'Người duyệt': t.approvedBy || '',
        'Thời gian': t.eventDate || t.createdAt || '',
        'Trạng thái gửi PH': t.parentNotificationStatus === 'SENT' ? 'Đã gửi PH' : 'Chưa gửi PH'
      };
    });

    const clsName = classService.getSettings().className || '11A1';
    exportService.exportToExcel(
      data,
      `So_Ren_Luyen_${clsName}_${new Date().toISOString().slice(0, 10)}`,
      'Sổ Rèn luyện'
    );
  };

  const handleOpenSendReportForStudent = (studentId?: string) => {
    setSelectedStudentForReport(studentId);
    setIsSendReportModalOpen(true);
  };

  const handleDelete = (tx: PointTransaction) => {
    setTransactionToDelete(tx);
  };

  const confirmDeleteTransaction = () => {
    if (transactionToDelete) {
      trainingService.deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    }
  };

  const handleSaveRuleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormTitle.trim()) return;

    const finalPoints = ruleFormPointsType === 'plus' ? Math.abs(ruleFormPointsValue) : -Math.abs(ruleFormPointsValue);

    if (editingRule) {
      trainingService.updateRule(editingRule.id, {
        title: ruleFormTitle.trim(),
        category: ruleFormCategory as TrainingCategory,
        points: finalPoints,
        icon: ruleFormIcon.trim() || (finalPoints >= 0 ? '⭐' : '⚠️')
      });
    } else {
      trainingService.addRule({
        title: ruleFormTitle.trim(),
        category: ruleFormCategory as TrainingCategory,
        points: finalPoints,
        icon: ruleFormIcon.trim() || (finalPoints >= 0 ? '⭐' : '⚠️')
      });
    }

    setRuleModalOpen(false);
    setEditingRule(null);
    loadData();
  };

  const confirmDeleteRule = () => {
    if (ruleToDelete) {
      trainingService.deleteRule(ruleToDelete.id);
      setRuleToDelete(null);
      loadData();
    }
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentDescription.trim()) return;

    trainingService.submitAdjustmentReport({
      studentId: myStudentId,
      studentName: myStudentInfo?.fullName || currentUser.name,
      category: adjustmentCategory,
      description: adjustmentDescription.trim(),
      evidenceFiles: []
    });

    setAdjustmentSubmitted(true);
    setTimeout(() => {
      setAdjustmentSubmitted(false);
      setIsAdjustmentModalOpen(false);
      setAdjustmentDescription('');
    }, 2500);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ========================================================================= */}
      {/* VIEW 1: PARENT VIEW ("RÈN LUYỆN CỦA CON")                                */}
      {/* ========================================================================= */}
      {isParent && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <span>RÈN LUYỆN CỦA CON ({myStudentInfo?.fullName})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi nề nếp, điểm thưởng và quá trình phát triển Cây Nguyệt Quế của con
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Dữ liệu chính thức từ GVCN</span>
              </span>
            </div>
          </div>

          {/* Laurel Tree Spotlight */}
          {myTree && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-tr from-emerald-50/70 via-white to-teal-50/70 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <TreeStageIllustration stage={myTree.stage} className="h-28 w-28 shrink-0" />
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>Cây Nguyệt Quế: {myStudentInfo?.fullName}</span>
                        <span className="rounded-md bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold">
                          Giai đoạn: {myTree.stageName}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Con đang có <b>{myTree.currentPoints}/100 điểm</b> trong chu kỳ nuôi cây hiện tại.
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-xs font-black self-start">
                      🌼 Đã hoàn thành: {myTree.completedTrees} Cây
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                        style={{ width: `${myTree.currentPoints}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
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
          )}

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-center sm:text-left">
              <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-center sm:justify-start gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Điểm Thưởng Tích Cực</span>
              </div>
              <div className="text-xl font-black text-emerald-900 mt-1">+{personalStats.totalPositive} đ</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">{personalStats.countPositive} lượt ghi nhận</div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 text-center sm:text-left">
              <div className="text-[11px] font-bold text-rose-700 flex items-center justify-center sm:justify-start gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Điểm Trừ / Nhắc Nhở</span>
              </div>
              <div className="text-xl font-black text-rose-900 mt-1">-{personalStats.totalNegative} đ</div>
              <div className="text-[10px] text-rose-600 mt-0.5">{personalStats.countNegative} lượt nhắc nhở</div>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3.5 text-center sm:text-left">
              <div className="text-[11px] font-bold text-purple-700 flex items-center justify-center sm:justify-start gap-1">
                <TreePine className="h-3.5 w-3.5" />
                <span>Điểm Tích Lũy Ròng</span>
              </div>
              <div className={`text-xl font-black mt-1 ${personalStats.netScore >= 0 ? 'text-purple-900' : 'text-rose-900'}`}>
                {personalStats.netScore > 0 ? `+${personalStats.netScore}` : personalStats.netScore} đ
              </div>
              <div className="text-[10px] text-purple-600 mt-0.5">Tích lũy năm học</div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-center sm:text-left">
              <div className="text-[11px] font-bold text-blue-700 flex items-center justify-center sm:justify-start gap-1">
                <Award className="h-3.5 w-3.5" />
                <span>Tổng Số Lượt Ghi Nhận</span>
              </div>
              <div className="text-xl font-black text-blue-900 mt-1">{personalStats.totalCount}</div>
              <div className="text-[10px] text-blue-600 mt-0.5">Bản ghi rèn luyện</div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Lịch sử ghi nhận nề nếp & khen thưởng của con
              </h3>
              <span className="text-[11px] text-slate-400">Chỉ hiển thị dữ liệu của {myStudentInfo?.fullName}</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3 text-center">Điểm số</th>
                  <th className="p-3">Danh mục</th>
                  <th className="p-3">Lý do & Nội dung ghi nhận</th>
                  <th className="p-3">Người ghi nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myPersonalTransactions.length > 0 ? (
                  myPersonalTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                        {t.eventDate || t.createdAt || 'Gần đây'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black ${
                            t.points >= 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {t.points > 0 ? `+${t.points}` : t.points}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {t.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-900 font-semibold">{t.reason}</span>
                      </td>
                      <td className="p-3 text-slate-500">{t.recordedBy || t.proposedByName || 'GVCN'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-slate-400 italic">
                      Chưa có bản ghi rèn luyện nào được chia sẻ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: STUDENT / CLASS OFFICER VIEW (Cá nhân & Lớp)                      */}
      {/* ========================================================================= */}
      {(isStudent || isOfficer) && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <span>SỔ GHI NHẬN RÈN LUYỆN & NỀ NẾP</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi kỷ cương nề nếp, điểm thưởng cá nhân và kết quả thi đua toàn lớp
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isOfficer && (
                <button
                  onClick={() => setIsScoreModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Báo cáo nhanh (Gửi GVCN)</span>
                </button>
              )}

              {/* 2 Tabs */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
                <button
                  onClick={() => setStudentTab('personal')}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    studentTab === 'personal'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Rèn luyện của tôi</span>
                </button>
                <button
                  onClick={() => setStudentTab('class')}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    studentTab === 'class'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Rèn luyện lớp</span>
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: Personal View */}
          {studentTab === 'personal' && (
            <div className="space-y-4">
              {myTree && (
                <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-tr from-emerald-50/70 via-white to-teal-50/70 p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <TreeStageIllustration stage={myTree.stage} className="h-28 w-28 shrink-0" />
                    <div className="flex-1 w-full space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <span>Cây Nguyệt Quế của bạn ({currentUser.name})</span>
                            <span className="rounded-md bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold">
                              Giai đoạn: {myTree.stageName}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Bạn đang có <b>{myTree.currentPoints}/100 điểm</b> trong chu kỳ nuôi cây này.
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-xs font-black self-start">
                          🌼 Đã hoàn thành: {myTree.completedTrees} Cây
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                            style={{ width: `${myTree.currentPoints}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
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
              )}

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-center sm:justify-start gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Điểm Thưởng Cá Nhân</span>
                  </div>
                  <div className="text-xl font-black text-emerald-900 mt-1">+{personalStats.totalPositive} đ</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">{personalStats.countPositive} lượt ghi nhận</div>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-rose-700 flex items-center justify-center sm:justify-start gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>Điểm Trừ / Nhắc Nhở</span>
                  </div>
                  <div className="text-xl font-black text-rose-900 mt-1">-{personalStats.totalNegative} đ</div>
                  <div className="text-[10px] text-rose-600 mt-0.5">{personalStats.countNegative} lượt vi phạm</div>
                </div>

                <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-purple-700 flex items-center justify-center sm:justify-start gap-1">
                    <TreePine className="h-3.5 w-3.5" />
                    <span>Điểm Tích Lũy Ròng</span>
                  </div>
                  <div className={`text-xl font-black mt-1 ${personalStats.netScore >= 0 ? 'text-purple-900' : 'text-rose-900'}`}>
                    {personalStats.netScore > 0 ? `+${personalStats.netScore}` : personalStats.netScore} đ
                  </div>
                  <div className="text-[10px] text-purple-600 mt-0.5">Đóng góp Cây Nguyệt Quế</div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-blue-700 flex items-center justify-center sm:justify-start gap-1">
                    <Award className="h-3.5 w-3.5" />
                    <span>Lượt Ghi Nhận</span>
                  </div>
                  <div className="text-xl font-black text-blue-900 mt-1">{personalStats.totalCount}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Bản ghi cá nhân</div>
                </div>
              </div>

              {/* Submit adjustment report */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-600">
                  Nếu phát hiện sai sót về điểm nề nếp hoặc có việc tốt cần bổ sung, bạn có thể gửi phản hồi trực tiếp đến GVCN.
                </div>
                <button
                  onClick={() => setIsAdjustmentModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Gửi đề xuất đính chính</span>
                </button>
              </div>

              {/* Official Periodical Evaluation Results & Self-Assessment for this Student */}
              {(() => {
                const studentEvals = conductEvaluationService.getStudentEvaluations(myStudentId);
                const relevantEvals = studentEvals.filter(
                  e => e.period.periodType === 'SEMESTER_1' || e.period.periodType === 'SEMESTER_2'
                );

                return (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                      <div>
                        <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-emerald-700" />
                          <span>Tự Nhận Xét & Đánh Giá Rèn Luyện Định Kỳ Của Bạn</span>
                        </h4>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Hai phương thức: Nhập thủ công (đối chiếu dữ liệu GVCN/Excel) hoặc Đồng bộ từ khảo sát rèn luyện
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelfAssessmentPeriod('SEMESTER_1');
                          setIsSelfAssessmentModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
                      >
                        <Award className="h-4 w-4 text-emerald-200" />
                        <span>Tự Nhận Xét Rèn Luyện</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(relevantEvals.length > 0 ? relevantEvals : [
                        {
                          period: conductEvaluationService.getOrCreateEvaluation('SEMESTER_1'),
                          evaluation: conductEvaluationService.getStudentEvaluation(myStudentId, 'SEMESTER_1') || {
                            studentId: myStudentId,
                            studentCode: myStudentInfo?.code || '',
                            studentName: myStudentInfo?.fullName || currentUser.name,
                            group: myStudentInfo?.group || 1,
                            plusPoints: 0,
                            minusPoints: 0,
                            netPoints: 0,
                            violationCount: 0,
                            praiseCount: 0,
                            selfAssessment: '',
                            selfAssessmentSource: undefined,
                            selfAssessmentSubmittedAt: undefined,
                            collectiveAssessment: '',
                            teacherAssessment: '',
                            finalGrade: '',
                            autoSummaryNote: '',
                            teacherNote: '',
                            status: 'DRAFT',
                            updatedAt: new Date().toISOString()
                          }
                        },
                        {
                          period: conductEvaluationService.getOrCreateEvaluation('SEMESTER_2'),
                          evaluation: conductEvaluationService.getStudentEvaluation(myStudentId, 'SEMESTER_2') || {
                            studentId: myStudentId,
                            studentCode: myStudentInfo?.code || '',
                            studentName: myStudentInfo?.fullName || currentUser.name,
                            group: myStudentInfo?.group || 1,
                            plusPoints: 0,
                            minusPoints: 0,
                            netPoints: 0,
                            violationCount: 0,
                            praiseCount: 0,
                            selfAssessment: '',
                            selfAssessmentSource: undefined,
                            selfAssessmentSubmittedAt: undefined,
                            collectiveAssessment: '',
                            teacherAssessment: '',
                            finalGrade: '',
                            autoSummaryNote: '',
                            teacherNote: '',
                            status: 'DRAFT',
                            updatedAt: new Date().toISOString()
                          }
                        }
                      ]).map(({ period, evaluation }) => {
                        const isFinal = period.status === 'FINALIZED';
                        const isGood = evaluation.finalGrade === 'Tốt';
                        const isFair = evaluation.finalGrade === 'Khá';
                        const isPass = evaluation.finalGrade === 'Đạt';

                        return (
                          <div
                            key={period.id}
                            className="rounded-2xl border border-white bg-white p-4 shadow-xs space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{period.periodTitle}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                                    isFinal
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {isFinal ? 'Chính thức' : 'Dự thảo'}
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  setSelfAssessmentPeriod(period.periodType);
                                  setIsSelfAssessmentModalOpen(true);
                                }}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer hover:underline"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>{evaluation.selfAssessment ? 'Cập nhật' : 'Nhập tự nhận xét'}</span>
                              </button>
                            </div>

                            {/* Data comparison block */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                                <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center justify-between">
                                  <span>Học viên tự nhận xét</span>
                                </div>
                                <div className="text-base font-black text-emerald-950">
                                  {evaluation.selfAssessment || <span className="text-slate-400 font-normal italic text-xs">Chưa có</span>}
                                </div>
                                {evaluation.selfAssessmentSource && (
                                  <div className="text-[9px] text-emerald-700 truncate" title={evaluation.selfAssessmentSource}>
                                    Nguồn: {evaluation.selfAssessmentSource}
                                  </div>
                                )}
                              </div>

                              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1">
                                <div className="text-[10px] font-bold text-indigo-800 uppercase">
                                  <span>GVCN đánh giá (Excel)</span>
                                </div>
                                <div className="text-base font-black text-indigo-950">
                                  {evaluation.teacherAssessment || evaluation.finalGrade || <span className="text-slate-400 font-normal italic text-xs">Chưa nhập</span>}
                                </div>
                                <div className="text-[9px] text-indigo-700">
                                  Tập thể: <b>{evaluation.collectiveAssessment || '-'}</b>
                                </div>
                              </div>
                            </div>

                            {/* Teacher note if present */}
                            {evaluation.teacherNote && (
                              <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed">
                                💬 <i>GVCN nhận xét: {evaluation.teacherNote}</i>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Personal Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3 text-center">Điểm số</th>
                      <th className="p-3">Danh mục</th>
                      <th className="p-3">Lý do & Nội dung ghi nhận</th>
                      <th className="p-3">Người ghi nhận</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myPersonalTransactions.length > 0 ? (
                      myPersonalTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-500 whitespace-nowrap font-medium">
                            {t.eventDate || t.createdAt || 'Gần đây'}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black ${
                                t.points >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {t.points > 0 ? `+${t.points}` : t.points}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {t.category}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-900 font-semibold">{t.reason}</span>
                          </td>
                          <td className="p-3 text-slate-500">{t.recordedBy || t.proposedByName || 'GVCN'}</td>
                          <td className="p-3 text-center">
                            {t.status === 'approved' ? (
                              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                Đã duyệt
                              </span>
                            ) : t.status === 'rejected' ? (
                              <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
                                Từ chối
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                                Chờ duyệt
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-slate-400 italic">
                          Chưa có bản ghi rèn luyện nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Class View */}
          {studentTab === 'class' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-center sm:justify-start gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Tổng Điểm Thưởng Cả Lớp</span>
                  </div>
                  <div className="text-xl font-black text-emerald-900 mt-1">+{classCollectiveStats.totalClassPlus} đ</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Thi đua toàn lớp</div>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-rose-700 flex items-center justify-center sm:justify-start gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>Tổng Điểm Trừ Toàn Lớp</span>
                  </div>
                  <div className="text-xl font-black text-rose-900 mt-1">-{classCollectiveStats.totalClassMinus} đ</div>
                  <div className="text-[10px] text-rose-600 mt-0.5">Nhắc nhở chung</div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-blue-700 flex items-center justify-center sm:justify-start gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>Tỷ Lệ Chuyên Cần</span>
                  </div>
                  <div className="text-xl font-black text-blue-900 mt-1">98.5%</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Xếp hạng 1 toàn khối</div>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-amber-700 flex items-center justify-center sm:justify-start gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Cây Nguyệt Quế Đã Trổ Hoa</span>
                  </div>
                  <div className="text-xl font-black text-amber-900 mt-1">10 Cây</div>
                  <div className="text-[10px] text-amber-700 mt-0.5">Mục tiêu: 14/14 cây</div>
                </div>
              </div>

              {/* Group Rankings */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <span>Bảng Điểm Thi Đua Theo Tổ</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((grp) => {
                    const data = classCollectiveStats.groupScores[grp];
                    return (
                      <div key={grp} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">Tổ {grp}</span>
                          <span className={`text-xs font-black ${data.total >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {data.total > 0 ? `+${data.total}` : data.total} đ
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                          <span className="text-emerald-600 font-semibold">Thưởng: +{data.plus}đ</span>
                          <span className="text-rose-600 font-semibold">Trừ: -{data.minus}đ</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Public Activity Feed */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    <span>Nhật Ký Thi Đua Toàn Lớp ({approvedTransactions.length} sự kiện chính thức)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">Cập nhật thời gian thực</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Học sinh / Tập thể</th>
                        <th className="p-3 text-center">Tổ</th>
                        <th className="p-3 text-center">Điểm</th>
                        <th className="p-3">Danh mục</th>
                        <th className="p-3">Lý do & Nội dung ghi nhận</th>
                        <th className="p-3">Người ghi nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {approvedTransactions.slice(0, 30).map((t) => {
                        const stu = studentMap.get(t.studentId || '');
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-500 whitespace-nowrap font-medium text-[11px]">
                              {t.eventDate || t.createdAt || 'Gần đây'}
                            </td>
                            <td className="p-3 font-bold text-slate-900">
                              {t.studentName || stu?.fullName || 'Học sinh lớp'}
                            </td>
                            <td className="p-3 text-center">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                Tổ {stu?.group || 1}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-xs font-black ${
                                  t.points >= 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {t.points > 0 ? `+${t.points}` : t.points}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {t.category}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-800 font-medium">{t.reason}</span>
                            </td>
                            <td className="p-3 text-slate-500 text-[11px]">{t.recordedBy || t.proposedByName || 'GVCN'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: TEACHER VIEW (FULL ADMIN MANAGEMENT & TRÍCH LỤC SỔ RÈN LUYỆN)    */}
      {/* ========================================================================= */}
      {isTeacher && (
        <div className="space-y-4">
          {/* Header & Main Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <span>QUẢN LÝ RÈN LUYỆN & NỀ NẾP LỚP HỌC</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy trình khép kín: Báo cáo nhanh → Duyệt rèn luyện → Nhật ký vi phạm/khen thưởng → Tổng hợp → Gửi Phụ huynh (Chat 1-1)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsScoreModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Ghi nhận điểm</span>
              </button>

              <button
                onClick={() => handleOpenSendReportForStudent()}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Gửi Báo Cáo Phụ Huynh</span>
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {/* Teacher Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
            <button
              onClick={() => setTeacherTab('journal')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                teacherTab === 'journal'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Nhật Ký Rèn Luyện ({approvedTransactions.length})</span>
            </button>

            <button
              onClick={() => setTeacherTab('pending')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
                teacherTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Chờ GVCN Duyệt</span>
              {pendingTransactions.length > 0 && (
                <span className="rounded-full bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2">
                  {pendingTransactions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTeacherTab('summary')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                teacherTab === 'summary'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Tổng Hợp & Báo Cáo</span>
              {stats.unnotifiedCount > 0 && (
                <span className="rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 border border-rose-200">
                  {stats.unnotifiedCount} chưa gửi PH
                </span>
              )}
            </button>

            <button
              onClick={() => setTeacherTab('evaluation')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                teacherTab === 'evaluation'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Đánh Giá Định Kỳ (HK & Năm)</span>
            </button>

            <button
              onClick={() => setTeacherTab('trees')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                teacherTab === 'trees'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <TreePine className="h-4 w-4" />
              <span>Cây Nguyệt Quế & Xếp Hạng</span>
            </button>

            <button
              onClick={() => setTeacherTab('rules')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                teacherTab === 'rules'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Quy Tắc Tính Điểm ({rules.length})</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: NHẬT KÝ RÈN LUYỆN (OFFICIAL APPROVED LOG)                          */}
          {/* ========================================================================= */}
          {teacherTab === 'journal' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none flex-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên học sinh, lý do..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                  {/* Group Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Tổ:</span>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="all">Tất cả các tổ</option>
                      <option value="1">Tổ 1</option>
                      <option value="2">Tổ 2</option>
                      <option value="3">Tổ 3</option>
                      <option value="4">Tổ 4</option>
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Loại:</span>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="all">Tất cả (+ / -)</option>
                      <option value="positive">⭐ Khen thưởng (+)</option>
                      <option value="negative">⚠️ Nhắc nhở (-)</option>
                    </select>
                  </div>

                  {/* Notification Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Gửi PH:</span>
                    <select
                      value={selectedNotificationStatus}
                      onChange={(e) => setSelectedNotificationStatus(e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="NOT_NOTIFIED">Chưa gửi PH</option>
                      <option value="SENT">Đã gửi PH</option>
                    </select>
                  </div>

                  {/* Student Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500">Học sinh:</span>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none max-w-[180px] truncate"
                    >
                      <option value="all">Toàn bộ học sinh</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(selectedGroup !== 'all' || selectedType !== 'all' || selectedStudentId !== 'all' || selectedCategory !== 'all' || selectedNotificationStatus !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedGroup('all');
                        setSelectedType('all');
                        setSelectedStudentId('all');
                        setSelectedCategory('all');
                        setSelectedNotificationStatus('all');
                        setSearchQuery('');
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:underline ml-auto cursor-pointer"
                    >
                      Đặt lại bộ lọc
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Học sinh</th>
                      <th className="p-3 text-center">Tổ</th>
                      <th className="p-3 text-center">Điểm số</th>
                      <th className="p-3">Danh mục & Lý do</th>
                      <th className="p-3">Người ghi nhận</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3 text-center">Trạng thái PH</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJournal.length > 0 ? (
                      filteredJournal.map((t) => {
                        const stu = studentMap.get(t.studentId || '');
                        const isNotified = t.parentNotificationStatus === 'SENT';

                        return (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{t.studentName}</div>
                              {stu?.code && <div className="text-[10px] text-slate-400">{stu.code}</div>}
                            </td>
                            <td className="p-3 text-center">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {stu?.group ? `Tổ ${stu.group}` : '-'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black ${
                                  t.points >= 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {t.points > 0 ? `+${t.points}` : t.points}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 mr-2">
                                {t.category}
                              </span>
                              <span className="text-slate-800 font-medium">{t.reason}</span>
                            </td>
                            <td className="p-3 text-slate-500">{t.recordedBy || t.proposedByName || 'GVCN'}</td>
                            <td className="p-3 text-slate-400 whitespace-nowrap">{t.eventDate || t.createdAt || 'Gần đây'}</td>
                            <td className="p-3 text-center">
                              {isNotified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold border border-blue-200">
                                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                  <span>Đã gửi PH</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                                  <span>Chưa gửi PH</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenSendReportForStudent(t.studentId)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Gửi báo cáo sự kiện này cho Phụ huynh"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(t)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Xóa bản ghi"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-xs text-slate-400 italic">
                          Chưa có bản ghi rèn luyện nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CHỜ GVCN DUYỆT (PENDING PROPOSALS)                                 */}
          {/* ========================================================================= */}
          {teacherTab === 'pending' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold shadow-xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-900">
                      Danh Sách Đề Xuất Rèn Luyện Chờ Phê Duyệt ({pendingTransactions.length})
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Các báo cáo nhanh từ Cán sự lớp và Học sinh cần GVCN kiểm tra tính xác thực trước khi tính vào điểm chính thức
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Học sinh được ghi nhận</th>
                      <th className="p-3 text-center">Điểm đề xuất</th>
                      <th className="p-3">Danh mục & Nội dung</th>
                      <th className="p-3">Người báo cáo</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3 text-right">Thao tác kiểm duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingTransactions.length > 0 ? (
                      pendingTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{tx.studentName}</div>
                            <div className="text-[10px] text-slate-400">
                              {studentMap.get(tx.studentId || '')?.code || 'HS'} (Tổ {studentMap.get(tx.studentId || '')?.group || 1})
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black ${
                                tx.points >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {tx.points > 0 ? `+${tx.points}` : tx.points}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 mr-2">
                              {tx.category}
                            </span>
                            <span className="text-slate-800 font-medium">{tx.reason}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{tx.proposedByName || 'Cán sự lớp'}</span>
                            <span className="block text-[10px] text-slate-400">{tx.proposedByRole || 'Cán bộ'}</span>
                          </td>
                          <td className="p-3 text-slate-400 whitespace-nowrap">{tx.eventDate || tx.createdAt || 'Hôm nay'}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setReviewingTx(tx)}
                                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Kiểm tra & Duyệt</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-xs text-slate-400 italic">
                          Hiện không có đề xuất nào đang chờ phê duyệt.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TỔNG HỢP & BÁO CÁO (SUMMARY & PARENT SENDING HUB)                  */}
          {/* ========================================================================= */}
          {teacherTab === 'summary' && (
            <div className="space-y-4">
              {/* Overall Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-center sm:justify-start gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Tổng Điểm Khen Thưởng</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">+{stats.totalPositive} đ</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">{stats.countPositive} sự kiện việc tốt & tiến bộ</div>
                </div>

                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-rose-700 flex items-center justify-center sm:justify-start gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>Tổng Điểm Nhắc Nhở</span>
                  </div>
                  <div className="text-2xl font-black text-rose-900 mt-1">-{stats.totalNegative} đ</div>
                  <div className="text-[10px] text-rose-600 mt-0.5">{stats.countNegative} sự kiện nề nếp / vi phạm</div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-blue-700 flex items-center justify-center sm:justify-start gap-1">
                    <Award className="h-3.5 w-3.5" />
                    <span>Điểm Rèn Luyện Ròng</span>
                  </div>
                  <div className={`text-2xl font-black mt-1 ${stats.netScore >= 0 ? 'text-blue-900' : 'text-rose-900'}`}>
                    {stats.netScore > 0 ? `+${stats.netScore}` : stats.netScore} đ
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Tích lũy tập thể lớp</div>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-center sm:text-left">
                  <div className="text-[11px] font-bold text-amber-700 flex items-center justify-center sm:justify-start gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Chưa Gửi Phụ Huynh</span>
                  </div>
                  <div className="text-2xl font-black text-amber-900 mt-1">{stats.unnotifiedCount}</div>
                  <div className="text-[10px] text-amber-700 mt-0.5">{studentsWithUnnotified.length} học sinh có sự kiện mới</div>
                </div>
              </div>

              {/* Group-by-group Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>Tổng Kết Điểm Thi Đua 4 Tổ</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((grp) => {
                    const data = classCollectiveStats.groupScores[grp];
                    return (
                      <div key={grp} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900">Tổ {grp}</span>
                          <span className={`text-sm font-black ${data.total >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {data.total > 0 ? `+${data.total}` : data.total} đ
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-emerald-700 font-medium">Khen thưởng:</span>
                            <span className="font-bold">+{data.plus}đ</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-rose-700 font-medium">Nhắc nhở:</span>
                            <span className="font-bold">-{data.minus}đ</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[10px]">
                            <span>Số lượt ghi nhận:</span>
                            <span>{data.count} lượt</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Students with Unnotified Records Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-rose-600" />
                      <span>Danh Sách Học Sinh Có Sự Kiện Rèn Luyện Chưa Báo Phụ Huynh</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bấm nút "Gửi Báo Cáo" để tổng hợp và gửi trực tiếp qua Nhịp cầu phụ huynh (Chat 1-1)
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenSendReportForStudent()}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Mở Soạn Báo Cáo Phụ Huynh</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3">Học sinh</th>
                        <th className="p-3 text-center">Tổ</th>
                        <th className="p-3 text-center">Số sự kiện chưa báo</th>
                        <th className="p-3 text-center">Điểm cộng (+)</th>
                        <th className="p-3 text-center">Điểm trừ (-)</th>
                        <th className="p-3 text-center">Điểm ròng</th>
                        <th className="p-3 text-right">Gửi trực tiếp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsWithUnnotified.length > 0 ? (
                        studentsWithUnnotified.map((item) => (
                          <tr key={item.student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{item.student.fullName}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.student.code} • PH: {item.student.parentName || 'Quý Phụ huynh'}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-600">
                              Tổ {item.student.group}
                            </td>
                            <td className="p-3 text-center">
                              <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-black">
                                {item.unnotifiedTxs.length} sự kiện
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-700">
                              +{item.plus}đ
                            </td>
                            <td className="p-3 text-center font-bold text-rose-700">
                              -{item.minus}đ
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                                  item.net >= 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {item.net > 0 ? `+${item.net}` : item.net}đ
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleOpenSendReportForStudent(item.student.id)}
                                className="flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ml-auto"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Gửi PH</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-slate-400 italic">
                            Tất cả sự kiện rèn luyện đã được gửi thông báo đến Phụ huynh.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ĐÁNH GIÁ, XẾP LOẠI RÈN LUYỆN ĐỊNH KỲ (PERIODICAL EVALUATION)         */}
          {/* ========================================================================= */}
          {teacherTab === 'evaluation' && <ConductEvaluationTab />}

          {/* ========================================================================= */}
          {/* TAB 4: CÂY NGUYỆT QUẾ & XẾP HẠNG (LAUREL TREES)                            */}
          {/* ========================================================================= */}
          {teacherTab === 'trees' && (
            <div className="space-y-4">
              {/* Week selector bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 p-3.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                      Thống kê Rèn luyện Tuần {currentWeek}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 ml-2">
                      ({weekRange.label})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentWeek(prev => Math.max(1, prev - 1))}
                    disabled={currentWeek <= 1}
                    className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
                  >
                    ← Tuần trước
                  </button>

                  <button
                    onClick={() => setCurrentWeek(1)}
                    className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 cursor-pointer"
                  >
                    Tuần này
                  </button>

                  <button
                    onClick={() => setCurrentWeek(prev => Math.min(35, prev + 1))}
                    disabled={currentWeek >= 35}
                    className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
                  >
                    Tuần sau →
                  </button>
                </div>
              </div>

              {/* Top laurel tree cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {trees.map((tree, idx) => (
                  <div
                    key={tree.studentId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black shrink-0">
                        #{idx + 1}
                      </div>
                      <img
                        src={tree.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={tree.studentName}
                        className="h-10 w-10 rounded-full object-cover border border-emerald-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900 truncate">{tree.studentName}</h4>
                        <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <span>{tree.stageName}</span>
                          <span>•</span>
                          <span>Tổ {tree.group || 1}</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-black shrink-0">
                        🌼 {tree.completedTrees} Cây
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Chu kỳ hiện tại</span>
                        <span className="font-bold text-emerald-800">{tree.currentPoints}/100 đ</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${tree.currentPoints}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Tổng tích lũy: <strong className="text-slate-700">{tree.totalLifetimePoints} đ</strong></span>
                      <button
                        onClick={() => handleOpenSendReportForStudent(tree.studentId)}
                        className="text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Gửi báo cáo PH →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: QUY TẮC TÍNH ĐIỂM (POINT RULES)                                    */}
          {/* ========================================================================= */}
          {teacherTab === 'rules' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      <span>Cấu Hình Quy Tắc & Mức Điểm Rèn Luyện (+/-)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tùy chỉnh tiêu chí cộng điểm thưởng và trừ kỷ luật áp dụng cho lớp. Dữ liệu lịch sử đã ghi nhận sẽ được bảo toàn nguyên vẹn.
                    </p>
                  </div>

                  {isTeacher && (
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setRuleFormTitle('');
                        setRuleFormCategory('Học tập');
                        setRuleFormPointsType('plus');
                        setRuleFormPointsValue(5);
                        setRuleFormIcon('⭐');
                        setRuleModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm tiêu chí điểm mới</span>
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Filter className="h-3.5 w-3.5 text-slate-400" /> Lọc:
                    </span>
                    <button
                      onClick={() => setRuleTypeFilter('all')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        ruleTypeFilter === 'all'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      Tất cả ({rules.length})
                    </button>
                    <button
                      onClick={() => setRuleTypeFilter('positive')}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        ruleTypeFilter === 'positive'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5" /> Điểm cộng (+) ({rules.filter(r => r.points > 0).length})
                    </button>
                    <button
                      onClick={() => setRuleTypeFilter('negative')}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        ruleTypeFilter === 'negative'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                      }`}
                    >
                      <TrendingDown className="h-3.5 w-3.5" /> Điểm trừ (-) ({rules.filter(r => r.points < 0).length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={ruleCategoryFilter}
                      onChange={(e) => setRuleCategoryFilter(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="all">Tất cả lĩnh vực</option>
                      <option value="Học tập">Học tập</option>
                      <option value="Nề nếp & Kỷ luật">Nề nếp & Kỷ luật</option>
                      <option value="Phong trào & Hoạt động">Phong trào & Hoạt động</option>
                      <option value="Việc tốt & Giúp đỡ">Việc tốt & Giúp đỡ</option>
                      <option value="Khác">Lĩnh vực khác</option>
                    </select>
                  </div>
                </div>

                {/* Rules Cards Grid */}
                {(() => {
                  const filteredRules = rules.filter((r) => {
                    if (ruleTypeFilter === 'positive' && r.points <= 0) return false;
                    if (ruleTypeFilter === 'negative' && r.points >= 0) return false;
                    if (ruleCategoryFilter !== 'all' && r.category !== ruleCategoryFilter) return false;
                    return true;
                  });

                  if (filteredRules.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                        Không tìm thấy tiêu chí nào phù hợp với bộ lọc hiện tại.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-2xl shrink-0">{rule.icon || '📌'}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 truncate" title={rule.title}>
                                {rule.title}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="rounded bg-white border border-slate-200 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 inline-block">
                                  {rule.category}
                                </span>
                                {rule.isCustom && (
                                  <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 inline-block">
                                    GVCN tạo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                                rule.points >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {rule.points > 0 ? `+${rule.points}` : rule.points} đ
                            </span>

                            {isTeacher && (
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setRuleFormTitle(rule.title);
                                    setRuleFormCategory(rule.category);
                                    setRuleFormPointsType(rule.points >= 0 ? 'plus' : 'minus');
                                    setRuleFormPointsValue(Math.abs(rule.points));
                                    setRuleFormIcon(rule.icon || '📌');
                                    setRuleModalOpen(true);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                                  title="Chỉnh sửa tiêu chí"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setRuleToDelete(rule)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Xóa tiêu chí"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Score Modal */}
      <QuickScoreModal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Send Parent Training Report Modal */}
      <SendParentTrainingReportModal
        isOpen={isSendReportModalOpen}
        initialStudentId={selectedStudentForReport}
        onClose={() => {
          setIsSendReportModalOpen(false);
          setSelectedStudentForReport(undefined);
        }}
        onSuccess={loadData}
      />

      {/* Review Training Modal for GVCN */}
      <ReviewTrainingModal
        isOpen={!!reviewingTx}
        transaction={reviewingTx}
        onClose={() => setReviewingTx(null)}
        onSuccess={loadData}
      />

      {/* Confirm Delete Transaction Modal */}
      <ConfirmDeleteModal
        isOpen={!!transactionToDelete}
        title="Xác nhận xóa bản ghi rèn luyện"
        itemName={transactionToDelete ? `${transactionToDelete.studentName} (${transactionToDelete.points > 0 ? '+' : ''}${transactionToDelete.points}đ: ${transactionToDelete.reason})` : ''}
        message="Thầy/Cô có chắc chắn muốn xóa bản ghi rèn luyện này? Điểm rèn luyện và cấp độ Cây Nguyệt Quế của học sinh sẽ tự động được tính toán và hoàn lại."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteTransaction}
        onClose={() => setTransactionToDelete(null)}
      />

      {/* Adjustment Report Modal for Student */}
      {isAdjustmentModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-600" />
                <span>Gửi Đề Xuất Đính Chính / Bổ Sung Điểm Rèn Luyện</span>
              </h3>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lĩnh vực</label>
                <select
                  value={adjustmentCategory}
                  onChange={(e) => setAdjustmentCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="Rèn luyện">Rèn luyện & Nề nếp</option>
                  <option value="Học tập">Học tập & Bài tập</option>
                  <option value="Khen thưởng">Khen thưởng & Việc tốt</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung giải trình / đề xuất</label>
                <textarea
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  rows={4}
                  placeholder="Mô tả cụ thể sự việc, ngày giờ, bạn cùng tham gia hoặc lý do cần đính chính..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {adjustmentSubmitted && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Đề xuất đã được gửi thành công đến Cô chủ nhiệm!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Gửi đến GVCN</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Point Rule Configuration Modal (Add/Edit) */}
      {ruleModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <span>{editingRule ? 'Chỉnh Sửa Tiêu Chí Rèn Luyện' : 'Thêm Tiêu Chí Rèn Luyện Mới'}</span>
              </h3>
              <button
                onClick={() => setRuleModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tiêu chí / Quy định vi phạm/khen thưởng *</label>
                <input
                  type="text"
                  required
                  value={ruleFormTitle}
                  onChange={(e) => setRuleFormTitle(e.target.value)}
                  placeholder="Ví dụ: Đạt giải Nhất cuộc thi KHKT, Không mang phù hiệu..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại điểm</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRuleFormPointsType('plus')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ruleFormPointsType === 'plus'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      + Cộng điểm
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleFormPointsType('minus')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        ruleFormPointsType === 'minus'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      - Trừ điểm
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mức điểm (+/-)</label>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-black ${ruleFormPointsType === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {ruleFormPointsType === 'plus' ? '+' : '-'}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={ruleFormPointsValue}
                      onChange={(e) => setRuleFormPointsValue(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-slate-500 font-bold">điểm</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lĩnh vực rèn luyện</label>
                  <select
                    value={ruleFormCategory}
                    onChange={(e) => setRuleFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                  >
                    <option value="Học tập">Học tập</option>
                    <option value="Nề nếp & Kỷ luật">Nề nếp & Kỷ luật</option>
                    <option value="Phong trào & Hoạt động">Phong trào & Hoạt động</option>
                    <option value="Việc tốt & Giúp đỡ">Việc tốt & Giúp đỡ</option>
                    <option value="Khác">Lĩnh vực khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Icon biểu tượng</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={ruleFormIcon}
                      onChange={(e) => setRuleFormIcon(e.target.value)}
                      className="w-14 rounded-xl border border-slate-300 p-2 text-center text-base outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {['⭐', '🏆', '🌿', '💡', '⚠️', '📌', '🧹', '🎯'].map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setRuleFormIcon(ic)}
                          className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-sm cursor-pointer"
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{editingRule ? 'Lưu cập nhật' : 'Tạo tiêu chí'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete Rule Modal */}
      <ConfirmDeleteModal
        isOpen={!!ruleToDelete}
        title="Xác nhận xóa tiêu chí rèn luyện"
        itemName={ruleToDelete ? `${ruleToDelete.icon || '📌'} ${ruleToDelete.title} (${ruleToDelete.points > 0 ? '+' : ''}${ruleToDelete.points}đ)` : ''}
        message="Thầy/Cô có chắc chắn muốn xóa tiêu chí này khỏi danh mục tính điểm? Các sự kiện rèn luyện đã ghi nhận trước đây vẫn sẽ được giữ nguyên không thay đổi."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmDeleteRule}
        onClose={() => setRuleToDelete(null)}
      />

      {/* Student Conduct Self Assessment Modal */}
      {isSelfAssessmentModalOpen && (
        <StudentConductSelfAssessmentModal
          isOpen={isSelfAssessmentModalOpen}
          onClose={() => setIsSelfAssessmentModalOpen(false)}
          studentId={myStudentId}
          initialPeriod={selfAssessmentPeriod}
          onSaved={() => loadData()}
        />
      )}
    </div>
  );
};
