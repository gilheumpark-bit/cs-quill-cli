// ============================================================
// CS Quill 🦔 — 4-Layer Engine (createProgram + TypeChecker)
// ============================================================
// Layer 0: Pre-filter (skip generated/minified)
// Layer 1: AST parse (typescript createSourceFile)
// Layer 2: Symbol resolution (createProgram + TypeChecker)
// Layer 3: Rule engine (evidence-based verdict)
//
// 무료 소스: typescript (이미 설치됨) + acorn + esquery

const ts = require('typescript') as typeof import('typescript');

// ============================================================
// PART 1 — Types
// ============================================================

export interface Evidence {
  engine: 'typescript-ast' | 'typescript-checker' | 'esquery' | 'regex';
  detail: string;
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

export interface EngineResult {
  findings: EngineFinding[];
  scopes: ScopeNode[];
  cyclomaticComplexity: number;
  nodeCount: number;
  enginesUsed: string[];
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
// PART 3 — Layer 1+2: TypeScript AST + TypeChecker
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

  // Pre-filter
  const codeToCheck = code ?? require('fs').readFileSync(targetFile, 'utf-8');
  const skipReason = shouldSkip(codeToCheck);
  if (skipReason) {
    return {
      findings: [{ ruleId: 'pre-filter/skip', line: 1, message: `[Bypass] ${skipReason}`, severity: 'info', confidence: 'high', evidence: [{ engine: 'regex', detail: skipReason }] }],
      scopes: [], cyclomaticComplexity: 0, nodeCount: 0, enginesUsed: ['pre-filter'],
    };
  }

  // createProgram — TypeChecker 포함
  let program: import('typescript').Program;
  let checker: import('typescript').TypeChecker;
  let sourceFile: import('typescript').SourceFile;

  try {
    // 가상 호스트로 단일 파일도 program으로 로드
    const host = ts.createCompilerHost({
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
    });

    // 대상 파일의 코드를 직접 주입 (파일 시스템 없이도 동작)
    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion, onError) => {
      if (fileName === targetFile || fileName.endsWith(targetFile)) {
        return ts.createSourceFile(fileName, codeToCheck, languageVersion, true);
      }
      return originalGetSourceFile.call(host, fileName, languageVersion, onError);
    };
    host.fileExists = (f) => f === targetFile || f.endsWith(targetFile) || require('fs').existsSync(f);
    host.readFile = (f) => {
      if (f === targetFile || f.endsWith(targetFile)) return codeToCheck;
      try { return require('fs').readFileSync(f, 'utf-8'); } catch { return undefined; }
    };

    program = ts.createProgram([targetFile], {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
    }, host);

    checker = program.getTypeChecker();
    enginesUsed.push('typescript-checker');

    const sf = program.getSourceFile(targetFile);
    if (!sf) {
      // fallback: createSourceFile 단독
      sourceFile = ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
    } else {
      sourceFile = sf;
    }
  } catch {
    // createProgram 실패 → createSourceFile fallback
    sourceFile = ts.createSourceFile(targetFile, codeToCheck, ts.ScriptTarget.Latest, true);
    checker = null as any;
  }

  const lineOf = (node: import('typescript').Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  // Scope graph 구축
  let scopeId = 0;
  let currentScopeId = 'scope-0';
  scopes.push({
    id: 'scope-0', kind: 'file', declared: new Set(),
    startLine: 1, endLine: sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1,
  });

  const reported = new Set<string>(); // 중복 방지

  function addFinding(f: EngineFinding) {
    const key = `${f.line}:${f.ruleId}`;
    if (reported.has(key)) return;
    reported.add(key);
    findings.push(f);
  }

  // ── AST 순회 ──
  function visit(node: import('typescript').Node, depth: number) {
    nodeCount++;

    // Cyclomatic complexity: 분기 노드만 카운트
    if (ts.isIfStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node) ||
        ts.isForOfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node) ||
        ts.isCaseClause(node) || ts.isCatchClause(node) || ts.isConditionalExpression(node)) {
      cyclomaticComplexity++;
    }
    // && || 도 분기
    if (ts.isBinaryExpression(node) && (
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken
    )) {
      cyclomaticComplexity++;
    }

    // Scope 추적
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
      scopeId++;
      const sid = `scope-${scopeId}`;
      const scope: ScopeNode = {
        id: sid, kind: 'function', parentId: currentScopeId,
        declared: new Set(), startLine: lineOf(node),
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
      };
      // 파라미터를 scope에 등록
      if ('parameters' in node) {
        for (const p of (node as any).parameters) {
          if (ts.isIdentifier(p.name)) scope.declared.add(p.name.text);
        }
      }
      scopes.push(scope);
      const prevScope = currentScopeId;
      currentScopeId = sid;

