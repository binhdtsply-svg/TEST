/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, UserRole } from '../types';

export type PermissionAction =
  | 'platform.manage'
  | 'teacher.manage'
  | 'workspace.manage'
  | 'featureFlags.toggle'
  | 'migrations.run'
  | 'auditLogs.view'
  | 'class.create'
  | 'class.editSettings'
  | 'student.viewList'
  | 'student.addEdit'
  | 'student.delete'
  | 'student.viewPrivateProfile'
  | 'points.propose'
  | 'points.approve'
  | 'points.editRules'
  | 'academic.viewAll'
  | 'academic.edit'
  | 'academic.viewOwn'
  | 'attendance.submit'
  | 'posts.create'
  | 'posts.delete'
  | 'posts.comment'
  | 'album.create'
  | 'album.delete'
  | 'album.comment'
  | 'parentBridge.access'
  | 'graduation.calculate'
  | 'graduation.editAll'
  | 'graduation.editOwn'
  | 'holland.viewAll'
  | 'holland.viewOwn'
  | 'timetable.edit'
  | 'timetable.view';

export interface PermissionContext {
  targetStudentId?: string;
  targetAuthorId?: string;
  targetTenantId?: string;
  isSupportBreakGlass?: boolean;
}

class PermissionManager {
  /**
   * Central role & capability checker
   */
  public can(
    user: UserAccount | null | undefined,
    action: PermissionAction,
    context?: PermissionContext
  ): boolean {
    if (!user) return false;

    const role = user.role;

    // 1. SUPER ADMIN
    if (role === 'SUPER_ADMIN') {
      // Super Admin has full platform & system privileges
      if (
        action === 'platform.manage' ||
        action === 'teacher.manage' ||
        action === 'workspace.manage' ||
        action === 'featureFlags.toggle' ||
        action === 'migrations.run' ||
        action === 'auditLogs.view'
      ) {
        return true;
      }

      // If Support/Break-glass is active, allow inspecting tenant data
      if (context?.isSupportBreakGlass) {
        return true;
      }

      // Default Super admin can view general non-private workspace content
      if (
        action === 'student.viewList' ||
        action === 'timetable.view' ||
        action === 'graduation.calculate'
      ) {
        return true;
      }

      return false; // Respect privacy by default without break-glass
    }

    // 2. TEACHER (GVCN)
    if (role === 'TEACHER') {
      // Teacher has complete authority inside their assigned workspace
      if (
        action === 'platform.manage' ||
        action === 'teacher.manage' ||
        action === 'workspace.manage' ||
        action === 'featureFlags.toggle' ||
        action === 'migrations.run'
      ) {
        return false; // Platform operations belong to SUPER_ADMIN only
      }
      return true;
    }

    // 3. CLASS OFFICER (Ban Cán sự Lớp)
    if (role === 'CLASS_OFFICER') {
      const perms = user.permissions || {
        manageAssignments: true,
        manageTests: true,
        manageActivities: true,
        publishPosts: true,
        submitStudentEvent: true,
        submitAttendance: true
      };

      switch (action) {
        case 'timetable.view':
        case 'student.viewList':
        case 'graduation.calculate':
          return true;

        case 'attendance.submit':
          return perms.submitAttendance !== false;

        case 'posts.create':
          return perms.publishPosts !== false;

        case 'posts.comment':
        case 'album.comment':
          return true;

        case 'points.propose':
          return perms.submitStudentEvent !== false;

        case 'posts.delete':
          return context?.targetAuthorId === user.id;

        case 'academic.viewOwn':
        case 'graduation.editOwn':
        case 'holland.viewOwn':
          return !context?.targetStudentId || context.targetStudentId === user.studentId;

        // Forbidden for Officer:
        case 'class.editSettings':
        case 'points.approve':
        case 'points.editRules':
        case 'academic.edit':
        case 'parentBridge.access':
        case 'student.addEdit':
        case 'student.delete':
        case 'student.viewPrivateProfile':
          return false;

        default:
          return false;
      }
    }

    // 4. STUDENT (Học sinh)
    if (role === 'STUDENT') {
      switch (action) {
        case 'timetable.view':
        case 'student.viewList':
        case 'graduation.calculate':
        case 'posts.comment':
        case 'album.comment':
          return true;

        case 'points.propose':
          // Student can propose self-achievement
          return true;

        case 'academic.viewOwn':
        case 'graduation.editOwn':
        case 'holland.viewOwn':
          return !context?.targetStudentId || context.targetStudentId === user.studentId;

        case 'posts.create':
          // Standard students do not create official bulletin announcements
          return false;

        default:
          return false;
      }
    }

    // 5. PARENT (Phụ huynh)
    if (role === 'PARENT') {
      const childId = user.childStudentId || user.studentId;

      switch (action) {
        case 'timetable.view':
        case 'parentBridge.access':
        case 'student.viewList':
          return true;

        case 'posts.comment':
        case 'posts.create':
        case 'posts.delete':
          // Strictly Read-Only on Classroom Feed for PARENT
          return false;

        case 'album.comment':
          return true;

        case 'academic.viewOwn':
        case 'holland.viewOwn':
          return !context?.targetStudentId || context.targetStudentId === childId;

        case 'graduation.calculate':
          return true;

        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Helper to check officer permissions easily
   */
  public isOfficerWith(user: UserAccount | null | undefined, feature: 'manageAssignments' | 'manageTests' | 'manageActivities' | 'submitAttendance' | 'publishPosts'): boolean {
    if (!user || user.role !== 'CLASS_OFFICER') return false;
    return Boolean(user.permissions && user.permissions[feature]);
  }
}

export const permissionService = new PermissionManager();
