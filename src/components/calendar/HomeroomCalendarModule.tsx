/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TeacherWorkCenterSection } from '../overview/TeacherWorkCenterSection';
import { UserRole } from '../../types';

interface HomeroomCalendarModuleProps {
  currentUserRole: UserRole;
  currentClassId?: string;
  onNavigateToModule: (module: string, params?: Record<string, any>) => void;
}

export const HomeroomCalendarModule: React.FC<HomeroomCalendarModuleProps> = ({
  currentUserRole,
  currentClassId,
  onNavigateToModule
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <TeacherWorkCenterSection
        currentUserRole={currentUserRole}
        currentClassId={currentClassId}
        onNavigateToModule={onNavigateToModule}
      />
    </div>
  );
};
