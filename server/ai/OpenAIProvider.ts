/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import { AIHealthResult, AIChatRequest, AIChatResponse, AIProvider } from './types';

export class OpenAIProvider implements AIProvider {
  public readonly name = 'openai';
  private client: OpenAI | null = null;

  public isConfigured(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  private getClient(): OpenAI {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new Error('OPENAI_KEY_MISSING: Chưa cấu hình OPENAI_API_KEY.');
    }
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: key,
        timeout: 25000,
        maxRetries: 1
      });
    }
    return this.client;
  }

  public getModelName(): string {
    return process.env.OPENAI_MODEL?.trim() || 'gpt-5.6-terra';
  }

  public async healthCheck(): Promise<AIHealthResult> {
    const startTime = Date.now();
    const openaiPresent = this.isConfigured();
    const geminiPresent = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());

    if (!openaiPresent) {
      return {
        ok: false,
        provider: 'none',
        status: 'DISCONNECTED',
        message: 'OPENAI_API_KEY chưa được cấu hình trên hệ thống máy chủ.',
        openaiPresent: false,
        geminiPresent,
        code: 'OPENAI_KEY_MISSING'
      };
    }

    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      provider: 'openai',
      model: this.getModelName(),
      status: 'CONNECTED',
      message: '✓ Cấu hình OpenAI đã sẵn sàng (0 Quota tiêu hao khi kiểm tra).',
      openaiPresent: true,
      geminiPresent,
      latencyMs
    };
  }

  public async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const startTime = Date.now();
    const client = this.getClient();
    const model = this.getModelName();

    const formattedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (request.systemInstruction) {
      formattedMessages.push({
        role: 'system',
        content: request.systemInstruction
      });
    }

    for (const m of request.messages) {
      const r = m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user';
      formattedMessages.push({
        role: r,
        content: m.content
      });
    }

    const candidateModels = [model, 'gpt-4o'];
    const uniqueModels = Array.from(new Set(candidateModels));

    let lastErr: any = null;

    for (const mName of uniqueModels) {
      try {
        const completion = await client.chat.completions.create({
          model: mName,
          messages: formattedMessages,
          temperature: request.temperature !== undefined ? request.temperature : 0.7
        });

        const text = completion.choices?.[0]?.message?.content?.trim() || '';
        if (!text) {
          throw new Error('OpenAI trả về nội dung rỗng.');
        }

        return {
          text,
          provider: 'openai',
          model: mName,
          latencyMs: Date.now() - startTime
        };
      } catch (err: any) {
        lastErr = err;
        const errMsg = err?.message || String(err);
        const isAuth = errMsg.includes('401') || errMsg.includes('invalid_api_key');
        const isRate = errMsg.includes('429') || errMsg.includes('rate_limit') || errMsg.includes('insufficient_quota');
        if (isAuth || isRate) {
          // Do not retry invalid auth or rate limit
          throw err;
        }
      }
    }

    throw lastErr;
  }
}
