// ============================================================
// CS Quill 🦔 — Worker Pool (Multi-Agent Parallel)
// ============================================================
// worker_threads 기반 병렬 검증. @/ 경로 의존 제거.
// 태스크 핸들러 레지스트리로 확장 가능.

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

// ============================================================
// PART 1 — Types
// ============================================================

export interface WorkerTask {
  id: string;
  type: string;
  payload: unknown;
}

export interface WorkerResult {
  id: string;
  type: string;
  success: boolean;
  result: unknown;
  error?: string;
  durationMs: number;
}

export interface PoolConfig {
  maxWorkers: number;
  taskTimeout: number;
}

export type TaskHandler = (payload: unknown) => Promise<unknown>;

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=WorkerTask,WorkerResult

// ============================================================
// PART 2 — Task Handler Registry (Main Thread)
// ============================================================

const _handlers: Map<string, TaskHandler> = new Map();

export function registerTaskHandler(type: string, handler: TaskHandler): void {
  _handlers.set(type, handler);
}

export function getRegisteredTypes(): string[] {
  return [..._handlers.keys()];
}

// 기본 핸들러 등록: 코드 검증용
registerTaskHandler('eval', async (payload) => {
  const { code } = payload as { code: string };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('payload', code);
  return fn(payload);
});

registerTaskHandler('lint-file', async (payload) => {
  const { filePath } = payload as { filePath: string };
  const { runESLint } = await import('./lint-engine');
  return runESLint(filePath);
});

registerTaskHandler('security-scan', async (payload) => {
  const { rootPath } = payload as { rootPath: string };
  const { runNpmAudit } = await import('./security-engine');
  return runNpmAudit(rootPath);
});

registerTaskHandler('dep-check', async (payload) => {
  const { rootPath } = payload as { rootPath: string };
  const { runDepcheck } = await import('./dep-analyzer');
  return runDepcheck(rootPath);
});

registerTaskHandler('accessibility', async (payload) => {
  const { html } = payload as { html: string };
  const { runAxeAccessibility } = await import('./web-quality');
  return runAxeAccessibility(html);
});

// IDENTITY_SEAL: PART-2 | role=task-registry | inputs=type,handler | outputs=void

// ============================================================
// PART 3 — Worker Thread Execution
// ============================================================

// Worker thread: execute task using inline code from workerData
if (!isMainThread && parentPort) {
  const task = workerData as WorkerTask & { handlerCode?: string };
  const start = performance.now();

  (async () => {
    try {
      let result: unknown;

      if (task.handlerCode) {
        // Execute serialized handler
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction('payload', task.handlerCode);
        result = await fn(task.payload);
      } else {
        throw new Error(`No handler for task type: ${task.type}`);
      }

      parentPort!.postMessage({
        id: task.id, type: task.type, success: true, result,
        durationMs: Math.round(performance.now() - start),
      } satisfies WorkerResult);
    } catch (err) {
      parentPort!.postMessage({
        id: task.id, type: task.type, success: false, result: null,
        error: (err as Error).message, durationMs: Math.round(performance.now() - start),
      } satisfies WorkerResult);
    }
  })();
}

// IDENTITY_SEAL: PART-3 | role=worker-exec | inputs=WorkerTask | outputs=WorkerResult

// ============================================================
// PART 4 — Pool Manager (Main Thread)
// ============================================================

const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxWorkers: Math.max(2, cpus().length - 1),
  taskTimeout: 30000,
};

