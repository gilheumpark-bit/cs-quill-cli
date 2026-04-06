// @ts-nocheck
// ============================================================
// CS Quill 🦔 — cs playground command
// ============================================================
// 44엔진 풀벤치마크. 3DMark 스타일 코드 점수.

// Verify/Audit engines imported dynamically via @/lib/code-studio/* below

// ============================================================
// PART 1 — Types & AST Metrics
// ============================================================

interface CategoryScore {
  name: string;
  icon: string;
  score: number;
  engines: number;
  duration: number;
}

interface ASTMetrics {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  totalInterfaces: number;
  avgComplexityPerFunction: number;
  maxComplexity: number;
  totalLines: number;
}

interface PlaygroundHistoryEntry {
  timestamp: string;
  score: number;
  categories: Array<{ name: string; score: number }>;
  metrics?: ASTMetrics;
}

/** Compute real AST metrics using ts-morph when available, falling back to regex counting */
function computeASTMetrics(srcDir: string): ASTMetrics {
  const { readdirSync, readFileSync, existsSync } = require('fs');
  const { join } = require('path');

  const metrics: ASTMetrics = {
    totalFiles: 0, totalFunctions: 0, totalClasses: 0,
    totalInterfaces: 0, avgComplexityPerFunction: 0, maxComplexity: 0, totalLines: 0,
  };

  // Collect all source file paths
  const filePaths: string[] = [];
  function collectFiles(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { collectFiles(p); continue; }
        if (/\.(ts|tsx|js|jsx)$/.test(e.name)) filePaths.push(p);
      }
    } catch { /* skip */ }
  }
  collectFiles(srcDir);
  metrics.totalFiles = filePaths.length;

  // Try ts-morph for real AST analysis
  let usedTsMorph = false;
  try {
    const { Project, SyntaxKind } = require('ts-morph');
    const project = new Project({ compilerOptions: { allowJs: true, noEmit: true }, skipAddingFilesFromTsConfig: true });

    // Add files in batches to avoid memory issues
    const batch = filePaths.slice(0, 100);
    for (const fp of batch) {
      try { project.addSourceFileAtPath(fp); } catch { /* skip unparseable */ }
    }

    let totalComplexity = 0;
    let functionCount = 0;

    for (const sourceFile of project.getSourceFiles()) {
      metrics.totalLines += sourceFile.getEndLineNumber();

      // Count classes
      metrics.totalClasses += sourceFile.getClasses().length;

      // Count interfaces
      metrics.totalInterfaces += sourceFile.getInterfaces().length;

      // Count functions and compute cyclomatic complexity per function
      const allFunctions = [
        ...sourceFile.getFunctions(),
        ...sourceFile.getClasses().flatMap(c => c.getMethods()),
      ];
      // Also count arrow functions assigned to variables
      const varDecls = sourceFile.getVariableDeclarations();
      for (const v of varDecls) {
        const init = v.getInitializer();
        if (init && init.getKind() === SyntaxKind.ArrowFunction) {
          allFunctions.push(init);
        }
      }

      for (const fn of allFunctions) {
        functionCount++;
        // Cyclomatic complexity = 1 + decision points
        let complexity = 1;
        try {
          const body = fn.getBody ? fn.getBody() : fn;
          if (body) {
            const text = body.getText();
            // Count decision points: if, else if, &&, ||, ?:, for, while, do, switch case, catch
            complexity += (text.match(/\bif\s*\(/g) ?? []).length;
            complexity += (text.match(/\belse\s+if\s*\(/g) ?? []).length;
            complexity += (text.match(/\bfor\s*\(/g) ?? []).length;
            complexity += (text.match(/\bwhile\s*\(/g) ?? []).length;
            complexity += (text.match(/\bcase\s+/g) ?? []).length;
            complexity += (text.match(/\bcatch\s*\(/g) ?? []).length;
            complexity += (text.match(/\?\s*[^:?]/g) ?? []).length;
            complexity += (text.match(/&&/g) ?? []).length;
            complexity += (text.match(/\|\|/g) ?? []).length;
          }
        } catch { /* keep complexity=1 */ }
        totalComplexity += complexity;
        if (complexity > metrics.maxComplexity) metrics.maxComplexity = complexity;
      }
    }

    metrics.totalFunctions = functionCount;
    metrics.avgComplexityPerFunction = functionCount > 0 ? Math.round((totalComplexity / functionCount) * 100) / 100 : 0;
    usedTsMorph = true;
  } catch {
    // ts-morph not available — regex fallback
  }

  // Regex fallback if ts-morph unavailable
  if (!usedTsMorph) {
    for (const fp of filePaths) {
      try {
        const code = readFileSync(fp, 'utf-8');
        metrics.totalLines += code.split('\n').length;
        metrics.totalFunctions += (code.match(/(?:function\s+\w+|=>\s*\{)/g) ?? []).length;
        metrics.totalClasses += (code.match(/\bclass\s+\w+/g) ?? []).length;
        metrics.totalInterfaces += (code.match(/\binterface\s+\w+/g) ?? []).length;
        // Estimate avg complexity from decision-point density
        const decisions = (code.match(/\b(if|for|while|case|catch)\b/g) ?? []).length;
        const funcs = Math.max(1, (code.match(/(?:function\s+\w+|=>\s*\{)/g) ?? []).length);
        const fileComplexity = 1 + decisions / funcs;
        if (fileComplexity > metrics.maxComplexity) metrics.maxComplexity = Math.round(fileComplexity);
      } catch { /* skip */ }
    }
    metrics.avgComplexityPerFunction = metrics.totalFunctions > 0
      ? Math.round((metrics.totalLines / metrics.totalFunctions) * 0.15 * 100) / 100
      : 0;
  }

  return metrics;
}

/** Score AST metrics into 0-100 — rewards well-structured, moderate-complexity code */
function scoreASTMetrics(m: ASTMetrics): number {
  let score = 100;

  // Penalize very high average complexity (target: 2-6)
  if (m.avgComplexityPerFunction > 10) score -= 20;
  else if (m.avgComplexityPerFunction > 8) score -= 12;
  else if (m.avgComplexityPerFunction > 6) score -= 5;

  // Penalize extremely high max complexity (target: < 15)
  if (m.maxComplexity > 30) score -= 15;
  else if (m.maxComplexity > 20) score -= 8;
  else if (m.maxComplexity > 15) score -= 3;

  // Reward type annotations (interfaces + classes vs total files)
  const typeRatio = m.totalFiles > 0 ? (m.totalInterfaces + m.totalClasses) / m.totalFiles : 0;
  if (typeRatio >= 0.5) score += 5;
  else if (typeRatio < 0.1 && m.totalFiles > 5) score -= 10;

  // Reward reasonable function density (functions per file, target: 2-8)
  const fnPerFile = m.totalFiles > 0 ? m.totalFunctions / m.totalFiles : 0;
  if (fnPerFile >= 2 && fnPerFile <= 8) score += 5;
  else if (fnPerFile > 15) score -= 10;
  else if (fnPerFile < 1 && m.totalFiles > 3) score -= 5;

  // Baseline bonus for having code at all
  if (m.totalFiles === 0) return 0;

  return Math.max(0, Math.min(100, score));
}

// IDENTITY_SEAL: PART-1 | role=types-and-ast-metrics | inputs=srcDir | outputs=ASTMetrics,score

// ============================================================
// PART 2 — Playground Runner
// ============================================================

interface PlaygroundOptions {
  full?: boolean;
  compare?: string;
  leaderboard?: boolean;
  challenge?: boolean;
  share?: boolean;
  json?: boolean;
}

export async function runPlayground(opts: PlaygroundOptions): Promise<void> {
  const { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
  const { join } = require('path');

  if (!opts.json) console.log('🦔 CS Quill Playground — 코드 벤치마크 🎮\n');

  const startTime = performance.now();
  const categories: CategoryScore[] = [];
  const srcDir = join(process.cwd(), 'src');

  // Phase 1: AST Score — real metrics via ts-morph or regex fallback
  if (!opts.json) console.log('  [Phase 1] AST 엔진...');
  const astStart = performance.now();
  const astMetrics = computeASTMetrics(srcDir);

  // Run actual pipeline on sampled files to blend with AST metrics
  let astPipelineScoreSum = 0;
  let astPipelineCount = 0;
  try {
    const { runStaticPipeline: runAstPipeline } = require('../core/pipeline-bridge');
    function sampleAST(dir: string, limit: number): void {
      if (astPipelineCount >= limit) return;
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (astPipelineCount >= limit) return;
          if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('.')) continue;
          const p = join(dir, e.name);
          if (e.isDirectory()) { sampleAST(p, limit); continue; }
          if (!/\.(ts|tsx)$/.test(e.name)) continue;
          try {
            const code = readFileSync(p, 'utf-8');
            if (code.length < 50) continue;
            const result = runAstPipeline(code, 'typescript');
            const astTeam = result.teams?.find((t: any) => t.name === 'ast');
            astPipelineScoreSum += astTeam ? astTeam.score : result.score;
            astPipelineCount++;
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
    sampleAST(srcDir, 20);
  } catch { /* pipeline-bridge not available */ }

  // Blend: 60% real AST metrics score + 40% pipeline score (if available)
  const metricsScore = scoreASTMetrics(astMetrics);
  const astScore = astPipelineCount > 0
    ? Math.round(metricsScore * 0.6 + (astPipelineScoreSum / astPipelineCount) * 0.4)
    : metricsScore;
  const astDuration = Math.round(performance.now() - astStart);
  categories.push({ name: 'AST', icon: '🔬', score: astScore, engines: 6, duration: astDuration });
  if (!opts.json) console.log(`        → ${astScore}/100 (${astMetrics.totalFiles} files, ${astMetrics.totalFunctions} fn, ${astMetrics.totalClasses} cls, ${astMetrics.totalInterfaces} iface, avg-cx ${astMetrics.avgComplexityPerFunction}) ${astDuration}ms`);

  // Phase 2: Quality Score (8-team pipeline)
  if (!opts.json) console.log('  [Phase 2] Quality 엔진...');
  const qualStart = performance.now();
  const { runStaticPipeline } = require('../core/pipeline-bridge');
  let qualScoreSum = 0;
  let qualCount = 0;
  const qualFileQueue: string[] = [];
  function collectQualFiles(dir: string, limit: number): void {
    if (qualFileQueue.length >= limit) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (qualFileQueue.length >= limit) return;
        if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { collectQualFiles(p, limit); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        qualFileQueue.push(p);
      }
    } catch { /* skip */ }
  }
  collectQualFiles(srcDir, 30);
  for (const filePath of qualFileQueue) {
    try {
      const code = readFileSync(filePath, 'utf-8');
      if (code.length < 50) continue;
      const result = await runStaticPipeline(code, 'typescript');
      qualScoreSum += result.score;
      qualCount++;
    } catch { /* skip */ }
  }
  const qualityScore = qualCount > 0 ? Math.round(qualScoreSum / qualCount) : 50;
  const qualDuration = Math.round(performance.now() - qualStart);
  categories.push({ name: 'Quality', icon: '🎯', score: qualityScore, engines: 6, duration: qualDuration });
  if (!opts.json) console.log(`        → ${qualityScore}/100 (${qualCount} files sampled) ${qualDuration}ms`);

  // Phase 3: Rule-Catalog Quality Summary (replaces AI simulation)
  if (!opts.json) console.log('  [Phase 3] Rule-Catalog 엔진...');
  const ruleStart = performance.now();
  let ruleCatalogScore = 75; // baseline
  let ruleStats = { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, byEngine: {} as Record<string, number>, byCategory: {} as Record<string, number> };
  try {
    const { RULE_CATALOG } = require('../core/rule-catalog');
    ruleStats.total = RULE_CATALOG.length;
    for (const rule of RULE_CATALOG) {
      ruleStats.bySeverity[rule.severity] = (ruleStats.bySeverity[rule.severity] ?? 0) + 1;
      ruleStats.byEngine[rule.engine] = (ruleStats.byEngine[rule.engine] ?? 0) + 1;
      ruleStats.byCategory[rule.category] = (ruleStats.byCategory[rule.category] ?? 0) + 1;
    }
    // Score = coverage breadth (how many categories have rules) + engine diversity
    const categoryCount = Object.keys(ruleStats.byCategory).length;
    const engineCount = Object.keys(ruleStats.byEngine).length;
    const astRuleRatio = (ruleStats.byEngine['ast'] ?? 0) / Math.max(1, ruleStats.total);
    // Reward projects that use AST-level rules and have broad category coverage
    ruleCatalogScore = Math.min(100, Math.round(
      50
      + Math.min(20, categoryCount * 2)
      + Math.min(15, engineCount * 3)
      + Math.min(15, astRuleRatio * 30)
    ));
  } catch { /* rule-catalog not available, keep baseline */ }
  const ruleDuration = Math.round(performance.now() - ruleStart);
  categories.push({ name: 'Rules', icon: '📋', score: ruleCatalogScore, engines: ruleStats.total > 0 ? Object.keys(ruleStats.byEngine).length : 1, duration: ruleDuration });
  if (!opts.json) console.log(`        → ${ruleCatalogScore}/100 (${ruleStats.total} rules, ${Object.keys(ruleStats.byCategory).length} categories) ${ruleDuration}ms`);

  // Phase 3b: Shield Score (security checks — secret scan)
  if (!opts.json) console.log('  [Phase 3b] Shield 엔진...');
  const shieldStart = performance.now();
  let secretHits = 0;
  function scanSecrets(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { scanSecrets(p); continue; }
        if (!/\.(ts|tsx|js|jsx|json)$/.test(e.name) || e.name === 'package-lock.json') continue;
        try {
          const c = readFileSync(p, 'utf-8');
          if (/sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{30,}|password\s*=\s*["'][^"']{5,}["']/i.test(c)) secretHits++;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  scanSecrets(srcDir);
  const shieldScore = Math.max(0, 100 - secretHits * 25);
  const shieldDuration = Math.round(performance.now() - shieldStart);
  categories.push({ name: 'Shield', icon: '🛡️', score: shieldScore, engines: 6, duration: shieldDuration });
  if (!opts.json) console.log(`        → ${shieldScore}/100 ${shieldDuration}ms`);

  // Phase 4: Arch Score (structure)
  if (!opts.json) console.log('  [Phase 4] Arch 엔진...');
  const archStart = performance.now();
  let partCount = 0;
  let sealCount = 0;
  function scanStructure(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { scanStructure(p); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        try {
          const c = readFileSync(p, 'utf-8');
          partCount += (c.match(/\/\/ PART \d/g) ?? []).length;
          sealCount += (c.match(/IDENTITY_SEAL/g) ?? []).length;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  scanStructure(srcDir);
  const archScore = Math.min(100, 60 + Math.min(20, partCount) + Math.min(20, sealCount));
  const archDuration = Math.round(performance.now() - archStart);
  categories.push({ name: 'Arch', icon: '🏗️', score: archScore, engines: 3, duration: archDuration });
  if (!opts.json) console.log(`        → ${archScore}/100 (${partCount} PARTs, ${sealCount} SEALs) ${archDuration}ms`);

  // Phase 5: Security Score (security-engine)
  if (!opts.json) console.log('  [Phase 5] Shield 엔진 (심층)...');
  const shieldDeepStart = performance.now();
  try {
    const { runFullSecurityAnalysis } = require('../adapters/security-engine');
    const secResult = await runFullSecurityAnalysis(process.cwd());
    // Override shield score with deep analysis if available — shield is at index after Rules
    const shieldIdx = categories.findIndex(c => c.name === 'Shield');
    if (secResult.avgScore > 0 && shieldIdx >= 0) {
      categories[shieldIdx] = { ...categories[shieldIdx], score: secResult.avgScore, engines: secResult.engines, duration: Math.round(performance.now() - shieldDeepStart) };
      if (!opts.json) console.log(`        → ${secResult.avgScore}/100 (${secResult.engines} engines) ${categories[shieldIdx].duration}ms`);
    }
  } catch {
    if (!opts.json) console.log('        → 기본 스캔 유지 (보안 도구 미설치)');
  }

  // Phase 6: Test Score (test-engine)
  if (!opts.json) console.log('  [Phase 6] Test 엔진...');
  const testStart = performance.now();
  try {
    const { runFullTestAnalysis } = require('../adapters/test-engine');
    const testResult = await runFullTestAnalysis(process.cwd());
    categories.push({ name: 'Test', icon: '🧪', score: testResult.avgScore, engines: testResult.engines, duration: Math.round(performance.now() - testStart) });
    if (!opts.json) console.log(`        → ${testResult.avgScore}/100 (${testResult.engines} engines) ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Test', icon: '🧪', score: 0, engines: 0, duration: 0 });
    if (!opts.json) console.log('        → 테스트 없음');
  }

  // Phase 7: Perf Score (perf-engine)
  if (!opts.json) console.log('  [Phase 7] Perf 엔진...');
  const perfStart = performance.now();
  try {
    const { runFullPerfAnalysis } = require('../adapters/perf-engine');
    const perfResult = await runFullPerfAnalysis(process.cwd());
    categories.push({ name: 'Turbo', icon: '⚡', score: perfResult.avgScore, engines: perfResult.engines, duration: Math.round(performance.now() - perfStart) });
    if (!opts.json) console.log(`        → ${perfResult.avgScore}/100 ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Turbo', icon: '⚡', score: 0, engines: 0, duration: 0 });
    if (!opts.json) console.log('        → 성능 측정 불가');
  }

  // Phase 8: Dependency Score (dep-analyzer)
  if (!opts.json) console.log('  [Phase 8] Dep 엔진...');
  const depStart = performance.now();
  try {
    const { runFullDepAnalysis } = require('../adapters/dep-analyzer');
    const depResult = await runFullDepAnalysis(process.cwd());
    categories.push({ name: 'Deps', icon: '📦', score: depResult.avgScore, engines: depResult.engines, duration: Math.round(performance.now() - depStart) });
    if (!opts.json) console.log(`        → ${depResult.avgScore}/100 (${depResult.engines} engines) ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Deps', icon: '📦', score: 0, engines: 0, duration: 0 });
    if (!opts.json) console.log('        → 의존성 분석 불가');
  }

  // Phase 9: Web Quality (a11y + bundle)
  if (!opts.json) console.log('  [Phase 9] Web 엔진...');
  const webStart = performance.now();
  try {
    const { runFullWebQualityAnalysis } = require('../adapters/web-quality');
    const webResult = await runFullWebQualityAnalysis(process.cwd());
    categories.push({ name: 'Web', icon: '🌐', score: webResult.avgScore, engines: webResult.engines, duration: Math.round(performance.now() - webStart) });
    if (!opts.json) console.log(`        → ${webResult.avgScore}/100 (${webResult.engines} engines) ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Web', icon: '🌐', score: 0, engines: 0, duration: 0 });
    if (!opts.json) console.log('        → 웹 분석 불가');
  }

  // ============================================================
  // PART 3 — Score Calculation & Output
  // ============================================================

  const totalDuration = Math.round(performance.now() - startTime);
  const weights = categories.map(() => 1 / categories.length);
  const weightedScore = Math.round(categories.reduce((s, c, i) => s + c.score * weights[i], 0));
  const totalEngines = categories.reduce((s, c) => s + c.engines, 0);
  const csScore = weightedScore;

  // Save to history
  const historyPath = join(process.cwd(), '.cs', 'playground-history.json');
  let history: PlaygroundHistoryEntry[] = [];
  try {
    const csDir = join(process.cwd(), '.cs');
    if (!existsSync(csDir)) mkdirSync(csDir, { recursive: true });
    if (existsSync(historyPath)) {
      history = JSON.parse(readFileSync(historyPath, 'utf-8'));
    }
  } catch { /* skip */ }

  const currentEntry: PlaygroundHistoryEntry = {
    timestamp: new Date().toISOString(),
    score: csScore,
    categories: categories.map(c => ({ name: c.name, score: c.score })),
    metrics: astMetrics,
  };
  history.push(currentEntry);
  // Keep last 50 entries
  if (history.length > 50) history = history.slice(-50);
  try { writeFileSync(historyPath, JSON.stringify(history, null, 2)); } catch { /* skip */ }

  // JSON output mode for CI integration
  if (opts.json) {
    const previousEntry = history.length > 1 ? history[history.length - 2] : null;
    const jsonOutput = {
      score: csScore,
      totalEngines,
      durationMs: totalDuration,
      categories: categories.map(c => ({ name: c.name, score: c.score, engines: c.engines, durationMs: c.duration })),
      astMetrics,
      ruleStats,
      comparison: previousEntry ? {
        previousScore: previousEntry.score,
        delta: csScore - previousEntry.score,
        previousTimestamp: previousEntry.timestamp,
        categoryDeltas: categories.map(c => {
          const prev = previousEntry.categories.find(pc => pc.name === c.name);
          return { name: c.name, current: c.score, previous: prev?.score ?? null, delta: prev ? c.score - prev.score : null };
        }),
      } : null,
      timestamp: currentEntry.timestamp,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  // Display
  console.log('\n  ┌─────────────────────────────────────┐');
  console.log('  │                                     │');
  for (const cat of categories) {
    const bar = '█'.repeat(Math.round(cat.score / 5)) + '░'.repeat(20 - Math.round(cat.score / 5));
    console.log(`  │  ${cat.icon} ${cat.name.padEnd(10)} ${bar} ${cat.score.toString().padStart(3)}  │`);
  }
  console.log('  │                                     │');
  console.log(`  │  🦔 CS SCORE: ${csScore.toString().padStart(6)}              │`);
  console.log(`  │  ${totalEngines} engines | ${totalDuration}ms | $0      │`);
  console.log('  │                                     │');
  console.log('  └─────────────────────────────────────┘');

  // History comparison
  const previousEntry = history.length > 1 ? history[history.length - 2] : null;
  if (previousEntry) {
    const delta = csScore - previousEntry.score;
    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '=';
    const sign = delta > 0 ? '+' : '';
    console.log(`\n  📊 이전 실행 대비: ${arrow} ${sign}${delta} (${previousEntry.score} → ${csScore})`);
    // Show per-category deltas for changed categories
    const changedCats = categories
      .map(c => {
        const prev = previousEntry.categories.find(pc => pc.name === c.name);
        return prev && prev.score !== c.score ? { name: c.name, prev: prev.score, cur: c.score, d: c.score - prev.score } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (changedCats.length > 0) {
      for (const ch of changedCats) {
        const s = ch.d > 0 ? '+' : '';
        console.log(`     ${ch.name}: ${ch.prev} → ${ch.cur} (${s}${ch.d})`);
      }
    }
  }

  // Quill mood
  try {
    const { getQuillMood } = require('./fun');
    console.log(getQuillMood(weightedScore));
  } catch { /* skip */ }

  // Session recording
  try {
    const { recordCommand, recordScore } = require('../core/session');
    recordCommand('playground');
    recordScore('playground', weightedScore);
  } catch { /* skip */ }

  // --challenge: show challenges
  if (opts.challenge) {
    try {
      const { evaluateChallenges } = require('../core/badges');
      const challenges = evaluateChallenges();
      console.log('  🎮 챌린지:\n');
      for (const c of challenges) {
        const pct = Math.round((c.progress / Math.max(1, c.total)) * 100);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        console.log(`    ${c.challenge.icon} ${c.challenge.name} [${bar}] ${c.progress}/${c.total}`);
        console.log(`       ${c.challenge.description}\n`);
      }
    } catch { /* skip */ }
  }

  // --share: generate share card
  if (opts.share) {
    try {
      const { generateShareCard, generateReadmeBadge, evaluateBadges } = require('../core/badges');
      const { allEarned } = evaluateBadges();
      const badgeIcons = BADGES_LIST.filter(b => allEarned.includes(b.id)).map(b => b.icon);
      const projectName = process.cwd().split('/').pop() ?? 'project';
      console.log('\n' + generateShareCard(projectName, weightedScore, badgeIcons));
      console.log('\n  README 뱃지:');
      console.log(`  ${generateReadmeBadge(projectName, weightedScore)}\n`);
    } catch { /* skip */ }
  }

  // Check for new badges
  try {
    const { evaluateBadges: evalBadges } = require('../core/badges');
    const { newBadges } = evalBadges();
    if (newBadges.length > 0) {
      console.log('  🏆 새 뱃지 획득!');
      for (const b of newBadges) {
        console.log(`     ${b.icon} ${b.name} — ${b.description}`);
      }
      console.log('');
    }
  } catch { /* skip */ }
}

// IDENTITY_SEAL: PART-3 | role=score-output-history | inputs=categories,opts | outputs=console,json,history

// ============================================================
// PART 4 — Constants
// ============================================================

// Needed for --share
const BADGES_LIST = [
  { id: 'first-blood', icon: '✨' }, { id: 'guardian', icon: '🛡️' }, { id: 'clean-code', icon: '🧹' },
  { id: 'sub-10', icon: '⚡' }, { id: 'top-10', icon: '🔥' }, { id: 'improver', icon: '📈' },
  { id: 'streak-5', icon: '🎯' }, { id: 'streak-10', icon: '💎' }, { id: 'centurion', icon: '💯' }, { id: 'perfect', icon: '🌟' },
];

// Export internal helpers for testing
export { computeASTMetrics, scoreASTMetrics };

// IDENTITY_SEAL: PART-4 | role=constants | inputs=none | outputs=BADGES_LIST
