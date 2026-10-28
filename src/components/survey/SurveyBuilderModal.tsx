/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  FileText,
  FileUp,
  Eye,
  Save,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Send,
  Layers,
  ListOrdered,
  Type,
  AlignLeft,
  CheckSquare,
  CircleDot,
  Sliders,
  ChevronDown,
  ExternalLink,
  Calendar,
  Clock,
  Timer,
  Table,
  Users,
  Globe,
  AlertCircle
} from 'lucide-react';
import { SurveyTemplate, SurveySection, SurveyQuestion, SurveyQuestionType } from '../../types';
import { surveyTemplateService, TemplateValidationResult } from '../../services/SurveyTemplateService';
import { GoogleAuthService } from '../../services/GoogleAuthService';
import { SurveyTextPasteModal } from './SurveyTextPasteModal';
import { SurveyDocxImportModal } from './SurveyDocxImportModal';
import { SurveyPreviewModal } from './SurveyPreviewModal';
import { SurveyGoogleFormImportModal } from './SurveyGoogleFormImportModal';
import { authService } from '../../services/AuthService';

interface SurveyBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: SurveyTemplate;
  templateId?: string;
  onSaved?: (savedTemplate: SurveyTemplate) => void;
  mode?: 'TEACHER' | 'ADMIN';
}

const QUESTION_TYPES: Array<{ type: SurveyQuestionType; label: string; icon: any }> = [
  { type: 'SINGLE_CHOICE', label: 'Trắc nghiệm một lựa chọn', icon: CircleDot },
  { type: 'MULTI_CHOICE', label: 'Trắc nghiệm nhiều lựa chọn', icon: CheckSquare },
  { type: 'SHORT_TEXT', label: 'Trả lời ngắn', icon: Type },
  { type: 'LONG_TEXT', label: 'Đoạn văn dài / Tự luận', icon: AlignLeft },
  { type: 'DROPDOWN', label: 'Menu thả xuống (Dropdown)', icon: ChevronDown },
  { type: 'DATE', label: 'Ngày tháng (DATE)', icon: Calendar },
  { type: 'TIME', label: 'Thời gian / Giờ (TIME)', icon: Clock },
  { type: 'DURATION', label: 'Thời lượng (DURATION)', icon: Timer },
  { type: 'SCALE', label: 'Mức độ / Thang đo', icon: Sliders },
  { type: 'GRID_SINGLE', label: 'Lưới 1 lựa chọn mỗi dòng', icon: Table },
  { type: 'GRID_MULTI', label: 'Lưới nhiều lựa chọn mỗi dòng', icon: Table }
];

