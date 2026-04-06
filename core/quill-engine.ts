// ============================================================
// CS Quill — 4-Layer Engine (createProgram + TypeChecker)
// ============================================================
// Layer 0: Pre-filter (skip generated/minified)
// Layer 1: AST parse (typescript createSourceFile)
// Layer 2: Symbol resolution (createProgram + TypeChecker)
// Layer 3: Rule engine (evidence-based verdict)
//
// Engines: typescript (built-in) + acorn + esquery

const ts = require('typescript') as typeof import('typescript');

// ============================================================
// PART 1 — Types
// ============================================================

export interface Evidence {
  engine: 'typescript-ast' | 'typescript-checker' | 'esquery' | 'regex';
  detail: string;
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
}

export interface EngineFinding {
  ruleId: string;
  line: number;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  confidence: 'high' | 'medium' | 'low';
  evidence: Evidence[];
  explanation?: string;
}

export interface ScopeNode {
  id: string;
  kind: 'file' | 'function' | 'block' | 'class' | 'catch';
  parentId?: string;
  declared: Set<string>;
  startLine: number;
  endLine: number;
}

export interface PerformanceMetrics {
  preFilterMs: number;
  astParseMs: number;
  typeCheckerMs: number;
  esqueryMs: number;
  totalMs: number;
  typeCheckerAvailable: boolean;
  typeCheckerTimedOut: boolean;
}

export interface EngineResult {
  findings: EngineFinding[];
  scopes: ScopeNode[];
  cyclomaticComplexity: number;
  nodeCount: number;
  enginesUsed: string[];
  performance: PerformanceMetrics;
}

// ============================================================
// PART 2 — Layer 0: Pre-filter
// ============================================================

function shouldSkip(code: string): string | null {
  if (code.length > 150_000) return 'oversized-file';
  const first10 = code.split('\n').slice(0, 10);
  const avgLen = first10.reduce((s, l) => s + l.length, 0) / Math.max(first10.length, 1);
  if (avgLen > 200) return 'minified-or-bundled';
  return null;
}

// ============================================================
// PART 2.5 — Finding Validation & Deduplication
// ============================================================

const REQUIRED_FINDING_FIELDS: (keyof EngineFinding)[] = ['ruleId', 'line', 'message', 'severity'];

function isValidFinding(f: Partial<EngineFinding>): f is EngineFinding {
  for (const field of REQUIRED_FINDING_FIELDS) {
    if (f[field] === undefined || f[field] === null) return false;
  }
  if (typeof f.line !== 'number' || f.line < 1) return false;
  if (typeof f.message !== 'string' || f.message.length === 0) return false;
  if (!['critical', 'error', 'warning', 'info'].includes(f.severity!)) return false;
  if (typeof f.ruleId !== 'string' || f.ruleId.length === 0) return false;
  return true;
}

function ensureEvidence(f: EngineFinding): EngineFinding {
  if (!Array.isArray(f.evidence) || f.evidence.length === 0) {
    f.evidence = [{ engine: 'typescript-ast', detail: 'auto-attached', confidence: 'low', source: 'validation-fallback' }];
  }
  // Ensure each evidence entry has confidence and source
  for (const ev of f.evidence) {
    if (!ev.confidence) ev.confidence = f.confidence ?? 'medium';
    if (!ev.source) ev.source = ev.engine;
  }
  return f;
}

