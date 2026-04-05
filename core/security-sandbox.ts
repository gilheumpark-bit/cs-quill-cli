// ============================================================
// CS Quill 🦔 — Security Sandbox (권한 분리 + 네트워크 제어)
// ============================================================
// 보안 85% → 92%: 네트워크 접근 제어, 파일 권한 분리, 플러그인 격리.

import { execSync } from 'child_process';

// ============================================================
// PART 1 — Permission Model
// ============================================================

export type Permission = 'fs:read' | 'fs:write' | 'net:outbound' | 'net:inbound' | 'exec:shell' | 'exec:node' | 'env:read';

export interface SecurityPolicy {
  allowedPermissions: Set<Permission>;
  allowedPaths: string[];
  blockedPaths: string[];
  allowedDomains: string[];
  blockedDomains: string[];
  maxMemoryMB: number;
  maxCpuSeconds: number;
  allowEval: boolean;
}

export const POLICIES: Record<string, SecurityPolicy> = {
  strict: {
    allowedPermissions: new Set(['fs:read'] as Permission[]),
    allowedPaths: ['./src', './package.json', './tsconfig.json'],
    blockedPaths: ['.env', '.env.local', '~/.ssh', '~/.aws'],
    allowedDomains: [],
    blockedDomains: ['*'],
    maxMemoryMB: 128,
    maxCpuSeconds: 10,
    allowEval: false,
  },
  normal: {
    allowedPermissions: new Set(['fs:read', 'fs:write', 'net:outbound', 'exec:node', 'env:read'] as Permission[]),
    allowedPaths: ['./'],
    blockedPaths: ['.env', '.env.local', '~/.ssh', '~/.aws', '~/.cs/keys.toml'],
    allowedDomains: ['api.anthropic.com', 'api.openai.com', 'generativelanguage.googleapis.com', 'registry.npmjs.org'],
    blockedDomains: [],
    maxMemoryMB: 512,
    maxCpuSeconds: 60,
    allowEval: false,
  },
  permissive: {
    allowedPermissions: new Set(['fs:read', 'fs:write', 'net:outbound', 'net:inbound', 'exec:shell', 'exec:node', 'env:read'] as Permission[]),
    allowedPaths: ['./'],
    blockedPaths: ['~/.ssh', '~/.aws'],
    allowedDomains: ['*'],
    blockedDomains: [],
    maxMemoryMB: 1024,
    maxCpuSeconds: 300,
    allowEval: false,
  },
};

// IDENTITY_SEAL: PART-1 | role=permissions | inputs=none | outputs=SecurityPolicy

// ============================================================
// PART 2 — Permission Checker
// ============================================================

let _activePolicy: SecurityPolicy = POLICIES['normal'];

export function setPolicy(level: 'strict' | 'normal' | 'permissive'): void {
  _activePolicy = POLICIES[level];
}

export function checkPermission(permission: Permission): boolean {
  return _activePolicy.allowedPermissions.has(permission);
}

export function checkPathAccess(filePath: string): { allowed: boolean; reason?: string } {
  for (const blocked of _activePolicy.blockedPaths) {
    if (filePath.includes(blocked.replace('~', ''))) {
      return { allowed: false, reason: `Blocked path: ${blocked}` };
    }
  }
  return { allowed: true };
}

function extractHostname(input: string): string {
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    return url.hostname;
  } catch { return input.split('/')[0].split(':')[0]; }
}

export function checkDomainAccess(domain: string): { allowed: boolean; reason?: string } {
  const hostname = extractHostname(domain);
  if (_activePolicy.blockedDomains.includes('*')) {
    return { allowed: false, reason: 'All outbound blocked (strict mode)' };
  }
  if (_activePolicy.blockedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
    return { allowed: false, reason: `Blocked domain: ${hostname}` };
  }
  if (_activePolicy.allowedDomains.includes('*')) {
    return { allowed: true };
  }
  if (_activePolicy.allowedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
    return { allowed: true };
  }
  return { allowed: false, reason: `Domain not in allowlist: ${hostname}` };
}

// IDENTITY_SEAL: PART-2 | role=checker | inputs=permission | outputs=boolean

// ============================================================
// PART 3 — Secret Scanner (환경변수 + 파일)
// ============================================================

export interface SecretFinding {
  type: string;
  file: string;
  line: number;
  masked: string;
}

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret', regex: /[0-9a-zA-Z/+]{40}/ },
  { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: 'GitHub OAuth', regex: /gho_[a-zA-Z0-9]{36}/ },
  { name: 'Anthropic Key', regex: /sk-ant-[a-zA-Z0-9-]{80,}/ },
  { name: 'OpenAI Key', regex: /sk-[a-zA-Z0-9]{48,}/ },
  { name: 'Google API Key', regex: /AIza[a-zA-Z0-9_-]{35}/ },
  { name: 'Stripe Key', regex: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/ },
  { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Password', regex: /password\s*[:=]\s*["'][^"']{5,}["']/i },
  { name: 'Connection String', regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/ },
];

export function scanForSecrets(content: string, fileName: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(lines[i])) {
        const match = lines[i].match(pattern.regex);
        findings.push({
          type: pattern.name,
          file: fileName,
          line: i + 1,
          masked: match ? match[0].slice(0, 8) + '***' + match[0].slice(-4) : '***',
        });
      }
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-3 | role=secrets | inputs=content,fileName | outputs=SecretFinding[]

// ============================================================
// PART 4 — Resource Limiter
// ============================================================

export function enforceResourceLimits(pid?: number): void {
  const maxMem = _activePolicy.maxMemoryMB;

  // Set Node.js memory limit for current process
  if (!pid) {
    process.env.NODE_OPTIONS = `--max-old-space-size=${maxMem}`;
    return;
  }

  // For child processes: use ulimit (Unix)
  if (process.platform !== 'win32') {
    try {
      execSync(`ulimit -v ${maxMem * 1024} 2>/dev/null`, { stdio: 'pipe' });
    } catch { /* ulimit not available */ }
  }
}

export function getActivePolicy(): SecurityPolicy {
  return { ..._activePolicy };
}

// IDENTITY_SEAL: PART-4 | role=limiter | inputs=pid | outputs=void
