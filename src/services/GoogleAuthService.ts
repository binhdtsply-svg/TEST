/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export type GoogleAuthState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'TOKEN_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'REQUIRES_CONFIGURATION'
  | 'ERROR';

export type GoogleAuthErrorCode =
  | 'GOOGLE_CONFIG_MISSING'
  | 'GOOGLE_CONNECT_CANCELLED'
  | 'GOOGLE_TOKEN_EXPIRED'
  | 'GOOGLE_PERMISSION_DENIED'
  | 'GOOGLE_FORM_NOT_FOUND'
  | 'GOOGLE_EDITOR_FORM_ID_REQUIRED'
  | 'GOOGLE_API_FAILED'
  | 'GOOGLE_UNSUPPORTED_ITEM'
  | 'TEXT_PARSE_FAILED';

export interface GoogleSessionInfo {
  state: GoogleAuthState;
  email: string | null;
  name?: string;
  avatarUrl?: string;
  sub?: string;
  accessToken?: string;
  hasClientId: boolean;
  hasFormsScope?: boolean;
  clientId?: string;
  errorMessage?: string;
  errorCode?: GoogleAuthErrorCode;
}

export interface GoogleConnectOptions {
  includeFormsScope?: boolean;
}

const SESSION_TOKEN_KEY = 'kgcns_google_access_token';
const SESSION_EMAIL_KEY = 'kgcns_google_user_email';
const SESSION_NAME_KEY = 'kgcns_google_user_name';
const SESSION_AVATAR_KEY = 'kgcns_google_user_avatar';
const SESSION_SUB_KEY = 'kgcns_google_user_sub';
const SESSION_FORMS_SCOPE_KEY = 'kgcns_google_forms_scope';
const GOOGLE_FORMS_READONLY_SCOPE = 'https://www.googleapis.com/auth/forms.body.readonly';

// Initialize Firebase App
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
const auth = firebaseAuth;

/**
 * Creates a GoogleAuthProvider configured with basic identity scopes by default,
 * and only attaches the Google Forms scope when explicitly requested.
 */
function createGoogleProvider(includeFormsScope: boolean = false): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  if (includeFormsScope) {
    provider.addScope(GOOGLE_FORMS_READONLY_SCOPE);
  }
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}

export class GoogleAuthService {
  private static token: string | null = null;
  private static email: string | null = null;
  private static profileName?: string;
  private static avatarUrl?: string;
  private static sub?: string;
  private static formsScopeGranted = false;
  private static state: GoogleAuthState = 'DISCONNECTED';
  private static errorCode?: GoogleAuthErrorCode;
  private static errorMessage?: string;
  private static listeners: Set<(session: GoogleSessionInfo) => void> = new Set();
  private static isInitialized = false;

