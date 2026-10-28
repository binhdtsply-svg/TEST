/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserLoginScreen } from './UserLoginScreen';
import { AdminLoginScreen } from './AdminLoginScreen';

export { UserLoginScreen, AdminLoginScreen };

interface LoginScreenProps {
  onLoginSuccess: () => void;
  initialMode?: 'user' | 'admin';
}

/**
 * LoginScreen Router Component
 * Automatically switches between UserLoginScreen (/app) and AdminLoginScreen (/quan-tri)
 * based on current pathname, hash, and user interaction.
 * Preserves legacy routes (/dang-nhap, /admin-login) for seamless backward compatibility.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, initialMode }) => {
  const detectIsAdminRoute = (): boolean => {
    if (typeof window !== 'undefined') {
      const path = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
      const hash = (window.location.hash || '').toLowerCase().replace('#', '').replace(/^\//, '').split('?')[0].split('/')[0];
      if (path === '/quan-tri' || path === '/quan-tri-x7k9' || path === '/admin-login' || hash === 'quan-tri' || hash === 'quan-tri-x7k9' || hash === 'quantri' || hash === 'admin-login') {
        return true;
      }
      if (path === '/app' || path === '/dang-nhap' || hash === 'app' || hash === 'dang-nhap') {
        return false;
      }
    }
    if (initialMode === 'admin') return true;
    if (initialMode === 'user') return false;
    return false;
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(detectIsAdminRoute);

  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminRoute(detectIsAdminRoute());
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleNavigateAdmin = () => {
    setIsAdminRoute(true);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', '/quan-tri');
      } catch {
        window.location.hash = 'quan-tri';
      }
    }
  };

  const handleNavigateUser = () => {
    setIsAdminRoute(false);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', '/app');
      } catch {
        window.location.hash = 'app';
      }
    }
  };

  if (isAdminRoute) {
    return (
      <AdminLoginScreen
        onLoginSuccess={onLoginSuccess}
        onNavigateUserLogin={handleNavigateUser}
      />
    );
  }

  return (
    <UserLoginScreen
      onLoginSuccess={onLoginSuccess}
      onNavigateAdminLogin={handleNavigateAdmin}
    />
  );
};
