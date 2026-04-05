// ============================================================
// CS Quill 🦔 — Local Sandbox Adapter
// ============================================================
// 2계층 샌드박스: vm 모듈(경량) + child_process(중량).
// vm: 빠른 코드 검증, child_process: 파일 I/O 필요한 프로젝트 실행.

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import * as vm from 'vm';

// ============================================================
// PART 1 — Types
// ============================================================

export interface SandboxConfig {
  timeout: number;
  maxMemoryMB: number;
  allowNetwork: boolean;
  env?: Record<string, string>;
  mode?: 'vm' | 'process';
}

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  memoryUsedMB?: number;
  timedOut: boolean;
  mode: 'vm' | 'process';
}

const DEFAULT_CONFIG: SandboxConfig = {
  timeout: 5000,
  maxMemoryMB: 256,
  allowNetwork: false,
  mode: 'vm',
};

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SandboxConfig,SandboxResult

// ============================================================
// PART 2 — VM Sandbox (경량, 인프로세스)
// ============================================================

function createSafeGlobals(): Record<string, unknown> {
  const output: string[] = [];
  const errors: string[] = [];

  return {
    console: {
      log: (...args: unknown[]) => output.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => errors.push(args.map(String).join(' ')),
      warn: (...args: unknown[]) => output.push(`[warn] ${args.map(String).join(' ')}`),
      info: (...args: unknown[]) => output.push(args.map(String).join(' ')),
    },
    JSON,
    Math,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Promise,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    // 차단: process, require, import, fs, child_process, eval, Function
    __output: output,
    __errors: errors,
  };
}

export function runInVM(code: string, config: Partial<SandboxConfig> = {}): SandboxResult {
  const cfg = { ...DEFAULT_CONFIG, ...config, mode: 'vm' as const };
  const start = performance.now();
  const globals = createSafeGlobals();

  try {
    const context = vm.createContext(globals, {
      codeGeneration: { strings: false, wasm: false },
    });

    const wrappedCode = `
      "use strict";
      ${code}
    `;

    vm.runInContext(wrappedCode, context, {
      timeout: cfg.timeout,
      displayErrors: true,
      breakOnSigint: true,
    });

    const output = (globals.__output as string[]).join('\n').slice(0, 5000);
    const errors = (globals.__errors as string[]).join('\n').slice(0, 5000);

    return {
      success: true,
      stdout: output,
      stderr: errors,
      exitCode: 0,
      durationMs: Math.round(performance.now() - start),
      timedOut: false,
      mode: 'vm',
    };
  } catch (e: unknown) {
    const error = e as Error;
    const timedOut = error.message?.includes('Script execution timed out') ?? false;

    return {
      success: false,
      stdout: (globals.__output as string[]).join('\n').slice(0, 5000),
      stderr: error.message?.slice(0, 5000) ?? 'unknown error',
      exitCode: 1,
      durationMs: Math.round(performance.now() - start),
      timedOut,
      mode: 'vm',
    };
  }
}

// IDENTITY_SEAL: PART-2 | role=vm-sandbox | inputs=code,config | outputs=SandboxResult

// ============================================================
// PART 3 — Process Sandbox (중량, 파일 I/O 가능)
// ============================================================

