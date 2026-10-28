/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Info,
  BookOpen,
  Calculator,
  UserCheck,
  Award,
  Layers,
  Sparkles,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { authService } from '../../services/AuthService';
import { GraduationGeneralInfoTab } from './GraduationGeneralInfoTab';
import { GraduationRegistrationTab } from './GraduationRegistrationTab';
import { GraduationCalculatorTab } from './GraduationCalculatorTab';
import { GraduationTeacherTrackingTab } from './GraduationTeacherTrackingTab';
import { GraduationArticleModal } from './GraduationArticleModal';
import { OfficialGraduationArticle } from '../../types';

interface GraduationModuleProps {
  initialTab?: 'info' | 'registration' | 'calculator' | 'teacher_tracking';
}

export const GraduationModule: React.FC<GraduationModuleProps> = ({ initialTab = 'info' }) => {
  const currentUser = authService.getCurrentUser();
  const isTeacher = currentUser.role === 'TEACHER';

  const [activeTab, setActiveTab] = useState<'info' | 'registration' | 'calculator' | 'teacher_tracking'>(initialTab);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState<boolean>(false);
  const [editingArticle, setEditingArticle] = useState<OfficialGraduationArticle | null>(null);

  useEffect(() => {
    if (initialTab) {
      if (!isTeacher && initialTab === 'teacher_tracking') {
        setActiveTab('info');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, isTeacher]);

  // Guard against non-teachers opening teacher_tracking
  useEffect(() => {
    if (!isTeacher && activeTab === 'teacher_tracking') {
      setActiveTab('info');
    }
  }, [isTeacher, activeTab]);

  const handleOpenCreateArticle = () => {
    setEditingArticle(null);
    setIsArticleModalOpen(true);
  };

  const handleOpenEditArticle = (art: OfficialGraduationArticle) => {
    setEditingArticle(art);
    setIsArticleModalOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
              THI TỐT NGHIỆP THPT &amp; XÉT CÔNG NHẬN TỐT NGHIỆP
            </h1>
            <p className="text-xs text-slate-500">
              Cổng thông tin quy chế, đăng ký 02 môn tự chọn, tính điểm dự kiến &amp; theo dõi xét tốt nghiệp THPT.
            </p>
          </div>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
            Chương trình GDPT 2018
          </span>
          <span className="rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            Quy chế &amp; Tuyển sinh
          </span>
        </div>
      </div>

      {/* Sub-Tabs Navigation (4 Tabs for Teacher, 3 for Students/Parents) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        {/* Tab 1: THÔNG TIN CHUNG */}
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'info'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Info className="h-4 w-4" />
          <span>1. THÔNG TIN CHUNG</span>
        </button>

        {/* Tab 2: ĐĂNG KÝ MÔN THI */}
        <button
          onClick={() => setActiveTab('registration')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'registration'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>2. ĐĂNG KÝ MÔN THI</span>
        </button>

        {/* Tab 3: DỰ KIẾN XÉT TỐT NGHIỆP */}
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'calculator'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>3. DỰ KIẾN XÉT TỐT NGHIỆP</span>
        </button>

        {/* Tab 4: THEO DÕI CỦA GVCN (TEACHER ONLY) */}
        {isTeacher && (
          <button
            onClick={() => setActiveTab('teacher_tracking')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teacher_tracking'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>4. THEO DÕI CỦA GVCN</span>
            <span className="rounded-md bg-white/20 px-1.5 py-0.2 text-[10px]">GVCN</span>
          </button>
        )}
      </div>

      {/* Active Tab Content */}
      <div className="pt-1">
        {activeTab === 'info' && (
          <GraduationGeneralInfoTab
            onOpenCreateArticleModal={handleOpenCreateArticle}
            onOpenEditArticleModal={handleOpenEditArticle}
          />
        )}

        {activeTab === 'registration' && <GraduationRegistrationTab />}

        {activeTab === 'calculator' && <GraduationCalculatorTab />}

        {activeTab === 'teacher_tracking' && isTeacher && <GraduationTeacherTrackingTab />}
      </div>

      {/* Article Create/Edit Modal */}
      {isArticleModalOpen && (
        <GraduationArticleModal
          initialArticle={editingArticle}
          onClose={() => {
            setIsArticleModalOpen(false);
            setEditingArticle(null);
          }}
        />
      )}
    </div>
  );
};