export const SurveyBuilderModal: React.FC<SurveyBuilderModalProps> = ({
  isOpen,
  onClose,
  template: initialTemplate,
  templateId,
  onSaved,
  mode = 'TEACHER'
}) => {
  const [template, setTemplate] = useState<SurveyTemplate>(() => {
    if (initialTemplate) return JSON.parse(JSON.stringify(initialTemplate));
    if (templateId) {
      const found = surveyTemplateService.getTemplateById(templateId);
      if (found) return JSON.parse(JSON.stringify(found));
    }
    const currentUser = authService.getCurrentUser();
    return surveyTemplateService.createTemplate({
      title: mode === 'ADMIN' ? 'Phiếu Khảo sát Toàn hệ thống Mới' : 'Phiếu Khảo sát Lớp học Mới',
      creatorRole: mode === 'ADMIN' ? 'SUPER_ADMIN' : 'TEACHER',
      targetAudience: mode === 'ADMIN' ? ['TEACHER', 'STUDENT', 'PARENT'] : ['STUDENT', 'PARENT'],
      scope: mode === 'ADMIN' ? 'SYSTEM' : 'CLASS',
      createdBy: currentUser?.name || (mode === 'ADMIN' ? 'Ban Quản trị Hệ thống' : 'Giáo viên Chủ nhiệm')
    });
  });

  const [pasteModalMode, setPasteModalMode] = useState<'AI' | 'WORD' | null>(null);
  const [docxModalOpen, setDocxModalOpen] = useState<boolean>(false);
  const [googleFormModalOpen, setGoogleFormModalOpen] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<TemplateValidationResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // In-app Section Delete Confirmation Modal State (Reliable in sandboxed iframes)
  const [sectionToDelete, setSectionToDelete] = useState<{
    index: number;
    id: string;
    title: string;
    questionCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleUpdateField = <K extends keyof SurveyTemplate>(field: K, value: SurveyTemplate[K]) => {
    setTemplate((prev) => ({
      ...prev,
      [field]: value
    }));
    setValidationResult(null);
  };

  // Section Handlers
  const handleAddSection = () => {
    const nextOrder = (template.sections?.length || 0) + 1;
    const newSection: SurveySection = {
      id: `sec-${Date.now()}-${nextOrder}`,
      title: `Phần ${nextOrder}: Tiêu đề phần mới`,
      description: '',
      order: nextOrder,
      questions: []
    };
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || []), newSection];
      const updated = {
        ...prev,
        sections: nextSections
      };
      // Auto persist draft
      try {
        surveyTemplateService.updateDraftTemplate(updated.id, updated);
      } catch (e) {
        console.warn('Auto-save section draft error', e);
      }
      return updated;
    });
    setSaveSuccessMsg(`Đã thêm Phần ${nextOrder} mới.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleUpdateSection = (sIdx: number, patch: Partial<SurveySection>) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      nextSections[sIdx] = { ...nextSections[sIdx], ...patch };
      return { ...prev, sections: nextSections };
    });
  };

  const handleDeleteSection = (sIdx: number) => {
    const sections = template.sections || [];
    if (sections.length <= 1) {
      setActionNotice('Biểu mẫu phải có ít nhất một phần khảo sát. Không thể xóa phần duy nhất còn lại.');
      setTimeout(() => setActionNotice(''), 4500);
      return;
    }

    const targetSec = sections[sIdx];
    if (!targetSec) return;

    setSectionToDelete({
      index: sIdx,
      id: targetSec.id,
      title: targetSec.title || `Phần ${sIdx + 1}`,
      questionCount: targetSec.questions?.length || 0
    });
  };

  const confirmDeleteSection = () => {
    if (!sectionToDelete) return;

    setTemplate((prev) => {
      const nextSections = (prev.sections || [])
        .filter((s, idx) => s.id !== sectionToDelete.id && idx !== sectionToDelete.index)
        .map((s, idx) => ({ ...s, order: idx + 1 }));

      const updated: SurveyTemplate = {
        ...prev,
        sections: nextSections,
        updatedAt: new Date().toISOString()
      };

      // Persist draft immediately so reload/logout keeps it deleted
      try {
        surveyTemplateService.updateDraftTemplate(updated.id, updated);
      } catch (e) {
        console.warn('Auto persist draft after section deletion error', e);
      }

      return updated;
    });

    const deletedTitle = sectionToDelete.title;
    setSectionToDelete(null);
    setSaveSuccessMsg(`Đã xóa "${deletedTitle}" và toàn bộ câu hỏi bên trong thành công.`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleMoveSection = (sIdx: number, direction: 'up' | 'down') => {
    setTemplate((prev) => {
      const sections = [...(prev.sections || [])];
      const targetIdx = direction === 'up' ? sIdx - 1 : sIdx + 1;
      if (targetIdx < 0 || targetIdx >= sections.length) return prev;
      const temp = sections[sIdx];
      sections[sIdx] = sections[targetIdx];
      sections[targetIdx] = temp;
      const reindexed = sections.map((s, idx) => ({ ...s, order: idx + 1 }));

      const updated = { ...prev, sections: reindexed };
      try {
        surveyTemplateService.updateDraftTemplate(updated.id, updated);
      } catch (e) {
        console.warn('Auto-save move section error', e);
      }
      return updated;
    });
  };

  // Question Handlers
  const handleAddQuestion = (sIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const qOrder = (targetSec.questions?.length || 0) + 1;

      const newQ: SurveyQuestion = {
        id: `q-${Date.now()}-${sIdx + 1}-${qOrder}`,
        key: `q_${Date.now()}_${sIdx + 1}_${qOrder}`,
        title: '',
        description: '',
        type: 'SINGLE_CHOICE',
        required: false,
        options: ['Lựa chọn 1', 'Lựa chọn 2'],
        allowOther: false,
        visibility: 'NORMAL',
        order: qOrder
      };

      targetSec.questions = [...(targetSec.questions || []), newQ];
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleUpdateQuestion = (sIdx: number, qIdx: number, patch: Partial<SurveyQuestion>) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      nextQuestions[qIdx] = { ...nextQuestions[qIdx], ...patch };
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleDeleteQuestion = (sIdx: number, qIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = (targetSec.questions || [])
        .filter((_, idx) => idx !== qIdx)
        .map((q, idx) => ({ ...q, order: idx + 1 }));
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleMoveQuestion = (sIdx: number, qIdx: number, direction: 'up' | 'down') => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const questions = [...(targetSec.questions || [])];
      const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
      if (targetIdx < 0 || targetIdx >= questions.length) return prev;
      const temp = questions[qIdx];
      questions[qIdx] = questions[targetIdx];
      questions[targetIdx] = temp;
      targetSec.questions = questions.map((q, idx) => ({ ...q, order: idx + 1 }));
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  // Option Handlers for choice questions
  const handleAddOption = (sIdx: number, qIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const options = [...(q.options || [])];
      options.push(`Lựa chọn ${options.length + 1}`);
      q.options = options;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleUpdateOption = (sIdx: number, qIdx: number, optIdx: number, value: string) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const options = [...(q.options || [])];
      options[optIdx] = value;
      q.options = options;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleDeleteOption = (sIdx: number, qIdx: number, optIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const options = (q.options || []).filter((_, idx) => idx !== optIdx);
      q.options = options;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  // Grid Row Handlers
  const handleAddGridRow = (sIdx: number, qIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const rows = [...(q.rows || q.gridRows || [])];
      rows.push(`Hàng ${rows.length + 1}: Tiêu chí mới`);
      q.rows = rows;
      q.gridRows = rows;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleUpdateGridRow = (sIdx: number, qIdx: number, rowIdx: number, value: string) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const rows = [...(q.rows || q.gridRows || [])];
      rows[rowIdx] = value;
      q.rows = rows;
      q.gridRows = rows;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleDeleteGridRow = (sIdx: number, qIdx: number, rowIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const rows = (q.rows || q.gridRows || []).filter((_, idx) => idx !== rowIdx);
      q.rows = rows;
      q.gridRows = rows;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleMoveGridRow = (sIdx: number, qIdx: number, rowIdx: number, direction: 'up' | 'down') => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const rows = [...(q.rows || q.gridRows || [])];
      const targetIdx = direction === 'up' ? rowIdx - 1 : rowIdx + 1;
      if (targetIdx < 0 || targetIdx >= rows.length) return prev;
      const temp = rows[rowIdx];
      rows[rowIdx] = rows[targetIdx];
      rows[targetIdx] = temp;
      q.rows = rows;
      q.gridRows = rows;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  // Grid Column Handlers
  const handleAddGridColumn = (sIdx: number, qIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const columns = [...(q.columns || q.gridColumns || [])];
      columns.push(`Cột ${columns.length + 1}: Mức đánh giá`);
      q.columns = columns;
      q.gridColumns = columns;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleUpdateGridColumn = (sIdx: number, qIdx: number, colIdx: number, value: string) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const columns = [...(q.columns || q.gridColumns || [])];
      columns[colIdx] = value;
      q.columns = columns;
      q.gridColumns = columns;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleDeleteGridColumn = (sIdx: number, qIdx: number, colIdx: number) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const columns = (q.columns || q.gridColumns || []).filter((_, idx) => idx !== colIdx);
      q.columns = columns;
      q.gridColumns = columns;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleMoveGridColumn = (sIdx: number, qIdx: number, colIdx: number, direction: 'up' | 'down') => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      const columns = [...(q.columns || q.gridColumns || [])];
      const targetIdx = direction === 'up' ? colIdx - 1 : colIdx + 1;
      if (targetIdx < 0 || targetIdx >= columns.length) return prev;
      const temp = columns[colIdx];
      columns[colIdx] = columns[targetIdx];
      columns[targetIdx] = temp;
      q.columns = columns;
      q.gridColumns = columns;
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  const handleSetGridPresets = (sIdx: number, qIdx: number, presetCols: string[]) => {
    setTemplate((prev) => {
      const nextSections = [...(prev.sections || [])];
      const targetSec = { ...nextSections[sIdx] };
      const nextQuestions = [...(targetSec.questions || [])];
      const q = { ...nextQuestions[qIdx] };
      q.columns = [...presetCols];
      q.gridColumns = [...presetCols];
      nextQuestions[qIdx] = q;
      targetSec.questions = nextQuestions;
      nextSections[sIdx] = targetSec;
      return { ...prev, sections: nextSections };
    });
  };

  // Import parsed sections from AI/Word/DOCX (Rule IX: DO NOT WIPE existing data by default!)
  const handleImportSections = (
    importedSections: SurveySection[],
    source: 'AI_PASTE' | 'WORD_PASTE' | 'DOCX_IMPORT',
    importMode: 'APPEND' | 'REPLACE' = 'APPEND'
  ) => {
    setTemplate((prev) => {
      let nextSections: SurveySection[];
      const existingSections = prev.sections || [];

      if (importMode === 'APPEND' && existingSections.length > 0) {
        // If there's only 1 empty section with no questions, replace it
        if (existingSections.length === 1 && (!existingSections[0].questions || existingSections[0].questions.length === 0)) {
          nextSections = importedSections.map((s, idx) => ({ ...s, order: idx + 1 }));
        } else {
          // Append new sections after existing sections
          const startOrder = existingSections.length;
          const reindexed = importedSections.map((s, idx) => ({
            ...s,
            id: `sec-${Date.now()}-${startOrder + idx + 1}`,
            order: startOrder + idx + 1
          }));
          nextSections = [...existingSections, ...reindexed];
        }
      } else {
        nextSections = importedSections.map((s, idx) => ({ ...s, order: idx + 1 }));
      }

      const updated: SurveyTemplate = {
        ...prev,
        source,
        sections: nextSections,
        updatedAt: new Date().toISOString()
      };

      try {
        surveyTemplateService.updateDraftTemplate(updated.id, updated);
      } catch (e) {
        console.warn('Auto-save draft error on import', e);
      }

      return updated;
    });

    setValidationResult(null);
    const totalQ = importedSections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    setSaveSuccessMsg(`Đã thêm thành công ${importedSections.length} phần (${totalQ} câu hỏi) vào bản nháp!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Import parsed sections from Google Form
  const handleImportGoogleForm = (result: {
    title?: string;
    description?: string;
    sections: SurveySection[];
    mode: 'REPLACE' | 'APPEND';
    formId?: string;
    url?: string;
    responderUri?: string;
    revisionId?: string;
  }) => {
    setTemplate((prev) => {
      let nextSections: SurveySection[] = [];
      if (result.mode === 'APPEND') {
        const existingCount = prev.sections?.length || 0;
        const reindexed = result.sections.map((sec, idx) => ({
          ...sec,
          order: existingCount + idx + 1
        }));
        nextSections = [...(prev.sections || []), ...reindexed];
      } else {
        nextSections = result.sections;
      }

      const nextStatus = prev.status === 'PUBLISHED' ? 'DRAFT' : prev.status;
      const nextVersion = prev.status === 'PUBLISHED' ? prev.version + 1 : prev.version;

      const updated: SurveyTemplate = {
        ...prev,
        title: result.mode === 'REPLACE' && result.title ? result.title : prev.title,
        description: result.mode === 'REPLACE' && result.description ? result.description : prev.description,
        status: nextStatus,
        version: nextVersion,
        source: 'GOOGLE_FORM_IMPORT',
        externalSource: {
          provider: 'GOOGLE_FORMS',
          formId: result.formId,
          url: result.url,
          responderUri: result.responderUri,
          revisionId: result.revisionId,
          importedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString()
        },
        sections: nextSections,
        updatedAt: new Date().toISOString()
      };

      try {
        surveyTemplateService.updateDraftTemplate(updated.id, updated);
      } catch (e) {
        console.warn('Auto-save draft error on Google Form import', e);
      }

      return updated;
    });

    setValidationResult(null);
    const totalQ = result.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
    setSaveSuccessMsg(`Đã nhập thành công ${result.sections.length} phần (${totalQ} câu hỏi) từ Google Form!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Save draft
  const handleSaveDraft = () => {
    try {
      const saved = surveyTemplateService.updateDraftTemplate(template.id, template);
      setSaveSuccessMsg('Đã lưu bản nháp khảo sát thành công vào cơ sở dữ liệu!');
      onSaved?.(saved);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      setActionNotice(err.message || 'Lỗi khi lưu bản nháp.');
      setTimeout(() => setActionNotice(''), 4000);
    }
  };

  // Publish / Apply
  const handlePublish = () => {
    setIsPublishing(true);
    const validation = surveyTemplateService.validateTemplate(template);
    setValidationResult(validation);

    if (!validation.valid) {
      setIsPublishing(false);
      return;
    }

    try {
      // First update draft content
      surveyTemplateService.updateDraftTemplate(template.id, template);
      // Then publish
      const published = surveyTemplateService.publishTemplate(template.id);
      onSaved?.(published);
      onClose();
    } catch (err: any) {
      setActionNotice(err.message || 'Lỗi khi xuất bản khảo sát.');
      setTimeout(() => setActionNotice(''), 4000);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex h-[96vh] max-h-[96vh] w-full max-w-6xl flex-col rounded-2xl bg-slate-100 shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {template.title || 'Soạn thảo biểu mẫu khảo sát'}
                </h2>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                  Phiên bản v{template.version} (Bản nháp)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Năm học: {template.schoolYear} • Tạo bởi: {template.createdBy}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              <Eye className="h-4 w-4 text-blue-600" />
              <span>Xem trước như học viên</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4 text-slate-600" />
              <span>Lưu bản nháp</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              <Send className="h-4 w-4" />
              <span>{isPublishing ? 'Đang xuất bản...' : 'Áp dụng (Xuất bản v' + template.version + ')'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Toolbar (AI / Word / DOCX / Google Form) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider whitespace-nowrap">
              NGUỒN NHẬP NHANH:
            </span>

            <button
              type="button"
              onClick={() => setGoogleFormModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-purple-600" />
              <span>{template.externalSource?.url ? '🔄 Cập nhật từ Google Form' : '📥 Nhập từ Google Form'}</span>
              {!GoogleAuthService.hasClientId() && (
                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                  Chưa cấu hình
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPasteModalMode('AI')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>✨ Dán từ ChatGPT / Gemini</span>
            </button>

            <button
              type="button"
              onClick={() => setPasteModalMode('WORD')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span>📋 Dán từ Word</span>
            </button>

            <button
              type="button"
              onClick={() => setDocxModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
            >
              <FileUp className="h-3.5 w-3.5 text-slate-600" />
              <span>📄 Nhập file .docx</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddSection}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm phần mới</span>
            </button>
          </div>
        </div>

        {/* Action Notice Alert (e.g. Can't delete last section) */}
        {actionNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs font-bold text-amber-900 flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice('')}
              className="text-amber-700 hover:text-amber-900 cursor-pointer p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Global Save Message Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg('')}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Validation Errors / Warnings Banner */}
        {validationResult && !validationResult.valid && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 text-xs text-rose-800 space-y-1 shrink-0">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Không thể xuất bản do phát hiện {validationResult.errors.length} lỗi cấu trúc:</span>
            </div>
            <ul className="list-disc pl-6 text-[11px] space-y-0.5 text-rose-700">
              {validationResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Builder Canvas Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Template Meta Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tên phiếu khảo sát:</label>
              <input
                type="text"
                value={template.title || ''}
                onChange={(e) => handleUpdateField('title', e.target.value)}
                placeholder="Ví dụ: Phiếu khảo sát nguyện vọng đầu năm học..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mô tả / Hướng dẫn học viên:</label>
              <textarea
                rows={2}
                value={template.description || ''}
                onChange={(e) => handleUpdateField('description', e.target.value)}
                placeholder="Nhập hướng dẫn làm bài cho học viên..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Audience & Scope Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    Đối tượng nhận khảo sát (Audience):
                  </label>
                  <span className="text-[11px] text-slate-500">Chọn 1 hoặc nhiều</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ...(mode === 'ADMIN' ? [{ id: 'TEACHER' as const, label: 'GVCN (Chủ nhiệm)', color: 'blue' }] : []),
                    { id: 'STUDENT' as const, label: 'Học viên', color: 'emerald' },
                    { id: 'PARENT' as const, label: 'Phụ huynh', color: 'purple' },
                  ].map((aud) => {
                    const isSelected = (template.targetAudience || ['STUDENT']).includes(aud.id);
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => {
                          const current = template.targetAudience || ['STUDENT'];
                          let next: ('TEACHER' | 'STUDENT' | 'PARENT')[];
                          if (isSelected) {
                            if (current.length === 1) return; // Keep at least one
                            next = current.filter((r) => r !== aud.id);
                          } else {
                            next = [...current, aud.id];
                          }
                          handleUpdateField('targetAudience', next);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border text-[9px] ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                        {aud.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Phạm vi phát hành (Scope):
                </label>
                {mode === 'ADMIN' ? (
                  <select
                    value={template.scope || 'SYSTEM'}
                    onChange={(e) => handleUpdateField('scope', e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="SYSTEM">🌐 Toàn hệ thống (Tất cả đơn vị & lớp học)</option>
                    <option value="WORKSPACE">🏫 Theo Không gian / Cơ sở hiện hành</option>
                    <option value="CLASS">🎓 Theo Lớp học cụ thể</option>
                  </select>
                ) : (
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span className="text-blue-600 font-bold">🎓 Lớp học hiện hành</span>
                    <span className="text-[11px] text-slate-400 font-normal">(Thuộc phạm vi quản lý của GVCN)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blank Canvas State or Sections List */}
          {!template.sections || template.sections.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Layers className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-800">
                  Phiếu khảo sát trắng (Chưa có câu hỏi)
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bắt đầu soạn thảo câu hỏi mới, nhập nhanh từ link Google Form hoặc dán nội dung từ Word / AI.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Thêm phần đầu tiên</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGoogleFormModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition-all cursor-pointer shadow-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Nhập từ Google Form</span>
                  {!GoogleAuthService.hasClientId() && (
                    <span className="rounded bg-amber-400/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-100 border border-amber-300/40">
                      Chưa cấu hình
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPasteModalMode('AI')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Dán từ AI / ChatGPT</span>
                </button>
              </div>
            </div>
          ) : (
            /* Sections List */
            <div className="space-y-6">
              {(template.sections || []).map((sec, sIdx) => (
                <div
                  key={sec.id || sIdx}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                >
                  {/* Section Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold text-blue-800 shrink-0">
                          Phần {sIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={sec.title || ''}
                          onChange={(e) => handleUpdateSection(sIdx, { title: e.target.value })}
                          placeholder="Tiêu đề phần khảo sát..."
                          className="w-full rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 px-2 py-1 text-xs font-extrabold text-slate-900 focus:bg-white focus:outline-hidden"
                        />
                      </div>
                      <input
                        type="text"
                        value={sec.description || ''}
                        onChange={(e) => handleUpdateSection(sIdx, { description: e.target.value })}
                        placeholder="Mô tả bổ sung cho phần này (tùy chọn)..."
                        className="w-full rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 px-2 py-0.5 text-[11px] text-slate-500 italic focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveSection(sIdx, 'up')}
                        disabled={sIdx === 0}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Di chuyển phần lên"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSection(sIdx, 'down')}
                        disabled={sIdx === (template.sections?.length || 1) - 1}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Di chuyển phần xuống"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(sIdx)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer ml-1 transition-colors"
                        title="Xóa phần khảo sát này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Questions in Section */}
                  <div className="space-y-4">
                    {(sec.questions || []).map((q, qIdx) => (
                      <div
                        key={q.id || q.key || qIdx}
                        className={`rounded-2xl border p-4.5 space-y-3.5 transition-all ${
                          q.needsReview
                            ? 'border-amber-300 bg-amber-50/40'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {/* Question Top Row (Order, Title, Type, Move, Delete) */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 mt-1">
                              {qIdx + 1}
                            </span>
                            <textarea
                              rows={2}
                              value={q.title || ''}
                              onChange={(e) => handleUpdateQuestion(sIdx, qIdx, { title: e.target.value })}
                              placeholder="Nhập nội dung câu hỏi..."
                              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden resize-y min-h-[42px] leading-relaxed whitespace-normal break-words"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Question Type Selector */}
                            <select
                              value={q.type || 'SINGLE_CHOICE'}
                              onChange={(e) => {
                                const nextType = e.target.value as SurveyQuestionType;
                                const isGrid =
                                  nextType === 'GRID_SINGLE' ||
                                  nextType === 'GRID_MULTI' ||
                                  (nextType as any) === 'GRID';
                                const defaultRows =
                                  q.rows && q.rows.length > 0
                                    ? q.rows
                                    : ['Tiêu chí / Nội dung 1', 'Tiêu chí / Nội dung 2'];
                                const defaultCols =
                                  q.columns && q.columns.length > 0
                                    ? q.columns
                                    : [
                                        '1 – Chưa biết/chưa từng thực hiện',
                                        '2 – Biết cơ bản nhưng cần hướng dẫn',
                                        '3 – Có thể tự thực hiện',
                                        '4 – Thành thạo, có thể hỗ trợ bạn khác'
                                      ];

                                handleUpdateQuestion(sIdx, qIdx, {
                                  type: nextType,
                                  needsReview: false,
                                  options:
                                    nextType === 'SINGLE_CHOICE' ||
                                    nextType === 'MULTI_CHOICE' ||
                                    nextType === 'DROPDOWN'
                                      ? q.options && q.options.length > 0
                                        ? q.options
                                        : ['Lựa chọn 1', 'Lựa chọn 2']
                                      : undefined,
                                  rows: isGrid ? defaultRows : q.rows,
                                  gridRows: isGrid ? defaultRows : q.gridRows,
                                  columns: isGrid ? defaultCols : q.columns,
                                  gridColumns: isGrid ? defaultCols : q.gridColumns
                                });
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-hidden"
                            >
                              {QUESTION_TYPES.map((t) => (
                                <option key={t.type} value={t.type}>
                                  {t.label}
                                </option>
                              ))}
                            </select>

                            {/* Reorder and Delete Question */}
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(sIdx, qIdx, 'up')}
                              disabled={qIdx === 0}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Di chuyển câu hỏi lên"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(sIdx, qIdx, 'down')}
                              disabled={qIdx === (sec.questions?.length || 1) - 1}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Di chuyển câu hỏi xuống"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(sIdx, qIdx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 cursor-pointer"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Needs Review Alert */}
                        {q.needsReview && (
                          <div className="flex items-center gap-2 rounded-xl bg-amber-100/70 p-2.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <span>{q.reviewReason || 'Câu hỏi cần kiểm tra lại định dạng trước khi xuất bản.'}</span>
                          </div>
                        )}

                        {/* Question Description */}
                        <input
                          type="text"
                          value={q.description || ''}
                          onChange={(e) => handleUpdateQuestion(sIdx, qIdx, { description: e.target.value })}
                          placeholder="Mô tả / Gợi ý hướng dẫn trả lời cho học sinh (tùy chọn)..."
                          className="w-full rounded-xl border border-slate-200 bg-white/70 p-2 text-xs text-slate-600 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                        />

                        {/* Choice Options Editor (For SINGLE_CHOICE, MULTI_CHOICE, DROPDOWN) */}
                        {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE' || q.type === 'DROPDOWN') && (
                          <div className="space-y-2 rounded-xl bg-white p-3.5 border border-slate-200">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Danh sách phương án lựa chọn:
                            </label>

                            <div className="space-y-1.5">
                              {(q.options || []).map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-400 font-mono w-4 text-center">
                                    {q.type === 'SINGLE_CHOICE' ? '○' : q.type === 'MULTI_CHOICE' ? '□' : '•'}
                                  </span>
                                  <input
                                    type="text"
                                    value={opt || ''}
                                    onChange={(e) => handleUpdateOption(sIdx, qIdx, optIdx, e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOption(sIdx, qIdx, optIdx)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                    title="Xóa lựa chọn"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddOption(sIdx, qIdx)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Thêm lựa chọn mới</span>
                              </button>

                              {/* allowOther Checkbox */}
                              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-semibold">
                                <input
                                  type="checkbox"
                                  checked={q.allowOther || false}
                                  onChange={(e) => handleUpdateQuestion(sIdx, qIdx, { allowOther: e.target.checked })}
                                  className="h-3.5 w-3.5 rounded-sm text-blue-600"
                                />
                                <span>Cho phép lựa chọn "Khác" (Học sinh tự nhập)</span>
                              </label>
                            </div>

                            {/* Max selections for MULTI_CHOICE */}
                            {q.type === 'MULTI_CHOICE' && (
                              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                <span className="text-xs text-slate-600">Số lựa chọn tối đa:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={(q.options?.length || 0) + (q.allowOther ? 1 : 0)}
                                  value={q.maxSelections || ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                    handleUpdateQuestion(sIdx, qIdx, { maxSelections: val });
                                  }}
                                  placeholder="Không giới hạn"
                                  className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Date Question Settings */}
                        {q.type === 'DATE' && (
                          <div className="rounded-xl bg-white p-3.5 border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                              <Calendar className="h-4 w-4 text-emerald-600" />
                              <span>Định dạng câu hỏi chọn ngày tháng</span>
                            </div>
                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-semibold">
                              <input
                                type="checkbox"
                                checked={q.dateIncludeYear !== false}
                                onChange={(e) => handleUpdateQuestion(sIdx, qIdx, { dateIncludeYear: e.target.checked })}
                                className="h-3.5 w-3.5 rounded-sm text-emerald-600"
                              />
                              <span>Bao gồm năm sinh/năm chọn</span>
                            </label>
                          </div>
                        )}

                        {/* Time Question Settings */}
                        {q.type === 'TIME' && (
                          <div className="rounded-xl bg-white p-3.5 border border-slate-200 flex items-center gap-2 text-xs text-teal-800 font-semibold">
                            <Clock className="h-4 w-4 text-teal-600" />
                            <span>Định dạng câu hỏi chọn giờ / thời gian trong ngày (HH:MM)</span>
                          </div>
                        )}

                        {/* Duration Question Settings */}
                        {q.type === 'DURATION' && (
                          <div className="rounded-xl bg-white p-3.5 border border-slate-200 flex items-center gap-2 text-xs text-cyan-800 font-semibold">
                            <Timer className="h-4 w-4 text-cyan-600" />
                            <span>Định dạng câu hỏi nhập thời lượng (Số giờ / số phút)</span>
                          </div>
                        )}

                        {/* Scale / Rating Settings */}
                        {q.type === 'SCALE' && (
                          <div className="space-y-3 rounded-xl bg-white p-3.5 border border-slate-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Sliders className="h-3.5 w-3.5 text-blue-600" />
                                <span>Cấu hình Mức độ / Thang đo:</span>
                              </label>

                              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded-md font-semibold transition-all">
                                  <input
                                    type="radio"
                                    name={`scale-mode-${q.id || qIdx}`}
                                    checked={q.scaleMode !== 'CUSTOM' && (!q.options || q.options.length === 0)}
                                    onChange={() => {
                                      handleUpdateQuestion(sIdx, qIdx, {
                                        scaleMode: 'NUMERIC',
                                        scaleMin: q.scaleMin || 1,
                                        scaleMax: q.scaleMax || 5,
                                        options: undefined
                                      });
                                    }}
                                    className="h-3.5 w-3.5 text-blue-600"
                                  />
                                  <span
                                    className={
                                      q.scaleMode !== 'CUSTOM' && (!q.options || q.options.length === 0)
                                        ? 'text-blue-700 font-bold'
                                        : 'text-slate-600'
                                    }
                                  >
                                    Thang số
                                  </span>
                                </label>

                                <label className="inline-flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded-md font-semibold transition-all">
                                  <input
                                    type="radio"
                                    name={`scale-mode-${q.id || qIdx}`}
                                    checked={q.scaleMode === 'CUSTOM' || (q.options && q.options.length > 0)}
                                    onChange={() => {
                                      const defaultCustomLevels =
                                        q.options && q.options.length >= 2
                                          ? q.options
                                          : ['Không biết', 'Cơ bản', 'Biết', 'Nắm rõ'];
                                      handleUpdateQuestion(sIdx, qIdx, {
                                        scaleMode: 'CUSTOM',
                                        options: defaultCustomLevels
                                      });
                                    }}
                                    className="h-3.5 w-3.5 text-blue-600"
                                  />
                                  <span
                                    className={
                                      q.scaleMode === 'CUSTOM' || (q.options && q.options.length > 0)
                                        ? 'text-blue-700 font-bold'
                                        : 'text-slate-600'
                                    }
                                  >
                                    Mức độ tùy chỉnh
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Numeric Scale */}
                            {q.scaleMode !== 'CUSTOM' && (!q.options || q.options.length === 0) ? (
                              <div className="space-y-3 pt-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                      Điểm bắt đầu (Từ):
                                    </label>
                                    <input
                                      type="number"
                                      value={q.scaleMin ?? 1}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        handleUpdateQuestion(sIdx, qIdx, { scaleMin: isNaN(val) ? 1 : val });
                                      }}
                                      min={0}
                                      max={q.scaleMax ? q.scaleMax - 1 : 4}
                                      className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                                      <span>Điểm kết thúc (Đến):</span>
                                      <span className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateQuestion(sIdx, qIdx, { scaleMax: 5 })}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                            (q.scaleMax ?? 5) === 5
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          1→5
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateQuestion(sIdx, qIdx, { scaleMax: 10 })}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                            (q.scaleMax ?? 5) === 10
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          1→10
                                        </button>
                                      </span>
                                    </label>
                                    <input
                                      type="number"
                                      value={q.scaleMax ?? 5}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        handleUpdateQuestion(sIdx, qIdx, { scaleMax: isNaN(val) ? 5 : val });
                                      }}
                                      min={(q.scaleMin ?? 1) + 1}
                                      max={20}
                                      className="w-full rounded-lg border border-slate-200 p-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Custom Levels Scale */
                              <div className="space-y-3 pt-1">
                                <div className="space-y-2">
                                  {(q.options || []).map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-slate-500 w-14 shrink-0">
                                        Mức {optIdx + 1}:
                                      </span>
                                      <input
                                        type="text"
                                        value={opt || ''}
                                        onChange={(e) => handleUpdateOption(sIdx, qIdx, optIdx, e.target.value)}
                                        placeholder={`Nhập tên mức ${optIdx + 1}...`}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteOption(sIdx, qIdx, optIdx)}
                                        disabled={(q.options?.length || 0) <= 2}
                                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-25 cursor-pointer"
                                        title="Xóa mức"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddOption(sIdx, qIdx)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer pt-1"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>+ Thêm mức đánh giá mới</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Grid / Matrix Question Editor (GRID_SINGLE, GRID_MULTI, GRID) */}
                        {(q.type === 'GRID_SINGLE' || q.type === 'GRID_MULTI' || (q.type as any) === 'GRID') && (
                          <div className="space-y-4 rounded-xl bg-white p-4 border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Table className="h-4 w-4 text-blue-600" />
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                  Cấu hình Lưới Ma trận (Hàng × Cột)
                                </span>
                              </div>
                              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                                {q.type === 'GRID_MULTI'
                                  ? 'Lưới nhiều lựa chọn mỗi dòng (Checkbox Grid)'
                                  : 'Lưới một lựa chọn mỗi dòng (Radio Grid)'}
                              </span>
                            </div>

                            {/* Grid Rows & Columns 2-Column Responsive Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* SECTION 1: HÀNG (ROWS) */}
                              <div className="space-y-2.5 rounded-xl bg-slate-50/70 p-3 border border-slate-200">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>Danh sách Hàng (Tiêu chí / Nội dung):</span>
                                    <span className="text-blue-600 font-mono">
                                      ({(q.rows || q.gridRows || []).length})
                                    </span>
                                  </label>
                                </div>

                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                  {(q.rows || q.gridRows || []).map((row, rIdx) => (
                                    <div
                                      key={rIdx}
                                      className="flex items-start gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200"
                                    >
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 mt-1">
                                        {rIdx + 1}
                                      </span>
                                      <textarea
                                        rows={2}
                                        value={row || ''}
                                        onChange={(e) => handleUpdateGridRow(sIdx, qIdx, rIdx, e.target.value)}
                                        placeholder={`Nhập nội dung hàng ${rIdx + 1}...`}
                                        className="w-full rounded-md border border-slate-200 bg-slate-50/40 p-1.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden whitespace-normal break-words leading-relaxed resize-y min-h-[34px]"
                                      />
                                      <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveGridRow(sIdx, qIdx, rIdx, 'up')}
                                          disabled={rIdx === 0}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                          title="Đẩy lên"
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveGridRow(sIdx, qIdx, rIdx, 'down')}
                                          disabled={rIdx === (q.rows || q.gridRows || []).length - 1}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                          title="Đẩy xuống"
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteGridRow(sIdx, qIdx, rIdx)}
                                          disabled={(q.rows || q.gridRows || []).length <= 1}
                                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                                          title="Xóa hàng"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddGridRow(sIdx, qIdx)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer pt-1"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>+ Thêm hàng / tiêu chí mới</span>
                                </button>
                              </div>

                              {/* SECTION 2: CỘT (COLUMNS) */}
                              <div className="space-y-2.5 rounded-xl bg-slate-50/70 p-3 border border-slate-200">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>Danh sách Cột (Mức đánh giá):</span>
                                    <span className="text-blue-600 font-mono">
                                      ({(q.columns || q.gridColumns || []).length})
                                    </span>
                                  </label>
                                </div>

                                {/* Presets */}
                                <div className="flex items-center gap-1 flex-wrap pb-1">
                                  <span className="text-[10px] text-slate-400">Mẫu cột:</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSetGridPresets(sIdx, qIdx, [
                                        '1 – Chưa biết/chưa từng thực hiện',
                                        '2 – Biết cơ bản nhưng cần hướng dẫn',
                                        '3 – Có thể tự thực hiện',
                                        '4 – Thành thạo, có thể hỗ trợ bạn khác'
                                      ])
                                    }
                                    className="text-[10px] rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 font-medium cursor-pointer"
                                  >
                                    4 mức kỹ năng số
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSetGridPresets(sIdx, qIdx, [
                                        '1 - Chưa biết',
                                        '2 - Biết cơ bản',
                                        '3 - Nắm chắc',
                                        '4 - Rất thành thạo'
                                      ])
                                    }
                                    className="text-[10px] rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 font-medium cursor-pointer"
                                  >
                                    4 mức chuẩn
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSetGridPresets(sIdx, qIdx, [
                                        'Rất không hài lòng',
                                        'Không hài lòng',
                                        'Bình thường',
                                        'Hài lòng',
                                        'Rất hài lòng'
                                      ])
                                    }
                                    className="text-[10px] rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 font-medium cursor-pointer"
                                  >
                                    5 mức hài lòng
                                  </button>
                                </div>

                                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                  {(q.columns || q.gridColumns || []).map((col, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="flex items-start gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200"
                                    >
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 mt-1">
                                        {cIdx + 1}
                                      </span>
                                      <textarea
                                        rows={2}
                                        value={col || ''}
                                        onChange={(e) => handleUpdateGridColumn(sIdx, qIdx, cIdx, e.target.value)}
                                        placeholder={`Nhập tên cột ${cIdx + 1}...`}
                                        className="w-full rounded-md border border-slate-200 bg-slate-50/40 p-1.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden whitespace-normal break-words leading-relaxed resize-y min-h-[34px]"
                                      />
                                      <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveGridColumn(sIdx, qIdx, cIdx, 'up')}
                                          disabled={cIdx === 0}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                          title="Đẩy lên"
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveGridColumn(sIdx, qIdx, cIdx, 'down')}
                                          disabled={cIdx === (q.columns || q.gridColumns || []).length - 1}
                                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                          title="Đẩy xuống"
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteGridColumn(sIdx, qIdx, cIdx)}
                                          disabled={(q.columns || q.gridColumns || []).length <= 1}
                                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                                          title="Xóa cột"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddGridColumn(sIdx, qIdx)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer pt-1"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>+ Thêm cột / mức đánh giá mới</span>
                                </button>
                              </div>
                            </div>

                            {/* SECTION 3: BẢNG XEM TRƯỚC TRỰC TIẾP */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Xem trước bảng ma trận (Học viên nhìn thấy khi làm bài):</span>
                                </label>
                              </div>

                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                                <table className="min-w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200">
                                      <th className="p-3 font-bold text-slate-700 border-r border-slate-200 min-w-[200px] max-w-[320px] whitespace-normal break-words">
                                        Tiêu chí / Nội dung đánh giá
                                      </th>
                                      {(q.columns || q.gridColumns || []).map((col, colIndex) => (
                                        <th
                                          key={colIndex}
                                          className="p-3 font-bold text-slate-800 text-center border-r last:border-r-0 border-slate-200 min-w-[130px] max-w-[200px] whitespace-normal break-words leading-snug"
                                        >
                                          {col || `Cột ${colIndex + 1}`}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(q.rows || q.gridRows || []).map((row, rowIndex) => (
                                      <tr
                                        key={rowIndex}
                                        className={`border-b last:border-b-0 border-slate-100 hover:bg-slate-50/70 transition-colors ${
                                          rowIndex % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                                        }`}
                                      >
                                        <td className="p-3 font-semibold text-slate-800 border-r border-slate-200 whitespace-normal break-words leading-relaxed min-w-[200px] max-w-[320px]">
                                          <div className="flex items-start gap-2">
                                            <span className="text-slate-400 text-[11px] font-mono shrink-0 mt-0.5">
                                              {rowIndex + 1}.
                                            </span>
                                            <span>{row || `Hàng ${rowIndex + 1}`}</span>
                                          </div>
                                        </td>
                                        {(q.columns || q.gridColumns || []).map((_, colIndex) => (
                                          <td
                                            key={colIndex}
                                            className="p-3 text-center border-r last:border-r-0 border-slate-200"
                                          >
                                            {q.type === 'GRID_MULTI' ? (
                                              <input
                                                type="checkbox"
                                                disabled
                                                className="h-4 w-4 rounded-sm text-blue-600 border-slate-300 opacity-70 cursor-not-allowed mx-auto"
                                              />
                                            ) : (
                                              <input
                                                type="radio"
                                                disabled
                                                className="h-4 w-4 text-blue-600 border-slate-300 opacity-70 cursor-not-allowed mx-auto"
                                              />
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Question Settings Bottom Bar */}
                        <div className="flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-4">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => handleUpdateQuestion(sIdx, qIdx, { required: e.target.checked })}
                                className="h-3.5 w-3.5 rounded-sm text-blue-600"
                              />
                              <span>Bắt buộc trả lời</span>
                            </label>

                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 text-[11px]">Quyền xem:</span>
                              <select
                                value={q.visibility || 'NORMAL'}
                                onChange={(e) => handleUpdateQuestion(sIdx, qIdx, { visibility: e.target.value as any })}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 focus:outline-hidden"
                              >
                                <option value="NORMAL">Bình thường (Công khai nội bộ lớp)</option>
                                <option value="TEACHER_ONLY">Bảo mật (Chỉ GVCN xem)</option>
                              </select>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400">ID: {q.key}</span>
                        </div>
                      </div>
                    ))}

                    {/* Add Question Button */}
                    <button
                      type="button"
                      onClick={() => handleAddQuestion(sIdx)}
                      className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-white/60 p-3 text-center text-xs font-bold text-slate-600 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm câu hỏi vào Phần {sIdx + 1}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Đóng trình soạn thảo
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Lưu bản nháp
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              <Send className="h-4 w-4" />
              <span>{isPublishing ? 'Đang xuất bản...' : 'Áp dụng (Xuất bản v' + template.version + ')'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      {pasteModalMode && (
        <SurveyTextPasteModal
          isOpen={true}
          mode={pasteModalMode}
          hasExistingSections={(template.sections?.length || 0) > 0}
          onClose={() => setPasteModalMode(null)}
          onImport={(sections, source, importMode) => handleImportSections(sections, source, importMode)}
        />
      )}

      {docxModalOpen && (
        <SurveyDocxImportModal
          isOpen={true}
          onClose={() => setDocxModalOpen(false)}
          onImport={(sections) => handleImportSections(sections, 'DOCX_IMPORT', 'APPEND')}
        />
      )}

      {previewOpen && (
        <SurveyPreviewModal
          isOpen={true}
          onClose={() => setPreviewOpen(false)}
          template={template}
        />
      )}

      {googleFormModalOpen && (
        <SurveyGoogleFormImportModal
          isOpen={true}
          onClose={() => setGoogleFormModalOpen(false)}
          onImport={handleImportGoogleForm}
          hasExistingContent={(template.sections?.length || 0) > 0}
          initialFormUrl={template.externalSource?.url || ''}
          existingTemplate={template}
        />
      )}

      {/* IN-APP SECTION DELETE CONFIRMATION MODAL (100% reliable in sandboxed iframe) */}
      {sectionToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Xác nhận xóa phần khảo sát</h3>
                <p className="text-xs text-slate-500">Loại bỏ phần và các câu hỏi thuộc phần này</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5">
              <p className="font-extrabold text-slate-800 text-xs">{sectionToDelete.title}</p>
              <p className="text-slate-600">
                Số câu hỏi bên trong sẽ bị loại bỏ: <strong className="text-rose-600 font-extrabold">{sectionToDelete.questionCount} câu hỏi</strong>
              </p>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                * Các phần khảo sát khác và dữ liệu còn lại trong biểu mẫu sẽ được giữ nguyên 100%.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSectionToDelete(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteSection}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
              >
                Xác nhận xóa phần này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
