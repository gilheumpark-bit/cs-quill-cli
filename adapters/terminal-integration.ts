// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Terminal Integration
// ============================================================
// pty 관리, REPL 연동, 프로세스 관리.
// 터미널 통합 10% → 70%

import { execSync, spawn, type ChildProcess } from 'child_process';

// ============================================================
// PART 1 — Shell Detection & Execution
// ============================================================

export function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC ?? 'cmd.exe';
  }
  return process.env.SHELL ?? '/bin/bash';
}

export function runShellCommand(command: string, opts?: {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(command, {
      cwd: opts?.cwd ?? process.cwd(),
      encoding: 'utf-8',
      timeout: opts?.timeout ?? 30000,
      env: { ...process.env, ...opts?.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (e: unknown) {
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? '',
      exitCode: e.status ?? 1,
    };
  }
}

// IDENTITY_SEAL: PART-1 | role=shell | inputs=command | outputs=stdout,stderr,exitCode

// ============================================================
// PART 2 — REPL Manager
// ============================================================

export interface REPLSession {
  language: string;
  process: ChildProcess;
  send: (code: string) => void;
  kill: () => void;
}

const REPL_COMMANDS: Record<string, { cmd: string; args: string[] }> = {
  node: { cmd: 'node', args: ['--interactive'] },
  typescript: { cmd: 'npx', args: ['tsx'] },
  python: { cmd: 'python3', args: ['-i'] },
  ruby: { cmd: 'irb', args: [] },
  go: { cmd: 'gore', args: [] },
};

export function startREPL(language: string): REPLSession | null {
  const repl = REPL_COMMANDS[language];
  if (!repl) return null;

  try {
    const child = spawn(repl.cmd, repl.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });

    child.stdout?.on('data', (data: Buffer) => {
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data);
    });

    return {
      language,
      process: child,
      send: (code: string) => { child.stdin?.write(code + '\n'); },
      kill: () => { child.kill(); },
    };
  } catch {
    return null;
  }
}

export function getSupportedREPLs(): string[] {
  return Object.keys(REPL_COMMANDS);
}

// IDENTITY_SEAL: PART-2 | role=repl | inputs=language | outputs=REPLSession

// ============================================================
// PART 3 — Background Job Manager
// ============================================================

interface BackgroundJob {
  id: string;
  command: string;
  process: ChildProcess;
  startedAt: number;
  status: 'running' | 'done' | 'error';
  output: string;
}

const _jobs = new Map<string, BackgroundJob>();

export function startBackground(command: string, cwd?: string): string {
  const id = `job-${Date.now().toString(36)}`;

  const child = spawn('sh', ['-c', command], {
    cwd: cwd ?? process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  const job: BackgroundJob = {
    id,
    command,
    process: child,
    startedAt: Date.now(),
    status: 'running',
    output: '',
  };

  child.stdout?.on('data', (data: Buffer) => { job.output += data.toString(); });
  child.stderr?.on('data', (data: Buffer) => { job.output += data.toString(); });
  child.on('close', (code) => { job.status = code === 0 ? 'done' : 'error'; });

  _jobs.set(id, job);
  return id;
}

export function listJobs(): Array<{ id: string; command: string; status: string; duration: number }> {
  return [..._jobs.values()].map(j => ({
    id: j.id,
    command: j.command.slice(0, 50),
    status: j.status,
    duration: Math.round((Date.now() - j.startedAt) / 1000),
  }));
}

export function getJobOutput(id: string): string {
  return _jobs.get(id)?.output ?? '';
}

export function killJob(id: string): boolean {
  const job = _jobs.get(id);
  if (!job || job.status !== 'running') return false;
  job.process.kill();
  job.status = 'done';
  return true;
}

// IDENTITY_SEAL: PART-3 | role=jobs | inputs=command | outputs=jobId

// ============================================================
// PART 4 — Process Watcher (포트/프로세스 관리)
// ============================================================

export function findProcessOnPort(port: number): { pid: number; command: string } | null {
  try {
    const output = execSync(`lsof -i :${port} -t 2>/dev/null || netstat -tlnp 2>/dev/null | grep :${port}`, {
      encoding: 'utf-8', timeout: 3000,
    });
    const pid = parseInt(output.trim().split('\n')[0], 10);
    if (isNaN(pid)) return null;

    const cmd = execSync(`ps -p ${pid} -o comm= 2>/dev/null`, { encoding: 'utf-8', timeout: 2000 }).trim();
    return { pid, command: cmd };
  } catch {
    return null;
  }
}

export function killProcessOnPort(port: number): boolean {
  const proc = findProcessOnPort(port);
  if (!proc) return false;
  try {
    process.kill(proc.pid);
    return true;
  } catch { return false; }
}

// IDENTITY_SEAL: PART-4 | role=process-watcher | inputs=port | outputs=pid

// ============================================================
// PART 5 — Progress Bar
// ============================================================

export interface ProgressBarOptions {
  total: number;
  width?: number;
  label?: string;
  fillChar?: string;
  emptyChar?: string;
}

export class ProgressBar {
  private current = 0;
  private total: number;
  private width: number;
  private label: string;
  private fillChar: string;
  private emptyChar: string;
  private startTime: number;

  constructor(opts: ProgressBarOptions) {
    this.total = opts.total;
    this.width = opts.width ?? 30;
    this.label = opts.label ?? '';
    this.fillChar = opts.fillChar ?? '█';
    this.emptyChar = opts.emptyChar ?? '░';
    this.startTime = performance.now();
  }

  update(current: number, label?: string): void {
    this.current = Math.min(current, this.total);
    if (label) this.label = label;
    this.render();
  }

  increment(label?: string): void {
    this.update(this.current + 1, label);
  }

  private render(): void {
    const ratio = this.total > 0 ? this.current / this.total : 0;
    const filled = Math.round(ratio * this.width);
    const empty = this.width - filled;
    const bar = this.fillChar.repeat(filled) + this.emptyChar.repeat(empty);
    const pct = Math.round(ratio * 100);

    const elapsed = Math.round((performance.now() - this.startTime) / 1000);
    const eta = ratio > 0 && ratio < 1
      ? Math.round(elapsed / ratio * (1 - ratio))
      : 0;
    const etaStr = eta > 0 ? ` ETA ${eta}s` : '';

    process.stdout.write(`\r  [${bar}] ${pct}% ${this.current}/${this.total}${etaStr} ${this.label.padEnd(20)}`);
  }

  done(message?: string): void {
    const elapsed = Math.round(performance.now() - this.startTime);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    if (message) {
      console.log(`  ${message} (${elapsed}ms)`);
    }
  }
}

// IDENTITY_SEAL: PART-5 | role=progress-bar | inputs=ProgressBarOptions | outputs=ProgressBar

// ============================================================
// PART 6 — Spinner
// ============================================================

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private message: string;

  constructor(message: string = 'Processing...') {
    this.message = message;
  }

  start(): void {
    if (this.intervalId) return;
    this.frameIndex = 0;
    this.intervalId = setInterval(() => {
      const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
      process.stdout.write(`\r  ${frame} ${this.message}`);
      this.frameIndex++;
    }, 80);
  }

  update(message: string): void {
    this.message = message;
  }

  stop(finalMessage?: string): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    process.stdout.write('\r' + ' '.repeat(this.message.length + 10) + '\r');
    if (finalMessage) {
      console.log(`  ${finalMessage}`);
    }
  }
}

// IDENTITY_SEAL: PART-6 | role=spinner | inputs=message | outputs=Spinner

// ============================================================
// PART 7 — Formatted Output Helpers
// ============================================================

export function printTable(headers: string[], rows: string[][], colWidths?: number[]): void {
  const widths = colWidths ?? headers.map((h, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0);
    return Math.max(h.length, maxData) + 2;
  });

  const header = headers.map((h, i) => h.padEnd(widths[i])).join(' ');
  console.log(`  ${header}`);
  console.log('  ' + widths.map(w => '─'.repeat(w)).join(' '));

  for (const row of rows) {
    const line = row.map((cell, i) => (cell ?? '').padEnd(widths[i] ?? 10)).join(' ');
    console.log(`  ${line}`);
  }
}

export function printBox(title: string, lines: string[], width: number = 50): void {
  const top = '┌' + '─'.repeat(width - 2) + '┐';
  const bottom = '└' + '─'.repeat(width - 2) + '┘';
  const titleLine = '│ ' + title.padEnd(width - 4) + ' │';

  console.log(`  ${top}`);
  console.log(`  ${titleLine}`);
  console.log(`  │${'─'.repeat(width - 2)}│`);
  for (const line of lines) {
    const trimmed = line.slice(0, width - 4);
    console.log(`  │ ${trimmed.padEnd(width - 4)} │`);
  }
  console.log(`  ${bottom}`);
}

// IDENTITY_SEAL: PART-7 | role=formatted-output | inputs=data | outputs=console
