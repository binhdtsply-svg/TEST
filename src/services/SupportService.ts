/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SupportTicket,
  SupportTicketStatus,
  UserFeedback,
  FeedbackStatus,
  SupportFeedbackStats,
  SupportTicketCategory,
  SupportTicketPriority,
  FeedbackType,
  FeedbackCategory
} from '../types';
import { authService } from './AuthService';
import { inAppNotificationService } from './InAppNotificationService';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storageUtils';

const STORAGE_KEYS = {
  MY_TICKETS: 'kgcns_support_my_tickets',
  MY_FEEDBACKS: 'kgcns_support_my_feedbacks'
};

type Listener = () => void;

class SupportService {
  private listeners: Listener[] = [];

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('[SupportService] Listener error', err);
      }
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private getAuthHeaders(tokenOverride?: string): HeadersInit {
    const token = tokenOverride || authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  // ==========================================================================
  // 1. SUPPORT TICKETS
  // ==========================================================================

  async submitTicket(data: {
    title: string;
    description: string;
    category: SupportTicketCategory;
    priority?: SupportTicketPriority;
    relatedModule?: string;
    userEmail?: string;
    userPhone?: string;
  }): Promise<{ success: boolean; message: string; ticket?: SupportTicket }> {
    try {
      let token = authService.getToken();
      if (!token) {
        token = await authService.ensureValidSession();
      }

      let res = await fetch('/api/v1/support/tickets', {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(data)
      });

      if (res.status === 401) {
        const refreshed = await authService.ensureValidSession();
        if (refreshed) {
          res = await fetch('/api/v1/support/tickets', {
            method: 'POST',
            headers: this.getAuthHeaders(refreshed),
            body: JSON.stringify(data)
          });
        }
      }

      const result = await res.json();
      if (result.success && result.ticket) {
        // Cache locally for offline/fast viewing
        try {
          const raw = safeLocalStorageGet(STORAGE_KEYS.MY_TICKETS);
          const cached: SupportTicket[] = raw ? JSON.parse(raw) : [];
          const updated = [result.ticket, ...cached.filter((t: SupportTicket) => t.id !== result.ticket!.id)];
          safeLocalStorageSet(STORAGE_KEYS.MY_TICKETS, JSON.stringify(updated));
        } catch {
          // ignore cache error
        }

        // Notify Admin
        try {
          inAppNotificationService.notifySupportTicketCreated({
            id: result.ticket.id,
            ticketCode: result.ticket.ticketCode,
            title: result.ticket.title,
            userName: result.ticket.userName,
            userRole: result.ticket.userRole,
            category: result.ticket.category
          });
        } catch (notifErr) {
          console.warn('[SupportService] Failed to dispatch support notification:', notifErr);
        }

        this.notify();
      }
      return result;
    } catch (err) {
      console.error('[SupportService] Error submitting ticket:', err);
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
      };
    }
  }

  async fetchMyTickets(): Promise<SupportTicket[]> {
    try {
      const res = await fetch('/api/v1/support/tickets/my', {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tickets)) {
          safeLocalStorageSet(STORAGE_KEYS.MY_TICKETS, JSON.stringify(data.tickets));
          return data.tickets;
        }
      }
    } catch (err) {
      console.warn('[SupportService] Failed to fetch my tickets from API, using cache:', err);
    }
    try {
      const raw = safeLocalStorageGet(STORAGE_KEYS.MY_TICKETS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async fetchAllTickets(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
  }): Promise<SupportTicket[]> {
    try {
      const query = new URLSearchParams();
      if (filters?.status) query.append('status', filters.status);
      if (filters?.category) query.append('category', filters.category);
      if (filters?.priority) query.append('priority', filters.priority);
      if (filters?.search) query.append('search', filters.search);

      const res = await fetch(`/api/v1/support/tickets?${query.toString()}`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tickets)) {
          return data.tickets;
        }
      }
    } catch (err) {
      console.error('[SupportService] Error fetching all tickets:', err);
    }
    return [];
  }

  async fetchTicketDetails(id: string): Promise<SupportTicket | null> {
    try {
      const res = await fetch(`/api/v1/support/tickets/${id}`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.ticket) {
          return data.ticket;
        }
      }
    } catch (err) {
      console.error('[SupportService] Error fetching ticket details:', err);
    }
    return null;
  }

  async updateTicketStatus(params: {
    ticketId: string;
    status: SupportTicketStatus;
    adminResponse?: string;
    adminNotes?: string;
  }): Promise<{ success: boolean; message: string; ticket?: SupportTicket }> {
    try {
      const res = await fetch(`/api/v1/support/tickets/${params.ticketId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          status: params.status,
          adminResponse: params.adminResponse,
          adminNotes: params.adminNotes
        })
      });
      const data = await res.json();
      this.notify();
      return data;
    } catch (err) {
      console.error('[SupportService] Error updating ticket status:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ.' };
    }
  }

  // ==========================================================================
  // 2. USER FEEDBACK & SUGGESTIONS
  // ==========================================================================

  async submitFeedback(data: {
    type: FeedbackType;
    rating?: number;
    category: FeedbackCategory;
    relatedModule?: string;
    title?: string;
    content: string;
    isAnonymous: boolean;
    userName?: string;
    userEmail?: string;
  }): Promise<{ success: boolean; message: string; feedback?: UserFeedback }> {
    try {
      let token = authService.getToken();
      if (!token) {
        token = await authService.ensureValidSession();
      }

      let res = await fetch('/api/v1/support/feedbacks', {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(data)
      });

      if (res.status === 401) {
        const refreshed = await authService.ensureValidSession();
        if (refreshed) {
          res = await fetch('/api/v1/support/feedbacks', {
            method: 'POST',
            headers: this.getAuthHeaders(refreshed),
            body: JSON.stringify(data)
          });
        }
      }

      const result = await res.json();
      if (result.success && result.feedback) {
        try {
          const raw = safeLocalStorageGet(STORAGE_KEYS.MY_FEEDBACKS);
          const cached: UserFeedback[] = raw ? JSON.parse(raw) : [];
          const updated = [result.feedback, ...cached.filter((f: UserFeedback) => f.id !== result.feedback!.id)];
          safeLocalStorageSet(STORAGE_KEYS.MY_FEEDBACKS, JSON.stringify(updated));
        } catch {
          // ignore cache error
        }

        // Notify Admin
        try {
          inAppNotificationService.notifyFeedbackSubmitted({
            id: result.feedback.id,
            title: result.feedback.title,
            content: result.feedback.content,
            userName: result.feedback.userName,
            rating: result.feedback.rating,
            type: result.feedback.type
          });
        } catch (notifErr) {
          console.warn('[SupportService] Failed to dispatch feedback notification:', notifErr);
        }

        this.notify();
      }
      return result;
    } catch (err) {
      console.error('[SupportService] Error submitting feedback:', err);
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
      };
    }
  }

  async fetchMyFeedbacks(): Promise<UserFeedback[]> {
    try {
      let token = authService.getToken();
      if (!token) {
        token = await authService.ensureValidSession();
      }

      let res = await fetch('/api/v1/support/feedbacks/my', {
        headers: this.getAuthHeaders(token)
      });

      if (res.status === 401) {
        const refreshed = await authService.ensureValidSession();
        if (refreshed) {
          res = await fetch('/api/v1/support/feedbacks/my', {
            headers: this.getAuthHeaders(refreshed)
          });
        }
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.feedbacks)) {
          safeLocalStorageSet(STORAGE_KEYS.MY_FEEDBACKS, JSON.stringify(data.feedbacks));
          return data.feedbacks;
        }
      }
    } catch (err) {
      console.warn('[SupportService] Failed to fetch my feedbacks from API, using cache:', err);
    }
    try {
      const raw = safeLocalStorageGet(STORAGE_KEYS.MY_FEEDBACKS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async fetchAllFeedbacks(filters?: {
    type?: string;
    category?: string;
    status?: string;
    module?: string;
    search?: string;
  }): Promise<UserFeedback[]> {
    try {
      const query = new URLSearchParams();
      if (filters?.type) query.append('type', filters.type);
      if (filters?.category) query.append('category', filters.category);
      if (filters?.status) query.append('status', filters.status);
      if (filters?.module) query.append('module', filters.module);
      if (filters?.search) query.append('search', filters.search);

      const res = await fetch(`/api/v1/support/feedbacks?${query.toString()}`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.feedbacks)) {
          return data.feedbacks;
        }
      }
    } catch (err) {
      console.error('[SupportService] Error fetching all feedbacks:', err);
    }
    return [];
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string; feedback?: UserFeedback }> {
    try {
      const res = await fetch(`/api/v1/support/feedbacks/${feedbackId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status, adminNotes })
      });
      const data = await res.json();
      this.notify();
      return data;
    } catch (err) {
      console.error('[SupportService] Error updating feedback status:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ.' };
    }
  }

  // ==========================================================================
  // 3. STATS & ANALYTICS
  // ==========================================================================

  private cachedStats: SupportFeedbackStats | null = null;

  getStats(): SupportFeedbackStats {
    if (this.cachedStats) return this.cachedStats;
    const stored = safeLocalStorageGet('kgcns_support_stats');
    if (stored) {
      try {
        this.cachedStats = JSON.parse(stored);
        if (this.cachedStats) return this.cachedStats;
      } catch {}
    }
    return {
      tickets: {
        total: 0,
        new: 0,
        processing: 0,
        responded: 0,
        resolved: 0,
        closed: 0
      },
      feedbacks: {
        total: 0,
        ratingsCount: 0,
        averageRating: 0,
        bugsCount: 0,
        suggestionsCount: 0,
        byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        byRole: {},
        byModule: {},
        byStatus: {}
      }
    };
  }

  async fetchStats(): Promise<SupportFeedbackStats | null> {
    try {
      const res = await fetch('/api/v1/support/stats', {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          this.cachedStats = data.stats;
          safeLocalStorageSet('kgcns_support_stats', JSON.stringify(data.stats));
          return data.stats;
        }
      }
    } catch (err) {
      console.error('[SupportService] Error fetching stats:', err);
    }
    return this.cachedStats || this.getStats();
  }

  // ==========================================================================
  // 4. ACCOUNT SUPPORT DESK (Super Admin)
  // ==========================================================================

  async searchAccounts(params?: {
    query?: string;
    role?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      const q = new URLSearchParams();
      if (params?.query) q.append('query', params.query);
      if (params?.role) q.append('role', params.role);
      if (params?.status) q.append('status', params.status);

      const res = await fetch(`/api/v1/support/accounts?${q.toString()}`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          return data.accounts;
        }
      }
    } catch (err) {
      console.error('[SupportService] Error searching accounts:', err);
    }
    return [];
  }

  async resetAccountPassword(tenantId: string, ownerId: string, type: 'TEACHER' | 'STUDENT' | 'PARENT'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/v1/support/accounts/reset-password', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ tenantId, ownerId, type })
      });
      return await res.json();
    } catch (err) {
      console.error('[SupportService] Error resetting account password:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ khi reset mật khẩu.' };
    }
  }
}

export const supportService = new SupportService();
