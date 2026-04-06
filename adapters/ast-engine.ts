// ============================================================
// CS Quill 🦔 — AST Engine Adapter
// ============================================================
// 6 packages: typescript, ts-morph, acorn, estraverse, esquery, @babel/parser
// Level 1~4 검증 정밀도 향상을 위한 통합 AST 분석 엔진.

// ============================================================
// PART 1 — TypeScript Compiler API (Level 2: 타입 추론)
// ============================================================

export async function analyzeWithTypeScript(code: string, fileName: string = 'temp.ts') {
  const ts = require('typescript');

  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  const lineOf = (node: import('typescript').Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  // ── 구조 통계 ──
  let fnCount = 0;
  let maxDepth = 0;
  let maxFnLines = 0;
  const declaredVars = new Set<string>();
  const usedVars = new Set<string>();

  function measureDepth(node: import('typescript').Node, depth: number): void {
    if (ts.isBlock(node)) {
      if (depth > maxDepth) maxDepth = depth;
      depth++;
    }
    ts.forEachChild(node, child => measureDepth(child, depth));
  }
  measureDepth(sourceFile, 0);

  function visit(node: import('typescript').Node): void {
    // 1. 빈 함수 탐지
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
      fnCount++;
      const body = (node as any).body;
      if (body && ts.isBlock(body)) {
        const stmtCount = body.statements.length;
        const fnLines = sourceFile.getLineAndCharacterOfPosition(body.getEnd()).line -
                        sourceFile.getLineAndCharacterOfPosition(body.getStart()).line;
        if (fnLines > maxFnLines) maxFnLines = fnLines;

        if (stmtCount === 0) {
          const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
          findings.push({ line: lineOf(node), message: `빈 함수: ${name}()`, severity: 'error' });
        }
        // 긴 함수 탐지
        if (fnLines > 60) {
          const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
          findings.push({ line: lineOf(node), message: `함수 ${name}() ${fnLines}줄 — 60줄 초과`, severity: 'warning' });
        }
      }
    }

    // 2. eval() / new Function() 탐지 — AST 기반이므로 규칙 정의 문자열과 혼동 없음
    if (ts.isCallExpression(node)) {
      const call = node as import('typescript').CallExpression;
      const expr = call.expression;
      if (ts.isIdentifier(expr) && expr.getText(sourceFile) === 'eval') {
        findings.push({ line: lineOf(node), message: 'eval() 호출 — 보안 위험', severity: 'error' });
      }
    }
    if (ts.isNewExpression(node)) {
      const ne = node as import('typescript').NewExpression;
      const ctor = ne.expression;
      if (ts.isIdentifier(ctor) && ctor.getText(sourceFile) === 'Function') {
        findings.push({ line: lineOf(node), message: 'new Function() — eval 동등', severity: 'error' });
      }
    }

    // 3. == / != 탐지 (=== / !== 권장)
    if (ts.isBinaryExpression(node)) {
      const bin = node as import('typescript').BinaryExpression;
      const op = bin.operatorToken.kind;
      if (op === ts.SyntaxKind.EqualsEqualsToken) {
        findings.push({ line: lineOf(node), message: '== 사용 — === 권장', severity: 'warning' });
      }
      if (op === ts.SyntaxKind.ExclamationEqualsToken) {
        findings.push({ line: lineOf(node), message: '!= 사용 — !== 권장', severity: 'warning' });
      }
    }

    // 4. any 타입 탐지
    if (ts.isTypeReferenceNode(node)) {
      const tr = node as import('typescript').TypeReferenceNode;
      if (ts.isIdentifier(tr.typeName) && tr.typeName.getText(sourceFile) === 'any') {
        findings.push({ line: lineOf(node), message: 'TypeScript any 타입 — 타입 안전성 저하', severity: 'warning' });
      }
    }

    // 5. console.log 탐지
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression((node as import('typescript').CallExpression).expression)) {
      const propExpr = (node as import('typescript').CallExpression).expression as import('typescript').PropertyAccessExpression;
      const obj = propExpr.expression;
      const prop = propExpr.name;
      if (ts.isIdentifier(obj) && obj.getText(sourceFile) === 'console' &&
          ts.isIdentifier(prop) && (prop.getText(sourceFile) === 'log' || prop.getText(sourceFile) === 'debug')) {
        findings.push({ line: lineOf(node), message: `console.${prop.getText(sourceFile)}() 발견`, severity: 'info' });
      }
    }

    // 6. 변수 선언/사용 추적 (미사용 변수)
    if (ts.isVariableDeclaration(node)) {
      const vd = node as import('typescript').VariableDeclaration;
      if (ts.isIdentifier(vd.name)) {
        declaredVars.add(vd.name.getText(sourceFile));
      }
    }
    if (ts.isIdentifier(node) && !ts.isVariableDeclaration(node.parent)) {
      usedVars.add(node.getText(sourceFile));
    }

    // 7. 파라미터 5개 초과
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
      const sig = node as import('typescript').SignatureDeclaration;
      if (sig.parameters.length > 5) {
        findings.push({ line: lineOf(node), message: `파라미터 ${sig.parameters.length}개 — 5개 초과`, severity: 'warning' });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // 구조 경고
  if (maxDepth > 5) {
    findings.push({ line: 1, message: `최대 중첩 깊이 ${maxDepth} — 5 초과`, severity: 'warning' });
  }

  return { findings: findings.slice(0, 30), nodeCount: sourceFile.getChildCount(), fnCount, maxDepth, maxFnLines };
}

// IDENTITY_SEAL: PART-1 | role=typescript-analysis | inputs=code | outputs=findings

// ============================================================
// PART 2 — ts-morph (Level 1: AST 구조 분석)
// ============================================================

export async function analyzeWithTsMorph(code: string, fileName: string = 'temp.ts') {
  const { Project, SyntaxKind } = require('ts-morph');

  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(fileName, code);
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  // Find empty functions
  for (const fn of sourceFile.getFunctions()) {
    if (fn.getBody()?.getStatements().length === 0) {
      findings.push({ line: fn.getStartLineNumber(), message: `Empty function: ${fn.getName() ?? 'anonymous'}`, severity: 'error' });
    }
  }

  // Find unused parameters
  for (const fn of sourceFile.getFunctions()) {
    for (const param of fn.getParameters()) {
      const name = param.getName();
      if (name.startsWith('_')) continue;
      const refs = param.findReferencesAsNodes();
      if (refs.length <= 1) { // 1 = the declaration itself
        findings.push({ line: param.getStartLineNumber(), message: `Unused parameter: ${name}`, severity: 'warning' });
      }
    }
  }

  // Find deeply nested blocks (complexity)
  let maxDepth = 0;
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.Block) {
      let depth = 0;
      let parent = node.getParent();
      while (parent) {
        if (parent.getKind() === SyntaxKind.Block) depth++;
        parent = parent.getParent();
      }
      if (depth > maxDepth) maxDepth = depth;
    }
  });

  if (maxDepth > 4) {
    findings.push({ line: 1, message: `Deep nesting detected: ${maxDepth} levels`, severity: 'warning' });
  }

  return { findings, functions: sourceFile.getFunctions().length, classes: sourceFile.getClasses().length };
}

