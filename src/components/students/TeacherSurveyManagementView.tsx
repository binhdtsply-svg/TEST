/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  CheckCheck,
  Clock,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Users,
  AlertCircle,
  FileEdit,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  HeartHandshake,
  Heart,
  Phone,
  GraduationCap,
  Award,
  Compass,
  MessageSquare,
  Check,
  X,
  History,
  Info,
  ShieldAlert,
  Layers,
  UserCheck,
  Plus,
  Copy,
  Archive,
  ArrowLeft,
  FileText,
  Settings,
  HelpCircle,
  BarChart3,
  Edit3,
  Trash2,
  Download,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  Student,
  StudentSurveyResponse,
  SurveySyncProposal,
  SurveySyncState,
  SurveySyncAudit,
  SurveyProposalCategory,
  SurveyProposalStatus,
  SurveyTemplate
} from '../../types';
import { studentService } from '../../services/StudentService';
import { studentSurveyService } from '../../services/StudentSurveyService';
import { surveyTemplateService } from '../../services/SurveyTemplateService';
import { surveySyncService } from '../../services/SurveySyncService';
import { classService } from '../../services/ClassService';
import { authService } from '../../services/AuthService';
import { exportService } from '../../services/ExportService';
import { StudentSurveyDetailModal } from '../student/StudentSurveyDetailModal';
import { SurveyTemplateManagerView } from '../survey/SurveyTemplateManagerView';
import { SurveyPreviewModal } from '../survey/SurveyPreviewModal';
import { SurveyBuilderModal } from '../survey/SurveyBuilderModal';
import { unwrapAnswerValue, normalizeConductGrade, getSafeSurveyAnswer } from '../../utils/surveyAnswerUtils';

interface TeacherSurveyManagementViewProps {
  initialTemplateId?: string;
  initialSubTab?: 'overview' | 'responses' | 'proposals' | 'sync' | 'structure';
  highlightSurveyId?: string;
}

const getAnswerValue = (answers: any, key: string): any => {
  return getSafeSurveyAnswer(answers, key);
};