function validateAndCleanFindings(findings: EngineFinding[]): EngineFinding[] {
  const seen = new Set<string>();
  const validated: EngineFinding[] = [];

  for (const f of findings) {
    // Validate required fields
    if (!isValidFinding(f)) continue;

    // Deduplicate by ruleId + line
    const key = `${f.ruleId}:${f.line}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Ensure evidence array is well-formed
    validated.push(ensureEvidence(f));
  }

  return validated;
}

// ============================================================
// PART 3 — Layer 1+2: TypeScript AST + TypeChecker
// ============================================================

/** Timeout wrapper: resolves with result or null on timeout */
function withTimeout<T>(fn: () => T, maxMs: number): { result: T | null; timedOut: boolean } {
  const startTime = Date.now();
  try {
    const result = fn();
    const elapsed = Date.now() - startTime;
    if (elapsed > maxMs) {
      return { result: null, timedOut: true };
    }
    return { result, timedOut: false };
  } catch {
    return { result: null, timedOut: false };
  }
}

export function analyzeWithProgram(
  filePaths: string[],
  targetFile: string,
  code?: string,
): EngineResult {
  const findings: EngineFinding[] = [];
  const scopes: ScopeNode[] = [];
  const enginesUsed: string[] = ['typescript-ast'];
  let cyclomaticComplexity = 1;
  let nodeCount = 0;
  const perf: PerformanceMetrics = {
    preFilterMs: 0, astParseMs: 0, typeCheckerMs: 0, esqueryMs: 0,
    totalMs: 0, typeCheckerAvailable: false, typeCheckerTimedOut: false,
  };
  const totalStart = Date.now();

  // Pre-filter
  const preFilterStart = Date.now();
  const codeToCheck = code ?? (() => {
    try { return require('fs').readFileSync(targetFile, 'utf-8'); }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Cannot read target file: ${targetFile} - ${msg}`);
    }
  })();
  const skipReason = shouldSkip(codeToCheck);
  perf.preFilterMs = Date.now() - preFilterStart;

  if (skipReason) {
    perf.totalMs = Date.now() - totalStart;
    return {
      findings: [{
        ruleId: 'pre-filter/skip', line: 1, message: `[Bypass] ${skipReason}`,
        severity: 'info', confidence: 'high',
        evidence: [{ engine: 'regex', detail: skipReason, confidence: 'high', source: 'pre-filter' }],
      }],
      scopes: [], cyclomaticComplexity: 0, nodeCount: 0, enginesUsed: ['pre-filter'], performance: perf,
    };
  }

  // createProgram -- TypeChecker (with timeout protection)
  let program: import('typescript').Program | undefined;
  let checker: import('typescript').TypeChecker | null = null;
  let sourceFile: import('typescript').SourceFile;
  let astOnlyMode = false;

  const astStart = Date.now();
  try {
    // Virtual host for single-file program loading
    const compilerOptions: import('typescript').CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      strictNullChecks: true,
    };

    const host = ts.createCompilerHost(compilerOptions);

    // Inject target file code directly (works without file system)
    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName: string, languageVersion: import('typescript').ScriptTarget, onError?: (message: string) => void) => {
      if (fileName === targetFile || fileName.endsWith(targetFile)) {
        return ts.createSourceFile(fileName, codeToCheck, languageVersion, true);
      }
      try {
        return originalGetSourceFile.call(host, fileName, languageVersion, onError);
      } catch {
        return undefined;
      }
    };
    host.fileExists = (f: string) => {
      if (f === targetFile || f.endsWith(targetFile)) return true;
      try { return require('fs').existsSync(f); } catch { return false; }
    };
    host.readFile = (f: string) => {
      if (f === targetFile || f.endsWith(targetFile)) return codeToCheck;
      try { return require('fs').readFileSync(f, 'utf-8'); } catch { return undefined; }
    };

    program = ts.createProgram([targetFile], compilerOptions, host);

    // TypeChecker with 10-second timeout protection
    const typeCheckerStart = Date.now();
    const checkerResult = withTimeout(() => program!.getTypeChecker(), 10_000);
    perf.typeCheckerMs = Date.now() - typeCheckerStart;

    if (checkerResult.timedOut) {
      perf.typeCheckerTimedOut = true;
      checker = null;
      astOnlyMode = true;
      findings.push({
        ruleId: 'engine/timeout', line: 1,
        message: 'TypeChecker timed out (>10s) -- falling back to AST-only mode',
        severity: 'info', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: `TypeChecker exceeded 10s limit`, confidence: 'high', source: 'engine-timeout' }],
      });
    } else if (checkerResult.result) {
      checker = checkerResult.result;
      perf.typeCheckerAvailable = true;
      enginesUsed.push('typescript-checker');
    } else {
      // checker creation returned null (unusual)
      checker = null;
      astOnlyMode = true;
    }

    const sf = program.getSourceFile(targetFile);
    if (!sf) {
      sourceFile = ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
    } else {
      sourceFile = sf;
    }
  } catch (programError: unknown) {
    // createProgram failed -- graceful fallback to AST-only mode
    astOnlyMode = true;
    checker = null;
    program = undefined;

    try {
      sourceFile = ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
    } catch (parseError: unknown) {
      // Even basic parsing failed -- return minimal result
      const parseMsg = parseError instanceof Error ? parseError.message : String(parseError);
      perf.totalMs = Date.now() - totalStart;
      return {
        findings: [{
          ruleId: 'engine/parse-error', line: 1,
          message: `Failed to parse source file: ${parseMsg}`,
          severity: 'error', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: parseMsg, confidence: 'high', source: 'parse-failure' }],
        }],
        scopes: [], cyclomaticComplexity: 0, nodeCount: 0,
        enginesUsed: ['typescript-ast'], performance: perf,
      };
    }

    const progMsg = programError instanceof Error ? programError.message : String(programError);
    findings.push({
      ruleId: 'engine/fallback', line: 1,
      message: `createProgram failed -- using AST-only mode: ${progMsg.slice(0, 100)}`,
      severity: 'info', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: progMsg.slice(0, 200), confidence: 'high', source: 'program-fallback' }],
    });
  }
  perf.astParseMs = Date.now() - astStart - perf.typeCheckerMs;

  const lineOf = (node: import('typescript').Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  // Scope graph construction
  let scopeId = 0;
  let currentScopeId = 'scope-0';
  scopes.push({
    id: 'scope-0', kind: 'file', declared: new Set(),
    startLine: 1, endLine: sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1,
  });

  const reported = new Set<string>(); // deduplication

  function addFinding(f: EngineFinding) {
    const key = `${f.line}:${f.ruleId}`;
    if (reported.has(key)) return;
    reported.add(key);
    // Ensure evidence array exists with source/confidence
    if (!Array.isArray(f.evidence) || f.evidence.length === 0) {
      f.evidence = [{ engine: 'typescript-ast', detail: 'auto-generated', confidence: f.confidence ?? 'medium', source: 'ast-visit' }];
    }
    for (const ev of f.evidence) {
      if (!ev.confidence) ev.confidence = f.confidence ?? 'medium';
      if (!ev.source) ev.source = ev.engine;
    }
    findings.push(f);
  }

  // -- AST traversal --
  function visit(node: import('typescript').Node, depth: number) {
    nodeCount++;

    // Cyclomatic complexity: count branching nodes only
    if (ts.isIfStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node) ||
        ts.isForOfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) ||
        ts.isCaseClause(node) || ts.isCatchClause(node) || ts.isConditionalExpression(node)) {
      cyclomaticComplexity++;
    }
    // && || also count as branches
    if (ts.isBinaryExpression(node) && (
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken
    )) {
      cyclomaticComplexity++;
    }

    // Scope tracking
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
      scopeId++;
      const sid = `scope-${scopeId}`;
      const scope: ScopeNode = {
        id: sid, kind: 'function', parentId: currentScopeId,
        declared: new Set(), startLine: lineOf(node),
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      };
      if ('parameters' in node) {
        for (const p of (node as any).parameters) {
          if (ts.isIdentifier(p.name)) scope.declared.add(p.name.text);
        }
      }
      scopes.push(scope);
      const prevScope = currentScopeId;
      currentScopeId = sid;

      // Empty function detection
      const body = (node as any).body;
      if (body && ts.isBlock(body) && body.statements.length === 0) {
        const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
        addFinding({
          ruleId: 'ERR-001', line: lineOf(node),
          message: `Empty function: ${name}()`,
          severity: 'error', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'Block.statements.length === 0', confidence: 'high', source: 'ast-empty-fn' }],
        });
      }

      // Long function detection
      if (body && ts.isBlock(body)) {
        const fnLines = sourceFile.getLineAndCharacterOfPosition(body.getEnd()).line -
                        sourceFile.getLineAndCharacterOfPosition(body.getStart()).line;
        if (fnLines > 60) {
          const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
          addFinding({
            ruleId: 'CMX-001', line: lineOf(node),
            message: `Function ${name}() is ${fnLines} lines -- exceeds 60-line threshold`,
            severity: 'warning', confidence: 'high',
            evidence: [{ engine: 'typescript-ast', detail: `body span: ${fnLines} lines`, confidence: 'high', source: 'ast-fn-length' }],
          });
        }
      }

      // Too many parameters
      if ('parameters' in node && (node as any).parameters.length > 5) {
        addFinding({
          ruleId: 'CMX-002', line: lineOf(node),
          message: `${(node as any).parameters.length} parameters -- exceeds 5-parameter threshold`,
          severity: 'warning', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'parameters.length > 5', confidence: 'high', source: 'ast-params' }],
        });
      }

      ts.forEachChild(node, (child) => visit(child, depth + 1));
      currentScopeId = prevScope;
      return;
    }

    // eval() / new Function() -- AST-based exact detection
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval') {
      addFinding({
        ruleId: 'SEC-006', line: lineOf(node),
        message: 'eval() call -- security risk',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'CallExpression callee === eval', confidence: 'high', source: 'ast-security' }],
      });
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      addFinding({
        ruleId: 'API-008', line: lineOf(node),
        message: 'new Function() -- eval equivalent',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'NewExpression callee === Function', confidence: 'high', source: 'ast-security' }],
      });
    }

    // == / != -> === / !==
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken) {
        addFinding({
          ruleId: 'LOG-001', line: lineOf(node),
          message: '== used -- === recommended',
          severity: 'warning', confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: 'BinaryExpression operator: ==', confidence: 'medium', source: 'ast-equality' }],
        });
      }
      if (node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken) {
        addFinding({
          ruleId: 'LOG-002', line: lineOf(node),
          message: '!= used -- !== recommended',
          severity: 'warning', confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: 'BinaryExpression operator: !=', confidence: 'medium', source: 'ast-equality' }],
        });
      }
    }

    // Symbol resolution -- TypeChecker (Layer 2), only if available
    if (checker && !astOnlyMode && ts.isIdentifier(node)) {
      const parent = node.parent;
      const isProperty = ts.isPropertyAccessExpression(parent) && parent.name === node;
      const isDecl = ts.isVariableDeclaration(parent) || ts.isFunctionDeclaration(parent) || ts.isParameter(parent);
      const isType = ts.isTypeReferenceNode(parent) || ts.isInterfaceDeclaration(parent);
      const isImport = ts.isImportSpecifier(parent) || ts.isImportClause(parent);

      if (!isProperty && !isDecl && !isType && !isImport) {
        try {
          const symbol = checker.getSymbolAtLocation(node);
          if (!symbol && node.text !== 'this' && node.text !== 'super' &&
              node.text.length > 1 && !/^(true|false|null|undefined|NaN|Infinity)$/.test(node.text)) {
            addFinding({
              ruleId: 'VAR-003', line: lineOf(node),
              message: `Unresolved symbol: '${node.text}'`,
              severity: 'info', confidence: 'medium',
              evidence: [{ engine: 'typescript-checker', detail: 'getSymbolAtLocation returned null', confidence: 'medium', source: 'type-checker' }],
            });
          }
        } catch {
          // Individual checker call failed -- continue AST traversal, don't crash
        }
      }
    }

    // -- Additional detection rules (catalog mapping) --

    // API-006: console.log (production)
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression;
      const prop = node.expression.name;
      if (ts.isIdentifier(obj) && obj.text === 'console' && (prop.text === 'log' || prop.text === 'debug')) {
        addFinding({
          ruleId: 'API-006', line: lineOf(node),
          message: `console.${prop.text}() found`,
          severity: 'info', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'console.log/debug', confidence: 'high', source: 'ast-api' }],
        });
      }
    }

    // API-009: document.write
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression;
      const prop = node.expression.name;
      if (ts.isIdentifier(obj) && obj.text === 'document' && prop.text === 'write') {
        addFinding({
          ruleId: 'API-009', line: lineOf(node),
          message: 'document.write() -- XSS risk',
          severity: 'error', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'document.write', confidence: 'high', source: 'ast-security' }],
        });
      }
    }

    // ASY-008: async function without await
    if ((ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) &&
        node.modifiers?.some((m: import('typescript').ModifierLike) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      let hasAwait = false;
      ts.forEachChild(node, function checkAwait(child: import('typescript').Node) {
        if (ts.isAwaitExpression(child)) hasAwait = true;
        if (!hasAwait) ts.forEachChild(child, checkAwait);
      });
      if (!hasAwait) {
        addFinding({
          ruleId: 'ASY-008', line: lineOf(node),
          message: 'async function without await',
          severity: 'info', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'async without await', confidence: 'high', source: 'ast-async' }],
        });
      }
    }

    // RTE-016: for...in on Array
    if (ts.isForInStatement(node)) {
      addFinding({
        ruleId: 'RTE-016', line: lineOf(node),
        message: 'for...in used -- for...of recommended for arrays',
        severity: 'warning', confidence: 'medium',
        evidence: [{ engine: 'typescript-ast', detail: 'ForInStatement', confidence: 'medium', source: 'ast-iteration' }],
      });
    }

    // RTE-018: switch without default
    if (ts.isSwitchStatement(node)) {
      const hasDefault = node.caseBlock.clauses.some((c: import('typescript').CaseOrDefaultClause) => ts.isDefaultClause(c));
      if (!hasDefault) {
        addFinding({
          ruleId: 'RTE-018', line: lineOf(node),
          message: 'switch without default case',
          severity: 'warning', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'SwitchStatement without default', confidence: 'high', source: 'ast-switch' }],
        });
      }
    }

    // ERR-005: string throw
    if (ts.isThrowStatement(node) && node.expression && ts.isStringLiteral(node.expression)) {
      addFinding({
        ruleId: 'ERR-005', line: lineOf(node),
        message: 'String throw -- use Error class instead',
        severity: 'warning', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'throw "string"', confidence: 'high', source: 'ast-throw' }],
      });
    }

    // VAR-002: var usage
    if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Let) === 0 && (node.flags & ts.NodeFlags.Const) === 0) {
      if (node.parent && ts.isVariableStatement(node.parent)) {
        addFinding({
          ruleId: 'VAR-002', line: lineOf(node),
          message: 'var used -- let/const recommended',
          severity: 'warning', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'VariableDeclarationList without Let/Const flag', confidence: 'high', source: 'ast-var' }],
        });
      }
    }

    // LOG-008: triple nested ternary
    if (ts.isConditionalExpression(node) && ts.isConditionalExpression(node.whenTrue)) {
      if (ts.isConditionalExpression((node.whenTrue as any).whenTrue)) {
        addFinding({
          ruleId: 'LOG-008', line: lineOf(node),
          message: 'Triple nested ternary operator',
          severity: 'warning', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'triple nested ConditionalExpression', confidence: 'high', source: 'ast-ternary' }],
        });
      }
    }

    ts.forEachChild(node, (child) => visit(child, depth + 1));
  }

  visit(sourceFile, 0);

  // Cyclomatic complexity warning
  if (cyclomaticComplexity > 15) {
    addFinding({
      ruleId: 'CMX-008', line: 1,
      message: `Cyclomatic complexity ${cyclomaticComplexity} -- exceeds threshold of 15`,
      severity: 'warning', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: `if/for/while/case/&&/|| count: ${cyclomaticComplexity}`, confidence: 'high', source: 'ast-complexity' }],
    });
  }

  // Deep nesting (scope graph based)
  const maxScopeDepth = scopes.reduce((max, s) => {
    let depth = 0;
    let cur: ScopeNode | undefined = s;
    while (cur?.parentId) {
      depth++;
      cur = scopes.find(sc => sc.id === cur!.parentId);
    }
    return Math.max(max, depth);
  }, 0);

  if (maxScopeDepth > 5) {
    addFinding({
      ruleId: 'CMX-007', line: 1,
      message: `Max scope depth ${maxScopeDepth} -- exceeds threshold of 5`,
      severity: 'warning', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: `scope graph depth: ${maxScopeDepth}`, confidence: 'high', source: 'ast-nesting' }],
    });
  }

  perf.totalMs = Date.now() - totalStart;

  // Validate all findings before returning
  const validatedFindings = validateAndCleanFindings(findings);

  return { findings: validatedFindings.slice(0, 80), scopes, cyclomaticComplexity, nodeCount, enginesUsed, performance: perf };
}

