/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DomainEventType =
  | 'POST_CREATED'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  | 'POST_PIN_CHANGED'
  | 'POST_COMMENT_CREATED'
  | 'POST_COMMENT_DELETED'
  | 'POST_REACTION_CHANGED'
  | 'POST_APPROVED'
  | 'POST_REJECTED'
  | 'SURVEY_SUBMITTED'
  | 'SURVEY_DRAFT_SAVED'
  | 'SURVEY_TEMPLATE_SAVED'
  | 'SURVEY_PROPOSAL_REVIEWED'
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_UPDATED'
  | 'ASSIGNMENT_DELETED'
  | 'ASSIGNMENT_PINNED'
  | 'QUICK_REPORT_CREATED'
  | 'SUBMISSION_CREATED'
  | 'SUBMISSION_APPROVED'
  | 'SUBMISSION_REJECTED'
  | 'ACADEMIC_PUBLISHED'
  | 'ACADEMIC_RECORD_UPDATED'
  | 'EXAM_SCHEDULE_SAVED'
  | 'PARENT_MESSAGE_SENT'
  | 'PARENT_ANNOUNCEMENT_SENT'
  | 'ATTENDANCE_RECORDED'
  | 'TRAINING_POINT_RECORDED'
  | 'CLASS_SETTINGS_UPDATED'
  | 'TIMETABLE_UPDATED'
  | 'TIMETABLE_APPLIED'
  | 'NOTIFICATION_READ'
  | 'PING';

export interface DomainEventNotificationPayload {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  linkTo?: string;
  category?: string;
  meta?: Record<string, any>;
}

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  tenantId: string;
  actorId: string;
  actorRole: string;
  actorName?: string;
  targetRoles?: string[];
  targetUserIds?: string[];
  excludeUserIds?: string[];
  parentVisible?: boolean;
  payload: Record<string, any>;
  notification?: DomainEventNotificationPayload;
  timestamp: string;
}
