/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIWorkspaceConfig, AIMessage } from '../types';

export interface AIProvider {
  providerName: string;
  generateText(
    prompt: string | AIMessage[],
    systemPrompt?: string,
    config?: Partial<AIWorkspaceConfig>,
    thinkingLevel?: 'low' | 'medium' | 'high'
  ): Promise<string>;
  testConnection(config?: Partial<AIWorkspaceConfig>): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    model?: string;
    provider?: 'openai' | 'gemini' | 'none';
    status?: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  }>;
}

export class ServerAIProviderRouter implements AIProvider {
  public providerName = 'AI Server Router (OpenAI / Gemini Fallback)';
  private static clientCooldownUntil = 0;

  public async testConnection(config?: Partial<AIWorkspaceConfig>): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    model?: string;
    provider?: 'openai' | 'gemini' | 'none';
    status?: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  }> {
    const startTime = Date.now();
    const personalKey = config?.personalApiKeyInMemory?.trim();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (personalKey) {
        headers['x-personal-gemini-key'] = personalKey;
      }

      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          sourceType: config?.sourceType || 'system',
          personalApiKey: personalKey
        })
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => null);
      const latencyMs = data?.latencyMs || (Date.now() - startTime);

      if (!res.ok || !data?.success) {
        return {
          success: false,
          message: data?.message || data?.error || 'Không thể kết nối với dịch vụ AI trên máy chủ.',
          provider: data?.provider || 'none',
          model: data?.model,
          status: data?.status || 'DISCONNECTED',
          latencyMs
        };
      }

      return {
        success: true,
        message: data.message || '✓ AI Trợ lý GVCN đã sẵn sàng.',
        provider: data.provider || 'gemini',
        model: data.model,
        status: data.status || 'CONNECTED',
        latencyMs
      };
    } catch (err: any) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('abort');
      const msg = isTimeout
        ? 'Kiểm tra kết nối AI quá thời gian chờ (8s).'
        : `Không thể kết nối máy chủ AI (${err?.message || 'Failed to fetch'}). Vui lòng kiểm tra lại mạng hoặc thử lại.`;
      return {
        success: false,
        message: msg,
        provider: 'none',
        status: 'DISCONNECTED',
        latencyMs
      };
    }
  }

  public async generateText(
    promptOrMessages: string | AIMessage[],
    systemPrompt?: string,
    config?: Partial<AIWorkspaceConfig>,
    thinkingLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    // 1. Client-side cooldown guard
    const now = Date.now();
    if (now < ServerAIProviderRouter.clientCooldownUntil) {
      throw new Error('AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.');
    }

    let messages: Array<{ role: string; content: string }> = [];
    if (typeof promptOrMessages === 'string') {
      messages = [{ role: 'user', content: promptOrMessages }];
    } else if (Array.isArray(promptOrMessages)) {
      messages = promptOrMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));
    }

    const personalKey = config?.personalApiKeyInMemory?.trim();

    // Server-side AI Router (/api/ai/chat)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config?.sourceType === 'personal_gemini' && personalKey) {
      headers['x-personal-gemini-key'] = personalKey;
    }

    const requestBody = JSON.stringify({
      messages,
      systemInstruction: systemPrompt,
      temperature: config?.temperature,
      thinkingLevel,
      sourceType: config?.sourceType || 'system',
      personalApiKey: personalKey
    });

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 26000);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: requestBody
      });

      clearTimeout(timeoutTimer);

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const status = res.status;
        const msg = errData?.error || errData?.message || `Lỗi máy chủ (${status})`;

        const isRateLimit =
          status === 429 ||
          msg.includes('hạn mức') ||
          msg.includes('Rate limit') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('đạt giới hạn');

        if (isRateLimit) {
          ServerAIProviderRouter.clientCooldownUntil = Date.now() + 30000;
          throw new Error('AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.');
        }

        throw new Error(msg);
      }

      const data = await res.json();
      if (!data?.success || !data?.text) {
        throw new Error(data?.error || 'Máy chủ AI đang tạm thời không xử lý được yêu cầu.');
      }

      return data.text;
    } catch (err: any) {
      clearTimeout(timeoutTimer);

      const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
      const errMsg = err?.message || '';

      const isRate =
        errMsg.includes('429') ||
        errMsg.includes('hạn mức') ||
        errMsg.includes('Rate limit') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('đạt giới hạn');

      if (isRate) {
        ServerAIProviderRouter.clientCooldownUntil = Date.now() + 30000;
        throw new Error('AI đang tạm thời đạt giới hạn sử dụng. Vui lòng thử lại sau.');
      }

      if (isAbort) {
        throw new Error('Yêu cầu AI đã quá thời gian xử lý.');
      }

      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ENOTFOUND')) {
        throw new Error('Không thể kết nối máy chủ AI. Vui lòng thử lại.');
      }

      if (errMsg.length > 0 && !errMsg.includes('object Object')) {
        throw new Error(errMsg);
      }

      throw new Error('Máy chủ AI đang tạm thời không xử lý được yêu cầu.');
    }
  }
}

