// ============================================================
// CS Quill 🦔 — LSP Adapter (tsserver)
// ============================================================
// OpenCode의 LSP 실시간 타입 분석을 로컬로 구현.
// TypeScript Language Server를 직접 호출해서
// 타입 추론, 크로스파일 참조, 진단을 수행.

import { execSync } from 'child_process';
import { readFileSync, existsSync, _writeFileSync } from 'fs';
import { join, relative } from 'path';

// ============================================================
// PART 1 — Types
// ============================================================

export interface LSPDiagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string | number;
}

export interface LSPTypeInfo {
  symbol: string;
  type: string;
  nullable: boolean;
  file: string;
  line: number;
}

export interface LSPReference {
  file: string;
  line: number;
  column: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=LSPDiagnostic,LSPTypeInfo,LSPReference

// ============================================================
// PART 2 — TypeScript Diagnostics (tsc --noEmit)
// ============================================================

export function getDiagnostics(rootPath: string): LSPDiagnostic[] {
  const tsConfigPath = join(rootPath, 'tsconfig.json');
  if (!existsSync(tsConfigPath)) return [];

  try {
    const output = execSync('npx tsc --noEmit --pretty false 2>&1', {
      cwd: rootPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    return parseTscOutput(output, rootPath);
  } catch (e: unknown) {
    const error = e as { stdout?: string };
    return parseTscOutput(error.stdout ?? '', rootPath);
  }
}

function parseTscOutput(output: string, rootPath: string): LSPDiagnostic[] {
  const diagnostics: LSPDiagnostic[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Format: src/file.ts(10,5): error TS2345: ...
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS(\d+):\s*(.+)$/);
    if (!match) continue;

    diagnostics.push({
      file: relative(rootPath, match[1]),
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      severity: match[4] as 'error' | 'warning',
      code: `TS${match[5]}`,
      message: match[6].trim(),
    });
  }

  return diagnostics;
}

// IDENTITY_SEAL: PART-2 | role=diagnostics | inputs=rootPath | outputs=LSPDiagnostic[]

// ============================================================
// PART 3 — Type Analysis (TypeScript Compiler API)
// ============================================================

export async function getTypeInfo(filePath: string, line: number, column: number): Promise<LSPTypeInfo | null> {
  try {
    const ts = await import('typescript');
    const content = readFileSync(filePath, 'utf-8');

    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    // Find node at position
    const pos = ts.getPositionOfLineAndCharacter(sourceFile, line - 1, column - 1);

    let targetNode: import('typescript').Node | null = null;
    function find(node: import('typescript').Node): void {
      if (node.getStart() <= pos && pos <= node.getEnd()) {
        targetNode = node;
        ts.forEachChild(node, find);
      }
    }
    find(sourceFile);

    if (!targetNode) return null;

    const text = (targetNode as import('typescript').Node).getText(sourceFile);

    // 실제 타입 해석: Program + TypeChecker 사용
    let typeStr = 'unknown';
    let nullable = false;
    try {
      const program = ts.createProgram([filePath], {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        strict: true,
        noEmit: true,
      });
      const checker = program.getTypeChecker();
      const sf = program.getSourceFile(filePath);
      if (sf) {
        // 동일 위치의 노드를 Program 컨텍스트에서 재탐색
        let progNode: import('typescript').Node | null = null;
        function findInProg(node: import('typescript').Node): void {
          if (node.getStart() <= pos && pos <= node.getEnd()) {
            progNode = node;
            ts.forEachChild(node, findInProg);
          }
        }
        findInProg(sf);

        if (progNode) {
          const type = checker.getTypeAtLocation(progNode);
          typeStr = checker.typeToString(type);
          nullable = typeStr.includes('null') || typeStr.includes('undefined');
        }
      }
    } catch { /* Program 생성 실패 시 'unknown' 유지 */ }

    return {
      symbol: text.slice(0, 50),
      type: typeStr,
      nullable,
      file: filePath,
      line,
    };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=type-analysis | inputs=filePath,line,column | outputs=LSPTypeInfo

// ============================================================
// PART 4 — Cross-File References (grep-based fast search)
// ============================================================

export function findReferences(rootPath: string, symbolName: string): LSPReference[] {
  const references: LSPReference[] = [];

  try {
    const output = execSync(
      `grep -rn "\\b${symbolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null`,
      { cwd: rootPath, encoding: 'utf-8', timeout: 10000 },
    );

    for (const line of output.split('\n').filter(Boolean)) {
      const match = line.match(/^(.+?):(\d+):/);
      if (match) {
        references.push({ file: match[1], line: parseInt(match[2], 10), column: 0 });
      }
    }
  } catch { /* no matches or grep unavailable */ }

  return references;
}

// IDENTITY_SEAL: PART-4 | role=references | inputs=rootPath,symbolName | outputs=LSPReference[]

// ============================================================
// PART 5 — Call Graph (import 추적)
// ============================================================

export function buildCallGraph(rootPath: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  try {
    const output = execSync(
      'grep -rn "^import .* from " --include="*.ts" --include="*.tsx" src/ 2>/dev/null',
      { cwd: rootPath, encoding: 'utf-8', timeout: 15000 },
    );

    for (const line of output.split('\n').filter(Boolean)) {
      const match = line.match(/^(.+?):\d+:import .+ from ['"](.+?)['"]/);
      if (!match) continue;

      const file = match[1];
      const imported = match[2];
      const deps = graph.get(file) ?? [];
      deps.push(imported);
      graph.set(file, deps);
    }
  } catch { /* skip */ }

  return graph;
}

export function findCircularDeps(graph: Map<string, string[]>): string[][] {
  const circles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) circles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);

    for (const dep of graph.get(node) ?? []) {
      dfs(dep, [...path, node]);
    }

    stack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node, []);
  }

  return circles;
}

// IDENTITY_SEAL: PART-5 | role=call-graph | inputs=rootPath | outputs=Map,circles

// ============================================================
// PART 6 — Unified LSP Runner
// ============================================================

export async function runFullLSPAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // tsc diagnostics
  const diagnostics = getDiagnostics(rootPath);
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;
  const diagScore = Math.max(0, 100 - errors * 10 - warnings * 3);
  results.push({ engine: 'tsc-diagnostics', score: diagScore, detail: `${errors} errors, ${warnings} warnings` });

  // Call graph circular deps
  const graph = buildCallGraph(rootPath);
  const circles = findCircularDeps(graph);
  const circScore = circles.length === 0 ? 100 : Math.max(0, 100 - circles.length * 25);
  results.push({ engine: 'call-graph', score: circScore, detail: `${graph.size} modules, ${circles.length} circular` });

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore, diagnostics, circles };
}

// IDENTITY_SEAL: PART-6 | role=unified-lsp | inputs=rootPath | outputs=results