// IDENTITY_SEAL: PART-2 | role=ts-morph-analysis | inputs=code | outputs=findings

// ============================================================
// PART 3 — Acorn + Estraverse + Esquery (JS 분석)
// ============================================================

export async function analyzeWithAcorn(code: string) {
  const acorn = require('acorn');
  const { traverse } = require('estraverse');
  const esquery = require('esquery');

  const findings: Array<{ line: number; message: string; severity: string }> = [];

  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  } catch (e) {
    return { findings: [{ line: 1, message: `Parse error: ${(e as Error).message}`, severity: 'error' }] };
  }

  type EstreeLoc = { loc?: { start?: { line?: number } } };

  // Esquery: find eval() calls
  const evalCalls = esquery.query(ast as never, 'CallExpression[callee.name="eval"]');
  for (const node of evalCalls) {
    const n = node as EstreeLoc;
    findings.push({ line: n.loc?.start?.line ?? 1, message: 'eval() detected — security risk', severity: 'critical' });
  }

  // Esquery: find console.log
  const consoleLogs = esquery.query(ast as never, 'CallExpression[callee.object.name="console"]');
  for (const node of consoleLogs) {
    const n = node as EstreeLoc;
    findings.push({ line: n.loc?.start?.line ?? 1, message: 'console.log detected — remove before production', severity: 'info' });
  }

  // Estraverse: count loop nesting
  let loopDepth = 0;
  let maxLoopDepth = 0;
  const loopTypes = new Set(['ForStatement', 'WhileStatement', 'DoWhileStatement', 'ForInStatement', 'ForOfStatement']);
  traverse(ast as never, {
    enter(node: { type?: string }) {
      if (node.type && loopTypes.has(node.type)) {
        loopDepth++;
        if (loopDepth > maxLoopDepth) maxLoopDepth = loopDepth;
      }
    },
    leave(node: { type?: string }) {
      if (node.type && loopTypes.has(node.type)) {
        loopDepth--;
      }
    },
  });

  if (maxLoopDepth >= 3) {
    findings.push({ line: 1, message: `Triple-nested loop: O(n^${maxLoopDepth}) complexity`, severity: 'warning' });
  }

  return { findings };
}

