/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Link2,
  FileCode,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Info,
  ShieldAlert,
  Code2,
  FileText,
  LogIn,
  LogOut,
  UserCheck,
  Settings2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { SurveySection, SurveyTemplate } from '../../types';
import {
  GoogleFormsService,
  GoogleFormFetchResult,
  GoogleFormDiffResult,
  ParsedGoogleFormInput
} from '../../services/GoogleFormsService';
import {
  GoogleAuthService,
  GoogleSessionInfo,
  GoogleAuthErrorCode
} from '../../services/GoogleAuthService';
import { SurveyGoogleFormParser } from '../../services/SurveyGoogleFormParser';

interface SurveyGoogleFormImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (result: {
    title?: string;
    description?: string;
    sections: SurveySection[];
    mode: 'REPLACE' | 'APPEND';
    formId?: string;
    url?: string;
    responderUri?: string;
    revisionId?: string;
  }) => void;
  hasExistingContent: boolean;
  initialFormUrl?: string;
  existingTemplate?: SurveyTemplate;
}

const SAMPLE_TEXT_QUESTIONS = `Phiếu Khảo sát Nguyện vọng Học sinh Đầu năm
Mục đích: Nắm bắt tâm tư, định hướng thi cử và ý kiến của học sinh
* Bắt buộc

1. Họ và tên học sinh *
Câu trả lời của bạn

2. Số điện thoại cá nhân (hoặc Zalo)
Câu trả lời của bạn

3. Lựa chọn môn thi tự chọn tốt nghiệp THPT *
Mục 1 lựa chọn
( ) Vật lí
( ) Hóa học
( ) Sinh học
( ) Lịch sử
( ) Địa lí
( ) Tin học
( ) Khác...

4. Những môn học em tự tin nhất *
Mục nhiều lựa chọn
[ ] Toán
[ ] Ngữ văn
[ ] Tiếng Anh
[ ] Vật lí
[ ] Hóa học
[ ] Khác

5. Mức độ tự tin và sẵn sàng cho năm học mới
Thang điểm từ 1 đến 5
1  2  3  4  5

6. Ý kiến / Nguyện vọng riêng gửi Giáo viên Chủ nhiệm
Đoạn văn`;

