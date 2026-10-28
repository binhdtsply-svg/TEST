/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { InAppNotification, UserAccount } from '../types';
import { inAppNotificationService } from '../services/InAppNotificationService';
import { authService } from '../services/AuthService';

export interface UseNotificationsResult {
  notifications: InAppNotification[];
  unreadCount: number;
  currentUser: UserAccount;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refresh: () => void;
}

export const useNotifications = (): UseNotificationsResult => {
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => authService.getCurrentUser());

  const getScopedNotifications = useCallback((user: UserAccount) => {
    return inAppNotificationService.getNotificationsForUser(
      user,
      user.studentId || user.childStudentId
    );
  }, []);

  const [notifications, setNotifications] = useState<InAppNotification[]>(() =>
    getScopedNotifications(currentUser)
  );

  const refresh = useCallback(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setNotifications(getScopedNotifications(user));
  }, [getScopedNotifications]);

  useEffect(() => {
    const unsubAuth = authService.subscribe((user) => {
      setCurrentUser(user);
      setNotifications(getScopedNotifications(user));
    });

    const unsubNotif = inAppNotificationService.subscribe(() => {
      const user = authService.getCurrentUser();
      setNotifications(getScopedNotifications(user));
    });

    return () => {
      unsubAuth();
      unsubNotif();
    };
  }, [getScopedNotifications]);

  const markAsRead = useCallback(
    (id: string) => {
      inAppNotificationService.markAsRead(id, currentUser.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
    [currentUser.id]
  );

  const markAllAsRead = useCallback(() => {
    inAppNotificationService.markAllAsRead(currentUser);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [currentUser]);

  const deleteNotification = useCallback((id: string) => {
    inAppNotificationService.deleteNotification(id);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    currentUser,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh
  };
};