// ============================================================
// PART 4 — Layer 3: esquery auxiliary (CSS selector patterns)
// ============================================================

export function analyzeWithEsquery(code: string): EngineFinding[] {
  try {
    const acorn = require('acorn');
    const esquery = require('esquery');
    const findings: EngineFinding[] = [];

    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });

    // eval() -- AST-based exact detection
    const evalCalls = esquery.query(ast, 'CallExpression[callee.name="eval"]');
    for (const node of evalCalls) {
      findings.push({
        ruleId: 'SEC-006', line: (node as any).loc?.start?.line ?? 1,
        message: 'eval() call -- security risk',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'esquery', detail: 'CallExpression[callee.name="eval"]', confidence: 'high', source: 'esquery-security' }],
      });
    }

    // Triple nested loop
    const tripleLoop = esquery.query(ast,
      ':matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement)');
    if (tripleLoop.length > 0) {
      findings.push({
        ruleId: 'PRF-002', line: (tripleLoop[0] as any).loc?.start?.line ?? 1,
        message: 'Triple nested loop -- O(n^3) complexity',
        severity: 'warning', confidence: 'high',
        evidence: [{ engine: 'esquery', detail: 'nested loop depth >= 3', confidence: 'high', source: 'esquery-performance' }],
      });
    }

    return findings;
  } catch {
    return [];
  }
}

