/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { CurrentStudyPeriodResult } from '../types';
import { classService } from '../services/ClassService';
import { schoolWeekService } from '../services/SchoolWeekService';
import { authService } from '../services/AuthService';
import { tenantService } from '../services/TenantService';

/**
 * Custom Hook: useCurrentStudyPeriod
 * Single Authoritative Source of Truth for Study Week & School Year period across all roles
 * (GVCN, Cán sự, Học viên, Phụ huynh) within the active workspace/class.
 */
export function useCurrentStudyPeriod(): CurrentStudyPeriodResult {
  const [currentPeriod, setCurrentPeriod] = useState<CurrentStudyPeriodResult>(() => {
    const settings = classService.getSettings();
    return schoolWeekService.getCurrentStudyPeriod(settings.schoolYearTimeline, new Date());
  });

  useEffect(() => {
    const updatePeriod = () => {
      const settings = classService.getSettings();
      const nextPeriod = schoolWeekService.getCurrentStudyPeriod(settings.schoolYearTimeline, new Date());
      setCurrentPeriod(nextPeriod);
    };

    // 1. Initial calculate on mount
    updatePeriod();

    // 2. Subscriptions to service state changes
    const unsubClass = classService.subscribe(updatePeriod);
    const unsubWeek = schoolWeekService.subscribe(updatePeriod);
    const unsubAuth = authService.subscribe(updatePeriod);
    const unsubTenant = tenantService.subscribe(updatePeriod);

    // 3. Recalculate on window focus and visibility change
    const handleFocus = () => updatePeriod();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePeriod();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Periodic check (every 60s) and midnight rollover
    const intervalId = window.setInterval(updatePeriod, 60000);

    return () => {
      unsubClass();
      unsubWeek();
      unsubAuth();
      unsubTenant();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  return currentPeriod;
}
