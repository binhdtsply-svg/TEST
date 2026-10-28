/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
  Key,
  Lock,
  Eye,
  EyeOff,
  Check,
  Trash2,
  Server
} from 'lucide-react';
import { aiService } from '../../services/AIService';
import { AIWorkspaceConfig, AISourceType } from '../../types';

interface AIConnectionBannerProps {
  config: AIWorkspaceConfig;
  onRefreshConfig: () => void;
  onOpenSettings?: () => void;
}

export const AIConnectionBanner: React.FC<AIConnectionBannerProps> = ({
  config,
  onRefreshConfig
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    model?: string;
    provider?: 'openai' | 'gemini' | 'none';
    status?: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED' | 'ERROR';
    sourceType?: AISourceType;
  } | null>(null);

  // Personal key modal/toggle state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputPersonalKey, setInputPersonalKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);

  const activeSource: AISourceType = config.sourceType || 'system';

  const fetchHealth = async (overrideConfig?: Partial<AIWorkspaceConfig>) => {
    setIsTesting(true);
    try {
      const cfg = overrideConfig || config;
      const res = await aiService.testConnection(cfg);
      setTestResult(res);
      onRefreshConfig();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Không thể kết nối đến máy chủ AI.',
        provider: 'none',
        status: 'DISCONNECTED'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSwitchSource = (newSource: AISourceType) => {
    aiService.setAISourceType(newSource);
    onRefreshConfig();
  };

  const handleSavePersonalKey = async () => {
    const clean = inputPersonalKey.trim();
    if (!clean) return;

    // Save strictly in-memory
    aiService.setPersonalApiKey(clean);
    aiService.setAISourceType('personal_gemini');
    setInputPersonalKey('');
    setShowKeyModal(false);
    setKeySavedMessage('Đã cấu hình khóa Gemini cá nhân cho phiên này.');
    setTimeout(() => setKeySavedMessage(null), 3000);

    const updated = aiService.getWorkspaceConfig();
    onRefreshConfig();
    fetchHealth(updated);
  };

  const handleClearPersonalKey = () => {
    aiService.clearPersonalApiKey();
    aiService.setAISourceType('system');
    setInputPersonalKey('');
    setShowKeyModal(false);
    setKeySavedMessage('Đã ngắt kết nối khóa cá nhân và chuyển về AI hệ thống.');
    setTimeout(() => setKeySavedMessage(null), 3000);

    const updated = aiService.getWorkspaceConfig();
    onRefreshConfig();
    fetchHealth(updated);
  };

  const currentStatus = testResult?.status || (config.connectionStatus === 'connected' ? 'CONNECTED' : config.connectionStatus === 'error' ? 'DISCONNECTED' : 'CHECKING');
  const hasPersonalKey = config.hasPersonalKeyConfigured;

  return (
    <div
      id="ai-connection-banner"
      className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs transition-all space-y-3.5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Identity & Model */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-indigo-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                AI TRỢ LÝ GVCN
              </h2>
              
              {/* Active Source Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                activeSource === 'personal_gemini'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
              }`}>
                {activeSource === 'personal_gemini' ? (
                  <>
                    <Key className="w-3 h-3 text-amber-600" />
                    <span>Gemini Cá nhân</span>
                  </>
                ) : (
                  <>
                    <Server className="w-3 h-3 text-indigo-600" />
                    <span>AI Hệ thống</span>
                  </>
                )}
              </span>

              {/* Status Badges */}
              {isTesting && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-600" />
                  Đang kiểm tra...
                </span>
              )}

              {!isTesting && currentStatus === 'CONNECTED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Đã kết nối
                </span>
              )}

              {!isTesting && currentStatus === 'DEGRADED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                  <Zap className="w-3 h-3 text-amber-600" />
                  Hệ thống dự phòng
                </span>
              )}

              {!isTesting && (currentStatus === 'DISCONNECTED' || currentStatus === 'ERROR') && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  {activeSource === 'personal_gemini' && !hasPersonalKey ? 'Chưa nhập khóa' : 'Chưa kết nối'}
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>
                {activeSource === 'personal_gemini'
                  ? 'Sử dụng quota Gemini cá nhân của GVCN · Cách ly an toàn theo tài khoản'
                  : 'Sử dụng hạ tầng AI hệ thống bảo mật · Quản lý tập trung · Không yêu cầu API key'}
              </span>
            </p>
          </div>
        </div>

        {/* Right: AI Source Switcher & Test Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
          {/* Source Radio Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              id="source-btn-system"
              onClick={() => handleSwitchSource('system')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeSource === 'system'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>1. AI hệ thống</span>
            </button>

            <button
              type="button"
              id="source-btn-personal"
              onClick={() => handleSwitchSource('personal_gemini')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeSource === 'personal_gemini'
                  ? 'bg-white text-amber-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>2. Gemini cá nhân</span>
              {hasPersonalKey && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Đã có khóa" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeSource === 'personal_gemini' && (
              <button
                type="button"
                id="btn-configure-personal-key"
                onClick={() => setShowKeyModal(true)}
                className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{hasPersonalKey ? 'Đổi khóa cá nhân' : 'Nhập khóa cá nhân'}</span>
              </button>
            )}

            <button
              id="btn-test-ai-connection"
              onClick={() => fetchHealth()}
              disabled={isTesting}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                isTesting
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 active:scale-98'
              }`}
              title="Kiểm tra kết nối thời gian thực"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm tra AI'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {keySavedMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{keySavedMessage}</span>
        </div>
      )}

      {/* Test feedback alerts */}
      {testResult && (
        <div
          id="ai-test-feedback"
          className={`p-3 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
            testResult.success
              ? testResult.status === 'DEGRADED'
                ? 'bg-amber-50/80 text-amber-900 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
              : 'bg-rose-50 text-rose-800 border border-rose-200/80'
          }`}
        >
          {testResult.success ? (
            testResult.status === 'DEGRADED' ? (
              <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-semibold flex items-center justify-between">
              <span>{testResult.message}</span>
              {testResult.latencyMs && (
                <span className="text-[11px] font-normal text-slate-500">
                  Độ trễ: {testResult.latencyMs}ms
                </span>
              )}
            </div>
            {!testResult.success && activeSource === 'personal_gemini' && !hasPersonalKey && (
              <p className="mt-1 text-slate-600 leading-relaxed text-[11px]">
                👉 Thầy/Cô vui lòng bấm nút <strong>"Nhập khóa cá nhân"</strong> ở trên để cung cấp Gemini API key riêng cho phiên làm việc này.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal / Popup for Personal Key Configuration */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Cấu hình Gemini cá nhân</h3>
                  <p className="text-[11px] text-slate-500">Dành riêng cho tài khoản GVCN hiện tại</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Gemini API Key (Google AI Studio):
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="personal-gemini-key-input"
                  value={inputPersonalKey}
                  onChange={(e) => setInputPersonalKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 rounded-xl border border-slate-300 px-3 py-2 pr-10 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Security Box */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  Bảo mật credential tuyệt đối
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 leading-relaxed">
                  <li>Khóa chỉ được giữ tạm trong bộ nhớ phiên làm việc trên trình duyệt.</li>
                  <li>Không lưu vào database, không ghi vào localStorage, không log ra console.</li>
                  <li>Hoàn toàn cách ly theo tài khoản GVCN, không chia sẻ với người khác.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              {hasPersonalKey ? (
                <button
                  type="button"
                  onClick={handleClearPersonalKey}
                  className="px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa khóa</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  id="btn-save-personal-gemini-key"
                  onClick={handleSavePersonalKey}
                  disabled={!inputPersonalKey.trim()}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                    !inputPersonalKey.trim()
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700 active:scale-98 shadow-amber-600/20'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu & Sử dụng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

