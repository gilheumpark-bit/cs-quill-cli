// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — AI Provider Bridge
// ============================================================
// @/lib/ai-providers 대신 CLI 자체 AI 호출 레이어.
// ai-config.ts 설정 기반으로 curl/fetch로 직접 호출.

import { getAIConfig } from './config';
import { getTemperature, type AITask } from './ai-config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface StreamChatOptions {
  systemInstruction?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  onChunk?: (text: string) => void;
  temperature?: number;
  maxTokens?: number;
  task?: AITask;
}

export interface ChatResult {
  content: string;
  model: string;
  tokensUsed?: number;
  durationMs: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=StreamChatOptions,ChatResult

// ============================================================
// PART 2 — Provider Endpoints
// ============================================================

interface ProviderConfig {
  baseUrl: string;
  authHeader: (key: string) => Record<string, string>;
  bodyBuilder: (opts: StreamChatOptions, model: string) => Record<string, unknown>;
  extractContent: (data: unknown) => string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    bodyBuilder: (opts, model) => ({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature,
      system: opts.systemInstruction,
      messages: opts.messages.filter(m => m.role !== 'system'),
    }),
    extractContent: (data: unknown) => data?.content?.[0]?.text ?? '',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    bodyBuilder: (opts, model) => ({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature,
      messages: [
        ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
        ...opts.messages,
      ],
    }),
    extractContent: (data: unknown) => data?.choices?.[0]?.message?.content ?? '',
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    authHeader: () => ({}), // key goes in URL
    bodyBuilder: (opts, _model) => ({
      contents: opts.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: opts.systemInstruction ? { parts: [{ text: opts.systemInstruction }] } : undefined,
      generationConfig: { temperature: opts.temperature, maxOutputTokens: opts.maxTokens ?? 4096 },
    }),
    extractContent: (data: unknown) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    bodyBuilder: (opts, model) => ({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature,
      messages: [
        ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
        ...opts.messages,
      ],
    }),
    extractContent: (data: unknown) => data?.choices?.[0]?.message?.content ?? '',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/api/chat',
    authHeader: () => ({}),
    bodyBuilder: (opts, model) => ({
      model,
      stream: false,
      messages: [
        ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
        ...opts.messages,
      ],
      options: { temperature: opts.temperature },
    }),
    extractContent: (data: unknown) => data?.message?.content ?? '',
  },
};

// IDENTITY_SEAL: PART-2 | role=providers | inputs=none | outputs=PROVIDERS

// ============================================================
// PART 3 — streamChat (핵심 API — @/lib/ai-providers 대체)
// ============================================================

export async function streamChat(opts: StreamChatOptions): Promise<ChatResult> {
  // ── 멀티키 폴백: 모든 등록된 키를 순회하며 시도 ──
  const { loadMergedConfig } = require('./config');
  const fullConfig = loadMergedConfig();
  const allKeys: Array<{ provider: string; key: string; model: string; baseUrl?: string }> = [];

  // 1순위: getAIConfig의 기본 키
  const primary = getAIConfig();
  if (primary.apiKey) {
    allKeys.push({ provider: primary.provider, key: primary.apiKey, model: primary.model, baseUrl: primary.baseUrl });
  }

  // 2순위: config.keys의 나머지 키 (중복 제거)
  for (const k of fullConfig.keys ?? []) {
    if (k.key && !allKeys.some(a => a.key === k.key)) {
      allKeys.push({ provider: k.provider, key: k.key, model: k.model, baseUrl: k.url });
    }
  }

  if (allKeys.length === 0) {
    throw new Error('AI 미설정 — cs config set-key <provider> <key>');
  }

  const errors: string[] = [];
  for (let i = 0; i < allKeys.length; i++) {
    const keyInfo = allKeys[i];
    try {
      const result = await _streamChatWithKey(opts, keyInfo.provider, keyInfo.key, keyInfo.model, keyInfo.baseUrl);
      // 성공 시 즉시 반환
      if (!result.content.startsWith('[AI Error')) {
        if (i > 0) console.log(`  🔄 폴백 성공: ${keyInfo.provider}/${keyInfo.model} (${i + 1}번째 키)`);
        return result;
      }
      errors.push(`${keyInfo.provider}: ${result.content.slice(0, 80)}`);
    } catch (e) {
      errors.push(`${keyInfo.provider}: ${(e as Error).message.slice(0, 80)}`);
    }
  }

  // 모든 키 실패
  const msg = `[AI 전체 실패] ${allKeys.length}개 키 시도:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`;
  opts.onChunk?.(msg);
  return { content: msg, model: 'none', durationMs: 0 };
}

