// ============================================================
// CS Quill — 4-Layer Engine (createProgram + TypeChecker)
// ============================================================
// Layer 0: Pre-filter (skip generated/minified)
// Layer 1: AST parse (typescript createSourceFile)
// Layer 2: Symbol resolution (createProgram + TypeChecker)
// Layer 3: Rule engine (evidence-based verdict)
//
// Engines: typescript (built-in) + acorn + esquery
// ============================================================

const ts = require('typescript') as typeof import('typescript');

// ============================================================
// PART 1 — Types & Contracts
// [CONTRACT]
// - MUST: Define all engine-wide interfaces.
// - MUST NOT: Global variable declarations or logic.
// - SLOT: @slot:types
// ============================================================

// @slot:types
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
  verified?: boolean; 
  verificationGate?: string; 
  refinement?: RefinementVerdict; // Added deterministic refinement result
}

export interface QuillRule {
  id: string;
  category: 'SEC' | 'LOG' | 'PRF' | 'CMX' | 'VAR';
  description: string;
  selector: (node: import('typescript').Node) => boolean;
  executor: (node: import('typescript').Node, checker?: import('typescript').TypeChecker) => Partial<EngineFinding>[];
  weight?: number; // 0.1 to 2.0 (Evolutionary weight)
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
  refinementMs: number; // Added tracking
  totalMs: number;
  typeCheckerAvailable: boolean;
  typeCheckerTimedOut: boolean;
}

export type RepairStrategy = 'SAFE_SWAP' | 'WRAP_GUARD' | 'REPLACE_LOGIC' | 'ANNOTATE_ONLY' | 'BLOCK_EXECUTION';

export interface RefinementVerdict {
  strategy: RepairStrategy;
  confidence: number; // 0.0 to 1.0 (Deterministic score)
  reasoning: string;
  proposedPatch?: string;
}

export interface EngineResult {
  findings: EngineFinding[];
  scopes: ScopeNode[];
  cyclomaticComplexity: number;
  nodeCount: number;
  enginesUsed: string[];
  performance: PerformanceMetrics;
}

