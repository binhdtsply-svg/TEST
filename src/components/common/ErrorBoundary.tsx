/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#overview';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] rounded-3xl border border-rose-200 bg-linear-to-b from-rose-50/70 to-white p-6 sm:p-8 text-center shadow-sm flex flex-col items-center justify-center space-y-4 my-4 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner">
            <AlertTriangle className="h-7 w-7" />
          </div>
          
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-black text-slate-900">
              {this.props.fallbackTitle || 'Đã xảy ra lỗi hiển thị'}
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Ứng dụng đã tự động bảo vệ dữ liệu của bạn. Hãy thử tải lại khu vực này hoặc chuyển sang mục khác.
            </p>
            {this.state.error?.message && (
              <div className="mt-2 rounded-xl bg-rose-100/60 p-2.5 text-[11px] font-mono text-rose-800 break-all text-left">
                {this.state.error.message}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Thử lại</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Về Tổng quan</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