// ============================================================
// PART 5 — Unified Runner
// ============================================================

const TYP_RULE_IDS = new Set([
  'TYP-001', 'TYP-002', 'TYP-003', 'TYP-004', 'TYP-005', 'TYP-006', 'TYP-007', 'TYP-008', 'TYP-009',
  'TYP-010', 'TYP-011', 'TYP-012', 'TYP-013', 'TYP-014', 'TYP-015',
]);

/** Run ts-morph TYP-* detectors */
function runTypMorphDetectors(code: string, fileName: string): EngineFinding[] {
  const out: EngineFinding[] = [];
  try {
    const { Project } = require('ts-morph');
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        strict: true,
        strictNullChecks: true,
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        skipLibCheck: true,
      },
    });
    const sourceFile = project.createSourceFile(fileName, code);
    const { loadAllDetectors } = require('./detectors');
    const registry = loadAllDetectors() as { getDetectors: () => Array<{ ruleId: string; detect: (sf: unknown) => Array<{ line: number; message: string }> }> };
    for (const detector of registry.getDetectors()) {
      if (!TYP_RULE_IDS.has(detector.ruleId)) continue;
      const raw = detector.detect(sourceFile);
      for (const pf of raw) {
        out.push({
          ruleId: detector.ruleId,
          line: pf.line,
          message: pf.message,
          severity: 'warning',
          confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: `ts-morph detector ${detector.ruleId}`, confidence: 'medium', source: 'ts-morph' }],
        });
      }
    }
  } catch {
    /* ts-morph / detectors not available */
  }
  return out;
}

