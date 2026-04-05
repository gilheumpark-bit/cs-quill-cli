// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Deep Verification Engine
// ============================================================
// 5차 진단에서 발견된 P0~P2 패턴을 자동화.
// 8팀 파이프라인이 못 잡는 논리적 버그를 잡는다.
//
// 증명: 자체 코드 91건 버그 중 48건은 이 엔진 수준에서만 발견 가능했음.

// ============================================================
// PART 1 — Types
// ============================================================

export interface DeepFinding {
  file: string;
  line: number;
  message: string;
  severity: 'P0' | 'P1' | 'P2';
  category: string;
  fix?: string;
}

export interface DeepVerifyResult {
  findings: DeepFinding[];
  score: number;
  checks: number;
  duration: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DeepFinding,DeepVerifyResult

// ============================================================
// PART 2 — Check: 변수 선언 순서 (P0 방지)
// ============================================================
// "fileName이 line 300에서 사용되는데 line 410에서 선언" 같은 패턴

function checkDeclarationOrder(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  // Track variable declarations
  const declarations = new Map<string, number>(); // varName → line number
  const usages: Array<{ name: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Declaration patterns
    const declMatch = line.match(/(?:const|let|var)\s+(\w+)\s*[=:]/);
    if (declMatch) {
      const name = declMatch[1];
      if (!declarations.has(name)) {
        declarations.set(name, i + 1);
      }
    }

    // Function parameter declarations
    const paramMatch = line.match(/(?:function\s+\w+|=>\s*)\(([^)]+)\)/);
    if (paramMatch) {
      for (const param of paramMatch[1].split(',')) {
        const pName = param.trim().replace(/[:=].*/, '').replace(/\.\.\./g, '').trim();
        if (pName && !pName.startsWith('_')) {
          declarations.set(pName, i + 1);
        }
      }
    }

    // Usage patterns (identifiers in expressions, not declarations)
    const identifiers = line.match(/\b[a-zA-Z_]\w*\b/g);
    if (identifiers) {
      for (const id of identifiers) {
        if (/^(const|let|var|function|class|import|export|return|if|else|for|while|new|typeof|await|async|try|catch|throw|break|continue|switch|case|default)$/.test(id)) continue;
        if (line.includes(`const ${id}`) || line.includes(`let ${id}`) || line.includes(`var ${id}`)) continue;
        usages.push({ name: id, line: i + 1 });
      }
    }
  }

