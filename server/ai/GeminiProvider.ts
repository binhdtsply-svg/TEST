/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { AIHealthResult, AIChatRequest, AIChatResponse, AIProvider } from './types';

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';
  private client: GoogleGenAI | null = null;

  public isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  private getClient(): GoogleGenAI {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      throw new Error('GEMINI_KEY_MISSING: Chưa cấu hình GEMINI_API_KEY.');
    }
    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return this.client;
  }

  public getModelName(): string {
    return process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
  }

  public normalizeModelName(model?: string): string {
    if (!model || typeof model !== 'string') return 'gemini-3.1-flash-lite';
    const m = model.trim();
    if (
      m === 'gemini-3.6-flash' ||
      m === 'gemini-2.5-flash' ||
      m === 'gemini-2.0-flash' ||
      m === 'gemini-1.5-flash' ||
      m === 'gemini-1.5-pro' ||
      m === 'gemini-pro' ||
      m === 'gemini-2.0-pro' ||
      m === 'gemini-2.0-flash-thinking' ||
      m === 'gemini-flash' ||
      m.includes('3.6') ||
      m.includes('2.5') ||
      m.includes('2.0') ||
      m.includes('1.5')
    ) {
      return 'gemini-3.1-flash-lite';
    }
    return m;
  }

  public parseGeminiError(err: any): { message: string; code: string } {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('GEMINI_API_KEY') || errMsg.includes('Chưa cấu hình')) {
      return { message: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống.', code: 'GEMINI_KEY_MISSING' };
    }
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('403') || errMsg.includes('401') || errMsg.includes('UNAUTHENTICATED')) {
      return { message: 'Khóa API Gemini không hợp lệ hoặc đã hết hạn.', code: 'GEMINI_AUTH_FAILED' };
    }
    if (errMsg.includes('QUOTA') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('rate_limit')) {
      return {
        message: 'AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.',
        code: 'GEMINI_RATE_LIMITED'
      };
    }
    if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('Overloaded')) {
      return { message: 'Mô hình AI đang có lưu lượng truy cập cao tạm thời. Thầy/Cô vui lòng thử lại sau giây lát.', code: 'GEMINI_TIMEOUT' };
    }
    if (errMsg.includes('NOT_FOUND') || (errMsg.includes('404') && errMsg.includes('model'))) {
      return { message: 'Mô hình AI hiện không khả dụng.', code: 'GEMINI_PROVIDER_ERROR' };
    }
    if (errMsg.includes('ENOTFOUND') || errMsg.includes('fetch failed') || errMsg.includes('ETIMEDOUT') || errMsg.includes('timeout')) {
      return { message: 'Mất kết nối Internet hoặc thời gian chờ AI quá hạn.', code: 'GEMINI_TIMEOUT' };
    }
    return { message: `Lỗi Gemini: ${errMsg}`, code: 'GEMINI_PROVIDER_ERROR' };
  }

  private async callWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Model request timed out after ${timeoutMs}ms`));
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

  public async healthCheck(): Promise<AIHealthResult> {
    const startTime = Date.now();
    const geminiPresent = this.isConfigured();
    const openaiPresent = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

    if (!geminiPresent) {
      return {
        ok: false,
        provider: 'none',
        status: 'DISCONNECTED',
        message: 'GEMINI_API_KEY chưa được cấu hình ở Server.',
        openaiPresent,
        geminiPresent: false,
        code: 'GEMINI_KEY_MISSING'
      };
    }

    const latencyMs = Date.now() - startTime;
    const primaryModel = this.normalizeModelName(this.getModelName());
    return {
      ok: true,
      provider: 'gemini',
      model: primaryModel,
      status: 'CONNECTED',
      message: '✓ Cấu hình Gemini đã sẵn sàng (0 Quota tiêu hao khi kiểm tra).',
      openaiPresent,
      geminiPresent: true,
      latencyMs
    };
  }

  public async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const startTime = Date.now();
    const client = this.getClient();
    const primaryModel = this.normalizeModelName(this.getModelName());

    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const config: any = {};
    if (request.systemInstruction) {
      config.systemInstruction = request.systemInstruction;
    }
    if (request.temperature !== undefined) {
      config.temperature = request.temperature;
    }
    if (request.responseSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = request.responseSchema;
    }

    if (primaryModel === 'gemini-3.7-flash') {
      const level = request.thinkingLevel?.toLowerCase();
      if (level === 'high') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      } else {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
    }

    try {
      const response = await this.callWithTimeout(
        client.models.generateContent({
          model: primaryModel,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined
        }),
        22000
      );

      const text = response?.text || '';
      if (!text) {
        throw new Error('Gemini trả về nội dung rỗng.');
      }

      return {
        text,
        provider: 'gemini',
        model: primaryModel,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      const parsed = this.parseGeminiError(err);
      throw new Error(parsed.message);
    }
  }

  /**
   * Execute chat using Teacher's Personal Gemini API Key (Ephemeral in-memory execution)
   */
  public async chatWithPersonalKey(apiKey: string, request: AIChatRequest): Promise<AIChatResponse> {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) {
      throw new Error('GEMINI_KEY_MISSING: Chưa cung cấp khóa Gemini cá nhân.');
    }

    const startTime = Date.now();
    const personalClient = new GoogleGenAI({
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-personal'
        }
      }
    });

    const mName = 'gemini-3.1-flash-lite';
    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const config: any = {};
    if (request.systemInstruction) {
      config.systemInstruction = request.systemInstruction;
    }
    if (request.temperature !== undefined) {
      config.temperature = request.temperature;
    }
    if (request.responseSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = request.responseSchema;
    }

    try {
      const response = await this.callWithTimeout(
        personalClient.models.generateContent({
          model: mName,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined
        }),
        22000
      );

      const text = response?.text || '';
      if (!text) {
        throw new Error('Gemini cá nhân trả về nội dung rỗng.');
      }

      return {
        text,
        provider: 'gemini',
        model: `${mName} (Personal)`,
        latencyMs: Date.now() - startTime
      };
    } catch (err: any) {
      const parsed = this.parseGeminiError(err);
      throw new Error(`[Gemini Cá nhân] ${parsed.message}`);
    }
  }

  /**
   * Health check / connection test for Teacher's Personal Gemini API Key
   */
  public async testPersonalKey(apiKey: string): Promise<AIHealthResult> {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) {
      return {
        ok: false,
        provider: 'gemini',
        status: 'DISCONNECTED',
        message: 'Chưa nhập khóa Gemini API cá nhân.',
        openaiPresent: false,
        geminiPresent: false,
        code: 'PERSONAL_KEY_MISSING'
      };
    }

    const startTime = Date.now();
    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      provider: 'gemini',
      model: 'gemini-3.1-flash-lite (Personal)',
      status: 'CONNECTED',
      message: '✓ Khóa Gemini cá nhân đã sẵn sàng (0 Quota tiêu hao khi kiểm tra).',
      openaiPresent: false,
      geminiPresent: true,
      latencyMs
    };
  }
}