function mergeFindingsDedupe(base: EngineFinding[], extra: EngineFinding[]): EngineFinding[] {
  const seen = new Set(base.map(f => `${f.line}:${f.ruleId}`));
  for (const f of extra) {
    const k = `${f.line}:${f.ruleId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    base.push(f);
  }
  return base;
}

export function runQuillEngine(code: string, fileName: string = 'temp.ts'): EngineResult {
  // Layer 1+2: TypeScript program
  const result = analyzeWithProgram([fileName], fileName, code);

  // TYP-001~015 (ts-morph plugins)
  try {
    const typMorph = runTypMorphDetectors(code, fileName);
    mergeFindingsDedupe(result.findings, typMorph);
    if (typMorph.length > 0 && !result.enginesUsed.includes('ts-morph-typ')) {
      result.enginesUsed.push('ts-morph-typ');
    }
  } catch { /* optional */ }

  // Layer 3: esquery auxiliary
  const esqueryStart = Date.now();
  try {
    const esqFindings = analyzeWithEsquery(code);
    // Evidence synthesis: merge evidence for same ruleId+line
    for (const esqF of esqFindings) {
      const existing = result.findings.find(f => f.ruleId === esqF.ruleId && f.line === esqF.line);
      if (existing) {
        existing.evidence.push(...esqF.evidence);
        // Multi-engine confirmation -> promote confidence
        if (existing.confidence === 'medium') existing.confidence = 'high';
      } else {
        result.findings.push(esqF);
      }
    }
    if (!result.enginesUsed.includes('esquery')) result.enginesUsed.push('esquery');
  } catch { /* esquery not installed -- skip */ }
  result.performance.esqueryMs = Date.now() - esqueryStart;
  result.performance.totalMs = Date.now() - (Date.now() - result.performance.totalMs); // recalculate

  // Final validation pass: ensure all findings have required fields and deduplicate
  result.findings = validateAndCleanFindings(result.findings).slice(0, 80);

  return result;
}

// IDENTITY_SEAL: PART-5 | role=unified-engine | inputs=code,fileName | outputs=EngineResult
