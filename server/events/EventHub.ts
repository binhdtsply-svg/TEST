/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { DomainEvent } from './DomainEvent';
import { getDatabase } from '../db/database';
import { notificationRepository } from '../repositories/NotificationRepository';

export interface SSEClient {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  studentId?: string;
  childStudentId?: string;
  res: Response;
  connectedAt: number;
}

export class EventHub {
  private clients: Map<string, SSEClient> = new Map();
  private recentEvents: Map<string, DomainEvent[]> = new Map(); // tenantId -> DomainEvent[]
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private MAX_RECENT_EVENTS = 200;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 25000);
  }

  private broadcastHeartbeat() {
    const pingData = JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() });
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(`event: ping\ndata: ${pingData}\n\n`);
      } catch {
        this.unregisterClient(clientId);
      }
    }
  }

  public registerClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    console.log(`[EventHub] Client connected: ${client.id} (Tenant: ${client.tenantId}, User: ${client.userId}, Role: ${client.role}) [Total: ${this.clients.size}]`);

    // Send initial handshake
    try {
      const initData = JSON.stringify({
        type: 'CONNECTED',
        clientId: client.id,
        tenantId: client.tenantId,
        timestamp: new Date().toISOString()
      });
      client.res.write(`event: connected\ndata: ${initData}\n\n`);
    } catch {
      this.unregisterClient(client.id);
    }
  }

  public unregisterClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`[EventHub] Client disconnected: ${clientId} [Remaining: ${this.clients.size}]`);
    }
  }

  /**
   * Publish a Domain Event to the tenant, persist notifications, and broadcast in real-time.
   */
  public publish(event: DomainEvent): void {
    const tenantId = event.tenantId;

    // 1. Buffer event in ring-buffer for reconnection/polling sync
    if (!this.recentEvents.has(tenantId)) {
      this.recentEvents.set(tenantId, []);
    }
    const tenantEvents = this.recentEvents.get(tenantId)!;
    tenantEvents.push(event);
    if (tenantEvents.length > this.MAX_RECENT_EVENTS) {
      tenantEvents.shift();
    }

    // 2. Persist notification to database if event has notification payload
    if (event.notification) {
      this.persistNotifications(event);
    }

    // 3. Broadcast to all active connected SSE clients in the same tenant
    const eventString = `event: domain_event\ndata: ${JSON.stringify(event)}\n\n`;

    for (const [clientId, client] of this.clients.entries()) {
      const isSuperAdmin = client.role === 'SUPER_ADMIN';
      const isSameTenant = client.tenantId === tenantId;
      if (!isSameTenant && !isSuperAdmin) {
        continue;
      }

      // Check RBAC and recipient filters
      if (!this.isClientEligibleForEvent(client, event)) {
        continue;
      }

      try {
        client.res.write(eventString);
      } catch (err) {
        console.warn(`[EventHub] Failed to send event to client ${clientId}:`, err);
        this.unregisterClient(clientId);
      }
    }
  }

  /**
   * Check if a connected client is eligible to receive this domain event
   */
  private isClientEligibleForEvent(client: SSEClient, event: DomainEvent): boolean {
    // 1. Exclude user if in excludeUserIds
    if (event.excludeUserIds && event.excludeUserIds.includes(client.userId)) {
      return false;
    }

    // 2. Parent visibility check
    if (event.parentVisible === false && client.role === 'PARENT') {
      return false;
    }

    // 3. Target roles filter
    if (event.targetRoles && event.targetRoles.length > 0) {
      const matchesRole = event.targetRoles.includes(client.role);
      if (!matchesRole) {
        return false;
      }
    }

    // 4. Target user IDs filter
    if (event.targetUserIds && event.targetUserIds.length > 0) {
      const targetIds = event.targetUserIds;
      const userMatched = targetIds.includes(client.userId) ||
        (client.studentId && targetIds.includes(client.studentId)) ||
        (client.childStudentId && targetIds.includes(client.childStudentId));
      if (!userMatched) {
        return false;
      }
    }

    return true;
  }

  /**
   * Persist notifications into SQLite database for all target recipients
   */
  private persistNotifications(event: DomainEvent): void {
    if (!event.notification) return;

    try {
      const db = getDatabase();
      const notif = event.notification;
      const now = event.timestamp || new Date().toISOString();

      // Find recipient user IDs within tenant based on targetRoles / targetUserIds
      let targetUserIds: string[] = [];

      if (event.targetUserIds && event.targetUserIds.length > 0) {
        targetUserIds = [...event.targetUserIds];
      } else {
        // Query credentials or teacher_accounts in tenant matching targetRoles
        const roles = event.targetRoles || ['TEACHER', 'STUDENT', 'CLASS_OFFICER', 'PARENT'];
        
        // Find teacher users
        if (roles.includes('TEACHER') || roles.includes('SUPER_ADMIN')) {
          const teachers = db.prepare('SELECT id, teacher_id FROM teacher_accounts WHERE tenant_id = ?').all(event.tenantId) as any[];
          for (const t of teachers) {
            targetUserIds.push(t.teacher_id || t.id);
          }
          // Also fallback standard teacher ID
          targetUserIds.push('u-gvcn', 'gv-01', 'teacher-01');
        }

        // Find credentials in tenant
        const creds = db.prepare(`
          SELECT id, owner_id, type, is_officer 
          FROM credentials 
          WHERE tenant_id = ? AND status = 'ACTIVE'
        `).all(event.tenantId) as any[];

        for (const c of creds) {
          if (roles.includes(c.type) || (c.is_officer && roles.includes('CLASS_OFFICER'))) {
            targetUserIds.push(c.owner_id);
          }
        }
      }

      // Deduplicate target user IDs
      const uniqueRecipients = Array.from(new Set(targetUserIds));

      for (const userId of uniqueRecipients) {
        // Exclude actor if in exclude list
        if (event.excludeUserIds && event.excludeUserIds.includes(userId)) {
          continue;
        }
        if (userId === event.actorId) {
          continue;
        }

        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        notificationRepository.create({
          id: notifId,
          tenant_id: event.tenantId,
          user_id: userId,
          role: event.targetRoles?.[0] || 'ALL',
          type: notif.type || 'info',
          title: notif.title,
          message: notif.message,
          link_to: notif.linkTo || null,
          is_read: 0,
          created_at: now
        });
      }
    } catch (err) {
      console.error('[EventHub] Error persisting notifications:', err);
    }
  }

  /**
   * Get events since a timestamp (for polling and reconnect catch-up)
   */
  public getEventsSince(tenantId: string, sinceTimestamp: string): DomainEvent[] {
    const events = this.recentEvents.get(tenantId) || [];
    if (!sinceTimestamp) {
      return events.slice(-30);
    }

    const sinceDate = new Date(sinceTimestamp).getTime();
    return events.filter(e => new Date(e.timestamp).getTime() > sinceDate);
  }
}

export const eventHub = new EventHub();
