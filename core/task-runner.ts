// ============================================================
// CS Quill 🦔 — Task Runner
// ============================================================
// 프로젝트별 빌드/테스트/린트 자동 감지 + 실행.
// 빌드 & 실행 60% → 75%

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// ============================================================
// PART 1 — Task Detection
// ============================================================

export interface Task {
  name: string;
  command: string;
  source: string;
  category: 'build' | 'test' | 'lint' | 'dev' | 'start' | 'custom';
}

export function detectTasks(rootPath: string): Task[] {
  const tasks: Task[] = [];

  // package.json scripts
  const pkgPath = join(rootPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts ?? {};

      for (const [name, _cmd] of Object.entries(scripts)) {
        const command = `npm run ${name}`;
        let category: Task['category'] = 'custom';

        if (/^(build|compile)/.test(name)) category = 'build';
        else if (/^(test|spec|jest|vitest)/.test(name)) category = 'test';
        else if (/^(lint|eslint|biome)/.test(name)) category = 'lint';
        else if (/^(dev|develop|watch)/.test(name)) category = 'dev';
        else if (/^(start|serve)/.test(name)) category = 'start';

        tasks.push({ name, command, source: 'package.json', category });
      }
    } catch { /* skip */ }
  }

  // Makefile
  if (existsSync(join(rootPath, 'Makefile'))) {
    try {
      const content = readFileSync(join(rootPath, 'Makefile'), 'utf-8');
      const targets = content.match(/^([a-zA-Z_-]+):/gm);
      if (targets) {
        for (const target of targets) {
          const name = target.replace(':', '');
          if (name.startsWith('.') || name === 'all') continue;
          tasks.push({ name, command: `make ${name}`, source: 'Makefile', category: 'custom' });
        }
      }
    } catch { /* skip */ }
  }

  // Cargo.toml (Rust)
  if (existsSync(join(rootPath, 'Cargo.toml'))) {
    tasks.push({ name: 'build', command: 'cargo build', source: 'Cargo.toml', category: 'build' });
    tasks.push({ name: 'test', command: 'cargo test', source: 'Cargo.toml', category: 'test' });
    tasks.push({ name: 'clippy', command: 'cargo clippy', source: 'Cargo.toml', category: 'lint' });
  }

  // go.mod (Go)
  if (existsSync(join(rootPath, 'go.mod'))) {
    tasks.push({ name: 'build', command: 'go build ./...', source: 'go.mod', category: 'build' });
    tasks.push({ name: 'test', command: 'go test ./...', source: 'go.mod', category: 'test' });
    tasks.push({ name: 'vet', command: 'go vet ./...', source: 'go.mod', category: 'lint' });
  }

  // pyproject.toml / requirements.txt (Python)
  if (existsSync(join(rootPath, 'pyproject.toml')) || existsSync(join(rootPath, 'requirements.txt'))) {
    tasks.push({ name: 'test', command: 'pytest', source: 'python', category: 'test' });
    tasks.push({ name: 'lint', command: 'pylint src/', source: 'python', category: 'lint' });
  }

  return tasks;
}

// IDENTITY_SEAL: PART-1 | role=detection | inputs=rootPath | outputs=Task[]

// ============================================================
// PART 2 — Task Execution
// ============================================================

export interface TaskResult {
  task: Task;
  success: boolean;
  output: string;
  duration: number;
  exitCode: number;
}

export function runTask(task: Task, rootPath: string, timeout: number = 60000): TaskResult {
  const start = performance.now();

  try {
    const output = execSync(task.command, {
      cwd: rootPath,
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      task, success: true, output: output.slice(0, 5000),
      duration: Math.round(performance.now() - start), exitCode: 0,
    };
  } catch (e: unknown) {
    return {
      task, success: false,
      output: ((e.stdout ?? '') + '\n' + (e.stderr ?? '')).slice(0, 5000),
      duration: Math.round(performance.now() - start),
      exitCode: e.status ?? 1,
    };
  }
}

// IDENTITY_SEAL: PART-2 | role=execution | inputs=task,rootPath | outputs=TaskResult

// ============================================================
// PART 3 — Quick Commands
// ============================================================

export function runBuild(rootPath: string): TaskResult | null {
  const tasks = detectTasks(rootPath);
  const build = tasks.find(t => t.category === 'build');
  return build ? runTask(build, rootPath) : null;
}

export function runTests(rootPath: string): TaskResult | null {
  const tasks = detectTasks(rootPath);
  const test = tasks.find(t => t.category === 'test');
  return test ? runTask(test, rootPath) : null;
}

export function runLint(rootPath: string): TaskResult | null {
  const tasks = detectTasks(rootPath);
  const lint = tasks.find(t => t.category === 'lint');
  return lint ? runTask(lint, rootPath) : null;
}

// IDENTITY_SEAL: PART-3 | role=quick-commands | inputs=rootPath | outputs=TaskResult
