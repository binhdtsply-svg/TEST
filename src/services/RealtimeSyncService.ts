/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authService } from './AuthService';
import { tenantService } from './TenantService';
import { inAppNotificationService } from './InAppNotificationService';
import { postService } from './PostService';
import { studentSurveyService } from './StudentSurveyService';
import { academicService } from './AcademicService';
import { trainingService } from './TrainingService';
import { parentCommunicationService } from './ParentCommunicationService';
import { classService } from './ClassService';
import { submissionService } from './SubmissionService';

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
  type: string;
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

type EventHandler = (event: DomainEvent) => void;

class RealtimeSyncService {
  private eventSource: EventSource | null = null;
  private isConnected: boolean = false;
  private reconnectTimeout: any = null;
  private reconnectAttempts: number = 0;
  private pollingInterval: any = null;
  private lastEventTimestamp: string = new Date().toISOString();
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private anyListeners: Set<EventHandler> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private activeTenantId: string = 'tenant-lan-nguyen';
  private activeSessionKey: string = '';
  private seenEventIds: Set<string> = new Set();
  private hadDisconnect: boolean = false;

  constructor() {
    this.activeTenantId = tenantService.getActiveTenantId();
    this.activeSessionKey = this.computeSessionKey();

    // Multi-tab sync via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('kgcns_realtime_events_channel');
        this.broadcastChannel.onmessage = (msgEvent) => {
          if (msgEvent.data && msgEvent.data.type === 'DOMAIN_EVENT') {
            const event: DomainEvent = msgEvent.data.event;
            this.handleIncomingEvent(event, false);
          }
        };
      } catch (err) {
        console.warn('[RealtimeSyncService] BroadcastChannel unavailable:', err);
      }
    }

    // Subscribe to tenant changes
    tenantService.subscribe(() => {
      const nextTenantId = tenantService.getActiveTenantId();
      if (nextTenantId !== this.activeTenantId) {
        this.activeTenantId = nextTenantId;
        this.reconnect();
      }
    });

    // Subscribe to auth session changes (login/logout/role switch)
    authService.subscribe(() => {
      const nextSessionKey = this.computeSessionKey();
      if (nextSessionKey !== this.activeSessionKey) {
        this.activeSessionKey = nextSessionKey;
        this.reconnect();
      }
    });

    // Start Real-time SSE Stream
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private computeSessionKey(): string {
    const token = authService.getToken() || (typeof localStorage !== 'undefined' ? localStorage.getItem('kgcns_auth_token') : '') || 'demo-token';
    const currentUser = authService.getCurrentUser();
    return `${currentUser?.id || 'u-gvcn'}:${currentUser?.role || 'TEACHER'}:${token}`;
  }

  /**
   * Connect to Server-Sent Events (SSE) stream endpoint
   */
  public connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      const token = authService.getToken() || localStorage.getItem('kgcns_auth_token') || 'demo-token';
      const currentUser = authService.getCurrentUser();
      const tenantId = tenantService.getActiveTenantId();
      const role = currentUser.role || 'TEACHER';
      const userId = currentUser.id || 'u-gvcn';

      const streamUrl = `/api/v1/events/stream?token=${encodeURIComponent(token)}&tenantId=${encodeURIComponent(tenantId)}&role=${encodeURIComponent(role)}&userId=${encodeURIComponent(userId)}`;
      
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        const recovering = this.hadDisconnect || this.reconnectAttempts > 0;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.hadDisconnect = false;
        this.stopPollingFallback();
        if (recovering) {
          this.pollEvents().catch(() => {});
          academicService.scheduleServerRecordsRefresh(150);
        }
      };

      this.eventSource.addEventListener('domain_event', (msgEvent: MessageEvent) => {
        try {
          const event: DomainEvent = JSON.parse(msgEvent.data);
          this.handleIncomingEvent(event, true);
        } catch (err) {
          console.error('[RealtimeSyncService] Error parsing domain_event:', err);
        }
      });

      this.eventSource.addEventListener('connected', () => {
        this.isConnected = true;
      });

      this.eventSource.addEventListener('ping', () => {
        // Keep-alive heartbeat received
      });

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.hadDisconnect = true;
        this.disconnect();
        this.scheduleReconnect();
        this.startPollingFallback();
      };
    } catch (err) {
      console.warn('[RealtimeSyncService] SSE initialization error:', err);
      this.startPollingFallback();
    }
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  public reconnect(): void {
    this.disconnect();
    this.connect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Fallback polling if SSE is temporarily unavailable
   */
  private startPollingFallback(): void {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(async () => {
      await this.pollEvents();
    }, 8000);
  }

  private stopPollingFallback(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async pollEvents(): Promise<void> {
    try {
      const token = authService.getToken() || localStorage.getItem('kgcns_auth_token') || 'demo-token';
      const tenantId = tenantService.getActiveTenantId();
      const res = await fetch(`/api/v1/events/poll?since=${encodeURIComponent(this.lastEventTimestamp)}&tenantId=${encodeURIComponent(tenantId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          for (const event of json.data) {
            this.handleIncomingEvent(event, false);
          }
          if (json.timestamp) {
            this.lastEventTimestamp = json.timestamp;
          }
        }
      }
    } catch {
      // ignore network errors in polling fallback
    }
  }

  /**
   * Central Event Dispatcher Pipeline
   */
  private handleIncomingEvent(event: DomainEvent, broadcastToTabs: boolean = true): void {
    if (!event || !event.type) return;

    // Deduplicate identical domain events across SSE, polling fallback, and BroadcastChannel
    if (event.id) {
      if (this.seenEventIds.has(event.id)) {
        return;
      }
      this.seenEventIds.add(event.id);
      if (this.seenEventIds.size > 500) {
        const oldestId = this.seenEventIds.values().next().value;
        if (oldestId) {
          this.seenEventIds.delete(oldestId);
        }
      }
    }

    if (event.timestamp && event.timestamp > this.lastEventTimestamp) {
      this.lastEventTimestamp = event.timestamp;
    }

    // 1. Check Tenant Isolation
    const currentTenant = tenantService.getActiveTenantId();
    const currentUser = authService.getCurrentUser();
    if (
      event.tenantId &&
      event.tenantId !== currentTenant &&
      event.tenantId !== 'platform-root' &&
      currentUser.role !== 'SUPER_ADMIN'
    ) {
      return;
    }

    // 2. Check RBAC Role Visibility
    if (event.parentVisible === false && currentUser.role === 'PARENT') {
      return;
    }

    // 3. Dispatch to InAppNotificationService (Notification Stream)
    if (event.notification) {
      inAppNotificationService.addNotification({
        eventId: event.id,
        tenantId: event.tenantId,
        workspaceId: event.tenantId,
        title: event.notification.title,
        desc: event.notification.message,
        type: event.notification.type || 'info',
        category: (event.notification.category as any) || 'system',
        targetRoles: (event.targetRoles as any) || ['TEACHER', 'STUDENT', 'PARENT', 'CLASS_OFFICER'],
        targetModule: (event.notification.linkTo as any) || 'posts',
        createdAtTimestamp: Date.now()
      });
    }

    // 4. Invalidate & Refresh Relevant Domain Services (Data Sync Stream)
    this.routeDomainDataSync(event);

    // 5. Notify Registered Component Listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[RealtimeSyncService] Listener error for ${event.type}:`, err);
        }
      });
    }

    this.anyListeners.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('[RealtimeSyncService] onAny listener error:', err);
      }
    });

    // 6. Broadcast across tabs
    if (broadcastToTabs && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'DOMAIN_EVENT',
          event
        });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Route Domain Event to specific local service caches to update data without page refresh
   */
  private routeDomainDataSync(event: DomainEvent): void {
    const { type, payload } = event;

    switch (type) {
      case 'POST_CREATED':
      case 'POST_APPROVED':
      case 'POST_REJECTED':
      case 'POST_UPDATED':
      case 'POST_DELETED':
      case 'POST_COMMENT_CREATED':
      case 'POST_COMMENT_DELETED':
      case 'POST_REACTION_CHANGED':
        postService.refresh();
        break;

      case 'SURVEY_SUBMITTED':
      case 'SURVEY_DRAFT_SAVED':
      case 'SURVEY_TEMPLATE_SAVED':
      case 'SURVEY_PROPOSAL_REVIEWED':
        studentSurveyService.refreshFromStorage();
        break;

      case 'ACADEMIC_RECORD_UPDATED':
      case 'ACADEMIC_PUBLISHED':
        academicService.scheduleServerRecordsRefresh();
        break;

      case 'ASSIGNMENT_CREATED':
      case 'ASSIGNMENT_DELETED':
      case 'TIMETABLE_UPDATED':
      case 'TIMETABLE_APPLIED':
      case 'EXAM_SCHEDULED':
        academicService.refresh();
        break;

      case 'TRAINING_POINT_RECORDED':
      case 'TRAINING_POINT_PROPOSED':
      case 'QUICK_REPORT_CREATED':
      case 'SUBMISSION_APPROVED':
      case 'SUBMISSION_REJECTED':
      case 'ATTENDANCE_RECORDED':
        trainingService.refresh();
        submissionService.refresh();
        postService.refresh();
        break;

      case 'PARENT_MESSAGE_SENT':
      case 'PARENT_ANNOUNCEMENT_SENT':
        parentCommunicationService.refresh();
        break;

      case 'CLASS_SETTINGS_UPDATED':
        classService.refresh();
        if (event.payload) {
          tenantService.syncClassroomConfiguration(event.tenantId, {
            schoolName: event.payload.schoolName,
            className: event.payload.className,
            totalStudentsCount: event.payload.totalStudents,
            academicYear: event.payload.academicYear
          });
        }
        tenantService.fetchTeachersFromServer().catch(() => {});
        break;

      default:
        break;
    }
  }

  /**
   * Publish a client-triggered domain event to the backend Event Router
   */
  public async publish(event: Partial<DomainEvent> & { type: string; payload: Record<string, any> }): Promise<void> {
    const currentUser = authService.getCurrentUser();
    const fullEvent: DomainEvent = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: event.type,
      tenantId: event.tenantId || tenantService.getActiveTenantId(),
      actorId: currentUser.id || 'u-gvcn',
      actorRole: currentUser.role || 'TEACHER',
      actorName: currentUser.name || 'Người dùng',
      targetRoles: event.targetRoles,
      targetUserIds: event.targetUserIds,
      excludeUserIds: event.excludeUserIds || [currentUser.id],
      parentVisible: event.parentVisible !== undefined ? event.parentVisible : true,
      payload: event.payload,
      notification: event.notification,
      timestamp: new Date().toISOString()
    };

    // Immediately handle locally for instant responsiveness
    this.handleIncomingEvent(fullEvent, true);

    // Send to backend server
    try {
      const token = authService.getToken() || localStorage.getItem('kgcns_auth_token') || 'demo-token';
      await fetch('/api/v1/events/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fullEvent)
      });
    } catch (err) {
      console.warn('[RealtimeSyncService] Failed to publish event to server:', err);
    }
  }

  /**
   * Subscribe to specific event types
   */
  public on(eventType: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(handler);
      }
    };
  }

  /**
   * Subscribe to all domain events
   */
  public onAny(handler: EventHandler): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const realtimeSyncService = new RealtimeSyncService();