async function _streamChatWithKey(
  opts: StreamChatOptions,
  providerName: string,
  apiKey: string,
  model: string,
  baseUrl?: string,
): Promise<ChatResult> {
  const start = performance.now();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    return { content: `[미지원 provider: ${providerName}]`, model: providerName, durationMs: 0 };
  }

  const temperature = opts.temperature ?? (opts.task ? getTemperature(opts.task) : 0.3);
  const optsWithTemp = { ...opts, temperature };

  // 스트리밍 가능 프로바이더: openai, groq, ollama, anthropic
  const canStream = ['openai', 'groq', 'ollama', 'anthropic'].includes(providerName);

  // 스트리밍용 body (stream: true 추가)
  const bodyObj = provider.bodyBuilder(optsWithTemp, model);
  if (canStream) (bodyObj as Record<string, unknown>).stream = true;
  const body = JSON.stringify(bodyObj);

  let url = provider.baseUrl;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...provider.authHeader(apiKey),
  };

  if (providerName === 'google') {
    url = `${provider.baseUrl}/${model}:generateContent?key=${apiKey}`;
  }
  if (baseUrl) {
    url = providerName === 'google'
      ? `${baseUrl}/${model}:generateContent?key=${apiKey}`
      : baseUrl;
  }

  try {
    const response = await fetch(url, {
      method: 'POST', headers, body,
      signal: AbortSignal.timeout(opts.maxTokens && opts.maxTokens > 4000 ? 120000 : 60000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const msg = `[AI Error ${response.status}] ${errorText.slice(0, 200)}`;
      opts.onChunk?.(msg);
      return { content: msg, model, durationMs: Math.round(performance.now() - start) };
    }

    // ── 리얼타임 SSE 스트리밍 ──
    if (canStream && response.body) {
      let content = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const json = JSON.parse(line.slice(6));
            let chunk = '';

            if (providerName === 'anthropic') {
              // Anthropic SSE: content_block_delta
              chunk = json.delta?.text ?? '';
            } else if (providerName === 'ollama') {
              chunk = json.message?.content ?? '';
            } else {
              // OpenAI / Groq SSE
              chunk = json.choices?.[0]?.delta?.content ?? '';
            }

            if (chunk) {
              content += chunk;
              opts.onChunk?.(chunk);
            }
          } catch { /* malformed SSE line */ }
        }
      }

      return { content, model, durationMs: Math.round(performance.now() - start) };
    }

    // ── Non-streaming fallback (Google 등) ──
    const data = await response.json();
    const content = provider.extractContent(data);
    opts.onChunk?.(content);

    return {
      content,
      model,
      tokensUsed: data?.usage?.total_tokens ?? data?.usageMetadata?.totalTokenCount,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (e) {
    const msg = `[AI 호출 실패] ${(e as Error).message}`;
    opts.onChunk?.(msg);
    return { content: msg, model, durationMs: Math.round(performance.now() - start) };
  }
}

// IDENTITY_SEAL: PART-3 | role=stream-chat-realtime | inputs=StreamChatOptions | outputs=ChatResult

// ============================================================
// PART 4 — Convenience: Quick Ask
// ============================================================

export async function quickAsk(
  prompt: string,
  system?: string,
  task?: AITask,
): Promise<string> {
  const result = await streamChat({
    systemInstruction: system,
    messages: [{ role: 'user', content: prompt }],
    task,
  });
  return result.content;
}

// IDENTITY_SEAL: PART-4 | role=quick-ask | inputs=prompt | outputs=string

// ============================================================
// PART 5 — getAIConfig re-export (호환성)
// ============================================================

// config.ts의 getAIConfig를 그대로 re-export (순환 import 방지)
export { getAIConfig } from './config';

// IDENTITY_SEAL: PART-5 | role=config-reexport | inputs=none | outputs=config
