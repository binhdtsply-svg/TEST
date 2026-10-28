/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Users, Radio } from 'lucide-react';

/**
 * DevRouteSwitcher Component
 *
 * Dedicated route testing tool for Google AI Studio Preview / Development.
 * CRITICAL REQUIREMENTS:
 * 1. ONLY rendered when import.meta.env.DEV is true (statically tree-shaken in production).
 * 2. Does NOT use localStorage or user role as evidence of environment.
 * 3. Does NOT auto-login, does NOT grant permissions, does NOT bypass server-side guards.
 * 4. Navigates cleanly between /quan-tri and /app using existing router.
 */
export const DevRouteSwitcher: React.FC = () => {
  // 1. Strict environment guard: Completely hidden in production
  if (!import.meta.env.DEV) {
    return null;
  }

  const detectActiveRoute = (): 'admin' | 'user' => {
    if (typeof window === 'undefined') return 'user';
    const path = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
    const hash = (window.location.hash || '').toLowerCase().replace('#', '').replace(/^\//, '').split('?')[0].split('/')[0];
    if (path === '/quan-tri' || path === '/quan-tri-x7k9' || path === '/admin-login' || hash === 'quan-tri' || hash === 'quan-tri-x7k9' || hash === 'quantri' || hash === 'admin-login') {
      return 'admin';
    }
    return 'user';
  };

  const [activeRoute, setActiveRoute] = useState<'admin' | 'user'>(detectActiveRoute);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      setActiveRoute(detectActiveRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (target: 'admin' | 'user') => {
    const targetPath = target === 'admin' ? '/quan-tri' : '/app';
    const targetHash = target === 'admin' ? 'quan-tri' : 'app';

    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', targetPath);
      } catch {
        // Fallback for strict iframe origin constraints
        window.location.hash = targetHash;
      }
      window.location.hash = targetHash;
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setActiveRoute(target);
  };

  if (isMinimized) {
    return (
      <aside aria-label="Dev Route Switcher Mini" className="fixed bottom-3 right-3 z-[9999]">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-xs font-semibold shadow-xl backdrop-blur-md transition-all cursor-pointer"
          title="Mở bảng kiểm thử route AI Studio"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>Dev Router: {activeRoute === 'admin' ? '/quan-tri' : '/app'}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Dev Route Switcher" className="fixed bottom-3 right-3 z-[9999]">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-md text-slate-100 flex flex-col gap-2 min-w-[280px] max-w-[340px]">
        {/* Header with Dev Indicator */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              AI Studio Preview Test
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
              DEV ONLY
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
              title="Thu nhỏ thanh điều hướng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Current Active Route Badge */}
        <div className="text-[11px] text-slate-300 px-1 flex items-center justify-between">
          <span className="text-slate-400">Route hiện tại:</span>
          <code className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
            activeRoute === 'admin'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}>
            {activeRoute === 'admin' ? '/quan-tri' : '/app'}
          </code>
        </div>

        {/* Two Required Navigation Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => navigateTo('admin')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeRoute === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50'
                : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Mở đăng nhập Admin</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('user')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeRoute === 'user'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50'
                : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mở đăng nhập người dùng</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