  /**
   * Initialize Auth state and restore cached session if available
   */
  private static ensureInit() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Restore cached session from sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const storedToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
      const storedEmail = window.sessionStorage.getItem(SESSION_EMAIL_KEY);
      const storedName = window.sessionStorage.getItem(SESSION_NAME_KEY);
      const storedAvatar = window.sessionStorage.getItem(SESSION_AVATAR_KEY);
      const storedSub = window.sessionStorage.getItem(SESSION_SUB_KEY);
      const storedFormsScope = window.sessionStorage.getItem(SESSION_FORMS_SCOPE_KEY);
      if (storedToken) {
        this.token = storedToken;
        this.email = storedEmail || 'Tài khoản Google';
        this.profileName = storedName || undefined;
        this.avatarUrl = storedAvatar || undefined;
        this.sub = storedSub || undefined;
        this.formsScopeGranted = storedFormsScope === 'true';
        this.state = 'CONNECTED';
      }
    }

    // Firebase Auth State Listener
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        if (!this.email) this.email = user.email || 'Tài khoản Google';
        if (!this.profileName) this.profileName = user.displayName || undefined;
        if (!this.avatarUrl) this.avatarUrl = user.photoURL || undefined;
        if (!this.sub) this.sub = user.uid;
        if (this.token) {
          this.state = 'CONNECTED';
        }
      } else {
        if (!this.token) {
          this.state = 'DISCONNECTED';
          this.email = null;
          this.profileName = undefined;
          this.avatarUrl = undefined;
          this.sub = undefined;
        }
      }
      this.notify();
    });
  }

  /**
   * Get Google Client ID from firebase config or env
   */
  public static getClientId(): string | undefined {
    if (firebaseConfig && firebaseConfig.oAuthClientId) {
      return firebaseConfig.oAuthClientId;
    }
    try {
      const envClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
      if (typeof envClientId === 'string' && envClientId.trim() && !envClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
        return envClientId.trim();
      }
      if (typeof window !== 'undefined' && (window as any).__GOOGLE_CLIENT_ID__) {
        const globalCid = (window as any).__GOOGLE_CLIENT_ID__;
        if (typeof globalCid === 'string' && globalCid.trim()) {
          return globalCid.trim();
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  /**
   * Check if Google Forms OAuth is configured
   */
  public static hasClientId(): boolean {
    // Configured via Firebase OAuth client ID or API key
    if (firebaseConfig && (firebaseConfig.apiKey || firebaseConfig.oAuthClientId)) {
      return true;
    }
    const cid = this.getClientId();
    return Boolean(cid && cid.length > 5);
  }

  /**
   * Get current session info
   */
  public static getSessionInfo(): GoogleSessionInfo {
    this.ensureInit();
    const hasCid = this.hasClientId();

    if (!hasCid) {
      this.state = 'REQUIRES_CONFIGURATION';
      this.errorCode = 'GOOGLE_CONFIG_MISSING';
      this.errorMessage = 'Nhập từ Google Form chưa được cấu hình. Bạn vẫn có thể tạo khảo sát trực tiếp, dán câu hỏi từ AI/Word hoặc nhập DOCX.';
      return {
        state: 'REQUIRES_CONFIGURATION',
        email: null,
        hasClientId: false,
        errorCode: 'GOOGLE_CONFIG_MISSING',
        errorMessage: this.errorMessage
      };
    }

    return {
      state: this.state,
      email: this.email,
      name: this.profileName,
      avatarUrl: this.avatarUrl,
      sub: this.sub,
      accessToken: this.token || undefined,
      hasClientId: true,
      hasFormsScope: this.formsScopeGranted,
      clientId: this.getClientId(),
      errorCode: this.errorCode,
      errorMessage: this.errorMessage
    };
  }

  /**
   * Check whether the current session token was granted Google Forms scope
   */
  public static hasFormsScope(): boolean {
    this.ensureInit();
    return this.formsScopeGranted;
  }

  /**
   * Get Access Token (in-memory / short-term session)
   */
  public static getAccessToken(): string | null {
    this.ensureInit();
    if (this.token) return this.token;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (stored) {
        this.token = stored;
        return stored;
      }
    }
    return null;
  }

  /**
   * Set manual or dev token (for debug purposes)
   */
  public static setDebugToken(token: string | null, email?: string): void {
    this.token = token;
    this.email = email || (token ? 'developer@debug.local' : null);
    this.formsScopeGranted = Boolean(token);
    this.state = token ? 'CONNECTED' : 'DISCONNECTED';
    this.errorCode = undefined;
    this.errorMessage = undefined;

    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (token) {
        window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        window.sessionStorage.setItem(SESSION_FORMS_SCOPE_KEY, 'true');
        if (this.email) window.sessionStorage.setItem(SESSION_EMAIL_KEY, this.email);
      } else {
        window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
        window.sessionStorage.removeItem(SESSION_EMAIL_KEY);
        window.sessionStorage.removeItem(SESSION_FORMS_SCOPE_KEY);
      }
    }

    this.notify();
  }

  /**
   * Subscribe to auth state changes
   */
  public static subscribe(listener: (session: GoogleSessionInfo) => void): () => void {
    this.ensureInit();
    this.listeners.add(listener);
    listener(this.getSessionInfo());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    const session = this.getSessionInfo();
    this.listeners.forEach((fn) => fn(session));
  }

  /**
   * Connect to Google using Firebase OAuth popup flow.
   * By default (login at /quan-tri and /app), only basic identity scopes (email/profile) are requested.
   * When options.includeFormsScope is true (Google Forms survey import), forms.body.readonly is also requested.
   */
  public static async connect(options?: GoogleConnectOptions): Promise<GoogleSessionInfo> {
    this.ensureInit();

    const includeFormsScope = Boolean(options?.includeFormsScope);
    const provider = createGoogleProvider(includeFormsScope);

    this.state = 'CONNECTING';
    this.errorCode = undefined;
    this.errorMessage = undefined;
    this.notify();

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error('Không nhận được Access Token từ Google sau khi đăng nhập.');
      }

      this.token = accessToken;
      this.email = result.user.email || 'Tài khoản Google';
      this.profileName = result.user.displayName || undefined;
      this.avatarUrl = result.user.photoURL || undefined;
      this.sub = result.user.uid || undefined;
      this.formsScopeGranted = includeFormsScope;
      this.state = 'CONNECTED';
      this.errorCode = undefined;
      this.errorMessage = undefined;

      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(SESSION_TOKEN_KEY, accessToken);
        window.sessionStorage.setItem(SESSION_FORMS_SCOPE_KEY, includeFormsScope ? 'true' : 'false');
        if (this.email) window.sessionStorage.setItem(SESSION_EMAIL_KEY, this.email);
        if (this.profileName) window.sessionStorage.setItem(SESSION_NAME_KEY, this.profileName);
        if (this.avatarUrl) window.sessionStorage.setItem(SESSION_AVATAR_KEY, this.avatarUrl);
        if (this.sub) window.sessionStorage.setItem(SESSION_SUB_KEY, this.sub);
      }

      this.notify();
      return this.getSessionInfo();
    } catch (err: any) {
      console.error('[GoogleAuthService] Connection error:', err);
      const isCancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('popup_closed');

      this.state = this.token ? 'CONNECTED' : 'DISCONNECTED';
      this.errorCode = isCancelled ? 'GOOGLE_CONNECT_CANCELLED' : 'GOOGLE_API_FAILED';
      this.errorMessage = isCancelled
        ? 'Bạn đã đóng cửa sổ đăng nhập Google.'
        : (err?.message || 'Lỗi khi kết nối tài khoản Google.');

      this.notify();
      throw err;
    }
  }

  /**
   * Disconnect Google Account
   */
  public static async disconnect(): Promise<void> {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }

    this.token = null;
    this.email = null;
    this.profileName = undefined;
    this.avatarUrl = undefined;
    this.sub = undefined;
    this.formsScopeGranted = false;
    this.state = 'DISCONNECTED';
    this.errorCode = undefined;
    this.errorMessage = undefined;

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
      window.sessionStorage.removeItem(SESSION_EMAIL_KEY);
      window.sessionStorage.removeItem(SESSION_NAME_KEY);
      window.sessionStorage.removeItem(SESSION_AVATAR_KEY);
      window.sessionStorage.removeItem(SESSION_SUB_KEY);
      window.sessionStorage.removeItem(SESSION_FORMS_SCOPE_KEY);
    }

    this.notify();
  }

  /**
   * Handle Expired Token
   */
  public static handleTokenExpired(): void {
    this.state = 'TOKEN_EXPIRED';
    this.errorCode = 'GOOGLE_TOKEN_EXPIRED';
    this.errorMessage = 'Phiên kết nối Google đã hết hạn. Vui lòng kết nối lại.';
    this.token = null;
    this.formsScopeGranted = false;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
      window.sessionStorage.removeItem(SESSION_FORMS_SCOPE_KEY);
    }
    this.notify();
  }

  /**
   * Handle Permission Denied
   */
  public static handlePermissionDenied(reason?: string): void {
    this.state = 'PERMISSION_DENIED';
    this.errorCode = 'GOOGLE_PERMISSION_DENIED';
    this.errorMessage = reason || 'Không tìm thấy Google Form hoặc tài khoản hiện tại không có quyền truy cập.';
    this.notify();
  }
}
