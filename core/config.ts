// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Configuration System
// ============================================================
// ~/.cs/config.toml 기반 설정 관리.
// 글로벌(~/.cs/) + 로컬(.cs.toml) 머지.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================
// PART 1 — Types
// ============================================================

export interface KeyConfig {
  id: string;
  provider: 'anthropic' | 'openai' | 'google' | 'groq' | 'mistral' | 'ollama' | 'lmstudio';
  key: string;
  model: string;
  roles: string[];
  budget?: string;
  url?: string;
}

export interface CSConfig {
  language: 'ko' | 'en' | 'ja' | 'zh';
  level: 'easy' | 'normal' | 'pro';
  structure: 'auto' | 'on' | 'off';
  fileMode: 'safe' | 'auto' | 'yolo';
  framework?: string;
  keys: KeyConfig[];
}

const DEFAULT_CONFIG: CSConfig = {
  language: 'en',
  level: 'normal',
  structure: 'auto',
  fileMode: 'safe',
  keys: [],
};

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=KeyConfig,CSConfig

// ============================================================
// PART 2 — Path Helpers
// ============================================================

export function getGlobalConfigDir(): string {
  return join(homedir(), '.cs');
}

export function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), 'config.json');
}

export function getLocalConfigPath(): string {
  return join(process.cwd(), '.cs.json');
}

export function getGeneratedDir(): string {
  return join(process.cwd(), '.cs', 'generated');
}

export function getReceiptDir(): string {
  return join(process.cwd(), '.cs', 'receipts');
}

// IDENTITY_SEAL: PART-2 | role=paths | inputs=none | outputs=string

// ============================================================
// PART 3 — Load / Save / Merge
// ============================================================

export function loadGlobalConfig(): CSConfig {
  const configPath = getGlobalConfigPath();
  if (!existsSync(configPath)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(configPath, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.error(`  ⚠️  설정 파일 손상 (${configPath}): ${(e as Error).message}. 기본값 사용.`);
    return { ...DEFAULT_CONFIG };
  }
}

export function loadLocalConfig(): Partial<CSConfig> | null {
  const configPath = getLocalConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function loadMergedConfig(): CSConfig {
  const global = loadGlobalConfig();
  const local = loadLocalConfig();
  if (!local) return global;
  return {
    ...global,
    ...local,
    keys: local.keys ?? global.keys,
  };
}

export function saveGlobalConfig(config: CSConfig): void {
  const dir = getGlobalConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getGlobalConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

export function saveLocalConfig(config: Partial<CSConfig>): void {
  writeFileSync(getLocalConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

// ============================================================
// PART 4 — Key Management
// ============================================================

export function addKey(config: CSConfig, key: KeyConfig): CSConfig {
  const existing = config.keys.findIndex(k => k.id === key.id);
  if (existing >= 0) {
    config.keys[existing] = key;
  } else {
    config.keys.push(key);
  }
  return config;
}

export function removeKey(config: CSConfig, keyId: string): CSConfig {
  config.keys = config.keys.filter(k => k.id !== keyId);
  return config;
}

export function getKeyForRole(config: CSConfig, role: string): KeyConfig | undefined {
  return config.keys.find(k => k.roles.includes(role)) ?? config.keys[0];
}

// IDENTITY_SEAL: PART-4 | role=key-management | inputs=CSConfig,KeyConfig | outputs=CSConfig

// ============================================================
// PART 5 — AI Config Helper
// ============================================================

export function getAIConfig(): { provider: string; model: string; apiKey: string; baseUrl?: string } {
  const config = loadMergedConfig();
  const primaryKey = config.keys?.[0];
  return {
    provider: primaryKey?.provider ?? config.provider ?? 'groq',
    model: primaryKey?.model ?? config.model ?? 'llama-3.3-70b-versatile',
    apiKey: primaryKey?.key ?? process.env.CS_API_KEY ?? '',
    baseUrl: config.baseUrl,
  };
}

// IDENTITY_SEAL: PART-5 | role=ai-config-helper | inputs=none | outputs=config