// IDENTITY_SEAL: PART-3 | role=acorn-analysis | inputs=code | outputs=findings

// ============================================================
// PART 4 — Babel Parser (JSX/TSX 분석)
// ============================================================

export async function analyzeWithBabel(code: string) {
  const { parse } = require('@babel/parser');
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators'],
      errorRecovery: true,
    });

    // Check for JSX without key prop in map
    for (const error of ast.errors ?? []) {
      const e = error as { message?: string; loc?: { line?: number } };
      findings.push({ line: e.loc?.line ?? 1, message: `Syntax: ${e.message ?? 'unknown'}`, severity: 'error' });
    }
  } catch (e) {
    findings.push({ line: 1, message: `Babel parse error: ${(e as Error).message}`, severity: 'error' });
  }

  return { findings };
}

// IDENTITY_SEAL: PART-4 | role=babel-analysis | inputs=code | outputs=findings

// ============================================================
// PART 5 — Unified AST Runner
// ============================================================

export async function runFullASTAnalysis(code: string, fileName: string = 'temp.ts') {
  const results: Array<{ engine: string; findings: Array<{ line: number; message: string; severity: string }> }> = [];

  // 메인 엔진: TypeScript 컴파일러 API (TS/JS/JSX/TSX 전부 지원)
  try {
    const tsResult = await analyzeWithTypeScript(code, fileName);
    results.push({ engine: 'typescript', findings: tsResult.findings });
  } catch { /* skip */ }

  // 보조 엔진: esquery (CSS 셀렉터 기반 AST 패턴 매칭 — typescript에 없는 고유 기능)
  try {
    const esqFindings = await analyzeWithEsquery(code);
    if (esqFindings.findings.length > 0) {
      results.push({ engine: 'esquery', findings: esqFindings.findings });
    }
  } catch { /* skip */ }

  // 중복 제거: 같은 라인 + 같은 메시지
  const seen = new Set<string>();
  const allFindings = results.flatMap(r => r.findings.map(f => ({ ...f, engine: r.engine })))
    .filter(f => {
      const key = `${f.line}:${f.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { engines: results.length, findings: allFindings, results };
}

// esquery 전용 분석 (acorn으로 파싱 후 esquery로 검색 — typescript에 없는 CSS 셀렉터 패턴)
async function analyzeWithEsquery(code: string) {
  const acorn = require('acorn');
  const esquery = require('esquery');
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  } catch {
    return { findings };
  }

  // eval() 호출 (CSS 셀렉터로 정확히 잡음)
  const evalCalls = esquery.query(ast as never, 'CallExpression[callee.name="eval"]');
  for (const node of evalCalls) {
    findings.push({ line: (node as any).loc?.start?.line ?? 1, message: 'eval() 호출 — 보안 위험', severity: 'critical' });
  }

  // new Function()
  const newFn = esquery.query(ast as never, 'NewExpression[callee.name="Function"]');
  for (const node of newFn) {
    findings.push({ line: (node as any).loc?.start?.line ?? 1, message: 'new Function() — eval 동등', severity: 'critical' });
  }

  // 3중 루프 탐지
  const tripleLoop = esquery.query(ast as never,
    ':matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement)');
  if (tripleLoop.length > 0) {
    findings.push({ line: (tripleLoop[0] as any).loc?.start?.line ?? 1, message: '3중 중첩 루프 — O(n³) 복잡도', severity: 'warning' });
  }

  return { findings };
}

// IDENTITY_SEAL: PART-5 | role=unified-runner | inputs=code,fileName | outputs=findings

// ============================================================
// PART 6 — Advanced AST Metrics (함수 길이, 중첩, 커플링, 응집도)
// ============================================================

export interface ASTMetrics {
  avgFunctionLength: number;
  maxFunctionLength: number;
  maxNestingDepth: number;
  totalFunctions: number;
  longFunctions: Array<{ name: string; line: number; length: number }>;
  deeplyNested: Array<{ line: number; depth: number; context: string }>;
  couplingScore: number;
  cohesionScore: number;
  imports: { internal: number; external: number; total: number };
  exports: { named: number; default: number; total: number };
  moduleDetails: {
    incomingRefs: string[];
    outgoingRefs: string[];
    unusedExports: string[];
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export async function computeASTMetrics(code: string, fileName: string = 'temp.ts'): Promise<ASTMetrics> {
  const ts = require('typescript');
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);

  const functions: Array<{ name: string; line: number; length: number; bodyStart: number; bodyEnd: number }> = [];
  const importModules: string[] = [];
  const exportNames: string[] = [];
  let hasDefaultExport = false;
  const usedIdentifiers = new Set<string>();
  const declaredIdentifiers = new Set<string>();

  // ── Pass 1: Collect functions, imports, exports ──

  function collectInfo(node: any): void {
    const lineOf = (n: any) => sourceFile.getLineAndCharacterOfPosition(n.getStart()).line + 1;
    const endLineOf = (n: any) => sourceFile.getLineAndCharacterOfPosition(n.getEnd()).line + 1;

    // Functions
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const name = node.name?.getText?.(sourceFile) ?? 'anonymous';
      const body = node.body;
      if (body) {
        const startLine = lineOf(node);
        const endLine = endLineOf(node);
        const length = endLine - startLine + 1;
        functions.push({ name, line: startLine, length, bodyStart: startLine, bodyEnd: endLine });
      }
    }

    // Imports
    if (ts.isImportDeclaration(node)) {
      const moduleSpec = node.moduleSpecifier?.getText?.(sourceFile)?.replace(/['"]/g, '') ?? '';
      importModules.push(moduleSpec);
    }

    // Exports
    if (ts.isExportDeclaration(node) || (node.modifiers && node.modifiers.some((m: any) => m.kind === ts.SyntaxKind.ExportKeyword))) {
      const name = node.name?.getText?.(sourceFile);
      if (name) exportNames.push(name);
      if (node.modifiers?.some((m: any) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
        hasDefaultExport = true;
      }
    }

    // Track identifiers for cohesion analysis
    if (ts.isIdentifier(node)) {
      const text = node.getText(sourceFile);
      if (ts.isVariableDeclaration(node.parent) || ts.isFunctionDeclaration(node.parent) ||
          ts.isParameter(node.parent) || ts.isClassDeclaration(node.parent)) {
        declaredIdentifiers.add(text);
      } else {
        usedIdentifiers.add(text);
      }
    }

    ts.forEachChild(node, collectInfo);
  }

  collectInfo(sourceFile);

  // ── Pass 2: Nesting depth analysis ──

  const deepNested: Array<{ line: number; depth: number; context: string }> = [];

  function measureNesting(node: any, depth: number, context: string): number {
    const lineOf = (n: any) => sourceFile.getLineAndCharacterOfPosition(n.getStart()).line + 1;

    const nestTypes = [
      ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForInStatement,
      ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
      ts.SyntaxKind.SwitchStatement, ts.SyntaxKind.TryStatement, ts.SyntaxKind.ConditionalExpression,
    ];

    let isNestingNode = nestTypes.includes(node.kind);
    let newDepth = depth;
    let newContext = context;

    if (isNestingNode) {
      newDepth = depth + 1;
      const kindName = ts.SyntaxKind[node.kind] ?? 'block';
      newContext = `${context} > ${kindName}`;

      if (newDepth >= 4) {
        deepNested.push({ line: lineOf(node), depth: newDepth, context: newContext.trim() });
      }
    }

    let maxChildDepth = newDepth;
    ts.forEachChild(node, (child: any) => {
      const childMax = measureNesting(child, newDepth, newContext);
      if (childMax > maxChildDepth) maxChildDepth = childMax;
    });

    return maxChildDepth;
  }

  const maxNestingDepth = measureNesting(sourceFile, 0, '');

  // ── Compute metrics ──

  const totalFunctions = functions.length;
  const avgFunctionLength = totalFunctions > 0
    ? Math.round(functions.reduce((s, f) => s + f.length, 0) / totalFunctions)
    : 0;
  const maxFunctionLength = totalFunctions > 0
    ? Math.max(...functions.map(f => f.length))
    : 0;

  const longFunctions = functions
    .filter(f => f.length > 40)
    .sort((a, b) => b.length - a.length)
    .slice(0, 10)
    .map(f => ({ name: f.name, line: f.line, length: f.length }));

  // Coupling: ratio of external imports to total imports
  const internalImports = importModules.filter(m => m.startsWith('.'));
  const externalImports = importModules.filter(m => !m.startsWith('.'));
  const totalImports = importModules.length;

  // High coupling = many external dependencies relative to module size
  const couplingRaw = totalImports > 0
    ? (externalImports.length / Math.max(totalFunctions, 1))
    : 0;
  const couplingScore = Math.max(0, Math.min(100, Math.round(100 - couplingRaw * 20)));

  // Cohesion: how many declared identifiers are actually used internally
  // High cohesion = most declarations are used within the module
  const sharedIdentifiers = [...declaredIdentifiers].filter(id => usedIdentifiers.has(id));
  const cohesionRaw = declaredIdentifiers.size > 0
    ? sharedIdentifiers.length / declaredIdentifiers.size
    : 1;
  const cohesionScore = Math.round(cohesionRaw * 100);

  // Grade
  const composite = (couplingScore * 0.3 + cohesionScore * 0.3 +
    Math.max(0, 100 - longFunctions.length * 15) * 0.2 +
    Math.max(0, 100 - maxNestingDepth * 10) * 0.2);
  const grade = composite >= 85 ? 'A' : composite >= 70 ? 'B' : composite >= 55 ? 'C' : composite >= 40 ? 'D' : 'F';

  return {
    avgFunctionLength,
    maxFunctionLength,
    maxNestingDepth,
    totalFunctions,
    longFunctions,
    deeplyNested: deepNested.slice(0, 10),
    couplingScore,
    cohesionScore,
    imports: { internal: internalImports.length, external: externalImports.length, total: totalImports },
    exports: { named: exportNames.length, default: hasDefaultExport ? 1 : 0, total: exportNames.length + (hasDefaultExport ? 1 : 0) },
    moduleDetails: {
      incomingRefs: [], // Requires cross-file analysis
      outgoingRefs: importModules.slice(0, 20),
      unusedExports: [], // Requires cross-file analysis
    },
    grade,
  };
}

// IDENTITY_SEAL: PART-6 | role=ast-metrics | inputs=code,fileName | outputs=ASTMetrics

// ============================================================
// PART 7 — Multi-File Coupling Analysis
// ============================================================

export async function analyzeModuleCoupling(rootPath: string): Promise<{
  modules: Array<{ file: string; imports: number; importedBy: number; couplingScore: number }>;
  mostCoupled: string[];
  leastCoupled: string[];
  avgCoupling: number;
}> {
  const fs = require('fs');
  const path = require('path');

  const importGraph = new Map<string, Set<string>>(); // file -> set of imported files
  const importedByGraph = new Map<string, Set<string>>(); // file -> set of files that import it

  function collectFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          results.push(...collectFiles(full));
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          results.push(full);
        }
      }
    } catch { /* skip */ }
    return results;
  }

  const files = collectFiles(rootPath);

  for (const file of files) {
    const rel = path.relative(rootPath, file).replace(/\\/g, '/');
    const imports = new Set<string>();

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const importRe = /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
      let m;
      while ((m = importRe.exec(content)) !== null) {
        const mod = m[1] ?? m[2];
        if (mod.startsWith('.')) {
          const resolved = path.relative(rootPath, path.resolve(path.dirname(file), mod)).replace(/\\/g, '/');
          imports.add(resolved);

          const existing = importedByGraph.get(resolved) ?? new Set();
          existing.add(rel);
          importedByGraph.set(resolved, existing);
        }
      }
    } catch { /* skip */ }

    importGraph.set(rel, imports);
  }

  const modules = [...importGraph.entries()].map(([file, imports]) => {
    const importedBy = importedByGraph.get(file.replace(/\.(ts|tsx|js|jsx)$/, ''))?.size ?? 0;
    const altKey = file.replace(/\/index\.(ts|tsx|js|jsx)$/, '');
    const importedByAlt = importedByGraph.get(altKey)?.size ?? 0;
    const totalImportedBy = importedBy + importedByAlt;

    return {
      file,
      imports: imports.size,
      importedBy: totalImportedBy,
      couplingScore: imports.size + totalImportedBy,
    };
  }).sort((a, b) => b.couplingScore - a.couplingScore);

  const avgCoupling = modules.length > 0
    ? Math.round(modules.reduce((s, m) => s + m.couplingScore, 0) / modules.length)
    : 0;

  return {
    modules: modules.slice(0, 30),
    mostCoupled: modules.slice(0, 5).map(m => m.file),
    leastCoupled: modules.filter(m => m.couplingScore === 0).map(m => m.file).slice(0, 5),
    avgCoupling,
  };
}

// IDENTITY_SEAL: PART-7 | role=module-coupling | inputs=rootPath | outputs=couplingAnalysis
