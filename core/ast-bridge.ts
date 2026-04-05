// @ts-nocheck
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
  const msg = finding.message.toLowerCase();

  // Team1 Simulation: 무한루프, 재귀
  if (/loop|recursive|infinite|stack overflow/i.test(msg)) return 'simulation';

  // Team2 Generation: TODO, 빈함수, console
  if (/empty function|todo|fixme|console\./i.test(msg)) return 'generation';

  // Team3 Validation: 타입, null, 파라미터
  if (/null|undefined|type|parameter|nullable|optional/i.test(msg)) return 'validation';

  // Team4 Size-Density: 복잡도, 중첩, 길이
  if (/nest|depth|complex|cognitive|length/i.test(msg)) return 'size-density';

  // Team5 Asset-Trace: 미사용, 데드코드
  if (/unused|dead|unreachable|orphan/i.test(msg)) return 'asset-trace';

  // Team6 Stability: 에러핸들링, try-catch
  if (/try.?catch|error|exception|reject|await.*without/i.test(msg)) return 'stability';

  // Team7 Release-IP: 보안, eval, secrets
  if (/eval|security|xss|injection|secret|credential/i.test(msg)) return 'release-ip';

  // Team8 Governance: 아키텍처, 의존성
  if (/import|dependency|circular|architecture/i.test(msg)) return 'governance';

  return 'generation'; // default
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
): Promise<EnhancedPipelineResult> {
  const findings: ASTFinding[] = [];
  const engines: string[] = [];

  // Phase 1: Original regex pipeline
  const { runStaticPipeline } = await import('../core/pipeline-bridge');
  const regexResult = await runStaticPipeline(code, language);
  engines.push('regex-pipeline');

  let regexFindingCount = 0;
  for (const stage of regexResult.teams) {
    for (const finding of stage.findings) {
      regexFindingCount++;
      findings.push({
        engine: 'regex',
        line: 0,
        message: typeof finding === 'string' ? finding : String(finding),
        severity: 'warning',
        team: stage.name,
        confidence: 0.6,
      });
    }
  }

  // Phase 2: AST analysis
  try {
    const { runFullASTAnalysis } = await import('../adapters/ast-engine');
    const astResult = await runFullASTAnalysis(code, fileName);

    for (const eng of astResult.results) {
      engines.push(eng.engine);
    }

    for (const f of astResult.findings) {
      findings.push({
        engine: (f as unknown).engine ?? 'ast',
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
    const { getDiagnostics } = await import('../adapters/lsp-adapter');
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
    const { trackNullFlow, trackTaintFlow } = await import('./data-flow');

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
    const { buildCallGraph, findCircularDeps } = await import('../adapters/lsp-adapter');
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
    const { trackCrossFileFlow } = await import('./data-flow');
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
    const { runDeepVerify } = await import('./deep-verify');
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
    const { runBrainAnalysis } = await import('./cfg-engine');
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

  // Score calculation
  const astFindingCount = deduped.filter(f => f.engine !== 'regex').length;
  const criticalCount = deduped.filter(f => f.severity === 'critical').length;
  const errorCount = deduped.filter(f => f.severity === 'error').length;
  const warningCount = deduped.filter(f => f.severity === 'warning').length;

  const astScore = Math.max(0, 100 - criticalCount * 25 - errorCount * 10 - warningCount * 3);
  const combinedScore = Math.round((regexResult.score * 0.4 + astScore * 0.6));

  return {
    regexScore: regexResult.score,
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
    const { Project, SyntaxKind } = await import('ts-morph');
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