  // Check: usage before declaration (same scope approximation)
  for (const usage of usages) {
    const declLine = declarations.get(usage.name);
    if (declLine && usage.line < declLine && declLine - usage.line > 5) {
      // Likely a real "use before declare" (not hoisting)
      findings.push({
        file: fileName, line: usage.line,
        message: `'${usage.name}' used at line ${usage.line} but declared at line ${declLine}`,
        severity: 'P0', category: 'declaration-order',
        fix: `Move declaration of '${usage.name}' before line ${usage.line}`,
      });
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-2 | role=declaration-order | inputs=code | outputs=DeepFinding[]

// ============================================================
// PART 3 — Check: Brace 균형 (P0 방지)
// ============================================================
// "for loop brace 구조 깨짐" 같은 패턴

function checkBraceBalance(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  const braceStack: Array<{ line: number; char: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip string contents and comments
    const cleaned = line
      .replace(/\/\/.*$/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/'[^']*'/g, '""')
      .replace(/"[^"]*"/g, '""')
      .replace(/`[^`]*`/g, '""');

    for (const char of cleaned) {
      if (char === '{') { braceDepth++; braceStack.push({ line: i + 1, char: '{' }); }
      if (char === '}') {
        braceDepth--;
        if (braceDepth < 0) {
          findings.push({
            file: fileName, line: i + 1,
            message: `Extra closing brace '}' without matching '{'`,
            severity: 'P0', category: 'brace-balance',
            fix: 'Remove extra } or add missing {',
          });
          braceDepth = 0;
        } else {
          braceStack.pop();
        }
      }
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }
  }

  if (braceDepth > 0) {
    const unclosed = braceStack.slice(-braceDepth);
    for (const b of unclosed) {
      findings.push({
        file: fileName, line: b.line,
        message: `Unclosed '{' at line ${b.line}`,
        severity: 'P0', category: 'brace-balance',
        fix: 'Add missing }',
      });
    }
  }

  if (parenDepth !== 0) {
    findings.push({
      file: fileName, line: lines.length,
      message: `Parentheses imbalance: ${parenDepth > 0 ? 'unclosed (' : 'extra )'}`,
      severity: 'P1', category: 'brace-balance',
    });
  }

  return findings;
}

// IDENTITY_SEAL: PART-3 | role=brace-balance | inputs=code | outputs=DeepFinding[]

// ============================================================
// PART 4 — Check: 비동기 안티패턴 (P1 방지)
// ============================================================

function checkAsyncPatterns(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Busy wait (sync sleep in loop)
    if (/while\s*\(/.test(line) && /execSync.*sleep/i.test(lines.slice(i, i + 5).join('\n'))) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Synchronous busy-wait detected (execSync sleep in loop)',
        severity: 'P1', category: 'async-pattern',
        fix: 'Use await new Promise(r => setTimeout(r, ms))',
      });
    }

    // Promise constructor inside async (unnecessary)
    if (/new Promise/.test(line)) {
      // Check if inside async function
      const above = lines.slice(Math.max(0, i - 10), i).join('\n');
      if (/async\s/.test(above) && /resolve.*reject/.test(lines.slice(i, i + 5).join('\n'))) {
        // Check if there's a callback-based API being wrapped (OK) vs unnecessary wrapping
        const promiseBody = lines.slice(i, i + 5).join('\n');
        if (/\.question\(|\.on\(/.test(promiseBody)) {
          // Wrapping callback API — OK, but check close
          if (!/\.close\(\)|finally/.test(lines.slice(i, i + 10).join('\n'))) {
            findings.push({
              file: fileName, line: i + 1,
              message: 'Promise wrapping callback without cleanup in finally',
              severity: 'P2', category: 'async-pattern',
              fix: 'Add finally { resource.close() }',
            });
          }
        }
      }
    }

    // await in loop without batching
    if (/for\s*\(|for\s+of|while\s*\(/.test(line)) {
      const loopBody = lines.slice(i, Math.min(i + 15, lines.length)).join('\n');
      const awaitCount = (loopBody.match(/await\s/g) ?? []).length;
      if (awaitCount >= 2) {
        findings.push({
          file: fileName, line: i + 1,
          message: `Multiple awaits (${awaitCount}) inside loop — potential N+1 performance issue`,
          severity: 'P2', category: 'async-pattern',
          fix: 'Consider Promise.all() for parallel execution',
        });
      }
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-4 | role=async-patterns | inputs=code | outputs=DeepFinding[]

// ============================================================
// PART 5 — Check: 강제 타입 캐스팅 (P1 방지)
// ============================================================

function checkUnsafeCasts(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // as never — always suspicious
    if (/as\s+never/.test(line)) {
      findings.push({
        file: fileName, line: i + 1,
        message: "'as never' cast — bypasses all type checking",
        severity: 'P1', category: 'unsafe-cast',
        fix: 'Use proper type guard or generic constraint',
      });
    }

    // as any — usually bad
    if (/as\s+any\b/.test(line) && !/\/\/.*as any/.test(line)) {
      findings.push({
        file: fileName, line: i + 1,
        message: "'as any' cast — loses type safety",
        severity: 'P2', category: 'unsafe-cast',
        fix: 'Use unknown + type guard, or proper interface',
      });
    }

    // @ts-ignore / @ts-expect-error
    if (/@ts-ignore|@ts-expect-error/.test(line)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'TypeScript suppression comment — hiding potential error',
        severity: 'P2', category: 'unsafe-cast',
        fix: 'Fix the underlying type error instead',
      });
    }

    // Non-null assertion (!) on function call result
    if (/\w+\([^)]*\)!\./.test(line)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Non-null assertion on function return — may crash if null',
        severity: 'P1', category: 'unsafe-cast',
        fix: 'Add null check or use optional chaining',
      });
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-5 | role=unsafe-casts | inputs=code | outputs=DeepFinding[]

// ============================================================
// PART 6 — Check: 리소스 릭 (P2 방지)
// ============================================================

function checkResourceLeaks(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  // Track resource allocations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // readline createInterface without close
    if (/createInterface\s*\(/.test(line)) {
      const rest = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');
      if (!rest.includes('.close()') && !rest.includes('finally')) {
        findings.push({
          file: fileName, line: i + 1,
          message: 'readline created without .close() or finally block',
          severity: 'P2', category: 'resource-leak',
          fix: 'Use try-finally { rl.close() }',
        });
      }
    }

    // setInterval without clear
    if (/setInterval\s*\(/.test(line)) {
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*setInterval/);
      if (varMatch) {
        const rest = lines.slice(i, lines.length).join('\n');
        if (!rest.includes(`clearInterval(${varMatch[1]})`) && !rest.includes(`clearInterval(this.${varMatch[1]}`)) {
          findings.push({
            file: fileName, line: i + 1,
            message: `setInterval assigned to '${varMatch[1]}' but never cleared`,
            severity: 'P2', category: 'resource-leak',
            fix: `Add clearInterval(${varMatch[1]}) in cleanup`,
          });
        }
      }
    }

    // spawn without kill/close
    if (/\bspawn\s*\(/.test(line) && !line.includes('execSync')) {
      const rest = lines.slice(i, Math.min(i + 30, lines.length)).join('\n');
      if (!rest.includes('.kill(') && !rest.includes('.destroy(') && !rest.includes('on(\'close\'')) {
        findings.push({
          file: fileName, line: i + 1,
          message: 'Child process spawned without kill/close handling',
          severity: 'P2', category: 'resource-leak',
          fix: 'Add process.kill() in cleanup or on(\'close\') handler',
        });
      }
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-6 | role=resource-leaks | inputs=code | outputs=DeepFinding[]

// ============================================================
// PART 7 — Check: 수학/논리 오류 (P1 방지)
// ============================================================

function checkMathLogic(code: string, fileName: string): DeepFinding[] {
  const findings: DeepFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Score × 100 when already 0-100
    if (/Score.*Math\.round\(\w+\s*\*\s*100\)/.test(line) || /score.*\*\s*100/.test(line)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Score multiplied by 100 — may already be 0-100 range',
        severity: 'P1', category: 'math-logic',
        fix: 'Verify if value is already 0-100 or 0-1',
      });
    }

    // Division by zero potential
    if (/\/\s*(?:\w+\.length|scores\.length|total|count)/.test(line) && !/Math\.max\s*\(\s*1/.test(line) && !/|| 1/.test(line)) {
      findings.push({
        file: fileName, line: i + 1,
        message: 'Division by variable that could be 0',
        severity: 'P1', category: 'math-logic',
        fix: 'Use Math.max(1, divisor) or add zero check',
      });
    }

    // Array sort mutates original
    if (/\.sort\s*\(/.test(line) && !/\[\.\.\./.test(line) && !line.includes('Array.from')) {
      // Check if it's a method chain that might depend on original order
      if (/\]\s*\.sort/.test(line) || /\)\s*\.sort/.test(line)) {
        // Creating new array — OK
      } else if (/\w+\.sort\(/.test(line)) {
        const varMatch = line.match(/(\w+)\.sort\(/);
        if (varMatch && !/^(?:_|temp|sorted|copy)/.test(varMatch[1])) {
          findings.push({
            file: fileName, line: i + 1,
            message: `'${varMatch[1]}.sort()' mutates original array`,
            severity: 'P2', category: 'math-logic',
            fix: `Use [...${varMatch[1]}].sort() to preserve original`,
          });
        }
      }
    }
  }

  return findings;
}

// IDENTITY_SEAL: PART-7 | role=math-logic | inputs=code | outputs=DeepFinding[]

// ============================================================
// PART 8 — Unified Deep Verify Runner
// ============================================================

export function runDeepVerify(code: string, fileName: string): DeepVerifyResult {
  const start = performance.now();

  const allFindings: DeepFinding[] = [
    ...checkDeclarationOrder(code, fileName),
    ...checkBraceBalance(code, fileName),
    ...checkAsyncPatterns(code, fileName),
    ...checkUnsafeCasts(code, fileName),
    ...checkResourceLeaks(code, fileName),
    ...checkMathLogic(code, fileName),
  ];

  // Deduplicate (same file + same line + same category)
  const seen = new Set<string>();
  const unique = allFindings.filter(f => {
    const key = `${f.file}:${f.line}:${f.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Score
  const p0 = unique.filter(f => f.severity === 'P0').length;
  const p1 = unique.filter(f => f.severity === 'P1').length;
  const p2 = unique.filter(f => f.severity === 'P2').length;
  const score = Math.max(0, 100 - p0 * 30 - p1 * 15 - p2 * 5);

  return {
    findings: unique,
    score,
    checks: 6,
    duration: Math.round(performance.now() - start),
  };
}

// ============================================================
// PART 9 — Project-Wide Deep Verify
// ============================================================

export function runDeepVerifyProject(rootPath: string): {
  files: number;
  totalFindings: number;
  score: number;
  findings: DeepFinding[];
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const { readdirSync, readFileSync } = require('fs');
  const { join, relative, _extname } = require('path');

  const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', '.cs']);
  const allFindings: DeepFinding[] = [];
  let fileCount = 0;
  let totalScore = 0;

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;

      const code = readFileSync(full, 'utf-8');
      const result = runDeepVerify(code, relative(rootPath, full));
      allFindings.push(...result.findings);
      totalScore += result.score;
      fileCount++;
    }
  }

  walk(rootPath);

  const bySeverity: Record<string, number> = { P0: 0, P1: 0, P2: 0 };
  const byCategory: Record<string, number> = {};
  for (const f of allFindings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
  }

  return {
    files: fileCount,
    totalFindings: allFindings.length,
    score: fileCount > 0 ? Math.round(totalScore / fileCount) : 100,
    findings: allFindings,
    bySeverity,
    byCategory,
  };
}

// IDENTITY_SEAL: PART-9 | role=project-verify | inputs=rootPath | outputs=project-results