      // 빈 함수 탐지
      const body = (node as any).body;
      if (body && ts.isBlock(body) && body.statements.length === 0) {
        const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
        addFinding({
          ruleId: 'empty-function', line: lineOf(node),
          message: `빈 함수: ${name}()`,
          severity: 'error', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'Block.statements.length === 0' }],
        });
      }

      // 긴 함수 탐지
      if (body && ts.isBlock(body)) {
        const fnLines = sourceFile.getLineAndCharacterOfPosition(body.getEnd()).line -
                        sourceFile.getLineAndCharacterOfPosition(body.getStart()).line;
        if (fnLines > 60) {
          const name = (node as any).name?.getText?.(sourceFile) ?? 'anonymous';
          addFinding({
            ruleId: 'long-function', line: lineOf(node),
            message: `함수 ${name}() ${fnLines}줄 — 60줄 초과`,
            severity: 'warning', confidence: 'high',
            evidence: [{ engine: 'typescript-ast', detail: `body span: ${fnLines} lines` }],
          });
        }
      }

      // 파라미터 과다
      if ('parameters' in node && (node as any).parameters.length > 5) {
        addFinding({
          ruleId: 'too-many-params', line: lineOf(node),
          message: `파라미터 ${(node as any).parameters.length}개 — 5개 초과`,
          severity: 'warning', confidence: 'high',
          evidence: [{ engine: 'typescript-ast', detail: 'parameters.length > 5' }],
        });
      }

      ts.forEachChild(node, (child) => visit(child, depth + 1));
      currentScopeId = prevScope;
      return;
    }

    // eval() / new Function() — AST 기반 정확 탐지
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval') {
      addFinding({
        ruleId: 'security/eval', line: lineOf(node),
        message: 'eval() 호출 — 보안 위험',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'CallExpression callee === eval' }],
      });
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      addFinding({
        ruleId: 'security/new-function', line: lineOf(node),
        message: 'new Function() — eval 동등',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'typescript-ast', detail: 'NewExpression callee === Function' }],
      });
    }

    // == / != → === / !==
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken) {
        addFinding({
          ruleId: 'style/loose-equality', line: lineOf(node),
          message: '== 사용 — === 권장',
          severity: 'warning', confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: 'BinaryExpression operator: ==' }],
        });
      }
      if (node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken) {
        addFinding({
          ruleId: 'style/loose-inequality', line: lineOf(node),
          message: '!= 사용 — !== 권장',
          severity: 'warning', confidence: 'medium',
          evidence: [{ engine: 'typescript-ast', detail: 'BinaryExpression operator: !=' }],
        });
      }
    }

    // Symbol resolution — TypeChecker 사용 (Layer 2)
    if (checker && ts.isIdentifier(node)) {
      const parent = node.parent;
      // 속성 접근, 선언부, 타입 노드는 제외
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
              ruleId: 'unresolved-symbol', line: lineOf(node),
              message: `미해석 심볼: '${node.text}'`,
              severity: 'info', confidence: 'medium',
              evidence: [{ engine: 'typescript-checker', detail: 'getSymbolAtLocation returned null' }],
            });
          }
        } catch { /* checker 실패 무시 */ }
      }
    }

    ts.forEachChild(node, (child) => visit(child, depth + 1));
  }

  visit(sourceFile, 0);

  // Cyclomatic complexity 경고
  if (cyclomaticComplexity > 15) {
    addFinding({
      ruleId: 'cognitive/cyclomatic', line: 1,
      message: `순환 복잡도 ${cyclomaticComplexity} — 15 초과`,
      severity: 'warning', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: `if/for/while/case/&&/|| count: ${cyclomaticComplexity}` }],
    });
  }

  // 깊은 중첩 (scope graph 기반)
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
      ruleId: 'structure/deep-nesting', line: 1,
      message: `최대 스코프 깊이 ${maxScopeDepth} — 5 초과`,
      severity: 'warning', confidence: 'high',
      evidence: [{ engine: 'typescript-ast', detail: `scope graph depth: ${maxScopeDepth}` }],
    });
  }

  return { findings: findings.slice(0, 30), scopes, cyclomaticComplexity, nodeCount, enginesUsed };
}

// ============================================================
// PART 4 — Layer 3: esquery 보조 (CSS 셀렉터 패턴)
// ============================================================

export function analyzeWithEsquery(code: string): EngineFinding[] {
  try {
    const acorn = require('acorn');
    const esquery = require('esquery');
    const findings: EngineFinding[] = [];

    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });

    // eval() — AST 기반 정확 탐지
    const evalCalls = esquery.query(ast, 'CallExpression[callee.name="eval"]');
    for (const node of evalCalls) {
      findings.push({
        ruleId: 'security/eval', line: (node as any).loc?.start?.line ?? 1,
        message: 'eval() 호출 — 보안 위험',
        severity: 'critical', confidence: 'high',
        evidence: [{ engine: 'esquery', detail: 'CallExpression[callee.name="eval"]' }],
      });
    }

    // 3중 루프
    const tripleLoop = esquery.query(ast,
      ':matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement) :matches(ForStatement, WhileStatement, ForOfStatement)');
    if (tripleLoop.length > 0) {
      findings.push({
        ruleId: 'perf/triple-loop', line: (tripleLoop[0] as any).loc?.start?.line ?? 1,
        message: '3중 중첩 루프 — O(n³) 복잡도',
        severity: 'warning', confidence: 'high',
        evidence: [{ engine: 'esquery', detail: 'nested loop depth >= 3' }],
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

export function runQuillEngine(code: string, fileName: string = 'temp.ts'): EngineResult {
  // Layer 1+2: TypeScript program
  const result = analyzeWithProgram([fileName], fileName, code);

  // Layer 3: esquery 보조
  try {
    const esqFindings = analyzeWithEsquery(code);
    // evidence 합성: 같은 ruleId+line이면 evidence 병합
    for (const esqF of esqFindings) {
      const existing = result.findings.find(f => f.ruleId === esqF.ruleId && f.line === esqF.line);
      if (existing) {
        existing.evidence.push(...esqF.evidence);
        // multi-engine → confidence 승격
        if (existing.confidence === 'medium') existing.confidence = 'high';
      } else {
        result.findings.push(esqF);
      }
    }
    if (!result.enginesUsed.includes('esquery')) result.enginesUsed.push('esquery');
  } catch { /* esquery 미설치 시 skip */ }

  return result;
}

// IDENTITY_SEAL: PART-5 | role=unified-engine | inputs=code,fileName | outputs=EngineResult
