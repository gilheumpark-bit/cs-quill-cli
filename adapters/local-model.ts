// ============================================================
// CS Quill 🦔 — Local Model Adapter (Ollama / LM Studio)
// ============================================================
// API 불가 시 로컬 모델로 폴백.

import { loadMergedConfig } from '../core/config';

// ============================================================
// PART 1 — Types
// ============================================================

interface LocalModelConfig {
  provider: 'ollama' | 'lmstudio';
  url: string;
  model: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamOptions {
  systemInstruction: string;
  messages: ChatMessage[];
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=LocalModelConfig,StreamOptions

// ============================================================
// PART 2 — Provider Detection
// ============================================================

export function getLocalModelConfig(): LocalModelConfig | null {
  const config = loadMergedConfig();

  // Check for Ollama/LMStudio keys
  const localKey = config.keys.find(k => k.provider === 'ollama' || k.provider === 'lmstudio');
  if (localKey) {
    return {
      provider: localKey.provider as 'ollama' | 'lmstudio',
      url: localKey.url ?? (localKey.provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'),
      model: localKey.model,
    };
  }

  return null;
}

export async function isLocalModelAvailable(): Promise<boolean> {
  const config = getLocalModelConfig();
  if (!config) return false;

  try {
    const endpoint = config.provider === 'ollama' ? `${config.url}/api/tags` : `${config.url}/v1/models`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// IDENTITY_SEAL: PART-2 | role=detection | inputs=none | outputs=LocalModelConfig|null

// ============================================================
// PART 3 — Streaming Chat
// ============================================================

export async function streamLocalChat(opts: StreamOptions): Promise<void> {
  const config = getLocalModelConfig();
  if (!config) throw new Error('No local model configured');

  if (config.provider === 'ollama') {
    await streamOllama(config, opts);
  } else {
    await streamLMStudio(config, opts);
  }
}

async function streamOllama(config: LocalModelConfig, opts: StreamOptions): Promise<void> {
  const res = await fetch(`${config.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: opts.systemInstruction },
        ...opts.messages,
      ],
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          opts.onChunk(data.message.content);
        }
      } catch { /* skip malformed */ }
    }
  }
}

async function streamLMStudio(config: LocalModelConfig, opts: StreamOptions): Promise<void> {
  // LM Studio uses OpenAI-compatible API
  const res = await fetch(`${config.url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: opts.systemInstruction },
        ...opts.messages,
      ],
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) throw new Error(`LM Studio error: ${res.status}`);
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n').filter(Boolean)) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) opts.onChunk(content);
      } catch { /* skip */ }
    }
  }
}

// IDENTITY_SEAL: PART-3 | role=streaming | inputs=StreamOptions | outputs=void

// ============================================================
// PART 4 — Fallback Wrapper
// ============================================================

export async function streamWithFallback(opts: StreamOptions): Promise<{ usedLocal: boolean }> {
  // Try remote first
  try {
    const { streamChat } = await import('../core/ai-bridge');
    await streamChat({
      systemInstruction: opts.systemInstruction,
      messages: opts.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      onChunk: opts.onChunk,
      signal: opts.signal,
    });
    return { usedLocal: false };
  } catch {
    // Fallback to local
    const available = await isLocalModelAvailable();
    if (!available) {
      throw new Error('API 연결 실패 + 로컬 모델 없음. cs config keys add 또는 Ollama 설치 필요.');
    }

    console.log('  ⚠️  API 불가 → 로컬 모델 폴백');
    await streamLocalChat(opts);
    return { usedLocal: true };
  }
}

// IDENTITY_SEAL: PART-4 | role=fallback | inputs=StreamOptions | outputs={usedLocal}
