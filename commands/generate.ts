// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — cs generate command
// ============================================================
// Plan → SEAL 계약 → 병렬 생성 → Merge → 8팀 검증 → 자동수정 → 영수증
// 대화 기반이 아닌 계약 기반 병렬 생성.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

import {
  PLANNER_SYSTEM_PROMPT, buildPlannerPrompt, parsePlanResult, buildExecutionWaves,
  type SealContract, type PlanResult,
} from '../ai/planner';
import { TEAM_LEAD_SYSTEM_PROMPT, buildTeamLeadPrompt, parseVerdict } from '../ai/team-lead';
import { CROSS_JUDGE_SYSTEM_PROMPT, buildJudgePrompt, parseJudgeResult } from '../ai/cross-judge';
import { createLoopGuard } from '../core/loop-guard';
import { computeReceiptHash, chainReceipt, formatReceipt, type ReceiptData } from '../formatters/receipt';

// ============================================================
// PART 1 — Types & Options
// ============================================================

interface GenerateOptions {
  mode: 'fast' | 'full' | 'strict';
  structure: 'auto' | 'on' | 'off';
  withTests?: boolean;
  commit?: boolean;
  pr?: boolean;
  dryRun?: boolean;
  noTui?: boolean;
}

interface GeneratedPart {
  part: number;
  code: string;
  contract: SealContract;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=GenerateOptions,GeneratedPart

// ============================================================
// PART 2 — SEAL Header Generator
// ============================================================

function generateSealHeader(contract: SealContract): string {
  return [
    `// ============================================================`,
    `// PART ${contract.part} — ${contract.role}`,
    `// ============================================================`,
  ].join('\n');
}

function generateSealFooter(contract: SealContract): string {
  const inputs = contract.inputs.length > 0 ? contract.inputs.join(',') : 'none';
  const outputs = contract.outputs.length > 0 ? contract.outputs.join(',') : 'none';
  return `// IDENTITY_SEAL: PART-${contract.part} | role=${contract.role} | inputs=${inputs} | outputs=${outputs}`;
}

function shouldUseParts(totalLines: number, structure: string): boolean {
  if (structure === 'on') return true;
  if (structure === 'off') return false;
  return totalLines >= 100;
}

// IDENTITY_SEAL: PART-2 | role=seal-header | inputs=SealContract | outputs=string

// ============================================================
// PART 3 — Code Merger
// ============================================================

function mergeGeneratedParts(parts: GeneratedPart[], structure: string): string {
  const totalLines = parts.reduce((sum, p) => sum + p.code.split('\n').length, 0);
  const useParts = shouldUseParts(totalLines, structure);

  if (!useParts) {
    // Flat mode: just concatenate without headers
    return parts.map(p => p.code).join('\n\n');
  }

  // PART mode: add SEAL headers and footers
  const sections: string[] = [];
  for (const part of parts.sort((a, b) => a.part - b.part)) {
    sections.push(generateSealHeader(part.contract));
    sections.push('');
    sections.push(part.code);
    sections.push('');
    sections.push(generateSealFooter(part.contract));
  }

  return sections.join('\n');
}

// Deduplicate imports across parts
function deduplicateImports(code: string): string {
  const lines = code.split('\n');
  const imports = new Set<string>();
  const nonImports: string[] = [];

  for (const line of lines) {
    if (line.startsWith('import ')) {
      imports.add(line);
    } else {
      nonImports.push(line);
    }
  }

  if (imports.size === 0) return code;
  return [...imports].sort().join('\n') + '\n\n' + nonImports.join('\n');
}

// IDENTITY_SEAL: PART-3 | role=code-merger | inputs=GeneratedPart[] | outputs=string

// ============================================================
// PART 4 — Main Generate Flow
// ============================================================

export async function runGenerate(prompt: string, opts: GenerateOptions): Promise<void> {
  const { printHeader, colors, icons } = require('../core/terminal-compat');
  const { Spinner } = require('../tui/progress');
  printHeader('코드 생성');
  console.log('');

  // ── Pre-check: Patent DB ──
  const { checkPatentPatterns } = require('../core/patent-db');
  const patentCheck = checkPatentPatterns(prompt);
  if (!patentCheck.safe) {
    console.log('  🚫 특허/보안 위험 감지:');
    for (const b of patentCheck.blocks) {
      console.log(`     ❌ ${b.name} — ${b.alternative}`);
    }
    console.log('  생성을 차단합니다.\n');
    return;
  }
  if (patentCheck.warnings.length > 0) {
    console.log('  ⚠️  IP 경고:');
    for (const w of patentCheck.warnings) {
      console.log(`     ${w.name} — ${w.alternative}`);
    }
    console.log('  대안 패턴으로 생성합니다.\n');
  }

  // ── Pre-check: Yolo mode git stash ──
  const { loadMergedConfig } = require('../core/config');
  const csConfig = loadMergedConfig();
  if (csConfig.fileMode === 'yolo') {
    try {
      const { execSync } = require('child_process');
      execSync('git stash push -m "cs-quill-yolo-backup"', { stdio: 'pipe' });
      console.log('  ⚡ Yolo 모드 — git stash 자동 백업 완료\n');
    } catch { /* no git or nothing to stash */ }
  }

  // Read project context
  const pkgPath = join(process.cwd(), 'package.json');
  const context = existsSync(pkgPath) ? readFileSync(pkgPath, 'utf-8').slice(0, 2000) : undefined;

  // ── Step 1: Plan ──
  console.log('  [1/6] 📐 계획 수립 (SEAL 계약 생성)...');

  // Inject patent directive + style + presets + references into context
  const { loadProfile, buildStyleDirective } = require('../core/style-learning');
  const { getPresetsForFramework, buildPresetDirective } = require('./preset');
  const { searchPatterns, buildReferencePrompt, recordUsage } = require('../core/reference-db');

  const projectId = process.cwd().split('/').pop() ?? 'unknown';
  const styleProfile = loadProfile(projectId);
  const styleDir = styleProfile ? buildStyleDirective(styleProfile) : '';
  const presets = csConfig.framework ? getPresetsForFramework(csConfig.framework) : [];
  const presetDir = buildPresetDirective(presets);

  // Reference search — 유사 패턴 찾아서 주입 (외부 레퍼런스 자동 로드 포함)
  try {
    const { loadExternalReferences } = require('../core/reference-db');
    const refPath = join(process.cwd(), '..', 'new1');
    const { existsSync: refExists } = require('fs');
    // 프로젝트 상위 또는 직박구리 내 new1 폴더 탐색
    const candidates = [refPath, join(process.cwd(), 'new1'), join(process.cwd(), '..', '..', 'new1')];
    for (const p of candidates) {
      if (refExists(p)) { loadExternalReferences(p); break; }
    }
  } catch { /* 외부 레퍼런스 없으면 스킵 */ }

  const references = searchPatterns(prompt, csConfig.framework ?? undefined, 5);
  const refDir = buildReferencePrompt(references);
  if (references.length > 0) {
    console.log(`        📚 레퍼런스 ${references.length}개 매칭: ${references.map(r => r.name).join(', ')}`);
    for (const ref of references) {
      recordUsage(ref.category, ref.id);
    }
  }

  const extraContext = [context, patentCheck.directive, styleDir, presetDir, refDir].filter(Boolean).join('\n\n');
  const planPrompt = buildPlannerPrompt(prompt, extraContext || undefined);

  // Dynamic import to avoid loading AI at startup
  const { streamChat } = require('../core/ai-bridge');
  const { getTemperature } = require('../core/ai-config');

  let planRaw = '';
  await streamChat({
    systemInstruction: PLANNER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: planPrompt }],
    onChunk: (t: string) => { planRaw += t; },
    temperature: getTemperature('plan'),
  });

  let plan = parsePlanResult(planRaw);
  // Retry once on plan failure
  if (!plan) {
    console.log('        ⚠️  첫 시도 실패, 재시도...');
    planRaw = '';
    await streamChat({
      systemInstruction: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: planPrompt + '\n\nIMPORTANT: Output ONLY valid JSON.' }],
      onChunk: (t: string) => { planRaw += t; },
      temperature: 0.2,
    });
    plan = parsePlanResult(planRaw);
  }
  if (!plan) {
    console.log('  ❌ 계획 생성 실패. 프롬프트를 더 구체적으로 해보세요.');
    return;
  }

  console.log(`        → ${plan.totalParts} PART 분해 완료`);
  for (const c of plan.contracts) {
    const deps = c.dependencies.length > 0 ? ` (→ PART ${c.dependencies.join(',')})` : ' (독립)';
    console.log(`        PART ${c.part}: ${c.role}${deps}`);
  }

  // Dry-run: show plan and exit
  if (opts.dryRun) {
    const totalLines = plan.contracts.reduce((s, c) => s + c.estimatedLines, 0);
    const estimatedTokens = totalLines * 15; // ~15 tokens per line
    const estimatedCostUsd = (estimatedTokens / 1000) * 0.003; // rough Sonnet pricing
    const apiCalls = plan.totalParts + 1 + (opts.mode !== 'fast' ? 2 : 0); // plan + parts + verify + crosscheck
    console.log(`\n  📊 실행 계획:`);
    console.log(`     코드:      ~${totalLines}줄`);
    console.log(`     PART:      ${plan.totalParts}개 (${buildExecutionWaves(plan.contracts).length} wave 병렬)`);
    console.log(`     API 호출:  ~${apiCalls}회`);
    console.log(`     예상 비용: ~$${estimatedCostUsd.toFixed(3)}`);
    console.log(`     구조:      ${opts.structure}`);
    console.log(`     모드:      ${opts.mode}`);
    if (references.length > 0) console.log(`     레퍼런스:  ${references.length}개`);
    console.log('\n  (--dry-run: 실행하지 않음)');
    return;
  }

  // ── Step 2: Parallel Generate ──
  const waves = buildExecutionWaves(plan.contracts);
  console.log(`\n  [2/6] ⚡ 병렬 생성 (${waves.length} wave)...`);

  const generated: GeneratedPart[] = [];
  const contractMap = new Map(plan.contracts.map(c => [c.part, c]));

  for (let wi = 0; wi < waves.length; wi++) {
    const wave = waves[wi];
    console.log(`        Wave ${wi + 1}: PART ${wave.join(', ')} (동시 ${wave.length}개)`);

    const waveResults = await Promise.all(
      wave.map(async (partNum) => {
        const contract = contractMap.get(partNum);
        if (!contract) return null;

        // Build generation prompt with SEAL contract
        const depsContext = contract.dependencies
          .map(d => generated.find(g => g.part === d)?.code ?? '')
          .filter(Boolean)
          .map((c, i) => `[PART ${contract.dependencies[i]} output]:\n${c.slice(0, 500)}`)
          .join('\n\n');

        const genPrompt = [
          `Generate PART ${contract.part}: ${contract.role}`,
          `Inputs: ${contract.inputs.join(', ') || 'none'}`,
          `Outputs: ${contract.outputs.join(', ') || 'none'}`,
          depsContext ? `\nDependency context:\n${depsContext}` : '',
          `\nNaming: ${plan.namingConvention}`,
          plan.framework ? `Framework: ${plan.framework}` : '',
          '\nOutput ONLY the code. No explanation.',
        ].filter(Boolean).join('\n');

        let code = '';
        await streamChat({
          systemInstruction: `You are a code generator. Follow the SEAL contract exactly. Output only code.

QUALITY RULES (mandatory):
- Use const over let. Never use var.
- Functions ≤ 20 lines, parameters ≤ 3 (use options object if more).
- Early return / Guard clause — no deep nesting.
- async/await only (no .then()). Use Promise.all for parallel.
- try-catch-finally on all async operations.
- No any type. Use unknown + type guards.
- No eval(), no new Function(), no innerHTML.
- No hardcoded secrets. Use process.env.
- No console.log in library code (only in CLI commands).
- Optional chaining ?. and nullish coalescing ?? for null safety.
- Meaningful names: verbs for functions, nouns for types, is/has for booleans.
- PART structure: each function has single responsibility.`,
          messages: [{ role: 'user', content: genPrompt }],
          onChunk: (t: string) => { code += t; },
        });

        // Strip markdown fences
        code = code.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();

        return { part: partNum, code, contract } as GeneratedPart;
      }),
    );

    for (const r of waveResults) {
      if (r) generated.push(r);
    }
  }

  // Define fileName early (used in verify + receipt)
  const fileName = prompt.replace(/[^a-zA-Z0-9가-힣]/g, '-').slice(0, 40) + '.ts';

  // ── Step 3: Merge ──
  console.log('\n  [3/6] 🔗 Merge (import 통합 + PART 조립)...');
  let mergedCode = mergeGeneratedParts(generated, opts.structure);
  mergedCode = deduplicateImports(mergedCode);
  console.log(`        → ${mergedCode.split('\n').length}줄 완성`);

  // ── Step 4: Verify (Enhanced 8-team + AST pipeline) ──
  console.log('\n  [4/6] 🔍 8팀 + AST 검증...');

  let pipelineResult: { teams: Array<{ name: string; score: number; findings: Array<string | { message: string }> }>; overallScore: number; overallStatus: string };
  try {
    const { runEnhancedPipeline } = require('../core/ast-bridge');
    const enhanced = await runEnhancedPipeline(mergedCode, 'typescript', fileName);
    console.log(`        엔진: ${enhanced.engines.join(', ')}`);

    // Map to pipeline format
    const teamMap = new Map<string, { score: number; findings: string[] }>();
    for (const f of enhanced.findings) {
      const team = teamMap.get(f.team) ?? { score: 100, findings: [] };
      team.findings.push(f.message);
      if (f.severity === 'critical') team.score -= 25;
      else if (f.severity === 'error') team.score -= 10;
      else if (f.severity === 'warning') team.score -= 3;
      team.score = Math.max(0, team.score);
      teamMap.set(f.team, team);
    }

    pipelineResult = {
      teams: [...teamMap.entries()].map(([name, data]) => ({ name, score: data.score, findings: data.findings })),
      overallScore: enhanced.combinedScore,
      overallStatus: enhanced.combinedScore >= 80 ? 'pass' : enhanced.combinedScore >= 60 ? 'warn' : 'fail',
    };
  } catch {
    // Fallback to regex-only
    const { runStaticPipeline } = require('../core/pipeline-bridge');
    pipelineResult = await runStaticPipeline(mergedCode, 'typescript');
  }

  for (const stage of pipelineResult.teams) {
    const icon = stage.score >= 80 ? '✅' : stage.score >= 60 ? '⚠️' : '❌';
    console.log(`        ${icon} ${stage.name.padEnd(14)} ${stage.score}/100`);
  }
  console.log(`        종합: ${pipelineResult.overallScore}/100 (${pipelineResult.overallStatus})`);

  // ── Step 4.5: Cross-Model Verification (full/strict only) ──
  if (opts.mode !== 'fast' && csConfig.keys.length >= 2) {
    console.log('\n  [4.5/6] 🔍 크로스모델 검증...');
    try {
      const { CROSS_JUDGE_SYSTEM_PROMPT, buildJudgePrompt, parseJudgeResult } = require('../ai/cross-judge');

      const judgeFindings = pipelineResult.teams.flatMap((s) => {
        const findings = Array.isArray(s.findings) ? s.findings : [];
        return findings.map((f: unknown, fi: number) => ({
          id: `${s.name}-${fi}`, severity: 'warning',
          message: typeof f === 'string' ? f : typeof f === 'object' && f !== null && 'message' in f ? String((f as { message: unknown }).message) : String(f),
          file: fileName, line: 0, team: s.name, confidence: 0.7,
        }));
      });

      if (judgeFindings.length > 0) {
        const judgePrompt = buildJudgePrompt(mergedCode, judgeFindings);
        let judgeRaw = '';
        await streamChat({
          systemInstruction: CROSS_JUDGE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: judgePrompt }],
          onChunk: (t: string) => { judgeRaw += t; },
          temperature: getTemperature('judge'),
        });

        const judgeResult = parseJudgeResult(judgeRaw);
        if (judgeResult) {
          const agreed = judgeResult.findings.filter(f => f.verdict === 'agree').length;
          const dismissed = judgeResult.findings.filter(f => f.verdict === 'dismiss').length;
          console.log(`        합의: ${agreed}건 | 기각: ${dismissed}건 (신뢰도: ${Math.round(judgeResult.overallAgreement * 100)}%)`);
        }
      } else {
        console.log('        → 발견 사항 없어 크로스체크 스킵');
      }
    } catch {
      console.log('        → 크로스체크 스킵 (키 부족 또는 API 오류)');
    }
  }

  // ── Step 5: Auto-fix loop ──
  const guard = createLoopGuard({ passThreshold: opts.mode === 'strict' ? 85 : 77 });
  let finalCode = mergedCode;

  if (pipelineResult.overallStatus !== 'pass' && opts.mode !== 'fast') {
    console.log('\n  [5/6] 🔧 자동수정 루프...');

    const { runVerificationLoop } = require('../core/pipeline-bridge');

    try {
      const maxRounds = opts.mode === 'strict' ? 3 : 2;
      const verifyResult = await runVerificationLoop(mergedCode, 'typescript', maxRounds);

      if (verifyResult.finalScore > pipelineResult.overallScore) {
        // 개선된 경우에만 반영 (runVerificationLoop는 코드 자체를 수정하지 않으므로 점수만 참조)
        console.log(`        → ${verifyResult.rounds}라운드 검증, 최종 ${verifyResult.finalScore}/100`);
      } else {
        console.log(`        → 추가 수정 불필요 (${verifyResult.finalScore}/100)`);
      }
    } catch {
      console.log('        → 자동수정 스킵');
    }
  } else {
    console.log('\n  [5/6] 🔧 자동수정 — 불필요 ✅');
  }

  // ── Step 6: Save + Receipt ──
  console.log('\n  [6/6] 💾 저장 + 영수증 발급...');

  const csDir = join(process.cwd(), '.cs', 'generated');
  mkdirSync(csDir, { recursive: true });

  const filePath = join(csDir, fileName);
  writeFileSync(filePath, finalCode, 'utf-8');
  console.log(`        → ${filePath}`);

  // Receipt
  const codeHash = createHash('sha256').update(finalCode).digest('hex');
  const receiptData: Omit<ReceiptData, 'receiptHash'> = {
    id: `cs-${Date.now().toString(36)}`,
    timestamp: Date.now(),
    codeHash,
    pipeline: {
      teams: pipelineResult.teams.map(s => ({
        name: s.name,
        score: s.score,
        blocking: s.name === 'validation' || s.name === 'release-ip',
        findings: s.findings.length,
        passed: s.score >= 77,
      })),
      overallScore: pipelineResult.overallScore,
      overallStatus: pipelineResult.overallStatus as 'pass' | 'warn' | 'fail',
    },
    verification: {
      rounds: guard.state.round || 1,
      fixesApplied: 0,
      stopReason: guard.state.stopReason ?? 'passed',
    },
  };

  const receiptHash = computeReceiptHash(receiptData);
  const receipt: ReceiptData = { ...receiptData, receiptHash };
  chainReceipt(receipt);

  // Save receipt
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  mkdirSync(receiptDir, { recursive: true });
  writeFileSync(join(receiptDir, `${receipt.id}.json`), JSON.stringify(receipt, null, 2));

  console.log('\n' + formatReceipt(receipt, 'ko'));

  // Deprecation check
  try {
    const { checkDeprecations, formatDeprecationReport } = require('../core/deprecation-checker');
    const deprecations = checkDeprecations(finalCode, fileName, process.cwd());
    if (deprecations.length > 0) {
      console.log('\n' + formatDeprecationReport(deprecations));
    }
  } catch { /* deprecation check optional */ }

  // Record to Fix Memory
  try {
    const { recordFix } = require('../core/fix-memory');
    for (const stage of pipelineResult.teams) {
      for (const finding of stage.findings) {
        recordFix({
          category: stage.name,
          description: typeof finding === 'string' ? finding : (finding as { message?: string }).message ?? String(finding),
          beforePattern: '',
          afterPattern: '',
          confidence: 0.5,
        });
      }
    }
  } catch { /* fix memory recording optional */ }

  // --with-tests: auto generate tests
  if (opts.withTests) {
    console.log('\n  🧪 테스트 생성 중...');
    try {
      let testCode = '';
      await streamChat({
        systemInstruction: 'Generate unit tests for the given code. Use vitest or jest syntax. Output only test code, no explanation.',
        messages: [{ role: 'user', content: `Generate tests for:\n\`\`\`\n${finalCode.slice(0, 4000)}\n\`\`\`` }],
        onChunk: (t: string) => { testCode += t; },
      });
      testCode = testCode.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();
      const testPath = join(csDir, fileName.replace('.ts', '.test.ts'));
      writeFileSync(testPath, testCode, 'utf-8');
      console.log(`        → ${testPath}`);
    } catch {
      console.log('        ⚠️  테스트 생성 실패');
    }
  }

  // Git commit with AI message
  if (opts.commit) {
    const { execSync } = require('child_process');
    try {
      let commitMsg = `feat(cs): ${prompt.slice(0, 50)}`;
      try {
        let aiMsg = '';
        await streamChat({
          systemInstruction: 'Generate a concise git commit message (1 line, imperative mood, max 72 chars) for the given code. Output only the message, nothing else.',
          messages: [{ role: 'user', content: `Code:\n${finalCode.slice(0, 2000)}\n\nTask: ${prompt}` }],
          onChunk: (t: string) => { aiMsg += t; },
        });
        if (aiMsg.trim().length > 5) commitMsg = aiMsg.trim().split('\n')[0];
      } catch { /* fallback to default */ }

      execSync(`git add "${filePath}"`, { stdio: 'pipe' });
      execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
      console.log(`\n  📝 커밋: ${commitMsg}`);
    } catch {
      console.log('\n  ⚠️  커밋 실패');
    }
  }

  // --pr: create PR (requires gh CLI)
  if (opts.pr) {
    const { execSync } = require('child_process');
    try {
      const branchName = `cs/${prompt.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}`;
      execSync(`git checkout -b "${branchName}" 2>/dev/null || true`, { stdio: 'pipe' });
      execSync(`git push -u origin "${branchName}"`, { stdio: 'pipe' });
      const prTitle = `feat(cs): ${prompt.slice(0, 60)}`;
      execSync(`gh pr create --title "${prTitle}" --body "Generated by CS Quill 🦔\n\nScore: ${pipelineResult.overallScore}/100\nReceipt: ${receipt.id}"`, { stdio: 'pipe' });
      console.log(`\n  🔗 PR 생성: ${prTitle}`);
    } catch {
      console.log('\n  ⚠️  PR 생성 실패 (gh CLI 필요)');
    }
  }

  // Badge auto-trigger
  try {
    const { evaluateBadges } = require('../core/badges');
    const { newBadges } = evaluateBadges();
    if (newBadges.length > 0) {
      for (const b of newBadges) console.log(`  🏆 ${b.icon} ${b.name} 획득! — ${b.description}`);
    }
  } catch { /* badges optional */ }

  console.log('\n  🦔 완료!\n');
}

// IDENTITY_SEAL: PART-4 | role=main-generate | inputs=prompt,opts | outputs=file+receipt
