/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, LayoutDashboard, UserCheck } from 'lucide-react';
import { UserRole } from '../../types';

export interface AccessRestrictedProps {
  role?: UserRole;
  userRole?: UserRole;
  attemptedModule?: string;
  moduleName?: string;
  requiredRole?: string;
  onGoHome?: () => void;
  onBackToHome?: () => void;
  onGoPersonalResults?: () => void;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  role,
  userRole,
  attemptedModule,
  moduleName,
  requiredRole,
  onGoHome,
  onBackToHome,
  onGoPersonalResults
}) => {
  const effectiveRole = userRole || role || 'STUDENT';
  const handleHome = onBackToHome || onGoHome || (() => {});

  const getResolvedModuleName = () => {
    if (moduleName) return moduleName;
    switch (attemptedModule) {
      case 'students':
        return 'Quản lý Học viên & Hồ sơ lớp';
      case 'parents':
        return 'Nhịp cầu Phụ huynh & Trao đổi riêng';
      case 'settings':
        return 'Cài đặt lớp & Cấu hình bảo mật';
      case 'approvals':
        return 'Nội dung chờ Giáo viên chủ nhiệm duyệt';
      case 'reports':
        return 'Báo cáo quản trị & Thống kê toàn trường';
      default:
        return 'Khu vực quản trị lớp học';
    }
  };

  const getRoleTitle = (r: UserRole) => {
    switch (r) {
      case 'STUDENT':
        return 'Học viên';
      case 'PARENT':
        return 'Phụ huynh';
      case 'CLASS_OFFICER':
        return 'Ban cán sự lớp';
      case 'SUPER_ADMIN':
        return 'Quản trị viên';
      default:
        return 'Người dùng';
    }
  };

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs animate-fade-in max-w-2xl mx-auto my-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mb-4 shadow-xs">
        <Lock className="h-8 w-8" />
      </div>

      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
        403 • Quyền truy cập bị giới hạn
      </span>

      <h2 className="text-xl font-black text-slate-900 mt-3 tracking-tight">
        Không có quyền truy cập module này
      </h2>

      <p className="text-xs text-slate-600 mt-2 max-w-md leading-relaxed">
        Tài khoản vai trò <b className="text-slate-800">{getRoleTitle(effectiveRole)}</b> không có quyền xem hoặc chỉnh sửa <b className="text-slate-800">{getResolvedModuleName()}</b>. Module này chỉ dành cho Giáo viên chủ nhiệm (GVCN).
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          onClick={handleHome}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Về trang Tổng quan lớp</span>
        </button>

        {onGoPersonalResults && (
          <button
            onClick={onGoPersonalResults}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span>Xem Kết quả cá nhân của tôi</span>
          </button>
        )}
      </div>
    </div>
  );
};
