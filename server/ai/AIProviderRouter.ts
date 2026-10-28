/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { AIChatRequest, AIChatResponse, AIHealthResult } from './types';

export class AIProviderRouter {
  private openAIProvider: OpenAIProvider;
  private geminiProvider: GeminiProvider;

  // Circuit Breaker State
  private openaiConsecutiveFailures = 0;
  private openaiCooldownUntil = 0;

  private geminiConsecutiveFailures = 0;
  private geminiCooldownUntil = 0;

  constructor() {
    this.openAIProvider = new OpenAIProvider();
    this.geminiProvider = new GeminiProvider();
  }

  public async healthCheck(): Promise<AIHealthResult> {
    const openaiPresent = this.openAIProvider.isConfigured();
    const geminiPresent = this.geminiProvider.isConfigured();

    if (!openaiPresent && !geminiPresent) {
      return {
        ok: false,
        provider: 'none',
        status: 'DISCONNECTED',
        message: 'Chưa có nhà cung cấp AI khả dụng (Cần OPENAI_API_KEY hoặc GEMINI_API_KEY ở Server).',
        openaiPresent: false,
        geminiPresent: false,
        code: 'NO_AI_PROVIDER'
      };
    }

    // 1. If OpenAI is configured, test OpenAI first (Primary)
    if (openaiPresent) {
      const openAiResult = await this.openAIProvider.healthCheck();
      if (openAiResult.ok) {
        this.openaiConsecutiveFailures = 0;
        return {
          ...openAiResult,
          status: 'CONNECTED',
          message: '✓ Kết nối OpenAI thành công.'
        };
      }

      // OpenAI failed, attempt Gemini fallback if present
      if (geminiPresent) {
        const geminiResult = await this.geminiProvider.healthCheck();
        if (geminiResult.ok) {
          return {
            ok: true,
            provider: 'gemini',
            model: geminiResult.model,
            status: 'DEGRADED',
            message: '● AI đang hoạt động bằng hệ thống dự phòng (Gemini).',
            openaiPresent: true,
            geminiPresent: true,
            latencyMs: geminiResult.latencyMs,
            details: `OpenAI không phản hồi (${openAiResult.message}). Đã tự động chuyển sang Gemini.`
          };
        }
      }

      // Both failed or OpenAI failed and no Gemini
      return {
        ok: false,
        provider: 'openai',
        status: 'DISCONNECTED',
        message: openAiResult.message || 'Không thể kết nối nhà cung cấp AI.',
        openaiPresent: true,
        geminiPresent,
        code: openAiResult.code || 'OPENAI_PROVIDER_ERROR',
        details: openAiResult.details
      };
    }

    // 2. If only Gemini is configured (Fallback becoming active provider)
    if (geminiPresent) {
      const geminiResult = await this.geminiProvider.healthCheck();
      if (geminiResult.ok) {
        this.geminiConsecutiveFailures = 0;
        return {
          ...geminiResult,
          status: 'CONNECTED',
          message: '✓ Kết nối Gemini thành công.'
        };
      }
      return {
        ok: false,
        provider: 'gemini',
        status: 'DISCONNECTED',
        message: geminiResult.message,
        openaiPresent: false,
        geminiPresent: true,
        code: geminiResult.code,
        details: geminiResult.details
      };
    }

    return {
      ok: false,
      provider: 'none',
      status: 'DISCONNECTED',
      message: 'Chưa có nhà cung cấp AI nào khả dụng.',
      openaiPresent: false,
      geminiPresent: false,
      code: 'NO_AI_PROVIDER'
    };
  }

  public async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const openaiPresent = this.openAIProvider.isConfigured();
    const geminiPresent = this.geminiProvider.isConfigured();

    if (!openaiPresent && !geminiPresent) {
      throw new Error('NO_AI_PROVIDER: Chưa cấu hình nhà cung cấp AI (OPENAI_API_KEY hoặc GEMINI_API_KEY).');
    }

    const now = Date.now();
    const isOpenAiAvailable = openaiPresent && now > this.openaiCooldownUntil;
    const isGeminiAvailable = geminiPresent && now > this.geminiCooldownUntil;

    if (openaiPresent && !isOpenAiAvailable && !isGeminiAvailable) {
      throw new Error('AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.');
    }

    if (!openaiPresent && geminiPresent && !isGeminiAvailable) {
      throw new Error('AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.');
    }

    let lastError: any = null;

    // 1. Try Primary: OpenAI (if configured and available)
    if (isOpenAiAvailable) {
      try {
        const response = await this.withTimeout(this.openAIProvider.chat(request), 20000);
        this.openaiConsecutiveFailures = 0;
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isRate = errMsg.includes('429') || errMsg.includes('rate_limit') || errMsg.includes('RATE_LIMITED') || errMsg.includes('hạn mức') || errMsg.includes('đạt giới hạn');
        if (isRate) {
          this.openaiCooldownUntil = Date.now() + 30000;
          throw new Error('AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.');
        }
        this.openaiConsecutiveFailures++;
        if (this.openaiConsecutiveFailures >= 3) {
          this.openaiCooldownUntil = Date.now() + 60000; // 60s cooldown
        }
        console.warn(`[AI-ROUTER] OpenAI request failed (failures: ${this.openaiConsecutiveFailures}).`, errMsg);
      }
    }

    // 2. Try Gemini (if configured and available)
    if (isGeminiAvailable || (!isOpenAiAvailable && geminiPresent && now > this.geminiCooldownUntil)) {
      try {
        const response = await this.withTimeout(this.geminiProvider.chat(request), 24000);
        this.geminiConsecutiveFailures = 0;
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isRate = errMsg.includes('429') || errMsg.includes('rate_limit') || errMsg.includes('RATE_LIMITED') || errMsg.includes('hạn mức') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('đạt giới hạn');
        if (isRate) {
          this.geminiCooldownUntil = Date.now() + 30000;
          // Stop immediately on rate limit error to avoid extra downstream spam or provider switching
          throw new Error('AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.');
        }
        this.geminiConsecutiveFailures++;
        if (this.geminiConsecutiveFailures >= 3) {
          this.geminiCooldownUntil = Date.now() + 30000;
        }
        console.error(`[AI-ROUTER] Gemini provider error:`, errMsg);
      }
    }

    throw lastError || new Error('Không thể kết nối đến nhà cung cấp AI nào.');
  }

  /**
   * Execute chat using teacher's personal Gemini API key
   */
  public async chatPersonal(apiKey: string, request: AIChatRequest): Promise<AIChatResponse> {
    return this.geminiProvider.chatWithPersonalKey(apiKey, request);
  }

  /**
   * Health check for teacher's personal Gemini API key
   */
  public async healthCheckPersonal(apiKey: string): Promise<AIHealthResult> {
    return this.geminiProvider.testPersonalKey(apiKey);
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Quá thời gian chờ phản hồi từ AI (${timeoutMs}ms).`));
      }, timeoutMs);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}

export const aiProviderRouter = new AIProviderRouter();
