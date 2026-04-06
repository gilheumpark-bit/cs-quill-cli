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
  'lm-studio': {
    baseUrl: 'http://192.168.219.102:1234/v1/chat/completions',
    authHeader: () => ({}), // LM Studio는 인증 불필요
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
};

// IDENTITY_SEAL: PART-2 | role=providers | inputs=none | outputs=PROVIDERS

// ============================================================
// PART 2.5 — ARI (Agent Reliability Index) + Circuit Breaker
// ============================================================

interface ARIState {
  provider: string;
  score: number;        // 0-100, starts at 100
  errorCount: number;
  successCount: number;
  lastError: number;    // timestamp
  circuitState: 'closed' | 'open' | 'half-open';
  circuitOpenedAt: number;
}

// In-memory ARI state per provider
const _ariStore: Map<string, ARIState> = new Map();

const ARI_CIRCUIT_OPEN_DURATION_MS = 60000; // 60s cooldown before half-open
const ARI_ALPHA = 0.3; // EMA weight — recent events weight more

function _getARIState(provider: string): ARIState {
  if (!_ariStore.has(provider)) {
    _ariStore.set(provider, {
      provider,
      score: 100,
      errorCount: 0,
      successCount: 0,
      lastError: 0,
      circuitState: 'closed',
      circuitOpenedAt: 0,
    });
  }
  return _ariStore.get(provider)!;
}

function updateARI(provider: string, success: boolean): ARIState {
  const state = _getARIState(provider);
  const delta = success ? +5 : -15;
  // EMA decay: newScore blends current score toward (score + delta)
  const rawNew = state.score * (1 - ARI_ALPHA) + (state.score + delta) * ARI_ALPHA;
  state.score = Math.max(0, Math.min(100, Math.round(rawNew * 100) / 100));

  if (success) {
    state.successCount++;
  } else {
    state.errorCount++;
    state.lastError = Date.now();
  }

  // Circuit breaker state transitions
  if (state.score < 30 && state.circuitState === 'closed') {
    state.circuitState = 'open';
    state.circuitOpenedAt = Date.now();
  }
  if (state.circuitState === 'open' && Date.now() - state.circuitOpenedAt > ARI_CIRCUIT_OPEN_DURATION_MS) {
    state.circuitState = 'half-open';
  }
  if (state.circuitState === 'half-open' && success) {
    state.circuitState = 'closed';
    // Recovery boost: bump score slightly on successful half-open probe
    state.score = Math.min(100, state.score + 10);
  }
  if (state.circuitState === 'half-open' && !success) {
    // Failed probe — re-open circuit
    state.circuitState = 'open';
    state.circuitOpenedAt = Date.now();
  }

  return { ...state };
}

/** Check if a provider's circuit breaker allows requests */
function isProviderAvailable(provider: string): boolean {
  const state = _getARIState(provider);
  // Check for half-open transition on read
  if (state.circuitState === 'open' && Date.now() - state.circuitOpenedAt > ARI_CIRCUIT_OPEN_DURATION_MS) {
    state.circuitState = 'half-open';
  }
  return state.circuitState !== 'open';
}

/** Get the best provider from a key list, sorted by ARI score (highest first), filtering out open circuits */
function getBestProvider(
  allKeys: Array<{ provider: string; key: string; model: string; baseUrl?: string }>,
): Array<{ provider: string; key: string; model: string; baseUrl?: string }> {
  // Separate available vs unavailable
  const available = allKeys.filter(k => isProviderAvailable(k.provider));
  const unavailable = allKeys.filter(k => !isProviderAvailable(k.provider));

  // Sort available by ARI score descending
  available.sort((a, b) => {
    const sa = _getARIState(a.provider).score;
    const sb = _getARIState(b.provider).score;
    return sb - sa;
  });

  // Unavailable go to the end as fallback (in case all are open)
  return [...available, ...unavailable];
}

/** Get diagnostic ARI report for all tracked providers */
function getARIReport(): Array<ARIState & { available: boolean }> {
  const report: Array<ARIState & { available: boolean }> = [];
  for (const [, state] of _ariStore) {
    // Refresh half-open check
    if (state.circuitState === 'open' && Date.now() - state.circuitOpenedAt > ARI_CIRCUIT_OPEN_DURATION_MS) {
      state.circuitState = 'half-open';
    }
    report.push({ ...state, available: state.circuitState !== 'open' });
  }
  return report.sort((a, b) => b.score - a.score);
}

// Export ARI functions for external use
export { updateARI, getARIReport, isProviderAvailable, getBestProvider };
export type { ARIState };

// IDENTITY_SEAL: PART-2.5 | role=ari-circuit-breaker | inputs=provider,success | outputs=ARIState

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

  // ARI-based dynamic routing: sort by reliability score, skip open circuits
  const sortedKeys = getBestProvider(allKeys);

  const errors: string[] = [];
  for (let i = 0; i < sortedKeys.length; i++) {
    const keyInfo = sortedKeys[i];

    // Circuit breaker check: skip providers with open circuit
    if (!isProviderAvailable(keyInfo.provider)) {
      errors.push(`${keyInfo.provider}: circuit OPEN (ARI=${Math.round(_getARIState(keyInfo.provider).score)})`);
      continue;
    }

    try {
      const result = await _streamChatWithKey(opts, keyInfo.provider, keyInfo.key, keyInfo.model, keyInfo.baseUrl);
      // 성공 시 즉시 반환
      if (!result.content.startsWith('[AI Error')) {
        updateARI(keyInfo.provider, true);
        if (i > 0) console.log(`  🔄 폴백 성공: ${keyInfo.provider}/${keyInfo.model} (ARI=${Math.round(_getARIState(keyInfo.provider).score)})`);
        return result;
      }
      // AI returned error content — treat as failure
      updateARI(keyInfo.provider, false);
      errors.push(`${keyInfo.provider}: ${result.content.slice(0, 80)}`);
    } catch (e) {
      updateARI(keyInfo.provider, false);
      errors.push(`${keyInfo.provider}: ${(e as Error).message.slice(0, 80)}`);
    }
  }

  // 모든 키 실패
  const msg = `[AI 전체 실패] ${sortedKeys.length}개 키 시도:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`;
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

// IDENTITY_SEAL: PART-3 | role=stream-chat-realtime-ari | inputs=StreamChatOptions | outputs=ChatResult

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

// IDENTITY_SEAL: PART-4 | role=quick-ask-ari | inputs=prompt | outputs=string

// ============================================================
// PART 5 — getAIConfig re-export (호환성)
// ============================================================

// config.ts의 getAIConfig를 그대로 re-export (순환 import 방지)
export { getAIConfig } from './config';

// IDENTITY_SEAL: PART-5 | role=config-reexport | inputs=none | outputs=config