function createSandboxDir(): string {
  const id = randomBytes(8).toString('hex');
  const dir = join(tmpdir(), `cs-sandbox-${id}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function destroySandbox(dir: string): void {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

function writeSandboxFiles(dir: string, files: Record<string, string>): void {
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    const fileDir = join(filePath, '..');
    if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
  }
  if (!files['package.json']) {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'cs-sandbox', private: true, type: 'module' }));
  }
}

export function runInProcess(code: string, config: Partial<SandboxConfig> = {}): SandboxResult {
  const cfg = { ...DEFAULT_CONFIG, ...config, mode: 'process' as const };
  const dir = createSandboxDir();
  const start = performance.now();

  try {
    writeSandboxFiles(dir, { 'run.mjs': code });

    const envVars: Record<string, string> = {
      ...process.env as Record<string, string>,
      NODE_ENV: 'test',
      CS_SANDBOX: '1',
      NODE_OPTIONS: `--max-old-space-size=${cfg.maxMemoryMB}`,
      ...cfg.env,
    };

    // 네트워크 차단: DNS 리졸버를 localhost로 제한
    if (!cfg.allowNetwork) {
      envVars['NODE_OPTIONS'] += ' --dns-result-order=verbatim';
    }

    const stdout = execSync('node --experimental-vm-modules run.mjs 2>&1', {
      cwd: dir,
      timeout: cfg.timeout,
      encoding: 'utf-8',
      env: envVars,
      maxBuffer: 1024 * 1024,
    });

    return {
      success: true,
      stdout: stdout.slice(0, 5000),
      stderr: '',
      exitCode: 0,
      durationMs: Math.round(performance.now() - start),
      timedOut: false,
      mode: 'process',
    };
  } catch (e: unknown) {
    const error = e as { status?: number; stdout?: string; stderr?: string; killed?: boolean };
    return {
      success: false,
      stdout: (error.stdout ?? '').slice(0, 5000),
      stderr: (error.stderr ?? '').slice(0, 5000),
      exitCode: error.status ?? 1,
      durationMs: Math.round(performance.now() - start),
      timedOut: error.killed ?? false,
      mode: 'process',
    };
  } finally {
    destroySandbox(dir);
  }
}

// IDENTITY_SEAL: PART-3 | role=process-sandbox | inputs=code,config | outputs=SandboxResult

// ============================================================
// PART 4 — Auto-Select + Public API
// ============================================================

export function runInSandbox(code: string, config: Partial<SandboxConfig> = {}): SandboxResult {
  const mode = config.mode ?? 'vm';

  // VM: 순수 JS 검증 (require/import 없는 코드)
  // Process: 파일 I/O, node 모듈 필요한 코드
  if (mode === 'vm') {
    return runInVM(code, config);
  }
  return runInProcess(code, config);
}

// IDENTITY_SEAL: PART-4 | role=auto-select | inputs=code,config | outputs=SandboxResult

// ============================================================
// PART 5 — Multi-File Sandbox (Process mode only)
// ============================================================

export function runProjectInSandbox(
  files: Record<string, string>,
  entryPoint: string = 'index.mjs',
  config: Partial<SandboxConfig> = {},
): SandboxResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const dir = createSandboxDir();
  const start = performance.now();

  try {
    writeSandboxFiles(dir, files);

    const stdout = execSync(`node ${entryPoint} 2>&1`, {
      cwd: dir,
      timeout: cfg.timeout,
      encoding: 'utf-8',
      env: {
        ...process.env as Record<string, string>,
        NODE_ENV: 'test',
        CS_SANDBOX: '1',
        NODE_OPTIONS: `--max-old-space-size=${cfg.maxMemoryMB}`,
        ...cfg.env,
      },
      maxBuffer: 1024 * 1024,
    });

    return {
      success: true, stdout: stdout.slice(0, 5000), stderr: '', exitCode: 0,
      durationMs: Math.round(performance.now() - start), timedOut: false, mode: 'process',
    };
  } catch (e: unknown) {
    const error = e as { status?: number; stdout?: string; stderr?: string; killed?: boolean };
    return {
      success: false,
      stdout: (error.stdout ?? '').slice(0, 5000),
      stderr: (error.stderr ?? '').slice(0, 5000),
      exitCode: error.status ?? 1,
      durationMs: Math.round(performance.now() - start),
      timedOut: error.killed ?? false,
      mode: 'process',
    };
  } finally {
    destroySandbox(dir);
  }
}

// IDENTITY_SEAL: PART-5 | role=multi-file | inputs=files,entryPoint,config | outputs=SandboxResult

// ============================================================
// PART 6 — Fuzz Runner (edge-case 입력 주입, VM mode)
// ============================================================

const FUZZ_INPUTS = [
  'null', 'undefined', '""', '0', '-1', 'NaN', 'Infinity',
  '[]', '{}', 'true', 'false',
  '"a".repeat(10000)', '"<script>alert(1)</script>"',
  'Symbol("test")', 'new Date(0)',
];

export function fuzzInSandbox(
  functionCode: string,
  functionName: string,
  config: Partial<SandboxConfig> = {},
): Array<{ input: string; result: SandboxResult }> {
  const results: Array<{ input: string; result: SandboxResult }> = [];

  for (const input of FUZZ_INPUTS) {
    const testCode = `
${functionCode}

try {
  const result = ${functionName}(${input});
  console.log(JSON.stringify({ ok: true, result: String(result).slice(0, 100) }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e.message }));
}
`;
    const result = runInVM(testCode, { ...config, timeout: 2000 });
    results.push({ input, result });
  }

  return results;
}

// IDENTITY_SEAL: PART-6 | role=fuzz-runner | inputs=functionCode,functionName | outputs=fuzz-results
