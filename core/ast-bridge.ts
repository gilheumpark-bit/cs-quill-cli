// ============================================================
// CS Quill 🦔 — AST Bridge (Level 2 Pipeline Enhancer)
// ============================================================
// 정규식 기반 8팀 결과 + AST 분석 결과를 합산.
// 기존 파이프라인을 교체하지 않고 보강하는 브릿지.

// ============================================================
// PART 1 — Types
// ============================================================

export interface ASTFinding {
  engine: string;
  line: number;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  team: string;
  confidence: number;
}

export interface EnhancedPipelineResult {
  regexScore: number;
  astScore: number;
  combinedScore: number;
  regexFindings: number;
  astFindings: number;
  totalFindings: number;
  findings: ASTFinding[];
  engines: string[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ASTFinding,EnhancedPipelineResult

// ============================================================
// PART 2 — AST Team Mapping
// ============================================================
// AST 분석 결과를 8팀에 매핑하는 규칙.

function mapFindingToTeam(finding: { message: string; severity: string }): string {
  const msg = finding.message;

  // Team7 Release-IP: 보안 (가장 먼저 — 보안은 최우선)
  if (/eval|security|xss|injection|secret|credential|보안|개인키|API 키|password|패스워드/i.test(msg)) return 'release-ip';

  // Team1 Simulation: 무한루프, 재귀
  if (/loop|recursive|infinite|stack overflow|루프|재귀/i.test(msg)) return 'simulation';

  // Team6 Stability: 에러핸들링, try-catch, await
  if (/try.?catch|exception|reject|await.*without|빈 catch|unhandled/i.test(msg)) return 'stability';

  // Team4 Size-Density: 복잡도, 중첩, 길이, 파일 크기
  if (/nest|depth|complex|cognitive|줄 초과|줄 길이|중첩|깊이|함수.*줄|파일.*줄|파라미터.*개|삼항/i.test(msg)) return 'size-density';

  // Team5 Asset-Trace: 미사용, 데드코드
  if (/unused|dead|unreachable|orphan|미사용|@ts-ignore/i.test(msg)) return 'asset-trace';

  // Team3 Validation: 타입, null, ===/!==
  if (/null|undefined|any 타입|===|!==|==\s|!=\s|타입.*안전|nullable|optional/i.test(msg)) return 'validation';

  // Team2 Generation: 빈함수, TODO, console
  if (/empty function|빈 함수|todo|fixme|hack|console\.|stub|스텁/i.test(msg)) return 'generation';

  // Team8 Governance: 아키텍처, 의존성
  if (/import|dependency|circular|architecture|의존/i.test(msg)) return 'governance';

  // Default: 메시지에 error 포함이면 stability, 아니면 governance
  if (/error/i.test(msg)) return 'stability';
  return 'governance';
}

function mapSeverity(severity: string): ASTFinding['severity'] {
  if (severity === 'critical') return 'critical';
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
}

// IDENTITY_SEAL: PART-2 | role=team-mapping | inputs=finding | outputs=teamName

// ============================================================
// PART 3 — Bridge: Merge Regex + AST
// ============================================================

export async function runEnhancedPipeline(
  code: string,
  language: string,
  fileName: string,
  regexResult?: { score: number; teams: Array<{ name: string; score: number; findings: Array<{ line: number; message: string; severity: string }> }> },
): Promise<EnhancedPipelineResult> {
  const findings: ASTFinding[] = [];
  const engines: string[] = [];

  // 자기참조 방지: 검증 엔진 소스 파일 자체는 분석 skip
  const SELF_FILES = ['ast-bridge', 'pipeline-bridge', 'ast-engine', 'deep-verify', 'verify-orchestrator'];
  if (SELF_FILES.some(s => fileName.includes(s))) {
    return { regexScore: regexResult?.score ?? 80, astScore: 80, combinedScore: 80, regexFindings: 0, astFindings: 0, totalFindings: 0, findings: [], engines: ['self-skip'] };
  }

  // Phase 1: Static pipeline 결과 병합 — 팀 이름을 enhanced 팀으로 re-map
  let regexFindingCount = 0;
  if (regexResult) {
    engines.push('regex-pipeline');
    for (const stage of regexResult.teams) {
      for (const finding of stage.findings) {
        regexFindingCount++;
        const msg = typeof finding === 'string' ? finding : (finding as any).message ?? String(finding);
        findings.push({
          engine: 'regex',
          line: typeof finding === 'object' ? (finding as any).line ?? 0 : 0,
          message: msg,
          severity: 'warning',
          team: mapFindingToTeam({ message: msg, severity: 'warning' }),
          confidence: 0.5,
        });
      }
    }
  }

  // Phase 2: AST analysis
  try {
    const { runFullASTAnalysis } = require('../adapters/ast-engine');
    const astResult = await runFullASTAnalysis(code, fileName);

    for (const eng of astResult.results) {
      engines.push(eng.engine);
    }

    for (const f of astResult.findings) {
      findings.push({
        engine: (f as any).engine ?? 'ast',
        line: f.line,
        message: f.message,
        severity: mapSeverity(f.severity),
        team: mapFindingToTeam(f),
        confidence: 0.8,
      });
    }
  } catch { /* AST engines not available — skip */ }

  // Phase 3: LSP diagnostics
  try {
    const { getDiagnostics } = require('../adapters/lsp-adapter');
    const diagnostics = getDiagnostics(process.cwd());

    if (diagnostics.length > 0) {
      engines.push('tsc-lsp');
      for (const d of diagnostics.slice(0, 50)) {
        findings.push({
          engine: 'tsc',
          line: d.line,
          message: d.message,
          severity: d.severity === 'error' ? 'error' : 'warning',
          team: 'validation',
          confidence: 0.95,
        });
      }
    }
  } catch { /* LSP not available */ }

  // Phase 4: Hollow code scan (AST-enhanced)
  try {
    const hollowFindings = await runASTHollowScan(code, fileName);
    if (hollowFindings.length > 0) {
      engines.push('ast-hollow');
      for (const h of hollowFindings) {
        findings.push(h);
      }
    }
  } catch { /* skip */ }

  // Phase 5: Data Flow Analysis (Level 3 — null flow + taint)
  try {
    const { trackNullFlow, trackTaintFlow } = require('./data-flow');

    const nullFlow = await trackNullFlow(code, fileName);
    if (nullFlow.findings.length > 0) {
      engines.push('data-flow-null');
      for (const f of nullFlow.findings) {
        findings.push({
          engine: 'data-flow', line: f.line, message: f.message,
          severity: f.severity === 'error' ? 'error' : 'warning',
          team: 'validation', confidence: 0.9,
        });
      }
    }

    const taint = await trackTaintFlow(code, fileName);
    if (taint.findings.length > 0) {
      engines.push('taint-analysis');
      for (const f of taint.findings) {
        findings.push({
          engine: 'taint', line: f.line, message: f.message,
          severity: 'critical', team: 'release-ip', confidence: 0.92,
        });
      }
    }
  } catch { /* data-flow not available */ }

  // Phase 6: Cross-File Analysis (Level 4 — call graph + circular deps)
  try {
    const { buildCallGraph, findCircularDeps } = require('../adapters/lsp-adapter');
    const graph = buildCallGraph(process.cwd());
    const circles = findCircularDeps(graph);

    if (circles.length > 0) {
      engines.push('call-graph');
      for (const circle of circles.slice(0, 5)) {
        findings.push({
          engine: 'call-graph', line: 0,
          message: `Circular dependency: ${circle.join(' → ')}`,
          severity: 'warning', team: 'governance', confidence: 0.95,
        });
      }
    }

    // Cross-file null flow (Level 4)
    const { trackCrossFileFlow } = require('./data-flow');
    const crossFile = await trackCrossFileFlow(process.cwd());
    if (crossFile.findings.length > 0) {
      engines.push('cross-file-null');
      for (const f of crossFile.findings) {
        findings.push({
          engine: 'cross-file', line: f.line, message: f.message,
          severity: 'error', team: 'validation', confidence: 0.88,
        });
      }
    }
  } catch { /* cross-file analysis not available */ }

  // Phase 7: Deep Verify (P0~P2 논리 버그)
  try {
    const { runDeepVerify } = require('./deep-verify');
    const deepResult = runDeepVerify(code, fileName);
    if (deepResult.findings.length > 0) {
      engines.push('deep-verify');
      for (const f of deepResult.findings) {
        findings.push({
          engine: 'deep-verify', line: f.line, message: `[${f.severity}] ${f.message}`,
          severity: f.severity === 'P0' ? 'critical' : f.severity === 'P1' ? 'error' : 'warning',
          team: f.category === 'brace-balance' || f.category === 'declaration-order' ? 'validation' :
                f.category === 'async-pattern' ? 'stability' :
                f.category === 'unsafe-cast' ? 'validation' :
                f.category === 'resource-leak' ? 'stability' :
                f.category === 'math-logic' ? 'simulation' : 'governance',
          confidence: f.severity === 'P0' ? 0.95 : f.severity === 'P1' ? 0.85 : 0.75,
        });
      }
    }
  } catch { /* deep-verify optional */ }

  // Phase 8: CFG Brain Analysis (제어 흐름 그래프 기반 위험 경로)
  try {
    const { runBrainAnalysis } = require('./cfg-engine');
    const brain = await runBrainAnalysis(code, fileName);
    if (brain.riskPaths.length > 0) {
      engines.push(`cfg-engine(${brain.stats.reductionPercent}% 컨텍스트 절감)`);
      for (const path of brain.riskPaths) {
        findings.push({
          engine: 'cfg', line: path.nodes[0]?.line ?? 0,
          message: `[CFG-${path.risk}] ${path.description}`,
          severity: path.risk === 'tainted' ? 'critical' : path.risk === 'nullable' ? 'error' : 'warning',
          team: path.risk === 'tainted' ? 'release-ip' : 'validation',
          confidence: 0.88,
        });
      }
    }
  } catch { /* cfg optional */ }

  // Deduplicate: same line + same team = keep higher confidence
  const deduped = deduplicateFindings(findings);

  // Score calculation — 감점 캡 적용 (최대 50점 감점)
  const astFindingCount = deduped.filter(f => f.engine !== 'regex').length;
  const criticalCount = Math.min(deduped.filter(f => f.severity === 'critical').length, 3);
  const errorCount = Math.min(deduped.filter(f => f.severity === 'error').length, 5);
  const warningCount = Math.min(deduped.filter(f => f.severity === 'warning').length, 10);

  const penalty = criticalCount * 10 + errorCount * 5 + warningCount * 1;
  const astScore = Math.max(50, 100 - Math.min(penalty, 50));
  const regexScore = regexResult?.score ?? 50;
  const combinedScore = Math.round(regexScore * 0.3 + astScore * 0.7);

  return {
    regexScore: regexScore,
    astScore,
    combinedScore,
    regexFindings: regexFindingCount,
    astFindings: astFindingCount,
    totalFindings: deduped.length,
    findings: deduped,
    engines,
  };
}

// IDENTITY_SEAL: PART-3 | role=bridge | inputs=code,language,fileName | outputs=EnhancedPipelineResult

// ============================================================
// PART 4 — AST-Enhanced Hollow Code Scanner
// ============================================================

export async function runASTHollowScan(code: string, fileName: string): Promise<ASTFinding[]> {
  const findings: ASTFinding[] = [];

  try {
    const { Project, SyntaxKind } = require('ts-morph');
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(fileName, code);

    // 1. Empty functions (AST precise) — both declarations and const arrows
    for (const fn of sourceFile.getFunctions()) {
      const body = fn.getBody();
      if (body && body.getStatements().length === 0) {
        findings.push({
          engine: 'ts-morph', line: fn.getStartLineNumber(),
          message: `Empty function: ${fn.getName() ?? 'anonymous'} — body has 0 statements`,
          severity: 'error', team: 'generation', confidence: 0.95,
        });
      }
    }

    // 1b. Empty const arrow functions (const foo = () => {})
    for (const decl of sourceFile.getVariableDeclarations()) {
      const init = decl.getInitializer();
      if (!init) continue;
      if (init.getKind() === SyntaxKind.ArrowFunction) {
        const arrow = init.asKind(SyntaxKind.ArrowFunction);
        if (!arrow) continue;
        const body = arrow.getBody();
        if (body.getKind() === SyntaxKind.Block) {
          const block = body.asKind(SyntaxKind.Block);
          if (block && block.getStatements().length === 0) {
            findings.push({
              engine: 'ts-morph', line: decl.getStartLineNumber(),
              message: `Empty arrow function: const ${decl.getName()} = () => {}`,
              severity: 'error', team: 'generation', confidence: 0.95,
            });
          }
        }
      }
    }

    // 2. Arrow functions with empty body
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ArrowFunction) {
        const arrow = node.asKind(SyntaxKind.ArrowFunction);
        if (!arrow) return;
        const body = arrow.getBody();
        if (body.getKind() === SyntaxKind.Block) {
          const block = body.asKind(SyntaxKind.Block);
          if (block && block.getStatements().length === 0) {
            findings.push({
              engine: 'ts-morph', line: arrow.getStartLineNumber(),
              message: 'Empty arrow function body',
              severity: 'error', team: 'generation', confidence: 0.9,
            });
          }
        }
      }
    });

