/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  systemInstruction?: string;
  temperature?: number;
  thinkingLevel?: 'low' | 'medium' | 'high' | 'minimal';
  responseSchema?: any;
}

export interface AIChatResponse {
  text: string;
  provider: 'openai' | 'gemini';
  model: string;
  latencyMs?: number;
}

export interface AIHealthResult {
  ok: boolean;
  provider: 'openai' | 'gemini' | 'none';
  model?: string;
  status: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED' | 'ERROR';
  message: string;
  openaiPresent: boolean;
  geminiPresent: boolean;
  latencyMs?: number;
  code?: string;
  details?: string;
}

export interface AIProvider {
  name: 'openai' | 'gemini';
  isConfigured(): boolean;
  healthCheck(): Promise<AIHealthResult>;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
}
