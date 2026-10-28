/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserCog, RotateCcw, ChevronUp, ChevronDown, Check, ShieldAlert, Layers, X } from 'lucide-react';
import { authService } from '../../services/AuthService';
import { tenantService } from '../../services/TenantService';
import { classService } from '../../services/ClassService';
import { UserRole } from '../../types';

interface DemoRoleMatrixProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DemoRoleMatrix: React.FC<DemoRoleMatrixProps> = ({ isOpen, onClose }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(authService.getRole());
  const [activeTenant, setActiveTenant] = useState(tenantService.getActiveTenant());
  const [allTenants, setAllTenants] = useState<any[]>(() => 
    tenantService.getTenants().filter(t => t.id !== 'platform-root' && t.id !== 'default')
  );
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    const unsubAuth = authService.subscribe((user) => {
      setCurrentRole(user.role);
    });
    const unsubTenant = tenantService.subscribe(() => {
      setActiveTenant(tenantService.getActiveTenant());
      setAllTenants(tenantService.getTenants().filter(t => t.id !== 'platform-root' && t.id !== 'default'));
    });

    return () => {
      unsubAuth();
      unsubTenant();
    };
  }, []);

  const handleSwitchRole = (role: UserRole) => {
    authService.switchRole(role);
  };

  const handleSwitchTenant = (tenantId: string) => {
    tenantService.setActiveTenant(tenantId);
    if (tenantId === 'tenant-hoang-nam') {
      authService.switchToTeacher2();
    } else {
      authService.switchRole('TEACHER');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại toàn bộ dữ liệu demo về trạng thái ban đầu?')) {
      classService.resetToDefault();
      authService.switchRole('TEACHER');
      window.location.reload();
    }
  };

  if (isOpen === false) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xl hover:bg-slate-800 transition-all border border-slate-700 cursor-pointer"
        >
          <UserCog className="h-4 w-4 text-amber-400" />
          <span>Demo Role Switcher</span>
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-fade-in">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md p-4 text-white shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Bảng Chuyển Đổi Vai Trò & Tenant Demo
            </h4>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Thu nhỏ"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Đóng"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Workspace Tenant Switcher */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-indigo-400" />
              <span>Không gian Lớp / GVCN ({allTenants.length} không gian):</span>
            </div>
            {allTenants.length >= 3 && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800">Đầy đủ {allTenants.length} lớp</span>
            )}
          </div>
          <div className={`grid ${allTenants.length > 2 ? 'grid-cols-1 sm:grid-cols-2 max-h-36 overflow-y-auto pr-1' : 'grid-cols-2'} gap-1.5 text-xs`}>
            {allTenants.map((t) => {
              const isActive = activeTenant.id === t.id;
              const displayName = t.name || (t.ownerName ? `${t.ownerName} (${t.schoolName})` : t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => handleSwitchTenant(t.id)}
                  className={`rounded-xl px-2.5 py-1.5 font-bold transition-all text-left truncate cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white ring-1 ring-indigo-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={`${displayName} - ${t.schoolName || ''}`}
                >
                  <span className="truncate block">{displayName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roles Switcher */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Vai trò trải nghiệm:
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { role: 'TEACHER' as UserRole, label: 'GVCN' },
              { role: 'CLASS_OFFICER' as UserRole, label: 'Ban Cán Sự' },
              { role: 'STUDENT' as UserRole, label: 'Học Viên' },
              { role: 'PARENT' as UserRole, label: 'Phụ Huynh' }
            ].map((item) => {
              const active = currentRole === item.role;
              return (
                <button
                  key={item.role}
                  onClick={() => handleSwitchRole(item.role)}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset button */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Dữ liệu thử nghiệm</span>
          <button
            onClick={handleResetData}
            className="flex items-center gap-1 font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
