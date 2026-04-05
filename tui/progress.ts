// ============================================================
// CS Quill 🦔 — TUI Progress Display
// ============================================================
// 진행률 바 + 예상 시간 + 실시간 상태.

// ============================================================
// PART 1 — Progress Bar
// ============================================================

export function progressBar(current: number, total: number, width: number = 20): string {
  const ratio = Math.min(1, current / Math.max(1, total));
  const filled = Math.round(ratio * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function progressLine(current: number, total: number, label: string): string {
  const bar = progressBar(current, total);
  const pct = Math.round((current / Math.max(1, total)) * 100);
  return `[${bar}] ${current}/${total} ${label} (${pct}%)`;
}

// IDENTITY_SEAL: PART-1 | role=progress-bar | inputs=current,total | outputs=string

// ============================================================
// PART 2 — Timer & ETA
// ============================================================

export class ProgressTimer {
  private startTime: number;
  private history: Array<{ elapsed: number; progress: number }> = [];

  constructor() {
    this.startTime = performance.now();
  }

  record(progress: number): void {
    this.history.push({ elapsed: performance.now() - this.startTime, progress });
  }

  getETA(currentProgress: number): string {
    if (this.history.length < 2 || currentProgress >= 1) return '';

    const recent = this.history.slice(-3);
    const rate = recent.reduce((s, h, i) => {
      if (i === 0) return 0;
      const dt = h.elapsed - recent[i - 1].elapsed;
      const dp = h.progress - recent[i - 1].progress;
      return s + (dp > 0 ? dt / dp : 0);
    }, 0) / Math.max(1, recent.length - 1);

    const remaining = (1 - currentProgress) * rate;
    if (remaining < 1000) return '< 1초';
    if (remaining < 60000) return `약 ${Math.ceil(remaining / 1000)}초`;
    return `약 ${Math.ceil(remaining / 60000)}분`;
  }

  getElapsed(): string {
    const ms = Math.round(performance.now() - this.startTime);
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
}

// IDENTITY_SEAL: PART-2 | role=timer | inputs=progress | outputs=ETA-string

// ============================================================
// PART 3 — Spinner
// ============================================================

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    this.interval = setInterval(() => {
      const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
      process.stdout.write(`\r  ${frame} ${this.message}`);
      this.frameIndex++;
    }, 80);
  }

  update(message: string): void {
    this.message = message;
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (finalMessage) {
      process.stdout.write(`\r  ✅ ${finalMessage}\n`);
    } else {
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
    }
  }
}

// IDENTITY_SEAL: PART-3 | role=spinner | inputs=message | outputs=console-animation
