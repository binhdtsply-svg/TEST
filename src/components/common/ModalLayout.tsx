/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalTabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: number | string;
}

export interface ModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  tabs?: ModalTabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // default max-w-5xl
  headerActions?: React.ReactNode;
}

export const ModalLayout: React.FC<ModalLayoutProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tabs,
  activeTab,
  onTabChange,
  children,
  footer,
  maxWidthClass = 'max-w-5xl',
  headerActions
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[92vh] ${maxWidthClass} rounded-none md:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Sticky Header */}
        <div className="sticky top-0 z-sticky flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-2xs">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
              title="Đóng cửa sổ"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Sticky Tab Bar (if provided) - horizontal scroll isolated to tab bar */}
        {tabs && tabs.length > 0 && (
          <div className="sticky top-[69px] z-sticky border-b border-slate-100 bg-slate-50/90 px-4 py-2 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none scroll-snap-x py-1">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange && onTabChange(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer scroll-snap-align-start shrink-0 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {TabIcon && <TabIcon className="h-3.5 w-3.5" />}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Scrollable Modal Body (vertical scroll only, never horizontal) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {children}
        </div>

        {/* 4. Sticky Footer (if provided) */}
        {footer && (
          <div className="sticky bottom-0 z-sticky border-t border-slate-200 bg-slate-50 px-5 py-3.5 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