    // 3. Functions that only return null/undefined/{}
    for (const fn of sourceFile.getFunctions()) {
      const body = fn.getBody();
      if (!body) continue;
      const statements = body.getStatements();
      if (statements.length === 1) {
        const text = statements[0].getText().trim();
        if (/^return\s+(null|undefined|\{\s*\}|\[\s*\]);?$/.test(text)) {
          findings.push({
            engine: 'ts-morph', line: fn.getStartLineNumber(),
            message: `Stub function: ${fn.getName() ?? 'anonymous'} only returns ${text.replace('return ', '')}`,
            severity: 'warning', team: 'generation', confidence: 0.85,
          });
        }
      }
    }

    // 4. Empty catch blocks
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CatchClause) {
        const catchClause = node.asKind(SyntaxKind.CatchClause);
        if (!catchClause) return;
        const block = catchClause.getBlock();
        if (block.getStatements().length === 0) {
          // Check if there's at least a comment
          const fullText = block.getFullText();
          if (!/\/\/|\/\*/.test(fullText)) {
            findings.push({
              engine: 'ts-morph', line: catchClause.getStartLineNumber(),
              message: 'Empty catch block — errors silently swallowed without comment',
              severity: 'warning', team: 'stability', confidence: 0.9,
            });
          }
        }
      }
    });

    // 5. Unused parameters (AST precise)
    for (const fn of sourceFile.getFunctions()) {
      for (const param of fn.getParameters()) {
        const name = param.getName();
        if (name.startsWith('_')) continue;
        const refs = param.findReferencesAsNodes();
        if (refs.length <= 1) {
          findings.push({
            engine: 'ts-morph', line: param.getStartLineNumber(),
            message: `Unused parameter: ${name}`,
            severity: 'info', team: 'asset-trace', confidence: 0.9,
          });
        }
      }
    }

    // 6. Await without try-catch (AST precise)
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AwaitExpression) {
        let parent = node.getParent();
        let hasTry = false;
        while (parent) {
          if (parent.getKind() === SyntaxKind.TryStatement) { hasTry = true; break; }
          if (parent.getKind() === SyntaxKind.ArrowFunction || parent.getKind() === SyntaxKind.FunctionDeclaration) break;
          parent = parent.getParent();
        }
        if (!hasTry) {
          findings.push({
            engine: 'ts-morph', line: node.getStartLineNumber(),
            message: 'await without try-catch in enclosing scope',
            severity: 'warning', team: 'stability', confidence: 0.85,
          });
        }
      }
    });

    // 7. Nested loops > 2 levels (AST precise)
    let maxLoopDepth = 0;
    const loopKinds = new Set([SyntaxKind.ForStatement, SyntaxKind.WhileStatement, SyntaxKind.DoStatement, SyntaxKind.ForInStatement, SyntaxKind.ForOfStatement]);

    sourceFile.forEachDescendant(node => {
      if (loopKinds.has(node.getKind())) {
        let depth = 1;
        let parent = node.getParent();
        while (parent) {
          if (loopKinds.has(parent.getKind())) depth++;
          parent = parent.getParent();
        }
        if (depth > maxLoopDepth) maxLoopDepth = depth;
        if (depth >= 3) {
          findings.push({
            engine: 'ts-morph', line: node.getStartLineNumber(),
            message: `Triple-nested loop (depth ${depth}) — O(n^${depth}) complexity`,
            severity: 'warning', team: 'simulation', confidence: 0.9,
          });
        }
      }
    });

    // --- [Phase 4-B] Registered Plug-in Detectors (414 Rule Connectors) ---
    const { loadAllDetectors } = require('./detectors');
    const { getRule } = require('./rule-catalog');
    
    const registry = loadAllDetectors();
    for (const detector of registry.getDetectors()) {
      const ruleMeta = getRule(detector.ruleId) || {
        severity: 'warning',
        category: 'generation',
        confidence: 'high'
      };
      
      const pFindings = detector.detect(sourceFile);
      for (const pf of pFindings) {
        // Find best severity mapping matching ASTFinding interface
        let mappedSev: 'critical'|'error'|'warning'|'info' = 'warning';
        if (ruleMeta.severity === 'critical') mappedSev = 'critical';
        else if (ruleMeta.severity === 'high') mappedSev = 'error';
        else if (ruleMeta.severity === 'info') mappedSev = 'info';

        // Find confidence math
        let mappedConf = 0.8;
        if (ruleMeta.confidence === 'high') mappedConf = 0.95;
        else if (ruleMeta.confidence === 'low') mappedConf = 0.6;

        findings.push({
          engine: 'detector-plugin',
          line: pf.line,
          message: `[${detector.ruleId}] ${pf.message}`,
          severity: mappedSev,
          team: mapFindingToTeam({ message: pf.message, severity: mappedSev }),
          confidence: mappedConf,
        });
      }
    }

  } catch { /* ts-morph not available */ }

  return findings;
}

// IDENTITY_SEAL: PART-4 | role=ast-hollow | inputs=code,fileName | outputs=ASTFinding[]

// ============================================================
// PART 5 — Deduplication
// ============================================================

function deduplicateFindings(findings: ASTFinding[]): ASTFinding[] {
  const seen = new Map<string, ASTFinding>();

  for (const f of findings) {
    const key = `${f.team}:${f.line}:${f.message.slice(0, 40)}`;
    const existing = seen.get(key);

    if (!existing || f.confidence > existing.confidence) {
      seen.set(key, f);
    }
  }

  return [...seen.values()].sort((a, b) => {
    const sevOrder = { critical: 0, error: 1, warning: 2, info: 3 };
    return sevOrder[a.severity] - sevOrder[b.severity] || b.confidence - a.confidence;
  });
}

// IDENTITY_SEAL: PART-5 | role=dedup | inputs=ASTFinding[] | outputs=ASTFinding[]