export const TeacherSurveyManagementView: React.FC<TeacherSurveyManagementViewProps> = ({
  initialTemplateId,
  initialSubTab,
  highlightSurveyId
}) => {
  // Top Level Navigation: 'surveys' (Quản lý khảo sát lớp) vs 'assigned' (Khảo sát gửi tới GVCN) vs 'builder' (Biểu mẫu & Soạn khảo sát)
  const [activeMainSection, setActiveMainSection] = useState<'surveys' | 'assigned' | 'builder'>('surveys');

  // Currently Selected Survey for Detailed Workspace (null = showing all survey templates list)
  const [selectedTemplateForManage, setSelectedTemplateForManage] = useState<SurveyTemplate | null>(null);

  // Sub-tabs when inside a specific survey's workspace
  const [activeSurveyTab, setActiveSurveyTab] = useState<'overview' | 'responses' | 'proposals' | 'sync' | 'structure'>('overview');

  // Data states
  const classSettings = classService.getSettings();
  const currentSchoolYear = classSettings.academicYear || '2025 - 2026';
  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const isTemplateFromAdmin = (t?: SurveyTemplate | null): boolean => {
    return surveyTemplateService.isSystemOrAdminTemplate(t);
  };

  const [templates, setTemplates] = useState<SurveyTemplate[]>(() =>
    surveyTemplateService.getTemplatesBySchoolYear(currentSchoolYear)
  );
  const [students, setStudents] = useState<Student[]>(() =>
    studentService.getAll().filter((s) => s.status !== 'ARCHIVED' && (s.status as any) !== 'Nghỉ học')
  );
  const [surveys, setSurveys] = useState<StudentSurveyResponse[]>(() => studentSurveyService.getAll());
  const [proposals, setProposals] = useState<SurveySyncProposal[]>(() => surveySyncService.getProposals());
  const [syncStates, setSyncStates] = useState<SurveySyncState[]>(() => surveySyncService.getAllSyncStates());

  // Refs to handle initial navigation props strictly once (preventing auto-reopen on re-renders/data refresh)
  const handledHighlightIdRef = useRef<string | null>(null);
  const handledInitialTemplateIdRef = useRef<string | null>(null);

  // Handle incoming template & tab navigation props
  useEffect(() => {
    if (initialTemplateId && initialTemplateId !== handledInitialTemplateIdRef.current) {
      handledInitialTemplateIdRef.current = initialTemplateId;
      const found = surveyTemplateService.getById(initialTemplateId) || templates.find((t) => t.id === initialTemplateId);
      if (found) {
        setSelectedTemplateForManage(found);
        setActiveMainSection('surveys');
      }
    }
  }, [initialTemplateId, templates]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSurveyTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Handle incoming survey highlighting strictly once per unique survey ID
  useEffect(() => {
    if (highlightSurveyId && highlightSurveyId !== handledHighlightIdRef.current) {
      handledHighlightIdRef.current = highlightSurveyId;
      const resp = studentSurveyService.getSurveyById(highlightSurveyId);
      if (resp) {
        setSelectedSurveyForDetail(resp);
        setIsDetailModalOpen(true);
      }
    }
  }, [highlightSurveyId]);

  // Filter for Template List View
  const [templateStatusFilter, setTemplateStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [templateSearch, setTemplateSearch] = useState<string>('');

  // Filters for Responses Tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'REVIEWED' | 'DRAFT' | 'NOT_STARTED'>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Filters for Proposals Tab
  const [proposalCategoryFilter, setProposalCategoryFilter] = useState<string>('ALL');
  const [proposalStatusFilter, setProposalStatusFilter] = useState<string>('PENDING');
  const [proposalPage, setProposalPage] = useState<number>(1);

  // Modals & Action States
  const [selectedSurveyForDetail, setSelectedSurveyForDetail] = useState<StudentSurveyResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<SurveyTemplate | null>(null);
  const [builderTemplate, setBuilderTemplate] = useState<SurveyTemplate | null>(null);

  // Explicit handlers for Survey Detail Modal (Guarantees closed state stays closed)
  const handleOpenDetailModal = (survey: StudentSurveyResponse) => {
    setSelectedSurveyForDetail(survey);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSurveyForDetail(null);
  };

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [processingProposalId, setProcessingProposalId] = useState<string | null>(null);
  const [rejectModalProposalId, setRejectModalProposalId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState<string>('');
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [audits, setAudits] = useState<SurveySyncAudit[]>([]);
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Edit and Sync Modal State
  const [editModalProposal, setEditModalProposal] = useState<SurveySyncProposal | null>(null);
  const [editProposalForm, setEditProposalForm] = useState<any>({});
  const [editReviewNote, setEditReviewNote] = useState<string>('');

  // Special Attention Approval Modal
  const [specialAttentionModalProposal, setSpecialAttentionModalProposal] = useState<SurveySyncProposal | null>(null);
  const [selectedAttentionCategories, setSelectedAttentionCategories] = useState<string[]>(['Sức khỏe']);
  const [attentionReviewNote, setAttentionReviewNote] = useState<string>('');

  // Rename Survey Modal State
  const [renameModalTemplate, setRenameModalTemplate] = useState<SurveyTemplate | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState<string>('');
  const [renameError, setRenameError] = useState<string>('');

  // Delete / Archive Survey Modal State
  const [deleteConfirmModalTemplate, setDeleteConfirmModalTemplate] = useState<SurveyTemplate | null>(null);

  // Survey Export & Filter Customization Modal State
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportTargetTemplate, setExportTargetTemplate] = useState<SurveyTemplate | null>(null);
  const [exportScope, setExportScope] = useState<'ALL' | 'SUBMITTED' | 'REVIEWED'>('ALL');
  const [exportGroup, setExportGroup] = useState<string>('all');
  const [exportSearch, setExportSearch] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [exportFileName, setExportFileName] = useState<string>('');
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([]);

  const refreshData = () => {
    setTemplates(surveyTemplateService.getTemplatesBySchoolYear(currentSchoolYear));
    setStudents(
      studentService.getAll().filter((s) => s.status !== 'ARCHIVED' && (s.status as any) !== 'Nghỉ học')
    );
    setSurveys(studentSurveyService.getAll());
    setProposals(surveySyncService.getProposals());
    setSyncStates(surveySyncService.getAllSyncStates());

    // Keep selected template updated
    if (selectedTemplateForManage) {
      const updated = surveyTemplateService.getById(selectedTemplateForManage.id);
      if (updated) setSelectedTemplateForManage(updated);
    }
  };

  useEffect(() => {
    refreshData();
    const unsubSurvey = studentSurveyService.subscribe(() => refreshData());
    const unsubSync = surveySyncService.subscribe(() => refreshData());
    const unsubStudent = studentService.subscribe(() => refreshData());
    const unsubTemplate = surveyTemplateService.subscribe(() => refreshData());

    return () => {
      unsubSurvey();
      unsubSync();
      unsubStudent();
      unsubTemplate();
    };
  }, [currentSchoolYear, selectedTemplateForManage?.id]);

  // Reset pagination when switching survey templates
  useEffect(() => {
    setProposalPage(1);
    setCurrentPage(1);
    setProposalCategoryFilter('ALL');
  }, [selectedTemplateForManage?.id]);

  // Flash notification helper
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setNotificationMessage({ type, text });
    setTimeout(() => {
      setNotificationMessage(null);
    }, 4000);
  };

  // Filtered Templates for List View
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (templateStatusFilter !== 'ALL' && t.status !== templateStatusFilter) return false;
      if (templateSearch.trim()) {
        const q = templateSearch.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [templates, templateStatusFilter, templateSearch]);

  // Specific Survey Metrics & Filtered Data when in Detail Workspace
  const currentTemplateSurveys = useMemo(() => {
    if (!selectedTemplateForManage) return [];
    return studentSurveyService.getResponsesByTemplate(selectedTemplateForManage.id);
  }, [selectedTemplateForManage, surveys]);

  const currentTemplateSummary = useMemo(() => {
    if (!selectedTemplateForManage) {
      return studentSurveyService.getClassSurveySummary(currentSchoolYear);
    }
    return studentSurveyService.getSurveySummaryForTemplate(selectedTemplateForManage.id, currentSchoolYear);
  }, [selectedTemplateForManage, surveys, students, currentSchoolYear]);

  // Filter proposals strictly relevant to the selected survey template (Zero data contamination)
  const currentTemplateProposals = useMemo(() => {
    if (!selectedTemplateForManage) return [];
    const targetTemplateId = selectedTemplateForManage.id;
    return surveySyncService.getProposals({ templateId: targetTemplateId });
  }, [selectedTemplateForManage, proposals]);

  const currentPendingProposalsCount = useMemo(() => {
    return currentTemplateProposals.filter((p) => p.status === 'PENDING').length;
  }, [currentTemplateProposals]);

  // Aggregate stats for the current survey's overview
  const aggMetrics = useMemo(() => {
    const electivePairs: Record<string, number> = {};
    const electiveSubjects: Record<string, number> = {};
    const classExpectations: Record<string, number> = {};
    const teacherExpectations: Record<string, number> = {};
    let urgentRequestsCount = 0;

    currentTemplateSurveys.forEach((s) => {
      if (s.status !== 'SUBMITTED' && s.status !== 'REVIEWED') return;
      const ans = (s.answers || {}) as any;

      const sub1 = ans.graduationPlan?.electiveSubject1;
      const sub2 = ans.graduationPlan?.electiveSubject2;
      if (sub1 && sub2 && sub1 !== 'Chưa xác định' && sub2 !== 'Chưa xác định') {
        const pair = [sub1, sub2].sort().join(' + ');
        electivePairs[pair] = (electivePairs[pair] || 0) + 1;
      }
      if (sub1 && sub1 !== 'Chưa xác định') electiveSubjects[sub1] = (electiveSubjects[sub1] || 0) + 1;
      if (sub2 && sub2 !== 'Chưa xác định') electiveSubjects[sub2] = (electiveSubjects[sub2] || 0) + 1;

      if (ans.classExpectations && Array.isArray(ans.classExpectations.expectations)) {
        ans.classExpectations.expectations.forEach((item: string) => {
          classExpectations[item] = (classExpectations[item] || 0) + 1;
        });
      }

      if (ans.teacherExpectations && Array.isArray(ans.teacherExpectations.expectations)) {
        ans.teacherExpectations.expectations.forEach((item: string) => {
          teacherExpectations[item] = (teacherExpectations[item] || 0) + 1;
        });
      }

      if (ans.privateTeacherMessage?.hasPrivateMessage || (ans.specialHealthIssues && ans.specialHealthIssues.length > 0)) {
        urgentRequestsCount++;
      }
    });

    return {
      electivePairs,
      electiveSubjects,
      classExpectations,
      teacherExpectations,
      urgentRequestsCount
    };
  }, [currentTemplateSurveys]);

  // Dynamic Question-by-Question Statistical Aggregation for the Active Survey Template
  const dynamicTemplateStats = useMemo(() => {
    if (!selectedTemplateForManage) return null;

    const submittedResponses = currentTemplateSurveys.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'REVIEWED'
    );
    const submittedCount = submittedResponses.length;

    const questionStats: Record<string, {
      question: any;
      answeredCount: number;
      optionCounts?: Record<string, number>;
      scaleAvg?: number;
      scaleDist?: Record<number, number>;
      gridMatrix?: Record<string, Record<string, number>>;
      textResponses?: Array<{ studentName: string; text: string; date?: string }>;
      otherTexts?: string[];
    }> = {};

    selectedTemplateForManage.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        const qKey = q.key || q.id;
        let answered = 0;
        const optCounts: Record<string, number> = {};
        if (q.options) {
          q.options.forEach((opt) => {
            optCounts[opt] = 0;
          });
        }
        const scaleDist: Record<number, number> = {};
        if (q.type === 'SCALE') {
          const min = q.scaleMin || 1;
          const max = q.scaleMax || 5;
          for (let i = min; i <= max; i++) scaleDist[i] = 0;
        }
        let scaleSum = 0;
        let scaleCount = 0;
        const gridMatrix: Record<string, Record<string, number>> = {};
        if (q.type === 'GRID' && q.gridRows && q.gridColumns) {
          q.gridRows.forEach((r) => {
            gridMatrix[r] = {};
            q.gridColumns!.forEach((c) => {
              gridMatrix[r][c] = 0;
            });
          });
        }
        const textResponses: Array<{ studentName: string; text: string; date?: string }> = [];
        const otherTexts: string[] = [];

        submittedResponses.forEach((resp) => {
          const student = students.find((st) => st.id === resp.studentId);
          const studentName = student?.fullName || `Học sinh (${resp.studentId.substring(0, 6)})`;
          const val = getAnswerValue(resp.answers, qKey);
          if (val === undefined || val === null || val === '') return;

          answered++;

          if (q.type === 'SINGLE_CHOICE' || q.type === 'DROPDOWN') {
            const strVal = String(val);
            optCounts[strVal] = (optCounts[strVal] || 0) + 1;
            const otherVal = (resp.answers as any)?.otherText?.[qKey];
            if (otherVal) otherTexts.push(`${studentName}: ${otherVal}`);
          } else if (q.type === 'MULTI_CHOICE') {
            if (Array.isArray(val)) {
              val.forEach((item) => {
                const strItem = String(item);
                optCounts[strItem] = (optCounts[strItem] || 0) + 1;
              });
            } else if (typeof val === 'string') {
              optCounts[val] = (optCounts[val] || 0) + 1;
            }
            const otherVal = (resp.answers as any)?.otherText?.[qKey];
            if (otherVal) otherTexts.push(`${studentName}: ${otherVal}`);
          } else if (q.type === 'SCALE') {
            const num = Number(val);
            if (!isNaN(num)) {
              scaleDist[num] = (scaleDist[num] || 0) + 1;
              scaleSum += num;
              scaleCount++;
            }
          } else if (q.type === 'GRID') {
            if (typeof val === 'object' && val !== null) {
              Object.entries(val).forEach(([rowKey, colVal]) => {
                if (gridMatrix[rowKey] && typeof colVal === 'string') {
                  gridMatrix[rowKey][colVal] = (gridMatrix[rowKey][colVal] || 0) + 1;
                }
              });
            }
          } else if (q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT') {
            textResponses.push({
              studentName,
              text: String(val),
              date: resp.submittedAt
            });
          }
        });

        questionStats[q.id] = {
          question: q,
          answeredCount: answered,
          optionCounts: optCounts,
          scaleAvg: scaleCount > 0 ? Math.round((scaleSum / scaleCount) * 10) / 10 : undefined,
          scaleDist,
          gridMatrix,
          textResponses,
          otherTexts
        };
      });
    });

    return {
      submittedCount,
      questionStats
    };
  }, [selectedTemplateForManage, currentTemplateSurveys, students]);

  // Filtered responses table for the selected survey
  const filteredResponses = useMemo(() => {
    if (!selectedTemplateForManage) return [];

    const surveyMap: Record<string, StudentSurveyResponse> = {};
    currentTemplateSurveys.forEach((s) => {
      surveyMap[s.studentId] = s;
    });

    return students
      .map((st) => {
        const resp = surveyMap[st.id];
        let derivedStatus: 'SUBMITTED' | 'REVIEWED' | 'DRAFT' | 'NOT_STARTED' = 'NOT_STARTED';
        if (resp) {
          derivedStatus = resp.status;
        }

        const syncState = resp ? syncStates.find((ss) => ss.surveyId === resp.id) : undefined;

        return {
          student: st,
          survey: resp,
          status: derivedStatus,
          syncState
        };
      })
      .filter((item) => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (groupFilter !== 'all' && String(item.student.group || 1) !== groupFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (item.student?.fullName || '').toLowerCase().includes(q) ||
            (item.student?.code || '').toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [selectedTemplateForManage, currentTemplateSurveys, students, syncStates, statusFilter, groupFilter, searchQuery]);

  const totalPages = Math.ceil(filteredResponses.length / pageSize) || 1;
  const paginatedResponses = filteredResponses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filtered proposals list for proposals tab (Zero data contamination between surveys)
  const filteredProposals = useMemo(() => {
    if (!selectedTemplateForManage) return [];
    return currentTemplateProposals.filter((p) => {
      // Strict Template Validation
      if (p.templateId) {
        if (p.templateId !== selectedTemplateForManage.id) return false;
      } else {
        const parentSurvey = studentSurveyService.getSurveyById(p.surveyId);
        const pTemplateId = parentSurvey?.surveyTemplateId || (parentSurvey as any)?.templateId;
        if (!parentSurvey || pTemplateId !== selectedTemplateForManage.id) {
          return false;
        }
      }
      if (proposalStatusFilter !== 'ALL' && p.status !== proposalStatusFilter) return false;
      if (proposalCategoryFilter !== 'ALL' && p.category !== proposalCategoryFilter) return false;
      return true;
    });
  }, [selectedTemplateForManage, currentTemplateProposals, proposalStatusFilter, proposalCategoryFilter]);

  const proposalPageSize = 10;
  const totalProposalPages = Math.ceil(filteredProposals.length / proposalPageSize) || 1;
  const paginatedProposals = filteredProposals.slice(
    (proposalPage - 1) * proposalPageSize,
    proposalPage * proposalPageSize
  );

  // Sync actions
  const handleSyncSingle = async (surveyId: string) => {
    try {
      setSyncingId(surveyId);
      await surveySyncService.processSurvey(surveyId, { force: true });
      showToast('success', 'Đồng bộ phản hồi học viên thành công!');
    } catch (e: any) {
      showToast('error', `Lỗi đồng bộ: ${e.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllThisSurvey = async () => {
    if (!selectedTemplateForManage) return;
    try {
      setIsSyncingAll(true);
      const submittedSurveys = currentTemplateSurveys.filter(
        (s) => s.status === 'SUBMITTED' || s.status === 'REVIEWED'
      );
      for (const s of submittedSurveys) {
        await surveySyncService.processSurvey(s.id, { force: true });
      }
      showToast('success', `Đã đồng bộ thành công ${submittedSurveys.length} phản hồi của bài khảo sát này!`);
    } catch (e: any) {
      showToast('error', `Lỗi đồng bộ: ${e.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const isProposalNeedsConcernReview = (proposal: SurveySyncProposal): boolean => {
    if (proposal.category === 'HEALTH_SENSITIVE') {
      const pVal = proposal.proposedValue;
      if (!pVal) return false;
      const statusArr: string[] = Array.isArray(pVal.healthStatus) ? pVal.healthStatus : [];
      const hasAbnormal = statusArr.some(
        (s) => s && s !== 'Bình thường' && s !== 'Khỏe mạnh' && s !== 'Tốt' && s !== 'Ổn định'
      );
      const hasSupportNote = !!(pVal.healthSupportNote && pVal.healthSupportNote.trim() !== '');
      return hasAbnormal || hasSupportNote;
    }
    if (proposal.category === 'PSYCHOLOGICAL_SENSITIVE') {
      const pVal = proposal.proposedValue;
      if (!pVal) return false;
      const emo = pVal.emotionalStatus;
      if (!emo) return false;
      return emo !== 'Bình thường' && emo !== 'Ổn định, vui vẻ' && emo !== 'Tốt' && emo !== 'Ổn định';
    }
    if (proposal.category === 'FAMILY_DIFFICULTY') {
      const pVal = proposal.proposedValue;
      if (!pVal) return false;
      const sit = pVal.familySituation;
      const isAbnormalSit = sit && sit !== 'Bình thường' && sit !== 'Đầy đủ điều kiện' && sit !== 'Ổn định';
      const hasNote = !!(pVal.familyNote && pVal.familyNote.trim() !== '');
      return !!(isAbnormalSit || hasNote);
    }
    if (proposal.category === 'PRIVATE_SUPPORT_REQUEST') {
      return true;
    }
    return false;
  };

  const handleApproveProposal = async (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    if (isProposalNeedsConcernReview(proposal)) {
      const initialCats: string[] = [];
      if (proposal.category === 'HEALTH_SENSITIVE') initialCats.push('Sức khỏe / Thể chất');
      if (proposal.category === 'PSYCHOLOGICAL_SENSITIVE') initialCats.push('Tâm lý / Cảm xúc');
      if (proposal.category === 'FAMILY_DIFFICULTY') initialCats.push('Gia cảnh đặc biệt / Khó khăn');
      if (initialCats.length === 0) initialCats.push('Học tập (Yếu/Cần phụ đạo)');
      setSelectedAttentionCategories(initialCats);
      setAttentionReviewNote(proposal.details || '');
      setSpecialAttentionModalProposal(proposal);
      return;
    }

    try {
      setProcessingProposalId(proposalId);
      await surveySyncService.approveProposal(proposalId, 'Đã duyệt ghi nhận vào hồ sơ', {
        addToSpecialAttention: false
      });
      showToast('success', 'Đã duyệt và đồng bộ vào hồ sơ học viên thành công!');
    } catch (e: any) {
      showToast('error', `Không thể duyệt đề xuất: ${e.message}`);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleApproveWithoutAttention = async () => {
    if (!specialAttentionModalProposal) return;
    try {
      setProcessingProposalId(specialAttentionModalProposal.id);
      await surveySyncService.approveProposal(
        specialAttentionModalProposal.id,
        attentionReviewNote || 'Đã duyệt ghi nhận phản hồi (Không đưa vào diện theo dõi đặc biệt)',
        {
          addToSpecialAttention: false
        }
      );
      setSpecialAttentionModalProposal(null);
      setAttentionReviewNote('');
      setSelectedAttentionCategories([]);
      showToast('success', 'Đã duyệt ghi nhận vào hồ sơ (Không đưa vào diện quan tâm đặc biệt)');
    } catch (e: any) {
      showToast('error', `Lỗi: ${e.message}`);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleConfirmSpecialAttention = async () => {
    if (!specialAttentionModalProposal) return;
    try {
      setProcessingProposalId(specialAttentionModalProposal.id);
      await surveySyncService.approveProposal(
        specialAttentionModalProposal.id,
        attentionReviewNote || 'Đã duyệt đưa vào diện lưu ý đặc biệt',
        {
          addToSpecialAttention: true,
          specialAttentionCategories: selectedAttentionCategories
        }
      );
      setSpecialAttentionModalProposal(null);
      setAttentionReviewNote('');
      setSelectedAttentionCategories([]);
      showToast('success', 'Đã đưa học viên vào danh sách cần lưu ý đặc biệt thành công!');
    } catch (e: any) {
      showToast('error', `Lỗi: ${e.message}`);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleOpenRejectModal = (proposalId: string) => {
    setRejectModalProposalId(proposalId);
    setRejectReasonText('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalProposalId) return;
    try {
      setProcessingProposalId(rejectModalProposalId);
      await surveySyncService.rejectProposal(rejectModalProposalId, rejectReasonText);
      setRejectModalProposalId(null);
      setRejectReasonText('');
      showToast('info', 'Đã từ chối đề xuất đồng bộ.');
    } catch (e: any) {
      showToast('error', `Lỗi từ chối: ${e.message}`);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleMarkReviewedNoAction = async (proposalId: string) => {
    try {
      setProcessingProposalId(proposalId);
      await surveySyncService.markReviewedNoAction(proposalId, 'GVCN đã xem và không cần đồng bộ vào hồ sơ');
      showToast('info', 'Đã đánh dấu: Đã xem và không cần đồng bộ (hồ sơ giữ nguyên)');
    } catch (e: any) {
      showToast('error', `Lỗi: ${e.message}`);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleOpenEditProposal = (proposal: SurveySyncProposal) => {
    setEditModalProposal(proposal);
    const formData = JSON.parse(JSON.stringify(proposal.proposedValue || {}));
    if (proposal.category === 'CONDUCT_SELF_EVALUATION') {
      formData.selfAssessment = normalizeConductGrade(formData.selfAssessment) || 'Tốt';
      if (formData.conductNote === '[object Object]' || formData.conductNote === '[object object]') {
        formData.conductNote = '';
      }
    }
    setEditProposalForm(formData);
    setEditReviewNote('');
  };

  const handleConfirmEditAndApprove = async () => {
    if (!editModalProposal) return;
    try {
      setProcessingProposalId(editModalProposal.id);
      const cleanedForm = { ...editProposalForm };
      if (editModalProposal.category === 'CONDUCT_SELF_EVALUATION') {
        cleanedForm.selfAssessment = normalizeConductGrade(cleanedForm.selfAssessment) || 'Tốt';
        if (cleanedForm.conductNote) {
          cleanedForm.conductNote = String(unwrapAnswerValue(cleanedForm.conductNote)).trim();
        }
      }
      await surveySyncService.updateAndApproveProposal(
        editModalProposal.id,
        cleanedForm,
        editReviewNote || 'GVCN đã chỉnh sửa và đồng bộ vào hồ sơ'
      );
      setEditModalProposal(null);
      setEditProposalForm({});
      setEditReviewNote('');
      showToast('success', 'Đã chỉnh sửa và đồng bộ thành công vào hồ sơ học viên!');
    } catch (e: any) {
      showToast('error', `Lỗi chỉnh sửa và đồng bộ: ${e.message}`);
    } finally {
      setProcessingProposalId(null);
    }
  };

  const handleBatchApproveAllPending = async () => {
    const pendingList = currentTemplateProposals.filter((p) => p.status === 'PENDING');
    if (pendingList.length === 0) return;

    try {
      setIsSyncingAll(true);
      let approvedCount = 0;
      for (const p of pendingList) {
        if (!isProposalNeedsConcernReview(p)) {
          await surveySyncService.approveProposal(p.id, 'Đã duyệt hàng loạt bởi GVCN');
          approvedCount++;
        }
      }
      showToast('success', `Đã duyệt thành công ${approvedCount} đề xuất của bài khảo sát này!`);
    } catch (e: any) {
      showToast('error', `Lỗi khi duyệt hàng loạt: ${e.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCreateNewSurvey = () => {
    const newDraft = surveyTemplateService.createTemplate({
      title: `Khảo sát mới - ${new Date().toLocaleDateString('vi-VN')}`,
      schoolYear: currentSchoolYear,
      surveyType: 'CUSTOM',
      sections: []
    });
    setBuilderTemplate(newDraft);
  };

  const handleOpenRenameSurvey = (t: SurveyTemplate) => {
    setRenameModalTemplate(t);
    setRenameTitleInput(t.title);
    setRenameError('');
  };

  const handleSaveRenameSurvey = () => {
    if (!renameModalTemplate) return;
    const trimmed = renameTitleInput.trim();
    if (!trimmed) {
      setRenameError('Tên bài khảo sát không được để trống.');
      return;
    }

    try {
      surveyTemplateService.renameTemplate(renameModalTemplate.id, trimmed);
      if (selectedTemplateForManage && selectedTemplateForManage.id === renameModalTemplate.id) {
        setSelectedTemplateForManage({
          ...selectedTemplateForManage,
          title: trimmed,
          updatedAt: new Date().toISOString()
        });
      }
      setRenameModalTemplate(null);
      refreshData();
      showToast('success', 'Đã đổi tên bài khảo sát thành công.');
    } catch (err: any) {
      setRenameError(err.message || 'Lỗi khi đổi tên bài khảo sát');
    }
  };

  const handleDeleteSurvey = (t: SurveyTemplate) => {
    setDeleteConfirmModalTemplate(t);
  };

  const handleConfirmDeleteOrArchive = () => {
    if (!deleteConfirmModalTemplate) return;
    const target = deleteConfirmModalTemplate;
    const responses = studentSurveyService.getResponsesByTemplate(target.id);
    const hasResponses = responses.length > 0;

    try {
      const res = surveyTemplateService.deleteOrArchiveSurvey(target.id, hasResponses);
      if (selectedTemplateForManage && selectedTemplateForManage.id === target.id) {
        setSelectedTemplateForManage(null);
      }
      setDeleteConfirmModalTemplate(null);
      refreshData();
      showToast(hasResponses ? 'info' : 'success', res.message);
    } catch (e: any) {
      showToast('error', e.message || 'Lỗi khi xóa bài khảo sát');
    }
  };

  const handleDuplicateTemplate = (t: SurveyTemplate) => {
    try {
      const cloned = surveyTemplateService.duplicateTemplate(t.id);
      showToast('success', `Đã nhân bản "${t.title}" thành bản nháp mới!`);
      setBuilderTemplate(cloned);
    } catch (e: any) {
      showToast('error', e.message || 'Lỗi nhân bản khảo sát');
    }
  };

  const handleToggleArchiveTemplate = (t: SurveyTemplate) => {
    try {
      if (t.status === 'ARCHIVED') {
        const updated = surveyTemplateService.createVersionDraft(t.id);
        showToast('success', `Đã tạo phiên bản nháp mới từ bài khảo sát đã lưu trữ.`);
        setBuilderTemplate(updated);
      } else {
        if (confirm(`Bạn có chắc chắn muốn lưu trữ/đóng bài khảo sát "${t.title}"?`)) {
          surveyTemplateService.archiveTemplate(t.id);
          showToast('info', `Đã lưu trữ bài khảo sát "${t.title}".`);
        }
      }
    } catch (e: any) {
      showToast('error', e.message || 'Lỗi thao tác');
    }
  };

  // ==========================================
  // SURVEY EXPORT & FILTERING LOGIC
  // ==========================================

  const handleOpenExportModal = (tpl?: SurveyTemplate) => {
    const target = tpl || selectedTemplateForManage || templates[0];
    if (!target) return;
    setExportTargetTemplate(target);
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeTitle = target.title.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    setExportFileName(`Ket_qua_khao_sat_${safeTitle}_${dateStr}`);
    setExportScope('ALL');
    setExportGroup('all');
    setExportSearch('');
    setExportFormat('excel');

    const initialKeys = [
      'studentCode',
      'fullName',
      'group',
      'gender',
      'phone',
      'parentName',
      'parentPhone',
      'surveyStatus',
      'submittedAt'
    ];

    if (target.sections && target.sections.length > 0) {
      target.sections.forEach(sec => {
        sec.questions.forEach(q => {
          initialKeys.push(`q_${q.key || q.id}`);
        });
      });
    } else {
      initialKeys.push(
        'livingWith',
        'learningConditions',
        'healthStatus',
        'emotionalStatus',
        'conductGrade',
        'conductNote',
        'conductCommitment',
        'examGroups',
        'targetCareer',
        'teacherMeetingRequest',
        'privateTeacherMessage'
      );
    }

    setSelectedFieldKeys(initialKeys);
    setExportModalOpen(true);
  };

  const availableExportFields = useMemo(() => {
    const target = exportTargetTemplate || selectedTemplateForManage || templates[0];
    const fields: Array<{
      category: string;
      items: Array<{ key: string; label: string; description?: string }>;
    }> = [];

    fields.push({
      category: '1. Thông tin học sinh cơ bản',
      items: [
        { key: 'studentCode', label: 'Mã học viên' },
        { key: 'fullName', label: 'Họ và tên học sinh' },
        { key: 'group', label: 'Tổ sinh hoạt' },
        { key: 'gender', label: 'Giới tính' },
        { key: 'dob', label: 'Ngày sinh' },
        { key: 'phone', label: 'Số điện thoại học sinh' },
        { key: 'parentName', label: 'Họ tên phụ huynh' },
        { key: 'parentPhone', label: 'Số điện thoại phụ huynh' },
        { key: 'surveyStatus', label: 'Trạng thái nộp bài' },
        { key: 'submittedAt', label: 'Thời gian nộp bài' },
        { key: 'reviewedAt', label: 'Thời gian GVCN duyệt' },
        { key: 'syncStatus', label: 'Trạng thái đồng bộ hệ thống' }
      ]
    });

    if (target?.sections && target.sections.length > 0) {
      target.sections.forEach((sec, idx) => {
        fields.push({
          category: `${idx + 2}. ${sec.title}`,
          items: sec.questions.map(q => ({
            key: `q_${q.key || q.id}`,
            label: q.title,
            description: q.description
          }))
        });
      });
    } else {
      fields.push({
        category: '2. Gia đình & Điều kiện học tập',
        items: [
          { key: 'livingWith', label: 'Đang sống cùng ai' },
          { key: 'learningConditions', label: 'Điều kiện góc học tập tại nhà' },
          { key: 'familyWorkSupportLevel', label: 'Mức độ hỗ trợ từ gia đình' },
          { key: 'familySituation', label: 'Hoàn cảnh gia đình' },
          { key: 'familyNote', label: 'Ghi chú thêm về gia đình' }
        ]
      });

      fields.push({
        category: '3. Sức khỏe & Tâm lý',
        items: [
          { key: 'healthStatus', label: 'Tình trạng thể chất / sức khỏe' },
          { key: 'healthSupportNote', label: 'Yêu cầu hỗ trợ sức khỏe đặc biệt' },
          { key: 'emotionalStatus', label: 'Tâm lý, cảm xúc' },
          { key: 'teacherMeetingRequest', label: 'Nguyện vọng gặp trao đổi riêng với GVCN' },
          { key: 'privateTeacherMessage', label: 'Lời nhắn gửi riêng cho GVCN' }
        ]
      });

      fields.push({
        category: '4. Tự đánh giá & Xếp loại rèn luyện',
        items: [
          { key: 'conductGrade', label: 'Tự đánh giá xếp loại rèn luyện' },
          { key: 'conductNote', label: 'Minh chứng / Ghi chú tự nhận mức xếp loại' },
          { key: 'conductCommitment', label: 'Mục tiêu / Phương hướng rèn luyện' }
        ]
      });

      fields.push({
        category: '5. Định hướng nghề nghiệp & Khối thi',
        items: [
          { key: 'examGroups', label: 'Tổ hợp môn xét tuyển dự kiến (A00, D01...)' },
          { key: 'targetCareer', label: 'Ngành nghề / Trường ĐH mong muốn' },
          { key: 'postHighSchoolPlan', label: 'Dự định sau khi tốt nghiệp THPT' },
          { key: 'careerClarity', label: 'Mức độ rõ ràng về định hướng tương lai' },
          { key: 'careerConcerns', label: 'Băn khoăn / Khó khăn về nghề nghiệp' }
        ]
      });

      fields.push({
        category: '6. Nguyện vọng & Ý kiến',
        items: [
          { key: 'seatingPreference', label: 'Nguyện vọng vị trí chỗ ngồi' },
          { key: 'leadershipDesiredPosition', label: 'Nguyện vọng ứng cử ban cán sự' },
          { key: 'classExpectations', label: 'Kỳ vọng đối với tập thể lớp' },
          { key: 'teacherExpectations', label: 'Kỳ vọng đối với GVCN' }
        ]
      });
    }

    return fields;
  }, [exportTargetTemplate, selectedTemplateForManage, templates]);

  const handleToggleField = (key: string) => {
    setSelectedFieldKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllFields = () => {
    const allKeys: string[] = [];
    availableExportFields.forEach(cat => {
      cat.items.forEach(item => allKeys.push(item.key));
    });
    setSelectedFieldKeys(allKeys);
  };

  const handleDeselectAllFields = () => {
    setSelectedFieldKeys(['studentCode', 'fullName']);
  };

  const handleApplyExportPreset = (preset: 'all' | 'conduct' | 'contact' | 'career' | 'health') => {
    if (preset === 'all') {
      handleSelectAllFields();
      return;
    }
    const baseKeys = ['studentCode', 'fullName', 'group', 'surveyStatus', 'submittedAt'];
    if (preset === 'conduct') {
      const conductKeys = [
        ...baseKeys,
        'conductGrade',
        'conductNote',
        'conductCommitment',
        'q_conductSelfEvaluation.grade',
        'q_conductSelfEvaluation.note',
        'q_conductSelfEvaluation.commitment',
        'q_q-conduct-self-grade',
        'q_q-conduct-note',
        'q_q-conduct-commitment'
      ];
      setSelectedFieldKeys(conductKeys);
    } else if (preset === 'contact') {
      const contactKeys = [
        ...baseKeys,
        'gender',
        'dob',
        'phone',
        'parentName',
        'parentPhone',
        'livingWith',
        'familySituation',
        'familyNote',
        'q_contact.phone',
        'q_contact.emergencyContactName',
        'q_contact.emergencyContactPhone',
        'q_contact.livingWith'
      ];
      setSelectedFieldKeys(contactKeys);
    } else if (preset === 'career') {
      const careerKeys = [
        ...baseKeys,
        'examGroups',
        'targetCareer',
        'postHighSchoolPlan',
        'careerClarity',
        'careerConcerns',
        'q_careerOrientation.examGroups',
        'q_careerOrientation.targetCareerAndSchool',
        'q_careerOrientation.postHighSchoolPlan'
      ];
      setSelectedFieldKeys(careerKeys);
    } else if (preset === 'health') {
      const healthKeys = [
        ...baseKeys,
        'healthStatus',
        'healthSupportNote',
        'emotionalStatus',
        'teacherMeetingRequest',
        'privateTeacherMessage',
        'q_healthAndWellbeing.healthStatus',
        'q_healthAndWellbeing.emotionalStatus',
        'q_privateTeacherMessage.content'
      ];
      setSelectedFieldKeys(healthKeys);
    }
  };

  const handleExecuteExport = () => {
    const target = exportTargetTemplate || selectedTemplateForManage || templates[0];
    if (!target) return;

    let targetStudents = students;
    if (exportGroup !== 'all') {
      targetStudents = targetStudents.filter(s => String(s.group || 1) === exportGroup);
    }
    if (exportSearch.trim()) {
      const q = exportSearch.toLowerCase();
      targetStudents = targetStudents.filter(s =>
        (s?.fullName || '').toLowerCase().includes(q) || (s?.code || '').toLowerCase().includes(q)
      );
    }

    const selectedFieldDefs: Array<{ key: string; label: string }> = [];
    availableExportFields.forEach(cat => {
      cat.items.forEach(item => {
        if (selectedFieldKeys.includes(item.key)) {
          selectedFieldDefs.push(item);
        }
      });
    });

    if (selectedFieldDefs.length === 0) {
      alert('Vui lòng chọn ít nhất 1 cột thông tin để xuất file.');
      return;
    }

    const rows: Array<Record<string, any>> = [];

    targetStudents.forEach(student => {
      const survey = surveys.find(
        s => s.studentId === student.id && (s.surveyTemplateId === target.id || (!s.surveyTemplateId && target.id === 'grade12_start_year'))
      );

      const status = survey?.status || 'NOT_STARTED';

      if (exportScope === 'SUBMITTED' && status !== 'SUBMITTED' && status !== 'REVIEWED') return;
      if (exportScope === 'REVIEWED' && status !== 'REVIEWED') return;

      const answers = survey?.answers || ({} as any);
      const row: Record<string, any> = {};

      selectedFieldDefs.forEach(f => {
        const k = f.key;
        if (k === 'studentCode') row[f.label] = student.code;
        else if (k === 'fullName') row[f.label] = student.fullName;
        else if (k === 'group') row[f.label] = `Tổ ${student.group || 1}`;
        else if (k === 'gender') row[f.label] = student.gender || 'Chưa rõ';
        else if (k === 'dob') row[f.label] = student.dob || '';
        else if (k === 'phone') row[f.label] = answers.contact?.phone || student.phone || '';
        else if (k === 'parentName') row[f.label] = answers.contact?.emergencyContactName || student.parentName || '';
        else if (k === 'parentPhone') row[f.label] = answers.contact?.emergencyContactPhone || student.parentPhone || '';
        else if (k === 'surveyStatus') {
          row[f.label] = status === 'REVIEWED' ? 'GVCN đã xem' : status === 'SUBMITTED' ? 'Đã hoàn thành' : status === 'DRAFT' ? 'Đang làm' : 'Chưa làm';
        }
        else if (k === 'submittedAt') row[f.label] = survey?.submittedAt ? formatDateTime(survey.submittedAt) : '';
        else if (k === 'reviewedAt') row[f.label] = survey?.reviewedAt ? formatDateTime(survey.reviewedAt) : '';
        else if (k === 'syncStatus') {
          const syncState = survey?.id ? syncStates.find(st => st.surveyId === survey.id) : undefined;
          row[f.label] = syncState?.status === 'SYNCED' ? 'Đã đồng bộ' : syncState?.status === 'PARTIAL' ? 'Đồng bộ một phần' : syncState?.status === 'FAILED' ? 'Lỗi đồng bộ' : 'Chưa đồng bộ';
        }
        else if (k === 'livingWith') row[f.label] = Array.isArray(answers.contact?.livingWith) ? answers.contact.livingWith.join(', ') : (answers.contact?.livingWith || '');
        else if (k === 'learningConditions') row[f.label] = Array.isArray(answers.familyAndLearningConditions?.learningConditions) ? answers.familyAndLearningConditions.learningConditions.join(', ') : '';
        else if (k === 'familyWorkSupportLevel') row[f.label] = answers.familyAndLearningConditions?.familyWorkSupportLevel || '';
        else if (k === 'familySituation') row[f.label] = answers.familyAndLearningConditions?.familySituation || '';
        else if (k === 'familyNote') row[f.label] = answers.familyAndLearningConditions?.familyNote || '';
        else if (k === 'healthStatus') row[f.label] = Array.isArray(answers.healthAndWellbeing?.healthStatus) ? answers.healthAndWellbeing.healthStatus.join(', ') : '';
        else if (k === 'healthSupportNote') row[f.label] = answers.healthAndWellbeing?.healthSupportNote || '';
        else if (k === 'emotionalStatus') row[f.label] = answers.healthAndWellbeing?.emotionalStatus || '';
        else if (k === 'teacherMeetingRequest') row[f.label] = answers.healthAndWellbeing?.teacherMeetingRequest || '';
        else if (k === 'privateTeacherMessage') row[f.label] = answers.privateTeacherMessage?.content || '';
        else if (k === 'conductGrade') {
          const c = answers.conductSelfEvaluation || answers.conductEvaluation || answers.selfEvaluation;
          const raw = c?.grade || c?.selfAssessment || (typeof c === 'string' ? c : undefined) || answers['q-conduct-self-grade'] || answers['conductSelfEvaluation.grade'] || answers.otherText?.['q-conduct-self-grade'] || c;
          row[f.label] = normalizeConductGrade(raw) || unwrapAnswerValue(raw) || '';
        }
        else if (k === 'conductNote') {
          const c = answers.conductSelfEvaluation || answers.conductEvaluation || answers.selfEvaluation;
          const raw = c?.note || c?.conductNote || answers['q-conduct-note'] || answers['conductSelfEvaluation.note'] || answers.otherText?.['q-conduct-note'] || '';
          row[f.label] = String(unwrapAnswerValue(raw)).trim();
        }
        else if (k === 'conductCommitment') {
          const c = answers.conductSelfEvaluation || answers.conductEvaluation || answers.selfEvaluation;
          const raw = c?.commitment || answers['q-conduct-commitment'] || answers['conductSelfEvaluation.commitment'] || '';
          row[f.label] = String(unwrapAnswerValue(raw)).trim();
        }
        else if (k === 'examGroups') row[f.label] = Array.isArray(answers.careerOrientation?.examGroups) ? answers.careerOrientation.examGroups.join(', ') : '';
        else if (k === 'targetCareer') row[f.label] = answers.careerOrientation?.targetCareerAndSchool || '';
        else if (k === 'postHighSchoolPlan') row[f.label] = answers.careerOrientation?.postHighSchoolPlan || '';
        else if (k === 'careerClarity') row[f.label] = answers.careerOrientation?.careerClarity || '';
        else if (k === 'careerConcerns') row[f.label] = Array.isArray(answers.careerOrientation?.careerConcerns) ? answers.careerOrientation.careerConcerns.join(', ') : '';
        else if (k === 'seatingPreference') row[f.label] = answers.seatingPreference?.preference || '';
        else if (k === 'leadershipDesiredPosition') row[f.label] = answers.leadershipProposal?.desiredPosition || '';
        else if (k === 'classExpectations') row[f.label] = Array.isArray(answers.classAndTeacherExpectations?.classExpectations) ? answers.classAndTeacherExpectations.classExpectations.join('; ') : '';
        else if (k === 'teacherExpectations') row[f.label] = Array.isArray(answers.classAndTeacherExpectations?.teacherExpectations) ? answers.classAndTeacherExpectations.teacherExpectations.join('; ') : '';
        else if (k.startsWith('q_')) {
          const rawKey = k.replace(/^q_/, '');
          let val = getAnswerValue(answers, rawKey) ?? answers[rawKey] ?? answers.otherText?.[rawKey];
          if (val === undefined && Array.isArray((survey as any)?.responses)) {
            const resp = (survey as any).responses.find((r: any) => r.questionId === rawKey || r.questionKey === rawKey);
            if (resp) val = resp.answer;
          }
          const unwrapped = unwrapAnswerValue(val);
          if (Array.isArray(unwrapped)) row[f.label] = unwrapped.join(', ');
          else if (typeof unwrapped === 'object' && unwrapped !== null) row[f.label] = JSON.stringify(unwrapped);
          else row[f.label] = unwrapped !== undefined && unwrapped !== null ? String(unwrapped) : '';
        } else {
          row[f.label] = '';
        }
      });

      rows.push(row);
    });

    if (rows.length === 0) {
      alert('Không có học sinh nào phù hợp với bộ lọc hiện tại để xuất file.');
      return;
    }

    const finalFileName = exportFileName.trim() || `Ket_qua_khao_sat_${Date.now()}`;

    if (exportFormat === 'csv') {
      exportService.exportToCSV(rows, finalFileName);
    } else {
      exportService.exportToExcel(rows, finalFileName, 'Kết quả khảo sát');
    }

    setExportModalOpen(false);
    showToast('success', `Đã xuất thành công ${rows.length} dòng dữ liệu (${selectedFieldDefs.length} cột thông tin) ra file ${exportFormat.toUpperCase()}!`);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {notificationMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-bold text-white shadow-xl transition-all animate-fade-in ${
            notificationMessage.type === 'success'
              ? 'bg-emerald-600'
              : notificationMessage.type === 'error'
              ? 'bg-rose-600'
              : 'bg-blue-600'
          }`}
        >
          {notificationMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : notificationMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <span>{notificationMessage.text}</span>
        </div>
      )}

      {/* Top Level Nav Strip: Mode A (Danh sách bài khảo sát) vs Mode B (Soạn khảo sát) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveMainSection('surveys');
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
              activeMainSection === 'surveys'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>A. Danh sách bài khảo sát</span>
          </button>

          <button
            onClick={() => {
              setActiveMainSection('builder');
              setSelectedTemplateForManage(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
              activeMainSection === 'builder'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>B. Biểu mẫu & Soạn khảo sát (Survey Builder)</span>
          </button>
        </div>

        {activeMainSection === 'surveys' && !selectedTemplateForManage && (
          <button
            onClick={handleCreateNewSurvey}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo bài khảo sát mới</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: SURVEY BUILDER & TEMPLATE MANAGER */}
      {/* ========================================================================= */}
      {activeMainSection === 'builder' && (
        <div className="animate-fade-in">
          <SurveyTemplateManagerView />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: SURVEYS MANAGEMENT CENTER */}
      {/* ========================================================================= */}
      {activeMainSection === 'surveys' && (
        <>
          {/* ===================================================================== */}
          {/* SUBMODE A1: ALL SURVEYS LIST VIEW */}
          {/* ===================================================================== */}
          {!selectedTemplateForManage ? (
            <div className="space-y-4 animate-fade-in">
              {/* Header Filter & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700">Trạng thái:</span>
                  {(['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setTemplateStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        templateStatusFilter === st
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'ALL'
                        ? 'Tất cả'
                        : st === 'PUBLISHED'
                        ? 'Đang phát hành'
                        : st === 'DRAFT'
                        ? 'Bản nháp'
                        : 'Đã lưu trữ'}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Tìm kiếm bài khảo sát..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Grid of Survey Templates */}
              {filteredTemplates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Không tìm thấy bài khảo sát nào phù hợp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bạn có thể tạo bài khảo sát mới hoặc chuyển sang tab Biểu mẫu để thiết kế.
                  </p>
                  <button
                    onClick={handleCreateNewSurvey}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tạo bài khảo sát ngay</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => {
                    const stats = studentSurveyService.getSurveySummaryForTemplate(template.id, currentSchoolYear);
                    const templateSurveys = studentSurveyService.getResponsesByTemplate(template.id);
                    const pendingProps = proposals.filter(
                      (p) => p.status === 'PENDING' && templateSurveys.some((s) => s.id === p.surveyId)
                    ).length;

                    const isPublished = template.status === 'PUBLISHED';
                    const isDraft = template.status === 'DRAFT';
                    const isArchived = template.status === 'ARCHIVED';
                    const isAdminSurvey = isTemplateFromAdmin(template);
                    const canManageSurvey = isSuperAdmin || !isAdminSurvey;

                    return (
                      <div
                        key={template.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 transition-all hover:border-blue-200 hover:shadow-sm"
                      >
                        {/* Top Badge & Version */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isAdminSurvey && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 border border-indigo-300">
                                  <ShieldCheck className="h-3 w-3 text-indigo-700" /> Biểu mẫu từ Admin
                                </span>
                              )}

                              {isPublished ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> Đang phát hành
                                </span>
                              ) : isDraft ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                                  <Clock className="h-3 w-3" /> Bản nháp
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-300">
                                  <Archive className="h-3 w-3" /> Đã lưu trữ
                                </span>
                              )}

                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                                v{template.version || 1}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {template.sections?.length || 0} phần • {template.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0)} câu hỏi
                              </span>
                            </div>

                            <h3 className="text-base font-extrabold text-slate-900 leading-snug pt-1">
                              {template.title}
                            </h3>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {template.description || 'Chưa có mô tả cho bài khảo sát này.'}
                        </p>

                        {/* Progress and Stats Bar */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">Tiến độ nộp phiếu:</span>
                            <span className="font-mono font-extrabold text-blue-600">
                              {stats.submitted}/{stats.total} học viên ({stats.completionRate}%)
                            </span>
                          </div>

                          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{ width: `${Math.min(100, stats.completionRate)}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
                            <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                              <span className="text-slate-400 block">Đã xem</span>
                              <strong className="text-emerald-700">{stats.reviewed}</strong>
                            </div>
                            <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                              <span className="text-slate-400 block">Đang làm</span>
                              <strong className="text-amber-700">{stats.draft}</strong>
                            </div>
                            <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                              <span className="text-slate-400 block">Cần xử lý</span>
                              <strong className="text-rose-700">{pendingProps}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Toolbar */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setPreviewTemplate(template)}
                              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                              title="Xem trước biểu mẫu"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleOpenExportModal(template)}
                              className="rounded-xl border border-blue-200 bg-blue-50/50 p-2 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
                              title="Trích lọc và tải kết quả khảo sát ra Excel/CSV"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            {canManageSurvey ? (
                              <>
                                <button
                                  onClick={() => handleOpenRenameSurvey(template)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer"
                                  title="Đổi tên bài khảo sát"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => setBuilderTemplate(template)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                                  title="Chỉnh sửa cấu trúc câu hỏi"
                                >
                                  <FileEdit className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => handleDuplicateTemplate(template)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                                  title="Nhân bản khảo sát"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteSurvey(template)}
                                  className="rounded-xl border border-slate-200 bg-white p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all cursor-pointer"
                                  title={template.status === 'DRAFT' ? 'Xóa bản nháp' : 'Lưu trữ / Đóng khảo sát'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400 italic px-1">
                                Biểu mẫu hệ thống (Chỉ thực hiện & quản lý phản hồi)
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setSelectedTemplateForManage(template);
                              setActiveSurveyTab('overview');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                          >
                            <span>Quản lý & Phản hồi</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =================================================================== */
            /* SUBMODE A2: DEDICATED WORKSPACE FOR A SPECIFIC SURVEY */
            /* =================================================================== */
            <div className="space-y-4 animate-fade-in">
              {/* Breadcrumb Header Bar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedTemplateForManage(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Quay lại danh sách</span>
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-extrabold text-slate-900">
                          {selectedTemplateForManage.title}
                        </h2>
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-700 border border-blue-200">
                          Phiên bản v{selectedTemplateForManage.version || 1}
                        </span>
                        {selectedTemplateForManage.status === 'PUBLISHED' ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            Đang phát hành
                          </span>
                        ) : selectedTemplateForManage.status === 'DRAFT' ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                            Bản nháp
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-300">
                            Đã lưu trữ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Năm học {currentSchoolYear} • {classSettings.className} • Phát hành lúc: {formatDateTime(selectedTemplateForManage.publishedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenExportModal(selectedTemplateForManage)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer shadow-xs"
                      title="Trích lọc và tải kết quả khảo sát ra Excel/CSV"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" />
                      <span>Tải kết quả</span>
                    </button>

                    <button
                      onClick={() => setPreviewTemplate(selectedTemplateForManage)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Xem trước</span>
                    </button>

                    {(isSuperAdmin || !isTemplateFromAdmin(selectedTemplateForManage)) ? (
                      <>
                        <button
                          onClick={() => handleOpenRenameSurvey(selectedTemplateForManage)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-all cursor-pointer shadow-xs"
                          title="Chỉnh sửa tên bài khảo sát"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                          <span>Đổi tên</span>
                        </button>

                        <button
                          onClick={() => setBuilderTemplate(selectedTemplateForManage)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                          <span>Sửa cấu trúc</span>
                        </button>

                        <button
                          onClick={() => handleDeleteSurvey(selectedTemplateForManage)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer shadow-xs"
                          title={selectedTemplateForManage.status === 'DRAFT' ? 'Xóa bản nháp' : 'Lưu trữ bài khảo sát'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa / Lưu trữ</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* 5 Sub-Tabs for this Specific Survey */}
                <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold border-b border-slate-100 pb-1">
                  <button
                    onClick={() => setActiveSurveyTab('overview')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeSurveyTab === 'overview'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>1. Tổng quan & Thống kê</span>
                  </button>

                  <button
                    onClick={() => setActiveSurveyTab('responses')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeSurveyTab === 'responses'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>2. Danh sách phản hồi ({currentTemplateSurveys.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveSurveyTab('proposals')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeSurveyTab === 'proposals'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <HeartHandshake className="h-4 w-4" />
                    <span>3. Cần xem xét & Đề xuất</span>
                    {currentPendingProposalsCount > 0 && (
                      <span className="rounded-full bg-rose-500 text-white px-2 py-0.2 text-[10px] font-extrabold">
                        {currentPendingProposalsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveSurveyTab('sync')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeSurveyTab === 'sync'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>4. Đồng bộ dữ liệu</span>
                  </button>

                  <button
                    onClick={() => setActiveSurveyTab('structure')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeSurveyTab === 'structure'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span>5. Cấu trúc câu hỏi</span>
                  </button>
                </div>

                {/* 4 Summary Stat Cards for this specific survey */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-500">Tổng học viên</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">{currentTemplateSummary.total}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                    <p className="text-[11px] font-semibold text-emerald-700">Đã hoàn thành</p>
                    <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{currentTemplateSummary.submitted}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-center">
                    <p className="text-[11px] font-semibold text-amber-700">Đang làm (Nháp)</p>
                    <p className="text-xl font-extrabold text-amber-800 mt-0.5">{currentTemplateSummary.draft}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center">
                    <p className="text-[11px] font-semibold text-rose-700">Chờ GVCN xử lý</p>
                    <p className="text-xl font-extrabold text-rose-800 mt-0.5">{currentPendingProposalsCount}</p>
                  </div>
                </div>
              </div>

              {/* =============================================================== */}
              {/* TAB 1: OVERVIEW & STATS (DYNAMIC PER SURVEY TEMPLATE) */}
              {/* =============================================================== */}
              {activeSurveyTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  {aggMetrics.urgentRequestsCount > 0 && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shrink-0">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-rose-900">
                            Có {aggMetrics.urgentRequestsCount} nội dung bảo mật / yêu cầu trao đổi riêng trong bài khảo sát này
                          </h3>
                          <p className="text-[11px] text-rose-700">
                            Bao gồm các vấn đề sức khỏe cần hỗ trợ, trạng thái tâm lý hoặc lời nhắn gửi GVCN.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveSurveyTab('proposals');
                          setProposalCategoryFilter('ALL');
                        }}
                        className="shrink-0 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
                      >
                        Xem & Xử lý đề xuất
                      </button>
                    </div>
                  )}

                  {/* Empty state when no submissions yet */}
                  {currentTemplateSummary.submitted === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <BarChart3 className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-slate-800">
                        Chưa có học sinh nộp phiếu trả lời
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                        Bài khảo sát <span className="font-semibold text-slate-700">"{selectedTemplateForManage.title}"</span> hiện có {currentTemplateSummary.draft} bản nháp và {currentTemplateSummary.notStarted} học sinh chưa làm. Thống kê câu hỏi sẽ tự động xuất hiện ngay khi có phản hồi nộp về.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Dynamic Question-by-Question Visualizer */}
                      {selectedTemplateForManage.sections.map((section, secIdx) => (
                        <div key={section.id} className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">
                              {secIdx + 1}
                            </span>
                            <div>
                              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                {section.title}
                              </h3>
                              {section.description && (
                                <p className="text-[11px] text-slate-500">{section.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.questions.map((q, qIdx) => {
                              const qStat = dynamicTemplateStats?.questionStats[q.id];
                              const answeredCount = qStat?.answeredCount || 0;
                              const totalSubmitted = currentTemplateSummary.submitted || 1;
                              const responseRate = Math.round((answeredCount / totalSubmitted) * 100);

                              return (
                                <div
                                  key={q.id}
                                  className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between ${
                                    q.type === 'GRID' || (q.type === 'SHORT_TEXT' && answeredCount > 3)
                                      ? 'md:col-span-2'
                                      : ''
                                  }`}
                                >
                                  <div>
                                    {/* Question Header */}
                                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[11px] font-bold text-indigo-600">
                                            Câu {secIdx + 1}.{qIdx + 1}
                                          </span>
                                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                            {q.type === 'SINGLE_CHOICE' && 'Trắc nghiệm đơn'}
                                            {q.type === 'MULTI_CHOICE' && 'Nhiều lựa chọn'}
                                            {q.type === 'DROPDOWN' && 'Menu chọn'}
                                            {q.type === 'SCALE' && 'Thang điểm đánh giá'}
                                            {q.type === 'GRID' && 'Lưới ma trận'}
                                            {q.type === 'SHORT_TEXT' && 'Trả lời ngắn'}
                                            {q.type === 'LONG_TEXT' && 'Đoạn văn tự luận'}
                                          </span>
                                          {q.required && (
                                            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
                                              Bắt buộc
                                            </span>
                                          )}
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                          {q.title}
                                        </h4>
                                      </div>
                                      <span className="shrink-0 font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                        {answeredCount}/{totalSubmitted} ({responseRate}%)
                                      </span>
                                    </div>

                                    {/* Content based on question type */}
                                    <div className="pt-3">
                                      {/* SINGLE_CHOICE / DROPDOWN / MULTI_CHOICE */}
                                      {(q.type === 'SINGLE_CHOICE' || q.type === 'DROPDOWN' || q.type === 'MULTI_CHOICE') && (
                                        <div className="space-y-2">
                                          {q.options && q.options.length > 0 ? (
                                            q.options.map((opt) => {
                                              const count = qStat?.optionCounts?.[opt] || 0;
                                              const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                                              return (
                                                <div key={opt} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 space-y-1.5">
                                                  <div className="flex items-center justify-between text-xs">
                                                    <span className="font-medium text-slate-800 pr-2 truncate">
                                                      {opt}
                                                    </span>
                                                    <span className="font-mono font-bold text-indigo-600 shrink-0">
                                                      {count} ({pct}%)
                                                    </span>
                                                  </div>
                                                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                      className="h-full rounded-full bg-indigo-600 transition-all"
                                                      style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <p className="text-xs text-slate-400 italic py-2">Không có tùy chọn được định nghĩa.</p>
                                          )}

                                          {/* Other option responses */}
                                          {qStat?.otherTexts && qStat.otherTexts.length > 0 && (
                                            <div className="mt-2 rounded-xl bg-amber-50/70 border border-amber-200 p-2.5">
                                              <p className="text-[11px] font-bold text-amber-900 mb-1">
                                                Ý kiến khác ({qStat.otherTexts.length}):
                                              </p>
                                              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                                {qStat.otherTexts.map((txt, i) => (
                                                  <p key={i} className="text-[11px] text-amber-800 bg-white/80 rounded px-2 py-0.5 border border-amber-100">
                                                    {txt}
                                                  </p>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* SCALE */}
                                      {q.type === 'SCALE' && (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 border border-indigo-200 p-3">
                                            <span className="text-xs font-semibold text-indigo-900">
                                              Điểm đánh giá trung bình
                                            </span>
                                            <span className="font-mono text-base font-extrabold text-indigo-700">
                                              {qStat?.scaleAvg !== undefined ? `${qStat.scaleAvg} / ${q.scaleMax || 5}` : '—'} ⭐
                                            </span>
                                          </div>

                                          <div className="space-y-1.5">
                                            {Array.from(
                                              { length: (q.scaleMax || 5) - (q.scaleMin || 1) + 1 },
                                              (_, i) => (q.scaleMin || 1) + i
                                            ).map((num) => {
                                              const count = qStat?.scaleDist?.[num] || 0;
                                              const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                                              return (
                                                <div key={num} className="flex items-center gap-2 text-xs">
                                                  <span className="w-8 font-mono font-bold text-slate-700 shrink-0">
                                                    {num} đ
                                                  </span>
                                                  <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                      className="h-full rounded-full bg-amber-500 transition-all"
                                                      style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                  </div>
                                                  <span className="w-16 text-right font-mono text-[11px] font-semibold text-slate-600 shrink-0">
                                                    {count} ({pct}%)
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* GRID */}
                                      {q.type === 'GRID' && q.gridRows && q.gridColumns && (
                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                          <table className="min-w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                                              <tr>
                                                <th className="p-2.5">Tiêu chí</th>
                                                {q.gridColumns.map((col) => (
                                                  <th key={col} className="p-2.5 text-center">{col}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {q.gridRows.map((row) => (
                                                <tr key={row} className="hover:bg-slate-50/50">
                                                  <td className="p-2.5 font-medium text-slate-800">{row}</td>
                                                  {q.gridColumns!.map((col) => {
                                                    const count = qStat?.gridMatrix?.[row]?.[col] || 0;
                                                    const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                                                    return (
                                                      <td key={col} className="p-2.5 text-center">
                                                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-700 border border-slate-200">
                                                          {count} ({pct}%)
                                                        </span>
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {/* TEXT RESPONSES */}
                                      {(q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT') && (
                                        <div className="space-y-2">
                                          {!qStat?.textResponses || qStat.textResponses.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2">Chưa có câu trả lời tự luận.</p>
                                          ) : (
                                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                              {qStat.textResponses.map((item, idx) => (
                                                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs space-y-1">
                                                  <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-bold text-slate-800">{item.studentName}</span>
                                                    {item.date && (
                                                      <span className="text-slate-400 font-mono">
                                                        {new Date(item.date).toLocaleDateString('vi-VN')}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <p className="text-slate-700 whitespace-pre-wrap">{item.text}</p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Specialized summary cards if start-of-year survey electives or expectations exist */}
                      {(Object.keys(aggMetrics.electivePairs).length > 0 ||
                        Object.keys(aggMetrics.classExpectations).length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                          {Object.keys(aggMetrics.electivePairs).length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="h-5 w-5 text-blue-600" />
                                  <h3 className="text-xs font-bold text-slate-900">
                                    Tổ hợp môn tự chọn tốt nghiệp THPT
                                  </h3>
                                </div>
                                <span className="text-[11px] text-slate-500 font-semibold">Tự động đồng bộ</span>
                              </div>
                              <div className="space-y-2">
                                {Object.entries(aggMetrics.electivePairs)
                                  .sort(([, a], [, b]) => b - a)
                                  .slice(0, 5)
                                  .map(([pair, count], idx) => {
                                    const pct = Math.round((count / (currentTemplateSummary.submitted || 1)) * 100);
                                    return (
                                      <div key={pair} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="font-bold text-slate-800">
                                            {idx + 1}. {pair}
                                          </span>
                                          <span className="font-mono font-bold text-blue-600">
                                            {count} HV ({pct}%)
                                          </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-blue-600 transition-all"
                                            style={{ width: `${Math.min(100, pct)}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {Object.keys(aggMetrics.classExpectations).length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Users className="h-5 w-5 text-emerald-600" />
                                <h3 className="text-xs font-bold text-slate-900">
                                  Kỳ vọng đối với tập thể lớp
                                </h3>
                              </div>
                              <div className="space-y-2">
                                {Object.entries(aggMetrics.classExpectations)
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([item, count]) => (
                                    <div
                                      key={item}
                                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex items-center justify-between text-xs"
                                    >
                                      <span className="text-slate-700">{item}</span>
                                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                                        {count} lượt
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* =============================================================== */}
              {/* TAB 2: RESPONSES LIST TABLE */}
              {/* =============================================================== */}
              {activeSurveyTab === 'responses' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Filters Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative w-48 sm:w-60">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Tìm học sinh theo tên, mã..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </div>

                      {/* Status Filter */}
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="SUBMITTED">Đã hoàn thành</option>
                        <option value="REVIEWED">GVCN đã xem</option>
                        <option value="DRAFT">Đang làm bài (Nháp)</option>
                        <option value="NOT_STARTED">Chưa làm</option>
                      </select>

                      {/* Group Filter */}
                      <select
                        value={groupFilter}
                        onChange={(e) => {
                          setGroupFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Tất cả tổ</option>
                        <option value="1">Tổ 1</option>
                        <option value="2">Tổ 2</option>
                        <option value="3">Tổ 3</option>
                        <option value="4">Tổ 4</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenExportModal()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-blue-600 transition-all cursor-pointer"
                        title="Trích lọc và tải kết quả ra file Excel/CSV theo nhu cầu"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-600" />
                        <span>Trích lọc & Tải kết quả</span>
                      </button>

                      <button
                        onClick={handleSyncAllThisSurvey}
                        disabled={isSyncingAll}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                        <span>{isSyncingAll ? 'Đang đồng bộ...' : 'Đồng bộ tất cả bài đã nộp'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Responses Table */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3.5">Học viên</th>
                            <th className="p-3.5">Tổ</th>
                            <th className="p-3.5">Trạng thái</th>
                            <th className="p-3.5">Thời gian gửi</th>
                            <th className="p-3.5">GVCN duyệt</th>
                            <th className="p-3.5">Trạng thái đồng bộ</th>
                            <th className="p-3.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedResponses.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                Không tìm thấy kết quả phản hồi phù hợp.
                              </td>
                            </tr>
                          ) : (
                            paginatedResponses.map(({ student, survey, status, syncState }) => {
                              const isSubmitted = status === 'SUBMITTED' || status === 'REVIEWED';
                              const isReviewed = status === 'REVIEWED';

                              return (
                                <tr key={student.id} className="hover:bg-slate-50/70 transition-all">
                                  <td className="p-3.5">
                                    <div>
                                      <span className="font-extrabold text-slate-900 block">
                                        {student.fullName}
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        {student.code}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3.5 font-semibold text-slate-700">
                                    Tổ {student.group || 1}
                                  </td>
                                  <td className="p-3.5">
                                    {isReviewed ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                        <ShieldCheck className="h-3 w-3" /> Đã xem
                                      </span>
                                    ) : isSubmitted ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                        <CheckCircle2 className="h-3 w-3" /> Đã nộp
                                      </span>
                                    ) : status === 'DRAFT' ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        <Clock className="h-3 w-3" /> Đang làm
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                        Chưa làm
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-slate-600">
                                    {survey?.submittedAt ? formatDateTime(survey.submittedAt) : '—'}
                                  </td>
                                  <td className="p-3.5 text-slate-600">
                                    {isReviewed ? (
                                      <span className="text-emerald-700 font-medium">
                                        {formatDateTime(survey?.reviewedAt)}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="p-3.5">
                                    {syncState ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-700">
                                        <span
                                          className={`h-2 w-2 rounded-full ${
                                            syncState.status === 'SYNCED'
                                              ? 'bg-emerald-500'
                                              : syncState.status === 'PARTIAL'
                                              ? 'bg-amber-500'
                                              : syncState.status === 'FAILED'
                                              ? 'bg-rose-500'
                                              : 'bg-slate-300'
                                          }`}
                                        />
                                        <span>
                                          {syncState.status === 'SYNCED'
                                            ? 'Đã đồng bộ'
                                            : syncState.status === 'PARTIAL'
                                            ? 'Đồng bộ một phần'
                                            : syncState.status === 'FAILED'
                                            ? 'Lỗi đồng bộ'
                                            : syncState.status === 'REVIEW_REQUIRED'
                                            ? 'Cần duyệt đề xuất'
                                            : 'Chưa đồng bộ'}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400">Chưa có</span>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-right space-x-1.5">
                                    {survey ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenDetailModal(survey)}
                                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                                          title="Xem chi tiết phiếu khảo sát của học viên"
                                        >
                                          <Eye className="h-3 w-3 text-blue-600" />
                                          <span>Xem</span>
                                        </button>
                                        {isSubmitted && (
                                          <button
                                            onClick={() => handleSyncSingle(survey.id)}
                                            disabled={syncingId === survey.id}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs disabled:opacity-50"
                                            title="Đồng bộ lại"
                                          >
                                            <RefreshCw className={`h-3 w-3 ${syncingId === survey.id ? 'animate-spin' : ''}`} />
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">Chưa nộp</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                        <span>
                          Trang {currentPage} / {totalPages} (Tổng {filteredResponses.length} học viên)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg border border-slate-200 bg-white p-1 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-lg border border-slate-200 bg-white p-1 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* TAB 3: PROPOSALS & NEED REVIEW */}
              {/* =============================================================== */}
              {activeSurveyTab === 'proposals' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Strict Scope Banner for GVCN */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-blue-600 p-2 text-white shadow-xs shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-blue-950">
                          Phạm vi kiểm duyệt: {selectedTemplateForManage.title}
                        </h4>
                        <p className="text-[11px] text-blue-700 mt-0.5">
                          Tất cả đề xuất hiển thị ở đây được giới hạn nghiêm ngặt theo bài khảo sát này ({currentTemplateProposals.length} mục, {currentPendingProposalsCount} chờ duyệt).
                        </p>
                      </div>
                    </div>

                    {currentPendingProposalsCount > 0 && (
                      <button
                        onClick={handleBatchApproveAllPending}
                        disabled={isSyncingAll}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <CheckCheck className="h-4 w-4" />
                        <span>{isSyncingAll ? 'Đang duyệt...' : `Duyệt nhanh tất cả (${currentPendingProposalsCount})`}</span>
                      </button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">Loại đề xuất:</span>
                      {(['ALL', 'CONDUCT_SELF_EVALUATION', 'GRADUATION_ELECTIVES', 'CONTACT_UPDATE', 'HEALTH_SENSITIVE', 'FAMILY_DIFFICULTY', 'PRIVATE_SUPPORT_REQUEST'] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setProposalCategoryFilter(cat);
                              setProposalPage(1);
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                              proposalCategoryFilter === cat
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {cat === 'ALL'
                              ? 'Tất cả'
                              : cat === 'CONDUCT_SELF_EVALUATION'
                              ? 'Tự đánh giá rèn luyện'
                              : cat === 'GRADUATION_ELECTIVES'
                              ? 'Môn thi tốt nghiệp'
                              : cat === 'CONTACT_UPDATE'
                              ? 'Thông tin liên hệ'
                              : cat === 'HEALTH_SENSITIVE'
                              ? 'Sức khỏe'
                              : cat === 'FAMILY_DIFFICULTY'
                              ? 'Hoàn cảnh'
                              : 'Lời nhắn gửi GVCN'}
                          </button>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={proposalStatusFilter}
                        onChange={(e) => {
                          setProposalStatusFilter(e.target.value);
                          setProposalPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="APPROVED">Đã duyệt</option>
                        <option value="REJECTED">Đã từ chối</option>
                        <option value="ALL">Tất cả trạng thái</option>
                      </select>
                    </div>
                  </div>

                  {/* Proposals Cards */}
                  {filteredProposals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-400 italic">
                      Không có đề xuất nào phù hợp với bộ lọc hiện tại.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedProposals.map((p) => {
                        // Strict Safety Guard: Never render an item that belongs to a different survey template or has unresolvable parent
                        if (selectedTemplateForManage) {
                          if (p.templateId && p.templateId !== selectedTemplateForManage.id) {
                            return null;
                          }
                          if (!p.templateId) {
                            const parent = studentSurveyService.getSurveyById(p.surveyId);
                            const parentTpl = parent?.surveyTemplateId || (parent as any)?.templateId;
                            if (!parent || parentTpl !== selectedTemplateForManage.id) {
                              return null;
                            }
                          }
                        }

                        const student = students.find((s) => s.id === p.studentId);
                        const isPending = p.status === 'PENDING';

                        const targetModuleLabel =
                          p.category === 'CONDUCT_SELF_EVALUATION'
                            ? 'Rèn luyện & Kỷ luật → Đánh giá định kỳ (HKI/HKII)'
                            : p.category === 'CONTACT_UPDATE'
                            ? 'Hồ sơ học sinh → Thông tin liên hệ & Phụ huynh'
                            : p.category === 'GRADUATION_ELECTIVES'
                            ? 'Hồ sơ học sinh → Tổ hợp môn thi tốt nghiệp'
                            : p.category === 'HEALTH_SENSITIVE' || p.category === 'FAMILY_DIFFICULTY' || p.category === 'PSYCHOLOGICAL_SENSITIVE'
                            ? 'Hồ sơ học sinh → Diện quan tâm đặc biệt (Bảo mật)'
                            : p.category === 'CLASS_OFFICER_CANDIDACY' || p.category === 'SEATING_PREFERENCE'
                            ? 'Quản lý lớp học → Ban cán sự & Sơ đồ lớp'
                            : 'Lịch công tác chủ nhiệm / Sổ tay tư vấn GVCN';

                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <strong className="text-xs font-extrabold text-slate-900">
                                    {student?.fullName || p.studentName || 'Học viên'} ({student?.code || p.studentCode || '—'})
                                  </strong>
                                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                                    {p.category === 'CONDUCT_SELF_EVALUATION'
                                      ? 'Tự đánh giá Rèn luyện'
                                      : p.category === 'CONTACT_UPDATE'
                                      ? 'Thông tin liên hệ'
                                      : p.category === 'GRADUATION_ELECTIVES'
                                      ? 'Môn thi tốt nghiệp'
                                      : p.category === 'HEALTH_SENSITIVE'
                                      ? 'Sức khỏe cần lưu ý'
                                      : p.category === 'PSYCHOLOGICAL_SENSITIVE'
                                      ? 'Tâm lý & Cảm xúc'
                                      : p.category === 'FAMILY_DIFFICULTY'
                                      ? 'Hoàn cảnh gia đình'
                                      : p.category === 'CLASS_OFFICER_CANDIDACY'
                                      ? 'Ứng cử Ban cán sự'
                                      : p.category === 'SEATING_PREFERENCE'
                                      ? 'Nguyện vọng chỗ ngồi'
                                      : p.category === 'PRIVATE_SUPPORT_REQUEST'
                                      ? 'Đề nghị trao đổi riêng'
                                      : p.category}
                                  </span>
                                  {isPending ? (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                      Chờ GVCN duyệt
                                    </span>
                                  ) : p.status === 'APPROVED' ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                      Đã duyệt & Đồng bộ
                                    </span>
                                  ) : p.status === 'REVIEWED_NO_ACTION' ? (
                                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                                      Đã xem & Không cần đồng bộ
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                                      Đã từ chối
                                    </span>
                                  )}
                                  {p.isEditedByTeacher && (
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                                      GVCN đã chỉnh sửa
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                  {p.details
                                    ? p.details.replace(/\[object Object\]/g, normalizeConductGrade(p.proposedValue?.selfAssessment) || 'Tốt')
                                    : p.title}
                                </p>
                                <div className="mt-1.5 flex items-center justify-between gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                    <span>🎯 Đích đồng bộ:</span>
                                    <span className="font-semibold text-slate-700">{targetModuleLabel}</span>
                                  </div>
                                  {!isPending && (() => {
                                    const pSurvey = studentSurveyService.getSurveyById(p.surveyId);
                                    if (!pSurvey) return null;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDetailModal(pSurvey)}
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                                        title="Xem phiếu khảo sát gốc của học viên"
                                      >
                                        <Eye className="h-3 w-3 text-blue-600" />
                                        <span>Xem phiếu</span>
                                      </button>
                                    );
                                  })()}
                                </div>
                              </div>

                              {isPending && (
                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                  {(() => {
                                    const pSurvey = studentSurveyService.getSurveyById(p.surveyId);
                                    if (!pSurvey) return null;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDetailModal(pSurvey)}
                                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                                        title="Xem toàn bộ phiếu khảo sát của học viên"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                                        <span>Xem phiếu</span>
                                      </button>
                                    );
                                  })()}
                                  <button
                                    onClick={() => handleMarkReviewedNoAction(p.id)}
                                    disabled={processingProposalId === p.id}
                                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                    title="Đã xem xét phản hồi nhưng giữ nguyên hồ sơ hiện có"
                                  >
                                    Đã xem (Không đồng bộ)
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditProposal(p)}
                                    disabled={processingProposalId === p.id}
                                    className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
                                    title="Chỉnh sửa thông tin trước khi cập nhật vào hồ sơ"
                                  >
                                    Chỉnh sửa & Đồng bộ
                                  </button>
                                  <button
                                    onClick={() => handleApproveProposal(p.id)}
                                    disabled={processingProposalId === p.id}
                                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                                    title="Xác nhận dữ liệu và đồng bộ vào hồ sơ học viên"
                                  >
                                    {processingProposalId === p.id ? 'Đang duyệt...' : 'Duyệt & Đồng bộ'}
                                  </button>
                                  <button
                                    onClick={() => handleOpenRejectModal(p.id)}
                                    disabled={processingProposalId === p.id}
                                    className="rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Proposed vs Current Diff */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                              <div>
                                <span className="font-semibold text-slate-500 block mb-1">Dữ liệu hiện tại trong hồ sơ:</span>
                                <pre className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre-wrap">
                                  {typeof p.currentValue === 'string' ? p.currentValue : JSON.stringify(p.currentValue, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-blue-600 block">
                                    {p.isEditedByTeacher ? 'Dữ liệu sau khi GVCN chỉnh sửa:' : 'Dữ liệu học viên gửi:'}
                                  </span>
                                  {p.originalValue && p.isEditedByTeacher && (
                                    <span className="text-[10px] text-purple-600 font-bold">(Đã chỉnh sửa từ bản gốc)</span>
                                  )}
                                </div>
                                {p.category === 'CONDUCT_SELF_EVALUATION' && p.proposedValue ? (
                                  <div className="rounded-lg bg-blue-50/50 p-2.5 border border-blue-200 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-700">Mức tự xếp loại:</span>
                                      <span className="font-extrabold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                                        {normalizeConductGrade(p.proposedValue.selfAssessment) || 'Tốt'}
                                      </span>
                                    </div>
                                    {p.proposedValue.conductNote && (
                                      <div className="text-[11px] text-slate-600 pt-0.5">
                                        <span className="font-semibold text-slate-700">Minh chứng / Ghi chú:</span> {String(unwrapAnswerValue(p.proposedValue.conductNote))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <pre className="font-mono text-[11px] text-blue-900 bg-blue-50/50 p-2 rounded-lg border border-blue-200 overflow-x-auto whitespace-pre-wrap">
                                    {typeof p.proposedValue === 'string' ? p.proposedValue : JSON.stringify(p.proposedValue, null, 2)}
                                  </pre>
                                )}
                                {p.originalValue && p.isEditedByTeacher && (
                                  <div className="mt-2 text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                                    <span className="font-semibold text-slate-600 block">Câu trả lời gốc học viên gửi:</span>
                                    <pre className="font-mono text-[10px] text-slate-600 mt-1 overflow-x-auto whitespace-pre-wrap">
                                      {typeof p.originalValue === 'string' ? p.originalValue : JSON.stringify(p.originalValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Proposal Pagination */}
                  {totalProposalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 bg-white p-3 rounded-xl text-xs text-slate-600">
                      <span>
                        Trang {proposalPage} / {totalProposalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setProposalPage((p) => Math.max(1, p - 1))}
                          disabled={proposalPage === 1}
                          className="rounded-lg border border-slate-200 bg-white p-1 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setProposalPage((p) => Math.min(totalProposalPages, p + 1))}
                          disabled={proposalPage === totalProposalPages}
                          className="rounded-lg border border-slate-200 bg-white p-1 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================== */}
              {/* TAB 4: SELECTIVE SYNC ENGINE */}
              {/* =============================================================== */}
              {activeSurveyTab === 'sync' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
                      <RefreshCw className="h-4.5 w-4.5 text-blue-600" />
                      <span>Trung tâm Đồng bộ 4 tầng (Survey Sync Engine)</span>
                    </div>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Hệ thống tự động phân loại dữ liệu từ khảo sát thành 4 tầng:
                      <br />• <strong>Tầng 1 (Tự động):</strong> Lịch sử khảo sát học sinh, thời gian gửi, trạng thái làm bài.
                      <br />• <strong>Tầng 2 (Bán tự động / Có đề xuất):</strong> Thông tin liên hệ, nguyện vọng ngành nghề, môn thi tốt nghiệp.
                      <br />• <strong>Tầng 3 (Duyệt có điều kiện):</strong> Danh sách học sinh cần lưu ý đặc biệt về sức khỏe, tâm lý, hoàn cảnh.
                      <br />• <strong>Tầng 4 (Bảo mật / Không ghi đè):</strong> Lời nhắn riêng tư gửi GVCN, nguyện vọng chỗ ngồi, ý kiến nhạy cảm.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                        Thao tác đồng bộ hàng loạt
                      </h3>
                      <button
                        onClick={() => {
                          setAudits(surveySyncService.getAudits());
                          setAuditModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5 text-slate-500" />
                        <span>Xem nhật ký kiểm toán (Audit Trail)</span>
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <strong className="text-xs text-slate-800 block">Đồng bộ tất cả bài đã nộp ({currentTemplateSurveys.filter(s => s.status === 'SUBMITTED' || s.status === 'REVIEWED').length} bài)</strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Quét và đồng bộ toàn bộ phản hồi của bài khảo sát này sang các mô-đun hồ sơ, hướng nghiệp, thi tốt nghiệp.
                        </p>
                      </div>
                      <button
                        onClick={handleSyncAllThisSurvey}
                        disabled={isSyncingAll}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                        <span>{isSyncingAll ? 'Đang thực hiện...' : 'Bắt đầu đồng bộ'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* TAB 5: SURVEY STRUCTURE & QUESTIONS SUMMARY */}
              {/* =============================================================== */}
              {activeSurveyTab === 'structure' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Cấu trúc phần & câu hỏi trong biểu mẫu
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tổng cộng {selectedTemplateForManage.sections?.length || 0} phần và {selectedTemplateForManage.sections?.reduce((acc, s) => acc + (s.questions?.length || 0), 0)} câu hỏi.
                      </p>
                    </div>

                    {(isSuperAdmin || !isTemplateFromAdmin(selectedTemplateForManage)) ? (
                      <button
                        onClick={() => setBuilderTemplate(selectedTemplateForManage)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        <span>Chỉnh sửa / Tạo phiên bản mới</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setPreviewTemplate(selectedTemplateForManage)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span>Xem chi tiết câu hỏi</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {(selectedTemplateForManage.sections || []).map((sec, sIdx) => (
                      <div
                        key={sec.id || sIdx}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <h4 className="text-xs font-extrabold text-blue-900">
                            Phần {sIdx + 1}: {sec.title}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            {sec.questions?.length || 0} câu hỏi
                          </span>
                        </div>

                        {sec.description && (
                          <p className="text-xs text-slate-500">{sec.description}</p>
                        )}

                        <div className="space-y-2 pt-1">
                          {(sec.questions || []).map((q, qIdx) => (
                            <div
                              key={q.id || qIdx}
                              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 block">
                                  {qIdx + 1}. {q.title} {q.required && <span className="text-rose-500 font-bold">*</span>}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Loại: <strong className="text-slate-600">{q.type}</strong>
                                  {q.options && q.options.length > 0 && ` • ${q.options.length} lựa chọn`}
                                </span>
                              </div>

                              {q.visibility === 'TEACHER_ONLY' && (
                                <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold shrink-0">
                                  Chỉ GVCN thấy
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Survey Detail Modal (for reviewing individual student response) */}
      {isDetailModalOpen && selectedSurveyForDetail && (
        <StudentSurveyDetailModal
          key={selectedSurveyForDetail.id}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          survey={selectedSurveyForDetail}
          template={selectedTemplateForManage}
          onStatusUpdated={() => {
            const refreshed = studentSurveyService.getSurveyById(selectedSurveyForDetail.id);
            if (refreshed) {
              setSelectedSurveyForDetail(refreshed);
            }
            refreshData();
          }}
        />
      )}

      {/* Preview Survey Modal */}
      {previewTemplate && (
        <SurveyPreviewModal
          isOpen={true}
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
        />
      )}

      {/* Survey Builder Modal */}
      {builderTemplate && (
        <SurveyBuilderModal
          isOpen={true}
          onClose={() => setBuilderTemplate(null)}
          template={builderTemplate}
          onSaved={(saved) => {
            setBuilderTemplate(null);
            refreshData();
            if (selectedTemplateForManage && selectedTemplateForManage.id === saved.id) {
              setSelectedTemplateForManage(saved);
            }
          }}
        />
      )}

      {/* Special Attention / Review Modal */}
      {specialAttentionModalProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-sm">
                <Heart className="h-5 w-5 text-rose-600" />
                <span>Xem xét đề xuất & Phê duyệt phản hồi</span>
              </div>
              <button
                onClick={() => setSpecialAttentionModalProposal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{specialAttentionModalProposal.studentName} ({specialAttentionModalProposal.studentCode})</span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {specialAttentionModalProposal.title}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {specialAttentionModalProposal.details || 'Học sinh gửi phản hồi qua phiếu khảo sát.'}
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              GVCN có thể chọn <strong>chỉ duyệt ghi nhận</strong> thông thường hoặc <strong>đưa vào danh sách học sinh cần quan tâm</strong> nếu cần theo dõi sát sao:
            </p>

            <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
              <span className="text-xs font-bold text-rose-900 block flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-600" />
                <span>Phân loại theo dõi (Áp dụng khi chọn Đưa vào Học sinh quan tâm):</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Sức khỏe', 'Tâm lý', 'Hoàn cảnh gia đình', 'Học tập & Kỷ luật'].map((cat) => {
                  const isChecked = selectedAttentionCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer font-medium transition-all ${
                        isChecked
                          ? 'border-rose-500 bg-white text-rose-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white/70 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedAttentionCategories((prev) => prev.filter((c) => c !== cat));
                          } else {
                            setSelectedAttentionCategories((prev) => [...prev, cat]);
                          }
                        }}
                        className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 block">Ghi chú xử lý của GVCN:</span>
              <textarea
                rows={2}
                value={attentionReviewNote}
                onChange={(e) => setAttentionReviewNote(e.target.value)}
                placeholder="Ghi chú bảo mật cho GVCN (tùy chọn)..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSpecialAttentionModalProposal(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApproveWithoutAttention}
                  disabled={processingProposalId === specialAttentionModalProposal.id}
                  className="rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
                  title="Duyệt và lưu thông tin vào hồ sơ nhưng KHÔNG đưa học sinh vào danh sách cần quan tâm"
                >
                  Duyệt ghi nhận (Không quan tâm)
                </button>
                <button
                  onClick={handleConfirmSpecialAttention}
                  disabled={selectedAttentionCategories.length === 0 || processingProposalId === specialAttentionModalProposal.id}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                  title="Duyệt và đưa học sinh vào danh sách theo dõi đặc biệt"
                >
                  Duyệt & Đưa vào quan tâm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalProposalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold text-slate-900">Từ chối đề xuất đồng bộ</h3>
              <button
                onClick={() => setRejectModalProposalId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Lý do từ chối (tùy chọn):</label>
              <textarea
                rows={3}
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                placeholder="Nhập lý do chưa đồng bộ hoặc giữ nguyên dữ liệu cũ..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectModalProposalId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 cursor-pointer"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit and Sync Modal */}
      {editModalProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Chỉnh sửa và đồng bộ vào hồ sơ</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Học viên: <strong className="text-slate-800">{editModalProposal.studentName}</strong> ({editModalProposal.studentCode || '—'})
                </p>
              </div>
              <button
                onClick={() => setEditModalProposal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 space-y-1">
                <span className="font-bold text-blue-900 block">{editModalProposal.title}</span>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  GVCN có thể điều chỉnh giá trị trước khi cập nhật. Câu trả lời gốc của học viên vẫn được lưu trữ bảo toàn.
                </p>
              </div>

              {/* Dynamic form based on category */}
              {editModalProposal.category === 'CONTACT_UPDATE' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Số điện thoại học sinh:</label>
                    <input
                      type="text"
                      value={editProposalForm.phone || ''}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="Số điện thoại cá nhân"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tên người liên hệ khẩn cấp / Phụ huynh:</label>
                    <input
                      type="text"
                      value={editProposalForm.emergencyContactName || ''}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, emergencyContactName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="Họ tên người liên hệ khẩn cấp"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Mối quan hệ:</label>
                      <input
                        type="text"
                        value={editProposalForm.emergencyContactRelationship || ''}
                        onChange={(e) => setEditProposalForm({ ...editProposalForm, emergencyContactRelationship: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        placeholder="Bố, Mẹ, v.v."
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">SĐT người liên hệ khẩn cấp:</label>
                      <input
                        type="text"
                        value={editProposalForm.emergencyContactPhone || ''}
                        onChange={(e) => setEditProposalForm({ ...editProposalForm, emergencyContactPhone: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        placeholder="SĐT liên hệ khẩn cấp"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editModalProposal.category === 'CONDUCT_SELF_EVALUATION' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mức tự xếp loại rèn luyện:</label>
                    <select
                      value={editProposalForm.selfAssessment || 'Tốt'}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, selfAssessment: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none font-bold"
                    >
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Chưa đạt">Chưa đạt</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ghi chú tự đánh giá:</label>
                    <textarea
                      rows={2}
                      value={editProposalForm.conductNote || ''}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, conductNote: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="Ghi chú minh chứng rèn luyện"
                    />
                  </div>
                </div>
              )}

              {editModalProposal.category === 'SEATING_PREFERENCE' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nguyện vọng vị trí ngồi:</label>
                  <input
                    type="text"
                    value={editProposalForm.preference || ''}
                    onChange={(e) => setEditProposalForm({ ...editProposalForm, preference: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    placeholder="Ví dụ: Bàn 2 dãy giữa, gần bảng..."
                  />
                </div>
              )}

              {editModalProposal.category === 'CLASS_OFFICER_CANDIDACY' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vị trí cán sự ứng cử / đề cử:</label>
                  <input
                    type="text"
                    value={editProposalForm.desiredPosition || ''}
                    onChange={(e) => setEditProposalForm({ ...editProposalForm, desiredPosition: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    placeholder="Ví dụ: Lớp phó học tập, Tổ trưởng tổ 2..."
                  />
                </div>
              )}

              {editModalProposal.category === 'GRADUATION_ELECTIVES' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Môn tự chọn 1:</label>
                    <input
                      type="text"
                      value={editProposalForm.electiveSubject1 || ''}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, electiveSubject1: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Môn tự chọn 2:</label>
                    <input
                      type="text"
                      value={editProposalForm.electiveSubject2 || ''}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, electiveSubject2: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {editModalProposal.category === 'FAMILY_DIFFICULTY' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Hoàn cảnh gia đình:</label>
                    <input
                      type="text"
                      value={editProposalForm.familySituation || ''}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, familySituation: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ghi chú chi tiết:</label>
                    <textarea
                      rows={2}
                      value={editProposalForm.familyNote || ''}
                      onChange={(e) => setEditProposalForm({ ...editProposalForm, familyNote: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {editModalProposal.category === 'HEALTH_SENSITIVE' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ghi chú sức khỏe cần hỗ trợ:</label>
                  <textarea
                    rows={2}
                    value={editProposalForm.healthSupportNote || ''}
                    onChange={(e) => setEditProposalForm({ ...editProposalForm, healthSupportNote: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú duyệt của GVCN (tùy chọn):</label>
                <textarea
                  rows={2}
                  value={editReviewNote}
                  onChange={(e) => setEditReviewNote(e.target.value)}
                  placeholder="Nhập ghi chú lý do chỉnh sửa (ví dụ: xác minh lại với phụ huynh qua điện thoại)..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditModalProposal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmEditAndApprove}
                disabled={processingProposalId === editModalProposal.id}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {processingProposalId === editModalProposal.id ? 'Đang lưu & đồng bộ...' : 'Lưu & Đồng bộ ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Nhật ký kiểm toán đồng bộ (Audit Trail)</h3>
              </div>
              <button
                onClick={() => setAuditModalOpen(false)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {audits.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  Chưa có nhật ký kiểm toán nào được ghi lại.
                </div>
              ) : (
                audits.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{a.performedBy || a.performedByRole}</span>
                      <span className="text-slate-400 font-normal">{formatDateTime(a.performedAt)}</span>
                    </div>
                    <p className="text-slate-600">{a.details}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-3 text-right">
              <button
                onClick={() => setAuditModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Survey Modal */}
      {renameModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Edit3 className="h-4 w-4 text-amber-600" />
                <span>Chỉnh sửa tên bài khảo sát</span>
              </div>
              <button
                onClick={() => setRenameModalTemplate(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên bài khảo sát <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={renameTitleInput}
                  onChange={(e) => {
                    setRenameTitleInput(e.target.value);
                    if (renameError) setRenameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveRenameSurvey();
                    }
                  }}
                  placeholder="Nhập tên bài khảo sát mới..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
                {renameError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{renameError}</p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Quy tắc bảo toàn dữ liệu:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li>Cập nhật trực tiếp trên bài khảo sát hiện tại (ID: <span className="font-mono text-slate-600">{renameModalTemplate.id}</span>)</li>
                  <li>Không tạo bản ghi mới, không thay đổi ID và không làm mất phản hồi của học sinh</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRenameModalTemplate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveRenameSurvey}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete or Archive Survey Confirmation Modal */}
      {deleteConfirmModalTemplate && (() => {
        const responsesCount = studentSurveyService.getResponsesByTemplate(deleteConfirmModalTemplate.id).length;
        const hasResponses = responsesCount > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  {hasResponses ? (
                    <>
                      <Archive className="h-4 w-4 text-amber-600" />
                      <span>Lưu trữ bài khảo sát</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 text-rose-600" />
                      <span>Xác nhận xóa bài khảo sát</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setDeleteConfirmModalTemplate(null)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {hasResponses ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                      Khảo sát đã có dữ liệu phản hồi ({responsesCount} học sinh) và không thể xóa hoàn toàn. Bạn có muốn lưu trữ khảo sát?
                    </p>
                    <div className="rounded-xl bg-amber-50 p-3 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                      <p className="font-bold">Bài khảo sát:</p>
                      <p className="font-medium text-slate-800">"{deleteConfirmModalTemplate.title}"</p>
                      <p className="text-[10px] text-amber-700 pt-1">
                        * Thao tác Lưu trữ giúp bảo toàn 100% dữ liệu đã nộp của học sinh, không gây lỗi hệ thống và không làm mất lịch sử học tập.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                      Bạn có chắc muốn xóa bài khảo sát này?
                    </p>
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-[11px] space-y-1">
                      <p className="font-bold text-slate-700">Tên bài khảo sát:</p>
                      <p className="font-medium text-slate-900">"{deleteConfirmModalTemplate.title}"</p>
                      <p className="text-[10px] text-slate-500 pt-1">
                        (Chưa có học sinh nào nộp câu trả lời. Bản nháp này sẽ được xóa an toàn khỏi hệ thống.)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModalTemplate(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteOrArchive}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white cursor-pointer shadow-xs ${
                    hasResponses
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {hasResponses ? (
                    <>
                      <Archive className="h-3.5 w-3.5" />
                      <span>Lưu trữ khảo sát</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Survey Export & Custom Filter Modal */}
      {exportModalOpen && (() => {
        const target = exportTargetTemplate || selectedTemplateForManage || templates[0];
        if (!target) return null;

        // Calculate preview matched students count
        let matchedStudents = students;
        if (exportGroup !== 'all') {
          matchedStudents = matchedStudents.filter(s => String(s.group || 1) === exportGroup);
        }
        if (exportSearch.trim()) {
          const q = exportSearch.toLowerCase();
          matchedStudents = matchedStudents.filter(s =>
            (s?.fullName || '').toLowerCase().includes(q) || (s?.code || '').toLowerCase().includes(q)
          );
        }
        if (exportScope === 'SUBMITTED') {
          matchedStudents = matchedStudents.filter(student => {
            const survey = surveys.find(
              s => s.studentId === student.id && (s.surveyTemplateId === target.id || (!s.surveyTemplateId && target.id === 'grade12_start_year'))
            );
            return survey?.status === 'SUBMITTED' || survey?.status === 'REVIEWED';
          });
        } else if (exportScope === 'REVIEWED') {
          matchedStudents = matchedStudents.filter(student => {
            const survey = surveys.find(
              s => s.studentId === student.id && (s.surveyTemplateId === target.id || (!s.surveyTemplateId && target.id === 'grade12_start_year'))
            );
            return survey?.status === 'REVIEWED';
          });
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
            <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      Trích lọc & Tải kết quả khảo sát
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      Bài khảo sát: <span className="font-semibold text-slate-800">{target.title}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Filter Scope & Criteria */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                    <span>1. Phạm vi trích lọc dữ liệu học sinh</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Trạng thái làm bài:
                      </label>
                      <select
                        value={exportScope}
                        onChange={(e) => setExportScope(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Toàn bộ danh sách lớp ({students.length} HS)</option>
                        <option value="SUBMITTED">Chỉ học sinh đã hoàn thành / đã nộp</option>
                        <option value="REVIEWED">Chỉ học sinh GVCN đã xem</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Phân theo tổ sinh hoạt:
                      </label>
                      <select
                        value={exportGroup}
                        onChange={(e) => setExportGroup(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="all">Tất cả các tổ</option>
                        <option value="1">Tổ 1</option>
                        <option value="2">Tổ 2</option>
                        <option value="3">Tổ 3</option>
                        <option value="4">Tổ 4</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Lọc theo tên / mã học sinh:
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={exportSearch}
                          onChange={(e) => setExportSearch(e.target.value)}
                          placeholder="Nhập tên hoặc mã..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Column / Field Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      <span>2. Lựa chọn thông tin cần xuất ({selectedFieldKeys.length} trường đã chọn)</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApplyExportPreset('all')}
                        className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyExportPreset('conduct')}
                        className="rounded-lg bg-emerald-50 hover:bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800 transition-all cursor-pointer border border-emerald-200/60"
                      >
                        ⭐ Tự xếp loại rèn luyện
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyExportPreset('contact')}
                        className="rounded-lg bg-blue-50 hover:bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-800 transition-all cursor-pointer border border-blue-200/60"
                      >
                        📞 Liên hệ & PH
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyExportPreset('career')}
                        className="rounded-lg bg-purple-50 hover:bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-800 transition-all cursor-pointer border border-purple-200/60"
                      >
                        🎯 Khối thi & Nghề
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyExportPreset('health')}
                        className="rounded-lg bg-amber-50 hover:bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 transition-all cursor-pointer border border-amber-200/60"
                      >
                        ❤️ Sức khỏe & Tâm lý
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllFields}
                        className="rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 px-2 py-1 text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Categorized Fields Grid */}
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 max-h-60 overflow-y-auto">
                    {availableExportFields.map((cat, catIdx) => {
                      const allCatKeys = cat.items.map(i => i.key);
                      const isAllCatSelected = allCatKeys.every(k => selectedFieldKeys.includes(k));
                      const isSomeCatSelected = allCatKeys.some(k => selectedFieldKeys.includes(k));

                      return (
                        <div key={catIdx} className="space-y-2 pb-3 border-b border-slate-200/60 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 hover:text-blue-600 select-none">
                              <input
                                type="checkbox"
                                checked={isAllCatSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = isSomeCatSelected && !isAllCatSelected;
                                }}
                                onChange={() => {
                                  if (isAllCatSelected) {
                                    setSelectedFieldKeys(prev => prev.filter(k => !allCatKeys.includes(k)));
                                  } else {
                                    setSelectedFieldKeys(prev => Array.from(new Set([...prev, ...allCatKeys])));
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>{cat.category}</span>
                            </label>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {allCatKeys.filter(k => selectedFieldKeys.includes(k)).length}/{allCatKeys.length} cột
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5">
                            {cat.items.map(item => {
                              const isChecked = selectedFieldKeys.includes(item.key);
                              return (
                                <label
                                  key={item.key}
                                  className={`flex items-start gap-2 p-1.5 rounded-lg text-[11px] cursor-pointer transition-all select-none ${
                                    isChecked ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-blue-200' : 'text-slate-600 hover:bg-white/60'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleField(item.key)}
                                    className="h-3 w-3 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="block truncate">{item.label}</span>
                                    {item.description && (
                                      <span className="block text-[9px] text-slate-400 truncate">{item.description}</span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Export Options & File Configuration */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <span>3. Định dạng và tên tệp tải về</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tên tệp lưu:
                      </label>
                      <input
                        type="text"
                        value={exportFileName}
                        onChange={(e) => setExportFileName(e.target.value)}
                        placeholder="Nhập tên tệp..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Định dạng tệp:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExportFormat('excel')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            exportFormat === 'excel'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>Excel (.xlsx)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportFormat('csv')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            exportFormat === 'csv'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>CSV (.csv)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs text-blue-950">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>
                      Dữ liệu sẵn sàng xuất: <strong className="font-extrabold text-blue-700">{matchedStudents.length} học sinh</strong> với <strong className="font-extrabold text-blue-700">{selectedFieldKeys.length} cột thông tin</strong> được trích lọc.
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-blue-700 bg-white/80 px-2 py-0.5 rounded-lg border border-blue-200">
                    .{exportFormat === 'excel' ? 'xlsx' : 'csv'}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all"
                >
                  Đóng
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteExport}
                    disabled={matchedStudents.length === 0 || selectedFieldKeys.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải kết quả trích lọc</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
