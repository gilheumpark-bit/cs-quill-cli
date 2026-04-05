// ============================================================
// CS Quill 🦔 — cs playground command
// ============================================================
// 44엔진 풀벤치마크. 3DMark 스타일 코드 점수.

// Verify/Audit engines imported dynamically via @/lib/code-studio/* below

// ============================================================
// PART 1 — Category Scoring
// ============================================================

interface CategoryScore {
  name: string;
  icon: string;
  score: number;
  engines: number;
  duration: number;
}

// ============================================================
// PART 2 — Playground Runner
// ============================================================

interface PlaygroundOptions {
  full?: boolean;
  compare?: string;
  leaderboard?: boolean;
  challenge?: boolean;
  share?: boolean;
}

export async function runPlayground(opts: PlaygroundOptions): Promise<void> {
  console.log('🦔 CS Quill Playground — 코드 벤치마크 🎮\n');

  const startTime = performance.now();
  const categories: CategoryScore[] = [];

  // Phase 1: AST Score (via verify pipeline)
  console.log('  [Phase 1] AST 엔진...');
  const astStart = performance.now();
  // Lightweight: count files + functions as proxy
  const { readdirSync, readFileSync, _statSync } = await import('fs');
  const { join, _extname } = await import('path');

  let totalFiles = 0;
  let totalFunctions = 0;
  function countSrc(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { countSrc(p); continue; }
        if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
          totalFiles++;
          try {
            const c = readFileSync(p, 'utf-8');
            totalFunctions += (c.match(/(?:function\s+\w+|=>\s*\{)/g) ?? []).length;
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }
  countSrc(join(process.cwd(), 'src'));

  const astScore = Math.min(100, Math.round(70 + (totalFiles > 10 ? 15 : 0) + (totalFunctions > 30 ? 15 : 0)));
  categories.push({ name: 'AST', icon: '🔬', score: astScore, engines: 6, duration: Math.round(performance.now() - astStart) });
  console.log(`        → ${astScore}/100 (${totalFiles} files, ${totalFunctions} functions) ${categories[0].duration}ms`);

  // Phase 2: Quality Score (8-team pipeline)
  console.log('  [Phase 2] Quality 엔진...');
  const qualStart = performance.now();
  // Run pipeline on a sample of files
  const { runStaticPipeline } = await import('../core/pipeline-bridge');
  let qualScoreSum = 0;
  let qualCount = 0;
  function sampleVerify(dir: string, limit: number): void {
    if (qualCount >= limit) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (qualCount >= limit) return;
        if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { sampleVerify(p, limit); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        try {
          const code = readFileSync(p, 'utf-8');
          if (code.length < 50) continue;
          const result = await runStaticPipeline(code, 'typescript');
          qualScoreSum += result.overallScore;
          qualCount++;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  sampleVerify(join(process.cwd(), 'src'), 30);
  const qualityScore = qualCount > 0 ? Math.round(qualScoreSum / qualCount) : 50;
  categories.push({ name: 'Quality', icon: '🎯', score: qualityScore, engines: 6, duration: Math.round(performance.now() - qualStart) });
  console.log(`        → ${qualityScore}/100 (${qualCount} files sampled) ${categories[1].duration}ms`);

  // Phase 3: Shield Score (security checks)
  console.log('  [Phase 3] Shield 엔진...');
  const shieldStart = performance.now();
  // Quick secret scan
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
  scanSecrets(join(process.cwd(), 'src'));
  const shieldScore = Math.max(0, 100 - secretHits * 25);
  categories.push({ name: 'Shield', icon: '🛡️', score: shieldScore, engines: 6, duration: Math.round(performance.now() - shieldStart) });
  console.log(`        → ${shieldScore}/100 ${categories[2].duration}ms`);

  // Phase 4: Arch Score (structure)
  console.log('  [Phase 4] Arch 엔진...');
  const archStart = performance.now();
  // Check for PART/SEAL structure, circular deps potential
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
  scanStructure(join(process.cwd(), 'src'));
  const archScore = Math.min(100, 60 + Math.min(20, partCount) + Math.min(20, sealCount));
  categories.push({ name: 'Arch', icon: '🏗️', score: archScore, engines: 3, duration: Math.round(performance.now() - archStart) });
  console.log(`        → ${archScore}/100 (${partCount} PARTs, ${sealCount} SEALs) ${categories[3].duration}ms`);

  // Phase 5: Security Score (security-engine)
  console.log('  [Phase 5] Shield 엔진 (심층)...');
  const shieldDeepStart = performance.now();
  try {
    const { runFullSecurityAnalysis } = await import('../adapters/security-engine');
    const secResult = await runFullSecurityAnalysis(process.cwd());
    // Override shield score with deep analysis if available
    if (secResult.avgScore > 0) {
      categories[2] = { ...categories[2], score: secResult.avgScore, engines: secResult.engines, duration: Math.round(performance.now() - shieldDeepStart) };
      console.log(`        → ${secResult.avgScore}/100 (${secResult.engines} engines) ${categories[2].duration}ms`);
    }
  } catch {
    console.log('        → 기본 스캔 유지 (보안 도구 미설치)');
  }

  // Phase 6: Test Score (test-engine)
  console.log('  [Phase 6] Test 엔진...');
  const testStart = performance.now();
  try {
    const { runFullTestAnalysis } = await import('../adapters/test-engine');
    const testResult = await runFullTestAnalysis(process.cwd());
    categories.push({ name: 'Test', icon: '🧪', score: testResult.avgScore, engines: testResult.engines, duration: Math.round(performance.now() - testStart) });
    console.log(`        → ${testResult.avgScore}/100 (${testResult.engines} engines) ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Test', icon: '🧪', score: 0, engines: 0, duration: 0 });
    console.log('        → 테스트 없음');
  }

  // Phase 7: Perf Score (perf-engine)
  console.log('  [Phase 7] Perf 엔진...');
  const perfStart = performance.now();
  try {
    const { runFullPerfAnalysis } = await import('../adapters/perf-engine');
    const perfResult = await runFullPerfAnalysis(process.cwd());
    categories.push({ name: 'Turbo', icon: '⚡', score: perfResult.avgScore, engines: perfResult.engines, duration: Math.round(performance.now() - perfStart) });
    console.log(`        → ${perfResult.avgScore}/100 ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Turbo', icon: '⚡', score: 0, engines: 0, duration: 0 });
    console.log('        → 성능 측정 불가');
  }

  // Phase 8: Dependency Score (dep-analyzer)
  console.log('  [Phase 8] Dep 엔진...');
  const depStart = performance.now();
  try {
    const { runFullDepAnalysis } = await import('../adapters/dep-analyzer');
    const depResult = await runFullDepAnalysis(process.cwd());
    categories.push({ name: 'Deps', icon: '📦', score: depResult.avgScore, engines: depResult.engines, duration: Math.round(performance.now() - depStart) });
    console.log(`        → ${depResult.avgScore}/100 (${depResult.engines} engines) ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Deps', icon: '📦', score: 0, engines: 0, duration: 0 });
    console.log('        → 의존성 분석 불가');
  }

  // Phase 9: Web Quality (a11y + bundle)
  console.log('  [Phase 9] Web 엔진...');
  const webStart = performance.now();
  try {
    const { runFullWebQualityAnalysis } = await import('../adapters/web-quality');
    const webResult = await runFullWebQualityAnalysis(process.cwd());
    categories.push({ name: 'Web', icon: '🌐', score: webResult.avgScore, engines: webResult.engines, duration: Math.round(performance.now() - webStart) });
    console.log(`        → ${webResult.avgScore}/100 (${webResult.engines} engines) ${categories[categories.length - 1].duration}ms`);
  } catch {
    categories.push({ name: 'Web', icon: '🌐', score: 0, engines: 0, duration: 0 });
    console.log('        → 웹 분석 불가');
  }

  // Calculate total
  const totalDuration = Math.round(performance.now() - startTime);
  const weights = categories.map(() => 1 / categories.length); // Equal weights for all categories
  const weightedScore = Math.round(categories.reduce((s, c, i) => s + c.score * weights[i], 0));
  const totalEngines = categories.reduce((s, c) => s + c.engines, 0);
  const csScore = weightedScore; // 이미 0-100 범위, ×100 하면 안 됨

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

  // Quill mood
  const { getQuillMood } = await import('./fun');
  console.log(getQuillMood(weightedScore));

  // Session recording
  try {
    const { recordCommand, recordScore } = await import('../core/session');
    recordCommand('playground');
    recordScore('playground', weightedScore);
  } catch { /* skip */ }

  // --challenge: show challenges
  if (opts.challenge) {
    const { evaluateChallenges } = await import('../core/badges');
    const challenges = evaluateChallenges();
    console.log('  🎮 챌린지:\n');
    for (const c of challenges) {
      const pct = Math.round((c.progress / Math.max(1, c.total)) * 100);
      const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
      console.log(`    ${c.challenge.icon} ${c.challenge.name} [${bar}] ${c.progress}/${c.total}`);
      console.log(`       ${c.challenge.description}\n`);
    }
  }

  // --share: generate share card
  if (opts.share) {
    const { generateShareCard, generateReadmeBadge, evaluateBadges } = await import('../core/badges');
    const { allEarned } = evaluateBadges();
    const badgeIcons = BADGES_LIST.filter(b => allEarned.includes(b.id)).map(b => b.icon);
    const projectName = process.cwd().split('/').pop() ?? 'project';
    console.log('\n' + generateShareCard(projectName, weightedScore, badgeIcons));
    console.log('\n  README 뱃지:');
    console.log(`  ${generateReadmeBadge(projectName, weightedScore)}\n`);
  }

  // Check for new badges
  const { evaluateBadges: evalBadges } = await import('../core/badges');
  const { newBadges } = evalBadges();
  if (newBadges.length > 0) {
    console.log('  🏆 새 뱃지 획득!');
    for (const b of newBadges) {
      console.log(`     ${b.icon} ${b.name} — ${b.description}`);
    }
    console.log('');
  }
}

// Needed for --share
const BADGES_LIST = [
  { id: 'first-blood', icon: '✨' }, { id: 'guardian', icon: '🛡️' }, { id: 'clean-code', icon: '🧹' },
  { id: 'sub-10', icon: '⚡' }, { id: 'top-10', icon: '🔥' }, { id: 'improver', icon: '📈' },
  { id: 'streak-5', icon: '🎯' }, { id: 'streak-10', icon: '💎' }, { id: 'centurion', icon: '💯' }, { id: 'perfect', icon: '🌟' },
];

// IDENTITY_SEAL: PART-2 | role=playground-runner | inputs=opts | outputs=console