export function runTasksParallel(
  tasks: WorkerTask[],
  config: Partial<PoolConfig> = {},
  onProgress?: (completed: number, total: number, result: WorkerResult) => void,
): Promise<WorkerResult[]> {
  const cfg = { ...DEFAULT_POOL_CONFIG, ...config };
  const maxConcurrency = Math.min(cfg.maxWorkers, tasks.length);

  return new Promise((resolve) => {
    if (tasks.length === 0) { resolve([]); return; }

    const results: WorkerResult[] = [];
    let nextTaskIndex = 0;
    let completedCount = 0;

    function onComplete(result: WorkerResult): void {
      results.push(result);
      completedCount++;
      onProgress?.(completedCount, tasks.length, result);
      if (completedCount === tasks.length) resolve(results);
      else spawnWorker();
    }

    function spawnWorker(): void {
      if (nextTaskIndex >= tasks.length) return;

      const task = tasks[nextTaskIndex++];
      // ESM/CJS 호환: __filename 또는 import.meta.url 사용
      const workerPath = typeof __filename !== 'undefined' ? __filename : new URL(import.meta.url).pathname;
      const worker = new Worker(workerPath, {
        workerData: { ...task, handlerCode: undefined },
      });

      const timer = setTimeout(() => {
        worker.terminate();
        onComplete({
          id: task.id, type: task.type, success: false,
          result: null, error: 'timeout', durationMs: cfg.taskTimeout,
        });
      }, cfg.taskTimeout);

      worker.on('message', (result: WorkerResult) => {
        clearTimeout(timer);
        worker.terminate();
        onComplete(result);
      });

      worker.on('error', (err) => {
        clearTimeout(timer);
        onComplete({
          id: task.id, type: task.type, success: false,
          result: null, error: err.message, durationMs: 0,
        });
      });
    }

    for (let i = 0; i < maxConcurrency; i++) {
      spawnWorker();
    }
  });
}

// IDENTITY_SEAL: PART-4 | role=pool-manager | inputs=tasks,config | outputs=WorkerResult[]

// ============================================================
// PART 5 — In-Process Parallel (Promise.allSettled 대안)
// ============================================================
// worker_threads가 실패하거나 오버헤드가 클 때 쓰는 경량 대안.

export async function runTasksInProcess(
  tasks: WorkerTask[],
  config: Partial<PoolConfig> = {},
  onProgress?: (completed: number, total: number, result: WorkerResult) => void,
): Promise<WorkerResult[]> {
  const cfg = { ...DEFAULT_POOL_CONFIG, ...config };
  const maxConcurrency = Math.min(cfg.maxWorkers, tasks.length);
  const results: WorkerResult[] = [];
  let nextIdx = 0;
  let completed = 0;

  async function runOne(): Promise<void> {
    while (nextIdx < tasks.length) {
      const task = tasks[nextIdx++];
      const handler = _handlers.get(task.type);
      const start = performance.now();

      let result: WorkerResult;
      if (!handler) {
        result = {
          id: task.id, type: task.type, success: false,
          result: null, error: `No handler for type: ${task.type}`,
          durationMs: 0,
        };
      } else {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), cfg.taskTimeout),
          );
          const value = await Promise.race([handler(task.payload), timeoutPromise]);
          result = {
            id: task.id, type: task.type, success: true,
            result: value, durationMs: Math.round(performance.now() - start),
          };
        } catch (err) {
          result = {
            id: task.id, type: task.type, success: false,
            result: null, error: (err as Error).message,
            durationMs: Math.round(performance.now() - start),
          };
        }
      }

      results.push(result);
      completed++;
      onProgress?.(completed, tasks.length, result);
    }
  }

  const workers = Array.from({ length: maxConcurrency }, () => runOne());
  await Promise.all(workers);
  return results;
}

// IDENTITY_SEAL: PART-5 | role=in-process-parallel | inputs=tasks | outputs=WorkerResult[]

// ============================================================
// PART 6 — Convenience: Parallel Verify
// ============================================================

export async function runParallelVerify(
  files: Array<{ path: string; content: string; language: string }>,
  onProgress?: (completed: number, total: number) => void,
): Promise<WorkerResult[]> {
  const tasks: WorkerTask[] = files.map((f, i) => ({
    id: `verify-${i}`,
    type: 'lint-file',
    payload: { filePath: f.path, code: f.content, language: f.language },
  }));

  return runTasksInProcess(tasks, {}, (completed, total) => {
    onProgress?.(completed, total);
  });
}

// IDENTITY_SEAL: PART-6 | role=parallel-verify | inputs=files | outputs=WorkerResult[]