export const SurveyGoogleFormImportModal: React.FC<SurveyGoogleFormImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  hasExistingContent,
  initialFormUrl = '',
  existingTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'URL_IFRAME' | 'PLAIN_TEXT'>('URL_IFRAME');
  const [inputUrlOrIframe, setInputUrlOrIframe] = useState<string>(initialFormUrl);
  const [pastedPlainText, setPastedPlainText] = useState<string>('');
  const [importMode, setImportMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');
  
  // Google Auth session state
  const [authSession, setAuthSession] = useState<GoogleSessionInfo>(() => GoogleAuthService.getSessionInfo());
  const [isConnectingAuth, setIsConnectingAuth] = useState<boolean>(false);

  // Parsing & Detection state
  const [parsedInput, setParsedInput] = useState<ParsedGoogleFormInput>(() =>
    GoogleFormsService.parseGoogleFormInput(initialFormUrl)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchResult, setFetchResult] = useState<GoogleFormFetchResult | null>(null);
  const [diffResult, setDiffResult] = useState<GoogleFormDiffResult | null>(null);
  
  // UI Panels
  const [showConfigGuide, setShowConfigGuide] = useState<boolean>(false);
  const [showDebugToken, setShowDebugToken] = useState<boolean>(false);
  const [debugTokenInput, setDebugTokenInput] = useState<string>('');
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);
  const [copiedDevOrigin, setCopiedDevOrigin] = useState<boolean>(false);

  const [errorStatus, setErrorStatus] = useState<{
    code: GoogleAuthErrorCode | 'UNKNOWN';
    message: string;
    details?: string;
  } | null>(null);

  // Subscribe to Google Auth changes
  useEffect(() => {
    const unsubscribe = GoogleAuthService.subscribe((session) => {
      setAuthSession(session);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initialFormUrl) {
      setInputUrlOrIframe(initialFormUrl);
      const parsed = GoogleFormsService.parseGoogleFormInput(initialFormUrl);
      setParsedInput(parsed);
    }
  }, [initialFormUrl]);

  if (!isOpen) return null;

  // Real-time Input Change & Classification
  const handleInputChange = (val: string) => {
    setInputUrlOrIframe(val);
    setErrorStatus(null);
    setFetchResult(null);
    setDiffResult(null);

    const parsed = GoogleFormsService.parseGoogleFormInput(val);
    setParsedInput(parsed);
  };

  // Google OAuth Connect Trigger
  const handleConnectGoogle = async () => {
    setIsConnectingAuth(true);
    setErrorStatus(null);
    try {
      await GoogleAuthService.connect({ includeFormsScope: true });
    } catch (err: any) {
      const code = GoogleAuthService.getSessionInfo().errorCode || 'GOOGLE_API_FAILED';
      setErrorStatus({
        code,
        message: err?.message || 'Không thể kết nối tài khoản Google.'
      });
    } finally {
      setIsConnectingAuth(false);
    }
  };

  const handleDisconnectGoogle = () => {
    GoogleAuthService.disconnect();
    setFetchResult(null);
    setDiffResult(null);
    setErrorStatus(null);
  };

  // Handle URL / iframe fetch via Google Forms API
  const handleFetchViaApi = async () => {
    const trimmed = inputUrlOrIframe.trim();
    const parsed = GoogleFormsService.parseGoogleFormInput(trimmed);
    setParsedInput(parsed);

    // Reject Responder URL with clear instructions
    if (parsed.inputType === 'RESPONDER_URL' || parsed.inputType === 'IFRAME_RESPONDER_URL') {
      setErrorStatus({
        code: 'GOOGLE_EDITOR_FORM_ID_REQUIRED',
        message: 'Đường dẫn bạn nhập là link dành cho người trả lời (/d/e/...). Google Forms API yêu cầu đường dẫn chỉnh sửa của Form dạng: https://docs.google.com/forms/d/FORM_ID/edit'
      });
      return;
    }

    if (parsed.inputType === 'INVALID' || !parsed.editorFormId) {
      setErrorStatus({
        code: 'GOOGLE_EDITOR_FORM_ID_REQUIRED',
        message: parsed.errorMessage || 'Đường dẫn Google Form không hợp lệ. Vui lòng kiểm tra lại URL.'
      });
      return;
    }

    // Require Google connection
    if (authSession.state !== 'CONNECTED' && !GoogleAuthService.getAccessToken()) {
      setErrorStatus({
        code: 'GOOGLE_CONFIG_MISSING',
        message: 'Vui lòng kết nối tài khoản Google trước khi nạp cấu trúc Form.'
      });
      return;
    }

    // Ensure Google Forms scope is granted when user actively fetches a form
    if (!GoogleAuthService.hasFormsScope()) {
      try {
        await GoogleAuthService.connect({ includeFormsScope: true });
      } catch (err: any) {
        const code = GoogleAuthService.getSessionInfo().errorCode || 'GOOGLE_API_FAILED';
        setErrorStatus({
          code,
          message: err?.message || 'Vui lòng cấp quyền đọc Google Forms để nạp cấu trúc biểu mẫu.'
        });
        return;
      }
    }

    setIsLoading(true);
    setErrorStatus(null);
    setFetchResult(null);
    setDiffResult(null);

    try {
      const res = await GoogleFormsService.fetchFormViaApi(parsed.editorFormId);

      if (!res.success) {
        setErrorStatus({
          code: res.errorCode || 'GOOGLE_API_FAILED',
          message: res.errorMessage || 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.'
        });
      } else {
        setFetchResult(res);

        // If updating an existing template, compute DIFF
        if (existingTemplate && existingTemplate.sections) {
          const diff = GoogleFormsService.diffGoogleForms(
            existingTemplate,
            res.sections || [],
            res.revisionId
          );
          setDiffResult(diff);
        }
      }
    } catch (err: any) {
      setErrorStatus({
        code: 'GOOGLE_API_FAILED',
        message: err?.message || 'Đã có lỗi xảy ra khi tải biểu mẫu Google Forms.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Plain Text Fallback
  const handleParsePlainText = () => {
    const trimmed = pastedPlainText.trim();
    if (!trimmed) {
      setErrorStatus({
        code: 'TEXT_PARSE_FAILED',
        message: 'Vui lòng dán nội dung văn bản danh sách câu hỏi.'
      });
      return;
    }

    const extraction = GoogleFormsService.parseGoogleFormInput(trimmed);
    if (
      extraction.inputType === 'EDITOR_URL' ||
      extraction.inputType === 'RESPONDER_URL' ||
      extraction.inputType === 'IFRAME_EDITOR_URL' ||
      extraction.inputType === 'IFRAME_RESPONDER_URL'
    ) {
      setInputUrlOrIframe(trimmed);
      setActiveTab('URL_IFRAME');
      setParsedInput(extraction);
      return;
    }

    try {
      setErrorStatus(null);
      const parsed = SurveyGoogleFormParser.parseTextStructure(trimmed);

      if (parsed.sections.length === 0 || parsed.stats.totalQuestions === 0) {
        setErrorStatus({
          code: 'TEXT_PARSE_FAILED',
          message: 'Không nhận diện được cấu trúc câu hỏi từ văn bản đã dán. Vui lòng kiểm tra lại định dạng câu hỏi (Ví dụ: 1. Tên câu hỏi * -> ( ) Lựa chọn 1).'
        });
        setFetchResult(null);
        return;
      }

      setFetchResult({
        success: true,
        title: parsed.title,
        description: parsed.description,
        sections: parsed.sections,
        warnings: parsed.warnings,
        stats: parsed.stats
      });
    } catch (err: any) {
      setErrorStatus({
        code: 'TEXT_PARSE_FAILED',
        message: err?.message || 'Lỗi khi phân tích nội dung văn bản câu hỏi.'
      });
      setFetchResult(null);
    }
  };

  const handleSaveDebugToken = () => {
    const clean = debugTokenInput.trim();
    GoogleAuthService.setDebugToken(clean || null);
    if (clean) {
      setErrorStatus(null);
      alert('Đã thiết lập Developer Access Token trong phiên làm việc.');
    } else {
      alert('Đã xóa Developer Access Token.');
    }
  };

  const handleConfirmImport = () => {
    if (!fetchResult || !fetchResult.sections || fetchResult.sections.length === 0) return;

    onImport({
      title: fetchResult.title,
      description: fetchResult.description,
      sections: fetchResult.sections,
      mode: hasExistingContent ? importMode : 'REPLACE',
      formId: fetchResult.formId,
      url: fetchResult.url,
      responderUri: fetchResult.responderUri,
      revisionId: fetchResult.revisionId
    });
    onClose();
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const copyOriginToClipboard = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedDevOrigin(true);
      setTimeout(() => setCopiedDevOrigin(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Nhập & Cập nhật từ Google Form
              </h3>
              <p className="text-xs text-slate-500">
                Đọc cấu trúc câu hỏi chính thức qua Google Forms API và chuyển đổi sang Khảo sát số
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              <span>3 Cách nhập</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 3 Import Ways Info Bar */}
        {showHelpGuide && (
          <div className="bg-purple-50/90 border-b border-purple-100 p-4 text-xs text-purple-950 space-y-2.5 animate-fade-in">
            <h4 className="font-extrabold flex items-center gap-1.5 text-purple-950">
              <Info className="h-4 w-4 text-purple-600" />
              Hướng dẫn 3 phương thức nhập:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
              <div className="bg-white/90 p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1">
                <span className="font-extrabold text-purple-900 flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5 text-purple-600" /> CÁCH 1 — KHUYẾN NGHỊ:
                </span>
                <p className="text-slate-600">
                  Dán đường link chỉnh sửa Form (dạng <code>docs.google.com/forms/d/FORM_ID/edit</code>) sau khi kết nối tài khoản Google.
                </p>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1">
                <span className="font-extrabold text-purple-900 flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5 text-purple-600" /> CÁCH 2 — MÃ NHÚNG IFRAME:
                </span>
                <p className="text-slate-600">
                  Nếu mã nhúng là link người trả lời (/d/e/), hệ thống sẽ hướng dẫn lấy link chỉnh sửa tương ứng.
                </p>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1">
                <span className="font-extrabold text-purple-900 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-purple-600" /> CÁCH 3 — DỰ PHÒNG (FALLBACK):
                </span>
                <p className="text-slate-600">
                  Dán nội dung danh sách câu hỏi dạng văn bản nếu không thể kết nối Google Forms API.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* SECTION 1: GOOGLE CONNECTION CARD */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-2xs ${
                    authSession.state === 'CONNECTED'
                      ? 'bg-emerald-600 text-white'
                      : authSession.state === 'REQUIRES_CONFIGURATION'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {authSession.state === 'CONNECTED' ? (
                    <UserCheck className="h-5 w-5" />
                  ) : authSession.state === 'REQUIRES_CONFIGURATION' ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">Google Forms:</span>
                    {authSession.state === 'CONNECTED' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> Đã kết nối: {authSession.email || 'Google User'}
                      </span>
                    ) : authSession.state === 'TOKEN_EXPIRED' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold text-rose-800">
                        <AlertTriangle className="h-3 w-3" /> Phiên kết nối đã hết hạn
                      </span>
                    ) : authSession.state === 'REQUIRES_CONFIGURATION' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800 border border-amber-200">
                        Chưa cấu hình
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-500">Chưa kết nối</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {authSession.state === 'CONNECTED'
                      ? 'Sẵn sàng đọc cấu trúc biểu mẫu qua Google Forms API (Scope: forms.body.readonly)'
                      : authSession.state === 'REQUIRES_CONFIGURATION'
                      ? 'Nhập từ Google Form chưa được cấu hình. Bạn vẫn có thể tạo khảo sát trực tiếp, dán câu hỏi từ AI/Word hoặc nhập DOCX.'
                      : 'Cần cấp quyền đọc biểu mẫu Google Forms để tự động nạp câu hỏi.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {authSession.state === 'CONNECTED' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isConnectingAuth}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Đổi tài khoản
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGoogle}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Ngắt kết nối</span>
                    </button>
                  </>
                ) : authSession.state === 'REQUIRES_CONFIGURATION' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                      title="Xem hướng dẫn cấu hình Client ID"
                    >
                      <LogIn className="h-3.5 w-3.5 text-slate-500" />
                      <span>Kết nối Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfigGuide(!showConfigGuide)}
                      className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>Xem hướng dẫn cấu hình</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isConnectingAuth}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  >
                    <LogIn className={`h-4 w-4 ${isConnectingAuth ? 'animate-spin' : ''}`} />
                    <span>{isConnectingAuth ? 'Đang mở đăng nhập...' : 'Kết nối Google'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Unconfigured Notice Banner */}
            {authSession.state === 'REQUIRES_CONFIGURATION' && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Nhập từ Google Form chưa được cấu hình.</p>
                  <p className="text-[11px] text-amber-800">
                    Bạn vẫn có thể tạo khảo sát trực tiếp, dán câu hỏi từ AI/Word hoặc nhập DOCX một cách nhanh chóng và đầy đủ tính năng.
                  </p>
                </div>
              </div>
            )}

            {/* Google Cloud Setup Instructions (Only if missing config or requested) */}
            {showConfigGuide && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2 font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="h-4 w-4 text-amber-700" />
                    Hướng dẫn cấu hình Google Cloud OAuth Client ID (Dành cho Quản trị viên):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfigGuide(false)}
                    className="text-amber-700 hover:text-amber-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-amber-900 leading-relaxed">
                  <li>
                    Truy cập <b>Google Cloud Console</b> (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-bold">console.cloud.google.com</a>).
                  </li>
                  <li>
                    Kích hoạt <b>Google Forms API</b> trong phần <i>APIs & Services → Enabled APIs & Services</i>.
                  </li>
                  <li>
                    Vào <i>Credentials → Create Credentials → OAuth Client ID</i>, chọn Application type: <b>Web application</b>.
                  </li>
                  <li>
                    Trong mục <b>Authorized JavaScript origins</b>, thêm địa chỉ web hiện tại của ứng dụng:
                    <div className="mt-1 flex items-center gap-2 bg-white/90 p-1.5 rounded-lg border border-amber-300 font-mono text-[10px] text-slate-800">
                      <span className="flex-1 truncate">{currentOrigin}</span>
                      <button
                        type="button"
                        onClick={copyOriginToClipboard}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold"
                      >
                        {copiedDevOrigin ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedDevOrigin ? 'Đã sao chép' : 'Sao chép URL'}</span>
                      </button>
                    </div>
                  </li>
                  <li>
                    Gán biến môi trường <code>VITE_GOOGLE_CLIENT_ID</code> bằng Client ID vừa tạo (ví dụ trong file <code>.env</code>) rồi tải lại trang.
                  </li>
                </ol>
              </div>
            )}

            {/* Developer Debug Token (Only in DEV mode) */}
            {import.meta.env.DEV && (
              <div className="mt-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDebugToken(!showDebugToken)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="h-3 w-3" />
                  <span>{showDebugToken ? 'Ẩn Developer Debug Token' : '⚙️ Cài đặt nâng cao dành cho nhà phát triển (Debug Mode)'}</span>
                </button>

                {showDebugToken && (
                  <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Developer Access Token (Chỉ dùng khi debug cục bộ):</span>
                      <span className="text-[10px] text-slate-400">DEV MODE ONLY</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={debugTokenInput}
                        onChange={(e) => setDebugTokenInput(e.target.value)}
                        placeholder="ya29.a0Ac..."
                        className="flex-1 rounded-lg border border-slate-200 p-2 font-mono text-xs focus:border-purple-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleSaveDebugToken}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition-all cursor-pointer text-xs"
                      >
                        Lưu Debug Token
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: TAB NAVIGATION */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('URL_IFRAME');
                setErrorStatus(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'URL_IFRAME'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Link2 className="h-4 w-4" />
              <span>Đường dẫn chỉnh sửa Google Form (URL)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('PLAIN_TEXT');
                setErrorStatus(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PLAIN_TEXT'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileCode className="h-4 w-4" />
              <span>Dán danh sách câu hỏi (Văn bản thuần túy)</span>
            </button>
          </div>

          {/* TAB 1: URL & IFRAME INPUT */}
          {activeTab === 'URL_IFRAME' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Dán đường dẫn chỉnh sửa của Google Form:</span>
                  <span className="text-[11px] text-slate-500 font-normal">Dạng <code>docs.google.com/forms/d/FORM_ID/edit</code></span>
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={inputUrlOrIframe}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/1XyZ.../edit"
                    className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-purple-500 focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleFetchViaApi}
                    disabled={isLoading || !inputUrlOrIframe.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Đang đọc Google Form...' : 'Nạp cấu trúc Form'}</span>
                  </button>
                </div>
              </div>

              {/* Responder URL / Iframe Detected Guidance */}
              {(parsedInput.inputType === 'RESPONDER_URL' || parsedInput.inputType === 'IFRAME_RESPONDER_URL') && (
                <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-950 space-y-1.5 animate-fade-in">
                  <div className="flex items-center gap-2 font-extrabold text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      {parsedInput.inputType === 'IFRAME_RESPONDER_URL'
                        ? 'Đã nhận diện mã nhúng iframe dành cho người trả lời (/d/e/...)'
                        : 'Đã nhận diện đường dẫn dành cho người làm bài / trả lời (/d/e/...)'}
                    </span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-amber-900">
                    Google Forms API yêu cầu <b>đường dẫn chỉnh sửa (Editor URL)</b> để đọc cấu trúc câu hỏi. Vui lòng mở Google Form bằng tài khoản sở hữu/chỉnh sửa của bạn, sao chép URL trên thanh địa chỉ dạng:
                  </p>
                  <div className="bg-white/90 p-2 rounded-lg border border-amber-300 font-mono text-[11px] text-purple-900">
                    https://docs.google.com/forms/d/<b>FORM_ID</b>/edit
                  </div>
                </div>
              )}

              {/* Editor URL Detected Confirmation */}
              {(parsedInput.inputType === 'EDITOR_URL' || parsedInput.inputType === 'IFRAME_EDITOR_URL') && parsedInput.editorFormId && (
                <div className="rounded-xl bg-purple-50 p-3 border border-purple-200 text-xs text-purple-950 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="font-bold">
                    Đã nhận diện Form ID chỉnh sửa: <code className="font-mono text-purple-800 bg-white px-1.5 py-0.5 rounded border border-purple-200">{parsedInput.editorFormId}</code>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLAIN TEXT FALLBACK */}
          {activeTab === 'PLAIN_TEXT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Dán nội dung văn bản danh sách câu hỏi:
                </label>
                <button
                  type="button"
                  onClick={() => setPastedPlainText(SAMPLE_TEXT_QUESTIONS)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Dán mẫu thử câu hỏi</span>
                </button>
              </div>

              <textarea
                rows={7}
                value={pastedPlainText}
                onChange={(e) => {
                  setPastedPlainText(e.target.value);
                  setErrorStatus(null);
                }}
                placeholder="Ví dụ:&#10;1. Họ và tên học sinh *&#10;Câu trả lời của bạn&#10;&#10;2. Môn thi tự chọn tốt nghiệp THPT *&#10;( ) Vật lí&#10;( ) Hóa học&#10;( ) Sinh học"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 font-mono text-xs text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-hidden"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePlainText}
                  disabled={!pastedPlainText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Phân tích văn bản câu hỏi</span>
                </button>
              </div>
            </div>
          )}

          {/* STRUCTURED ERROR BANNER */}
          {errorStatus && (
            <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-900 flex items-start gap-3 animate-fade-in">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span className="font-extrabold text-rose-950 flex items-center gap-1.5">
                  <span>Mã lỗi: {errorStatus.code}</span>
                </span>
                <p className="leading-relaxed text-rose-800">{errorStatus.message}</p>
                {(errorStatus.code === 'GOOGLE_CONFIG_MISSING' || errorStatus.message.includes('kết nối tài khoản Google')) && (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition-all cursor-pointer shadow-xs"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Kết nối tài khoản Google ngay</span>
                  </button>
                )}
                {errorStatus.code === 'GOOGLE_TOKEN_EXPIRED' && (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Kết nối lại Google</span>
                  </button>
                )}
                {errorStatus.code === 'GOOGLE_PERMISSION_DENIED' && (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    <span>Đổi sang tài khoản sở hữu Form</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PARSE / FETCH RESULT PREVIEW */}
          {fetchResult && fetchResult.sections && fetchResult.sections.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Google Form đã đọc thành công: {fetchResult.stats?.totalQuestions} câu hỏi ({fetchResult.stats?.totalSections} phần)
                    </h4>
                    <p className="text-xs text-slate-600">
                      Tên biểu mẫu: <b>{fetchResult.title}</b>
                    </p>
                  </div>
                </div>

                {/* Badge Stats */}
                {fetchResult.stats && (
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    {fetchResult.stats.singleChoiceCount > 0 && (
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800">
                        {fetchResult.stats.singleChoiceCount} trắc nghiệm đơn
                      </span>
                    )}
                    {fetchResult.stats.multiChoiceCount > 0 && (
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-bold text-indigo-800">
                        {fetchResult.stats.multiChoiceCount} nhiều lựa chọn
                      </span>
                    )}
                    {fetchResult.stats.gridCount > 0 && (
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 font-bold text-purple-900 border border-purple-200">
                        {fetchResult.stats.gridCount} dạng lưới (bảng)
                      </span>
                    )}
                    {fetchResult.stats.shortTextCount > 0 && (
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 font-bold text-slate-800">
                        {fetchResult.stats.shortTextCount} ngắn
                      </span>
                    )}
                    {fetchResult.stats.longTextCount > 0 && (
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 font-bold text-purple-800">
                        {fetchResult.stats.longTextCount} đoạn văn
                      </span>
                    )}
                    {fetchResult.stats.scaleCount > 0 && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                        {fetchResult.stats.scaleCount} thang điểm
                      </span>
                    )}
                    {fetchResult.stats.dropdownCount > 0 && (
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 font-bold text-teal-800">
                        {fetchResult.stats.dropdownCount} thả xuống
                      </span>
                    )}
                    {fetchResult.stats.needsReviewCount > 0 && (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                        {fetchResult.stats.needsReviewCount} cần kiểm tra
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* DIFF SUMMARY (If updating an existing template) */}
              {diffResult && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-extrabold text-slate-800 flex items-center justify-between">
                    <span>So sánh thay đổi với bản khảo sát hiện tại:</span>
                    {diffResult.unchanged ? (
                      <span className="text-emerald-700 font-bold">✓ Không có thay đổi so với lần nhập gần nhất</span>
                    ) : diffResult.hasChanges ? (
                      <span className="text-purple-700 font-bold">Phát hiện cập nhật</span>
                    ) : (
                      <span className="text-slate-500 font-normal">Cấu trúc tương đồng</span>
                    )}
                  </div>

                  {diffResult.unchanged && (
                    <p className="text-[11px] text-slate-500 italic">
                      Google Form chưa có thay đổi kể từ lần nhập gần nhất (Revision ID khớp).
                    </p>
                  )}

                  {diffResult.hasChanges && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                      {diffResult.added.length > 0 && (
                        <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-900">
                          <span className="font-bold">+ {diffResult.added.length} câu hỏi mới:</span>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {diffResult.added.slice(0, 3).map((a, i) => (
                              <li key={i} className="truncate">{a.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {diffResult.modified.length > 0 && (
                        <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-900">
                          <span className="font-bold">~ {diffResult.modified.length} câu hỏi thay đổi:</span>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {diffResult.modified.slice(0, 3).map((m, i) => (
                              <li key={i} className="truncate">{m.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {diffResult.removed.length > 0 && (
                        <div className="bg-rose-50 p-2 rounded-lg border border-rose-200 text-rose-900">
                          <span className="font-bold">- {diffResult.removed.length} câu hỏi không còn:</span>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {diffResult.removed.slice(0, 3).map((r, i) => (
                              <li key={i} className="truncate">{r.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Import Options (Replace vs Append) */}
              {hasExistingContent && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800">Tùy chọn nhập vào Survey Builder:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        importMode === 'REPLACE'
                          ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'REPLACE'}
                        onChange={() => setImportMode('REPLACE')}
                        className="text-purple-600"
                      />
                      <div className="text-xs">
                        <span>Thay thế toàn bộ biểu mẫu hiện tại</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        importMode === 'APPEND'
                          ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'APPEND'}
                        onChange={() => setImportMode('APPEND')}
                        className="text-purple-600"
                      />
                      <div className="text-xs">
                        <span>Thêm vào cuối biểu mẫu hiện tại</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Sections Breakdown List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fetchResult.sections.map((sec, sIdx) => (
                  <div key={sec.id || sIdx} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{sec.title}</span>
                      <span className="text-[11px] text-slate-500 font-normal">{sec.questions.length} câu hỏi</span>
                    </div>
                    <ul className="list-decimal pl-5 space-y-0.5 text-slate-600 text-[11px]">
                      {sec.questions.slice(0, 5).map((q, qIdx) => (
                        <li key={q.id || qIdx}>
                          <span className="font-medium text-slate-800">{q.title}</span>{' '}
                          {q.type === 'GRID' || q.type === 'GRID_MULTI' || q.type === 'GRID_SINGLE' ? (
                            <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              {q.type === 'GRID_MULTI' ? 'Lưới hộp kiểm' : 'Lưới trắc nghiệm'}: {q.rows?.length || q.gridRows?.length || 0} hàng × {q.columns?.length || q.gridColumns?.length || 0} cột
                            </span>
                          ) : (
                            <span className="text-slate-400">({q.type}{q.options ? ` - ${q.options.length} lựa chọn` : ''})</span>
                          )}
                          {q.needsReview && (
                            <span className="text-rose-600 font-bold ml-1.5">[Cần kiểm tra: {q.reviewReason}]</span>
                          )}
                        </li>
                      ))}
                      {sec.questions.length > 5 && (
                        <li className="list-none text-slate-400 italic">...và thêm {sec.questions.length - 5} câu hỏi khác</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Đóng / Hủy
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!fetchResult || !fetchResult.sections || fetchResult.sections.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            <span>Nhập vào bản nháp</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