export class CustomEndpointProvider implements AIProvider {
  public providerName = 'Personal AI / Custom Endpoint';

  public async testConnection(config?: Partial<AIWorkspaceConfig>): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    model?: string;
    provider?: 'openai' | 'gemini' | 'none';
    status?: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  }> {
    const url = (config?.customEndpoint || config?.personalAiUrl || '').trim();
    if (!url) {
      return {
        success: false,
        message: 'Chưa cấu hình URL Personal AI / Endpoint.',
        status: 'DISCONNECTED'
      };
    }

    const startTime = Date.now();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (config?.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      } else if (config?.customAuthHeader) {
        headers['Authorization'] = config.customAuthHeader.trim();
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config?.model || 'default',
          messages: [
            { role: 'system', content: 'You are a pedagogical AI assistant.' },
            { role: 'user', content: 'Ping test connection.' }
          ],
          prompt: 'Ping test connection'
        })
      });

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return {
          success: false,
          message: `Endpoint phản hồi HTTP ${res.status}`,
          status: 'DISCONNECTED',
          latencyMs
        };
      }

      return {
        success: true,
        message: `Kết nối Personal AI thành công (${latencyMs}ms)`,
        status: 'CONNECTED',
        latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        message: `Lỗi kết nối Personal AI: ${err?.message || 'Không kết nối được'}`,
        status: 'DISCONNECTED',
        latencyMs
      };
    }
  }

  public async generateText(
    promptOrMessages: string | AIMessage[],
    systemPrompt?: string,
    config?: Partial<AIWorkspaceConfig>
  ): Promise<string> {
    const url = (config?.customEndpoint || config?.personalAiUrl || '').trim();
    if (!url) {
      throw new Error('Chưa cấu hình Endpoint AI tùy chỉnh.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    } else if (config?.customAuthHeader) {
      headers['Authorization'] = config.customAuthHeader.trim();
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (typeof promptOrMessages === 'string') {
      messages.push({ role: 'user', content: promptOrMessages });
    } else if (Array.isArray(promptOrMessages)) {
      messages.push(...promptOrMessages.map((m) => ({ role: m.role, content: m.content })));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config?.model || 'default',
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`Endpoint trả về lỗi HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    if (data?.text) {
      return data.text;
    }
    if (data?.response) {
      return data.response;
    }
    if (typeof data === 'string') {
      return data;
    }

    return JSON.stringify(data);
  }
}

export function getAIProviderInstance(providerType: 'gemini' | 'openai' | 'custom' = 'gemini'): AIProvider {
  switch (providerType) {
    case 'custom':
      return new CustomEndpointProvider();
    case 'gemini':
    case 'openai':
    default:
      return new ServerAIProviderRouter();
  }
}
