/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScheduleAndAssignmentsModule } from '../academic/ScheduleAndAssignmentsModule';

/**
 * Streamlined Daily Homework & Assignments Module
 * Grouped strictly by study days in accordance with the Vietnamese homeroom system.
 */
export const AssignmentModule: React.FC = () => {
  return <ScheduleAndAssignmentsModule initialSubTab="assignments" />;
};

export default AssignmentModule;