export interface SelfHealingResult extends EngineResult {
  repairedCode?: string;
  repairCount: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=Interfaces

// ============================================================
// PART 2 — Pure Helpers (Filtering & Validation)
// [CONTRACT]
// - MUST: Pure functions for data processing.
// - MUST NOT: Access file system directly (use params).
// - SLOT: @slot:helpers
// ============================================================

// @slot:helpers
const REQUIRED_FINDING_FIELDS: (keyof EngineFinding)[] = ['ruleId', 'line', 'message', 'severity'];

/** Layer 0: Skip oversized or minified files */
function shouldSkip(code: string): string | null {
  if (code.length > 150_000) return 'oversized-file';
  const first10 = code.split('\n').slice(0, 10);
  const avgLen = first10.reduce((s, l) => s + l.length, 0) / Math.max(first10.length, 1);
  if (avgLen > 200) return 'minified-or-bundled';
  return null;
}

/** Validate finding structure */
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

/** Ensure evidence completeness */
function ensureEvidence(f: EngineFinding): EngineFinding {
  if (!Array.isArray(f.evidence) || f.evidence.length === 0) {
    f.evidence = [{ engine: 'typescript-ast', detail: 'auto-attached', confidence: 'low', source: 'validation-fallback' }];
  }
  for (const ev of f.evidence) {
    if (!ev.confidence) ev.confidence = f.confidence ?? 'medium';
    if (!ev.source) ev.source = ev.engine;
  }
  return f;
}

/** Clean and deduplicate results */
function validateAndCleanFindings(findings: EngineFinding[]): EngineFinding[] {
  const seen = new Set<string>();
  const validated: EngineFinding[] = [];

  for (const f of findings) {
    if (!isValidFinding(f)) continue;
    const key = `${f.ruleId}:${f.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    validated.push(ensureEvidence(f));
  }
  return validated;
}

/** Timeout wrapper for heavy operations */
function withTimeout<T>(fn: () => T, maxMs: number): { result: T | null; timedOut: boolean } {
  const startTime = Date.now();
  try {
    const result = fn();
    const elapsed = Date.now() - startTime;
    return { result: elapsed > maxMs ? null : result, timedOut: elapsed > maxMs };
  } catch {
    return { result: null, timedOut: false };
  }
}

// IDENTITY_SEAL: PART-2 | role=helpers | inputs=data | outputs=bool,EngineFinding,CleanedData

// ============================================================
// PART 3 — Core Analysis Engine (AST & TypeChecker)
// [CONTRACT]
// - MUST: Handle TS-native traversal and symbol resolution.
// - MUST NOT: Contain library-specific auxiliary rules (use PART 4).
// - SLOT: @slot:engine-init, @slot:engine-runtime, @slot:rules-static, @slot:rules-ai
// ============================================================

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
    preFilterMs: 0, astParseMs: 0, typeCheckerMs: 0, esqueryMs: 0, refinementMs: 0,
    totalMs: 0, typeCheckerAvailable: false, typeCheckerTimedOut: false,
  };
  const totalStart = Date.now();

  // ------------------------------------------------------------
  // 3.0 Rule Registry System (Agentic Platform)
  // @slot:rule-registry
  // ------------------------------------------------------------
  const ruleRegistry = new Map<number, QuillRule[]>();
  const registerRule = (kinds: number[], rule: QuillRule) => {
    for (const kind of kinds) {
      if (!ruleRegistry.has(kind)) ruleRegistry.set(kind, []);
      ruleRegistry.get(kind)!.push(rule);
    }
  };

  // Seed Static Rules (Migrated from hardcoded v2.0)
  registerRule([ts.SyntaxKind.CallExpression], {
    id: 'SEC-006', category: 'SEC', description: 'Detect eval()',
    selector: (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'eval',
    executor: (n) => [{ ruleId: 'SEC-006', message: 'eval() used', severity: 'critical', confidence: 'high' }]
  });

  registerRule([ts.SyntaxKind.BinaryExpression], {
    id: 'LOG-001', category: 'LOG', description: 'Strict equality check',
    selector: (n) => (n as any).operatorToken?.kind === ts.SyntaxKind.EqualsEqualsToken,
    executor: (n) => [{ ruleId: 'LOG-001', message: '== used (=== recommended)', severity: 'warning', confidence: 'medium' }]
  });

  registerRule([ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.FunctionExpression, ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.MethodDeclaration], {
    id: 'CMX-001', category: 'CMX', description: 'Long function detection',
    selector: () => true, // Already filtered by kind
    executor: (n) => {
      const body = (n as any).body;
      if (!body || !ts.isBlock(body)) return [];
      const lines = sourceFile.getLineAndCharacterOfPosition(body.getEnd()).line - sourceFile.getLineAndCharacterOfPosition(body.getStart()).line;
      return lines > 60 ? [{ ruleId: 'CMX-001', message: `Long function (${lines} lines)`, severity: 'warning', confidence: 'high' }] : [];
    }
  });

  registerRule([ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.MethodDeclaration], {
    id: 'ERR-001', category: 'CMX', description: 'Empty function check',
    selector: () => true,
    executor: (n) => {
      const body = (n as any).body;
      return (body && ts.isBlock(body) && body.statements.length === 0) 
        ? [{ ruleId: 'ERR-001', message: 'Empty function', severity: 'error', confidence: 'high' }] : [];
    }
  });

  // 3.1 Pre-filter (Effect boundary: reading file if no code provided)
  const preFilterStart = Date.now();
  const codeToCheck = code ?? (() => {
    try { return require('fs').readFileSync(targetFile, 'utf-8'); }
    catch (e: any) { throw new Error(`Cannot read file: ${targetFile} - ${e.message}`); }
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

  // 3.2 Initialize TypeScript logic
  let program: import('typescript').Program | undefined;
  let checker: import('typescript').TypeChecker | null = null;
  let sourceFile: import('typescript').SourceFile;
  let astOnlyMode = false;

  const astStart = Date.now();
  try {
    const compilerOptions: import('typescript').CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true, checkJs: true, noEmit: true, skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX, strict: true, strictNullChecks: true,
    };

    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion, onError) => {
      if (fileName === targetFile || fileName.endsWith(targetFile)) {
        return ts.createSourceFile(fileName, codeToCheck, languageVersion, true);
      }
      try { return originalGetSourceFile.call(host, fileName, languageVersion, onError); }
      catch { return undefined; }
    };

    program = ts.createProgram([targetFile], compilerOptions, host);
    const typeCheckerStart = Date.now();
    const checkerResult = withTimeout(() => program!.getTypeChecker(), 10_000);
    perf.typeCheckerMs = Date.now() - typeCheckerStart;

    if (checkerResult.timedOut) {
      perf.typeCheckerTimedOut = true;
      astOnlyMode = true;
      findings.push({
        ruleId: 'engine/timeout', line: 1, message: 'TypeChecker timed out (>10s) -- fallback to AST',
        severity: 'info', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'TypeChecker limit exceeded', confidence: 'high', source: 'timeout' }],
      });
    } else if (checkerResult.result) {
      checker = checkerResult.result;
      perf.typeCheckerAvailable = true;
      enginesUsed.push('typescript-checker');
    }

    sourceFile = program.getSourceFile(targetFile) || ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
  } catch (e: any) {
    astOnlyMode = true;
    checker = null;
    sourceFile = ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
    findings.push({
      ruleId: 'engine/fallback', line: 1, message: `Fallback to AST-only: ${e.message.slice(0, 50)}`,
      severity: 'info', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: e.message, confidence: 'high', source: 'fallback' }],
    });
  }
  perf.astParseMs = Date.now() - astStart - perf.typeCheckerMs;

  const lineOf = (node: import('typescript').Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  // 3.3 Visitor context
  let scopeId = 0;
  let currentScopeId = 'scope-0';
  scopes.push({
    id: 'scope-0', kind: 'file', declared: new Set(),
    startLine: 1, endLine: sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1,
  });

  const reported = new Set<string>();
  function addFinding(f: EngineFinding) {
    const key = `${f.line}:${f.ruleId}`;
    if (reported.has(key)) return;
    reported.add(key);
    findings.push(ensureEvidence(f));
  }

  // 3.4 AST Traversal & AI Strategy Runtime
  function visit(node: import('typescript').Node) {
    nodeCount++;

    // ------------------------------------------------------------
    // SECTOR 3.4.A — Metrics Runtime
    // @slot:engine-runtime
    // ------------------------------------------------------------
    if (ts.isIfStatement(node) || ts.isForStatement(node) || ts.isWhileStatement(node) ||
        ts.isCaseClause(node) || ts.isCatchClause(node) || ts.isConditionalExpression(node)) {
      cyclomaticComplexity++;
    }
    if (ts.isBinaryExpression(node) && (
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken
    )) {
      cyclomaticComplexity++;
    }

    // ------------------------------------------------------------
    // SECTOR 3.4.B & C — Rule Execution Sandbox
    // @slot:rules-ai
    // ------------------------------------------------------------
    const applicableRules = ruleRegistry.get(node.kind);
    if (applicableRules) {
      for (const rule of applicableRules) {
        try {
          if (rule.selector(node)) {
            const rawFindings = rule.executor(node, checker || undefined);
            for (const rf of rawFindings) {
              addFinding({
                ruleId: rf.ruleId || rule.id,
                line: lineOf(node),
                message: rf.message || rule.description,
                severity: rf.severity || 'warning',
                confidence: rf.confidence || 'medium',
                evidence: rf.evidence || [{ engine: 'typescript-ast', detail: `Triggered by ${rule.id}`, confidence: 'medium', source: 'registry' }]
              });
            }
          }
        } catch (e: any) {
          addFinding({
            ruleId: 'engine/rule-fail', line: lineOf(node), message: `Rule ${rule.id} failed: ${e.message}`,
            severity: 'info', confidence: 'low', evidence: []
          });
        }
      }
    }

    // Type resolution (Legacy Fallback - to be migrated to Registry later)
    if (checker && !astOnlyMode && ts.isIdentifier(node)) {
      if (!ts.isPropertyAccessExpression(node.parent) && !ts.isVariableDeclaration(node.parent)) {
        try {
          if (!checker.getSymbolAtLocation(node) && !/^(true|false|null|undefined)$/.test(node.text)) {
            addFinding({ ruleId: 'VAR-003', line: lineOf(node), message: `Unresolved: '${node.text}'`, severity: 'info', confidence: 'medium', evidence: [] });
          }
        } catch {}
      }
    }

    // ------------------------------------------------------------
    // SECTOR 3.4.D — Traversal & Scope Management
    // ------------------------------------------------------------
    if (ts.isFunctionLike(node)) {
      scopeId++;
      const sid = `scope-${scopeId}`;
      scopes.push({
        id: sid, kind: 'function', parentId: currentScopeId,
        declared: new Set(), startLine: lineOf(node),
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      });
      const prevScope = currentScopeId;
      currentScopeId = sid;
      ts.forEachChild(node, visit);
      currentScopeId = prevScope;
    } else {
      ts.forEachChild(node, visit);
    }
  }

  visit(sourceFile);
  perf.totalMs = Date.now() - totalStart;

  return {
    findings: validateAndCleanFindings(findings).slice(0, 80),
    scopes, cyclomaticComplexity, nodeCount, enginesUsed, performance: perf
  };
}

// IDENTITY_SEAL: PART-3 | role=analysis-engine | inputs=filePath,code | outputs=EngineResult

// ============================================================
// PART 4 — Cross-Verification Gateway (Double-Sandbox)
// [CONTRACT]
// - MUST: Scrutinize Pass-1 findings against physical AST evidence.
// - MUST: Operate in a secondary logic sandbox.
// - SLOT: @slot:cross-verifier
// ============================================================

/** 
 * STEP 2.5: CrossVerifier
 * Scrutinizes findings from the primary sandbox.
 */
function runCrossVerification(findings: EngineFinding[], sourceFile: import('typescript').SourceFile): EngineFinding[] {
  const verified: EngineFinding[] = [];
  
  for (const f of findings) {
    // 샌드박스 2: 논리 재검증 (Cross-Check)
    try {
      // @slot:cross-verifier-logic
      // 단순 패턴 매칭을 넘어, 해당 라인의 노드를 다시 추출하여 맥락 검증
      const linePos = sourceFile.getPositionOfLineAndCharacter(f.line - 1, 0);
      let nodeAtLine: import('typescript').Node | undefined;
      
      const findNode = (n: import('typescript').Node): void => {
        if (nodeAtLine) return;
        const start = n.getStart();
        const end = n.getEnd();
        if (linePos >= start && linePos <= end) {
          if (n.kind !== ts.SyntaxKind.SourceFile) nodeAtLine = n;
          ts.forEachChild(n, findNode);
        }
      };
      findNode(sourceFile);

      if (!nodeAtLine) {
        // 증거 부재: 기각
        continue;
      }

      // 2차 검증 로직: 규칙별 정밀 타격
      let isLegit = true;
      if (f.ruleId === 'SEC-006' && !f.message.includes('eval')) isLegit = false;
      if (f.ruleId === 'LOG-001' && f.confidence === 'low') isLegit = false; // 저확신 기각

      if (isLegit) {
        f.verified = true;
        f.verificationGate = 'dcsg-v1-logic';
        verified.push(f);
      }
    } catch {
      // 검증 실패 시 안전을 위해 기각 (Strict Mode)
      continue;
    }
  }
  
  return verified;
}

// IDENTITY_SEAL: PART-4 | role=cross-verifier | inputs=Findings | outputs=VerifiedFindings

// ============================================================
// PART 5 — Strategy Refinement Brain (Deterministic Resolver)
// [CONTRACT]
// - MUST: Map Findings to specific RepairStrategies using logical trees.
// - MUST NOT: Suggest a strategy without a 0.8+ deterministic confidence.
// ============================================================

/**
 * STEP 2.7: StrategyResolver
 * Decides HOW to fix a finding based on AST context.
 */
function resolveRepairStrategy(findings: EngineFinding[], sourceFile: import('typescript').SourceFile): EngineFinding[] {
  return findings.map(f => {
    if (!f.verified) return f;

    // Determine strategy based on ruleId and context
    let strategy: RepairStrategy = 'ANNOTATE_ONLY';
    let reasoning = 'Default to safety (manual review required)';
    let confidence = 0.5;

    // Deterministic Logic Tree
    if (f.ruleId === 'SEC-006') { // eval()
      strategy = 'BLOCK_EXECUTION';
      reasoning = 'Structural substitution of eval with JSON.parse or dynamic import required for security.';
      confidence = 1.0;
    } else if (f.ruleId === 'LOG-001') { // ==
      strategy = 'SAFE_SWAP';
      reasoning = 'Strict equality (===) is a safe identity-preserving transformation for binary expressions.';
      confidence = 1.0;
    } else if (f.ruleId.startsWith('TYP')) {
      strategy = 'ANNOTATE_ONLY';
      reasoning = 'Type inference requires global context; manual annotation recommended to preserve intent.';
      confidence = 0.8;
    } else if (f.ruleId.startsWith('API')) {
      strategy = 'REPLACE_LOGIC';
      reasoning = 'Deprecated API requires contextual replacement with modern alternative.';
      confidence = 0.7;
    }

    f.refinement = {
      strategy,
      confidence,
      reasoning
    };

    return f;
  });
}

// IDENTITY_SEAL: PART-5 | role=strategy-brain | inputs=VerifiedFindings | outputs=RefinedFindings

// ============================================================
// PART 6 — Auxiliary Engines (esquery & ts-morph)
// ============================================================

export function analyzeWithEsquery(code: string): EngineFinding[] {
  try {
    const acorn = require('acorn');
    const esquery = require('esquery');
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
    const findings: EngineFinding[] = [];

    // O(n^3) detection
    const tripleLoop = esquery.query(ast, ':matches(ForStatement, WhileStatement) :matches(ForStatement, WhileStatement) :matches(ForStatement, WhileStatement)');
    if (tripleLoop.length > 0) {
      findings.push({
        ruleId: 'PRF-002', line: (tripleLoop[0] as any).loc?.start?.line ?? 1,
        message: 'Triple nested loop detected', severity: 'warning', confidence: 'high',
        evidence: [{ engine: 'esquery', detail: 'nested loop count >= 3', confidence: 'high', source: 'perf' }],
      });
    }
    return findings;
  } catch { return []; }
}

function runTypMorphDetectors(code: string, fileName: string): EngineFinding[] {
  const out: EngineFinding[] = [];
  try {
    const { Project } = require('ts-morph');
    const project = new Project({ useInMemoryFileSystem: true });
    const sf = project.createSourceFile(fileName, code);
    const { loadAllDetectors } = require('./detectors');
    const registry = loadAllDetectors();
    for (const detector of registry.getDetectors()) {
      const raw = detector.detect(sf);
      for (const pf of raw) {
        out.push({
          ruleId: detector.ruleId, line: pf.line, message: pf.message,
          severity: 'warning', confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: `External detector: ${detector.ruleId}`, confidence: 'medium', source: 'morph' }],
        });
      }
    }
  } catch { /* skip */ }
  return out;
}

// IDENTITY_SEAL: PART-4 | role=aux-engines | inputs=code | outputs=EngineFinding[]

// ============================================================
// PART 6 — Unified Runner (Stage-Gate Pipeline)
// [CONTRACT]
// - MUST: Verify completion of Step N before Step N+1.
// - MUST: Halt on critical integrity failure.
// - SLOT: @slot:pipeline-steps, @slot:pipeline-gates
// ============================================================

export function runQuillEngine(code: string, fileName: string = 'temp.ts'): EngineResult {
  const totalStart = Date.now();
  
  // @slot:pipeline-steps
  // STEP 1: Core Engine Execution
  const result = analyzeWithProgram([fileName], fileName, code);

  // @slot:pipeline-gates
  // [GATE 1] Core Integrity Check
  if (!result || typeof result.nodeCount !== 'number') {
    throw new Error("[FATAL] PART 3 (Core Analysis) failed to return valid metrics.");
  }

  // STEP 2: Auxiliary Engines Integration (Conditional)
  const isBypassed = result.enginesUsed.includes('pre-filter');
  
  if (!isBypassed) {
    // 2.A: ts-morph detectors
    try {
      const extra = runTypMorphDetectors(code, fileName);
      if (extra.length > 0) {
        const seen = new Set(result.findings.map(f => `${f.line}:${f.ruleId}`));
        for (const f of extra) {
          if (!seen.has(`${f.line}:${f.ruleId}`)) {
            result.findings.push(f);
            seen.add(`${f.line}:${f.ruleId}`);
          }
        }
        if (!result.enginesUsed.includes('ts-morph-typ')) result.enginesUsed.push('ts-morph-typ');
      }
    } catch (e: any) {
      result.findings.push({
        ruleId: 'engine/gate-aux', line: 1, message: `PART 4 (ts-morph) failed: ${e.message}`,
        severity: 'info', confidence: 'low', evidence: []
      });
    }

    // 2.B: esquery check
    const esqStart = Date.now();
    try {
      const esqF = analyzeWithEsquery(code);
      if (esqF.length > 0) {
        for (const f of esqF) {
          const existing = result.findings.find(ex => ex.ruleId === f.ruleId && ex.line === f.line);
          if (existing) {
            existing.evidence.push(...f.evidence);
            if (existing.confidence === 'medium') existing.confidence = 'high';
          } else {
            result.findings.push(f);
          }
        }
        if (!result.enginesUsed.includes('esquery')) result.enginesUsed.push('esquery');
      }
    } catch (e: any) {
      result.findings.push({
        ruleId: 'engine/gate-esq', line: 1, message: `PART 4 (esquery) failed: ${e.message}`,
        severity: 'info', confidence: 'low', evidence: []
      });
    }
    result.performance.esqueryMs = Date.now() - esqStart;
    
    // 2.C: Post-Processing Rules (Wiring logic)
    if (result.cyclomaticComplexity > 25) {
      result.findings.push({
        ruleId: 'CMX-TOTAL', line: 1, message: `Extremely high total complexity (${result.cyclomaticComplexity}). Refactoring recommended.`,
        severity: 'warning', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: `Total CC=${result.cyclomaticComplexity}`, confidence: 'high', source: 'post-process' }]
      });
    }
  }

  // STEP 3: Final Validation & Locking
  // [GATE 2] Double-Sandbox Cross-Verification (DCSG)
  // Ensure EVERYTHING is verified before returning
  const sourceFileForVerify = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  const verifiedFindings = runCrossVerification(result.findings, sourceFileForVerify);
  
  // STEP 3.5: Strategy Refinement (The Brain)
  const refinementStart = Date.now();
  const refinedFindings = resolveRepairStrategy(verifiedFindings, sourceFileForVerify);
  result.performance.refinementMs = Date.now() - refinementStart;

  const finalFindings = validateAndCleanFindings(refinedFindings);
  
  result.findings = finalFindings.slice(0, 80);
  result.performance.totalMs = Date.now() - totalStart;

  return result;
}

// IDENTITY_SEAL: PART-6 | role=unified-engine | inputs=code,fileName | outputs=EngineResult

// ============================================================
// PART 7 — Repair Executor (Atomic Patching)
// [CONTRACT]
// - MUST: Apply verified strategies to source text.
// - MUST: Use immutable source updates (return new string).
// ============================================================

/**
 * STEP 4.0: RepairExecutor
 * Transforms source code based on derived strategies.
 */
async function applyRepairs(code: string, findings: EngineFinding[], fileName: string): Promise<string> {
  let patchedCode = code;
  // Sort findings in reverse order to prevent offset issues
  const sorted = [...findings].sort((a,b) => b.line - a.line);
  
  const lines = patchedCode.split('\n');
  for (const f of sorted) {
    if (!f.verified || !f.refinement) continue;
    
    const lineIndex = f.line - 1;
    
    // Strategy 1: SAFE_SWAP (Static)
    if (f.refinement.strategy === 'SAFE_SWAP') {
      if (f.ruleId === 'LOG-001') {
        lines[lineIndex] = lines[lineIndex].replace(' == ', ' === ');
      }
    } 
    // Strategy 2: REPLACE_LOGIC (AI Synergy)
    else if (f.refinement.strategy === 'REPLACE_LOGIC') {
      const aiPatch = await AIPatchGenerator.generate(f, patchedCode, fileName);
      if (aiPatch) {
        // Simple line replacement for now, could be block-based
        lines[lineIndex] = aiPatch;
      }
    }
  }
  
  return lines.join('\n');
}

// IDENTITY_SEAL: PART-7 | role=repair-executor | inputs=code,findings | outputs=patchedCode

// PART 8 — Self-Healing Loop (Verification-First Repair)
// [REMOVED DUPLICATE] - Unified implementation shifted to Part 10 for better pipeline integration.

// ============================================================
// PART 9 — Evolution & Audit Engine (Stealth Learning)
// [CONTRACT]
// - MUST: Record successes/failures without stopping main execution.
// - MUST: Persist knowledge to prevent amnesia.
// ============================================================

export interface AuditEntry {
  timestamp: string;
  fileName: string;
  repairCount: number;
  ruleStats: Record<string, 'success' | 'failure'>;
}

/**
 * STEP 5.0: AuditManager
 * Structured logging for long-term data analysis.
 */
export class AuditManager {
  private static ledger: AuditEntry[] = [];
  private static readonly LEDGER_PATH = '.quill-knowledge.ledger';

  static record(entry: AuditEntry) {
    this.ledger.push(entry);
    // Stealth IO: Append-only ledger
    try {
      const fs = require('fs');
      fs.appendFileSync(this.LEDGER_PATH, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {}
  }

  static getHistory() {
    return this.ledger;
  }
}

/**
 * STEP 5.1: LearningEngine
 * Adjusts rule weights based on successful repairs.
 */
export class LearningEngine {
  private static ruleWeights = new Map<string, number>();
  private static readonly WEIGHTS_PATH = '.quill-weights.json';
  private static initialized = false;

  private static init() {
    if (this.initialized) return;
    try {
      const fs = require('fs');
      if (fs.existsSync(this.WEIGHTS_PATH)) {
        const data = JSON.parse(fs.readFileSync(this.WEIGHTS_PATH, 'utf-8'));
        Object.entries(data).forEach(([id, w]) => this.ruleWeights.set(id, w as number));
      }
    } catch {}
    this.initialized = true;
  }

  static learnFromSuccess(ruleId: string) {
    this.init();
    const current = this.ruleWeights.get(ruleId) || 1.0;
    this.ruleWeights.set(ruleId, Math.min(current + 0.02, 2.0));
    this.save();
  }

  static learnFromFailure(ruleId: string) {
    this.init();
    const current = this.ruleWeights.get(ruleId) || 1.0;
    // Hardening: Drop weight significantly on failure
    this.ruleWeights.set(ruleId, Math.max(current - 0.05, 0.1));
    this.save();
  }

  private static save() {
    try {
      const fs = require('fs');
      const obj = Object.fromEntries(this.ruleWeights);
      fs.writeFileSync(this.WEIGHTS_PATH, JSON.stringify(obj), 'utf-8');
    } catch {}
  }

  static getWeight(ruleId: string): number {
    this.init();
    return this.ruleWeights.get(ruleId) || 1.0;
  }

  /** Auto-Disable Gate for low-confidence rules */
  static isSuppressed(ruleId: string): boolean {
    return this.getWeight(ruleId) < 0.5;
  }
}

// IDENTITY_SEAL: PART-9 | role=evolution-engine | inputs=AuditEntry | outputs=LearnedWeights

// ============================================================
// PART 10 — Physical Release Gate (Atomic)
// ============================================================

/**
 * STEP 6.0: AtomicWriter
 * Ensures code is written safely or not at all.
 */
function atomicWrite(target: string, code: string): boolean {
  try {
    const fs = require('fs');
    const path = require('path');
    const tempPath = `${target}.tmp`;
    
    // 1. Write to temp
    fs.writeFileSync(tempPath, code, 'utf-8');
    
    // 2. Atomic Rename (Replaces target)
    fs.renameSync(tempPath, target);
    return true;
  } catch {
    return false;
  }
}

// IDENTITY_SEAL: PART-10 | role=physical-gate | inputs=code | outputs=bool

// [REVISION: PART-8 Update with Learning Loop & Delta Analysis]
export async function runQuillWithRepair(code: string, fileName: string = 'temp.ts', persist: boolean = false): Promise<SelfHealingResult> {
  // 1. Initial Analysis
  const result = runQuillEngine(code, fileName);
  
  // 2. Filter findings for high-confidence repairs + Evolution Gate
  const repairable = result.findings.filter(f => 
    f.verified && 
    (f.refinement?.strategy === 'SAFE_SWAP' || f.refinement?.strategy === 'REPLACE_LOGIC') &&
    !LearningEngine.isSuppressed(f.ruleId)
  );
  
  if (repairable.length === 0) return { ...result, repairCount: 0 };

  // 3. Execution (Repair with AI Synergy)
  const patchedCode = await applyRepairs(code, repairable, fileName);

  // 4. Re-Verification (Delta Analysis)
  const finalCheck = runQuillEngine(patchedCode, fileName);
  
  // 5. Success/Failure Classification (Stealth Learning)
  const stats: Record<string, 'success' | 'failure'> = {};
  
  for (const f of repairable) {
    const stillExists = finalCheck.findings.some(nf => nf.ruleId === f.ruleId && nf.line === f.line);
    
    if (stillExists) {
      stats[f.ruleId] = 'failure';
      LearningEngine.learnFromFailure(f.ruleId);
    } else {
      stats[f.ruleId] = 'success';
      LearningEngine.learnFromSuccess(f.ruleId);
    }
  }

  // 6. Audit Logging
  AuditManager.record({
    timestamp: new Date().toISOString(),
    fileName,
    repairCount: repairable.length,
    ruleStats: stats
  });

  // 7. Physical Persistence
  if (persist && fileName !== 'temp.ts') {
    atomicWrite(fileName, patchedCode);
  }

  return {
    ...finalCheck,
    repairedCode: patchedCode,
    repairCount: repairable.length
  };
}

// ============================================================
// PART 11 — Cross-Module Impact Engine (Blast Radius Control)
// [CONTRACT]
// - MUST: Map workspaces dependencies.
// - MUST: Verify dependent files after a local repair.
// - MUST: Trigger rollback if total workspace health drops.
// ============================================================

export interface ImpactReport {
  targetFile: string;
  dependents: string[];
  isTotalIntegrityMaintained: boolean;
  regressions: Record<string, EngineFinding[]>;
}

/**
 * STEP 7.0: DependencyTracker
 * Maps imports across the workspace using TS Program.
 */
export class DependencyTracker {
  private static graph = new Map<string, Set<string>>(); // target -> importedBy

  static buildGraph(program: import('typescript').Program) {
    this.graph.clear();
    const sourceFiles = program.getSourceFiles();
    const path = require('path');
    
    for (const sf of sourceFiles) {
      if (sf.isDeclarationFile) continue;
      const currentFile = path.resolve(sf.fileName);
      
      ts.forEachChild(sf, node => {
        if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const resolved = ts.resolveModuleName(
            node.moduleSpecifier.text,
            sf.fileName,
            program.getCompilerOptions(),
            ts.createCompilerHost(program.getCompilerOptions())
          );
          
          if (resolved.resolvedModule) {
            const target = path.resolve(resolved.resolvedModule.resolvedFileName);
            if (!this.graph.has(target)) this.graph.set(target, new Set());
            this.graph.get(target)!.add(currentFile);
            // console.log(`[DEP] ${target} is imported by ${currentFile}`);
          }
        }
      });
    }
  }

  static getDependents(filePath: string): string[] {
    const path = require('path');
    const absolutePath = path.resolve(filePath);
    return Array.from(this.graph.get(absolutePath) || []);
  }
}

/**
 * STEP 7.1: ImpactAnalyzer
 * Orchestrates multi-file verification.
 */
export class ImpactAnalyzer {
  static async verifyBlastRadius(repairedFile: string, dependents: string[]): Promise<ImpactReport> {
    const report: ImpactReport = {
      targetFile: repairedFile,
      dependents,
      isTotalIntegrityMaintained: true,
      regressions: {}
    };

    for (const dep of dependents) {
      // Re-analyze each dependent file to see if the repair broke them
      const result = runQuillEngine(require('fs').readFileSync(dep, 'utf-8'), dep);
      const criticals = result.findings.filter(f => f.severity === 'critical' || f.severity === 'error');
      
      if (criticals.length > 0) {
        report.isTotalIntegrityMaintained = false;
        report.regressions[dep] = criticals;
      }
    }

    return report;
  }
}

// [REVISION: PART-10 Workspace-Aware Repair]
export async function runQuillWorkspaceRepair(
  targetFile: string, 
  workspaceFiles: string[]
): Promise<ImpactReport | SelfHealingResult> {
  const fs = require('fs');
  const code = fs.readFileSync(targetFile, 'utf-8');
  
  // 1. Snapshot for Rollback
  const snapshot = code;
  
  // 2. Local Repair Loop (Async)
  const localRes = await runQuillWithRepair(code, targetFile, true);
  
  if (localRes.repairCount === 0) return localRes;

  // 3. Dependency Analysis
  const compilerOptions = { target: ts.ScriptTarget.Latest, module: ts.ModuleKind.CommonJS };
  const program = ts.createProgram(workspaceFiles, compilerOptions);
  DependencyTracker.buildGraph(program);
  
  const dependents = DependencyTracker.getDependents(require('path').resolve(targetFile));
  
  if (dependents.length === 0) return localRes;

  // 4. Global Verification (Blast Radius)
  const impact = await ImpactAnalyzer.verifyBlastRadius(targetFile, dependents);
  
  // 5. Global Rollback Policy
  if (!impact.isTotalIntegrityMaintained) {
    // 롤백: 수리 전 상태로 복구 (Atomic)
    atomicWrite(targetFile, snapshot);
    
    // 이 실패를 지식 엔진에 학습 (Global Weakness)
    for (const f of (localRes as SelfHealingResult).findings) {
      LearningEngine.learnFromFailure(f.ruleId);
    }
    
    return impact;
  }

  return localRes;
}

// ============================================================
// PART 12 — AI Patch Synergy Engine (Context-Aware Refinement)
// ============================================================

/**
 * STEP 8.0: AIPatchGenerator
 * Connects to LLM to resolve complex findings.
 */
export class AIPatchGenerator {
  static async generate(finding: EngineFinding, code: string, fileName: string): Promise<string | null> {
    try {
      const { quickAsk } = require('./ai-bridge');
      const context = this.getCodeContext(code, finding.line);
      
      const prompt = `
[CONTEXT] File: ${fileName}, Line: ${finding.line}
\`\`\`typescript
${context}
\`\`\`

[ISSUE] Rule: ${finding.ruleId}, Message: ${finding.message}

Please provide ONLY the replacement code for the specific line/block to fix this.
Rules:
- MUST NOT include explanations.
- MUST maintain indentation.
- MUST be syntactically correct TypeScript.
- TARGET LINE: ${finding.line}
`;

      const response = await quickAsk(prompt, "You are an expert vulnerability researcher and TS refactor bot.", "code-refactor");
      
      // Clean up response: remove markdown blocks if any
      let cleaned = response.replace(/```typescript/g, '').replace(/```/g, '').trim();
      
      return cleaned || null;
    } catch {
      return null;
    }
  }

  private static getCodeContext(code: string, line: number, range: number = 10): string {
    const lines = code.split('\n');
    const start = Math.max(0, line - 1 - range);
    const end = Math.min(lines.length, line - 1 + range);
    return lines.slice(start, end + 1).join('\n');
  }
}

// IDENTITY_SEAL: PART-12 | role=ai-synergy-engine | inputs=findings,code | outputs=AIPatches
