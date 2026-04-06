// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill — cs generate command
// ============================================================
// Plan -> SEAL contract -> parallel generation -> Merge -> 8-team verify -> auto-fix -> receipt
// Contract-based parallel generation (not conversation-based).

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
  tokensUsed: number;
  retries: number;
  durationMs: number;
}

interface WaveProgress {
  waveIndex: number;
  totalWaves: number;
  partsInWave: number;
  partsCompleted: number;
  partsFailed: number;
}

interface TokenUsage {
  planTokens: number;
  generateTokens: number;
  verifyTokens: number;
  fixTokens: number;
  totalTokens: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=GenerateOptions,GeneratedPart,WaveProgress,TokenUsage

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
// PART 3 — Code Merger + Validation
// ============================================================

function mergeGeneratedParts(parts: GeneratedPart[], structure: string): string {
  // Sort by dependency order (part number, which respects topological order from planner)
  const sorted = [...parts].sort((a, b) => a.part - b.part);
  const totalLines = sorted.reduce((sum, p) => sum + p.code.split('\n').length, 0);
  const useParts = shouldUseParts(totalLines, structure);

  if (!useParts) {
    return sorted.map(p => p.code).join('\n\n');
  }

  // PART mode: add SEAL headers and footers
  const sections: string[] = [];
  for (const part of sorted) {
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
  const importLines: string[] = [];
  const nonImportLines: string[] = [];

  // Collect all import lines and track unique imports
  const importSet = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      // Normalize whitespace for dedup comparison
      const normalized = trimmed.replace(/\s+/g, ' ').trim();
      if (!importSet.has(normalized)) {
        importSet.add(normalized);
        importLines.push(line);
      }
    } else {
      nonImportLines.push(line);
    }
  }

  if (importLines.length === 0) return code;

  // Group imports: external (no ./ or ../) first, then relative
  const externalImports: string[] = [];
  const relativeImports: string[] = [];
  for (const imp of importLines) {
    if (imp.includes("'./") || imp.includes("'../") || imp.includes('"./' ) || imp.includes('"../')) {
      relativeImports.push(imp);
    } else {
      externalImports.push(imp);
    }
  }

  const sortedImports = [...externalImports.sort(), '', ...relativeImports.sort()].filter(
    (line, i, arr) => !(line === '' && (i === 0 || arr[i - 1] === ''))
  );

  return sortedImports.join('\n') + '\n\n' + nonImportLines.join('\n');
}

// Validate generated code for basic correctness
function validateGeneratedCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Bracket balance check
  const brackets: Record<string, number> = { '(': 0, '[': 0, '{': 0 };
  const closers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : '';
    const next = i < code.length - 1 ? code[i + 1] : '';

    // Track string context
    if (!inComment && !inLineComment) {
      if (!inString && (ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
        inString = true;
        stringChar = ch;
        continue;
      }
      if (inString && ch === stringChar && prev !== '\\') {
        inString = false;
        continue;
      }
    }

    // Track comments
    if (!inString && !inComment && !inLineComment && ch === '/' && next === '/') {
      inLineComment = true;
      continue;
    }
    if (inLineComment && ch === '\n') {
      inLineComment = false;
      continue;
    }
    if (!inString && !inLineComment && !inComment && ch === '/' && next === '*') {
      inComment = true;
      continue;
    }
    if (inComment && ch === '*' && next === '/') {
      inComment = false;
      i++; // skip the /
      continue;
    }

    if (inString || inComment || inLineComment) continue;

    if (ch in brackets) brackets[ch]++;
    if (ch in closers) brackets[closers[ch]]--;
  }

  if (brackets['('] !== 0) errors.push(`Unbalanced parentheses: ${brackets['(']} unclosed`);
  if (brackets['['] !== 0) errors.push(`Unbalanced square brackets: ${brackets['[']} unclosed`);
  if (brackets['{'] !== 0) errors.push(`Unbalanced curly braces: ${brackets['{']} unclosed`);

  // Check for unresolved imports (import from paths that look broken)
  const importLines = code.split('\n').filter(l => l.trim().startsWith('import '));
  for (const imp of importLines) {
    if (imp.includes("from ''") || imp.includes('from ""') || imp.includes('from \'\'')) {
      errors.push(`Empty import path: ${imp.trim().slice(0, 60)}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// IDENTITY_SEAL: PART-3 | role=code-merger | inputs=GeneratedPart[] | outputs=string

// ============================================================
// PART 3.5 — Dynamic Quality Rules from Good Pattern Catalog
// ============================================================

const { GOOD_PATTERN_CATALOG } = require('../core/good-pattern-catalog');

function buildQualityRulesFromCatalog(): string {
  const filtered = GOOD_PATTERN_CATALOG.filter(
    (p: { signal: string; confidence: string }) => p.signal === 'boost' && p.confidence === 'high',
  );

  const groups: Record<string, string[]> = {};
  for (const p of filtered) {
    const dim = p.quality as string;
    if (!groups[dim]) groups[dim] = [];
    groups[dim].push(`- ${p.title}`);
  }

  const sections: string[] = [];
  const order = ['Maintainability', 'Reliability', 'Security', 'Performance'];
  let count = 0;
  for (const dim of order) {
    const rules = groups[dim];
    if (!rules || rules.length === 0) continue;
    sections.push(`[${dim}]`);
    for (const rule of rules) {
      if (count >= 40) break;
      sections.push(rule);
      count++;
    }
    if (count >= 40) break;
  }

  return `QUALITY RULES (mandatory):\n${sections.join('\n')}`;
}

// IDENTITY_SEAL: PART-3.5 | role=quality-rules-builder | inputs=GOOD_PATTERN_CATALOG | outputs=string

// ============================================================
// PART 3.7 — Parallel Generation with Error Recovery
// ============================================================

async function generatePartWithRetry(
  contract: SealContract,
  genPrompt: string,
  streamChat: Function,
  qualityRules: string,
  maxRetries: number,
): Promise<{ code: string; tokensUsed: number; retries: number; durationMs: number }> {
  let retries = 0;
  let lastError: string = '';
  const startTime = Date.now();

  while (retries <= maxRetries) {
    try {
      let code = '';
      let tokensUsed = 0;

      const prompt = retries === 0
        ? genPrompt
        : [
            genPrompt,
            `\n\nPREVIOUS ATTEMPT FAILED: ${lastError}`,
            retries >= 2 ? '\nSIMPLIFIED MODE: Generate minimal working code. Skip edge cases.' : '',
          ].filter(Boolean).join('\n');

      await streamChat({
        systemInstruction: `You are a code generator. Follow the SEAL contract exactly. Output only code.\n\n${qualityRules}`,
        messages: [{ role: 'user', content: prompt }],
        onChunk: (t: string) => {
          code += t;
          tokensUsed += Math.ceil(t.length / 4); // approximate token count
        },
      });

      // Strip markdown fences
      code = code.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();

      // Validate generated code
      const validation = validateGeneratedCode(code);
      if (!validation.valid && retries < maxRetries) {
        lastError = validation.errors.join('; ');
        retries++;
        continue;
      }

      return { code, tokensUsed, retries, durationMs: Date.now() - startTime };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      retries++;
      if (retries > maxRetries) {
        // Return fallback comment block instead of crashing
        const fallbackCode = [
          `// PART ${contract.part}: ${contract.role}`,
          `// GENERATION FAILED after ${retries} attempts: ${lastError.slice(0, 100)}`,
          `// TODO: Implement manually`,
          `throw new Error('PART ${contract.part} generation failed -- manual implementation required');`,
        ].join('\n');
        return { code: fallbackCode, tokensUsed: 0, retries, durationMs: Date.now() - startTime };
      }
    }
  }

  // Should not reach here, but safety fallback
  return { code: `// PART ${contract.part}: generation failed`, tokensUsed: 0, retries, durationMs: Date.now() - startTime };
}

function reportWaveProgress(progress: WaveProgress, colors: any): void {
  const pct = Math.round((progress.partsCompleted / progress.partsInWave) * 100);
  const bar = '='.repeat(Math.floor(pct / 5)).padEnd(20, '-');
  const failMsg = progress.partsFailed > 0 ? ` (${progress.partsFailed} failed)` : '';
  console.log(`        Wave ${progress.waveIndex + 1}/${progress.totalWaves} [${bar}] ${pct}% (${progress.partsCompleted}/${progress.partsInWave})${failMsg}`);
}

// IDENTITY_SEAL: PART-3.7 | role=parallel-gen | inputs=SealContract,streamChat | outputs=GeneratedPart

// ============================================================
// PART 4 — Main Generate Flow
// ============================================================

export async function runGenerate(prompt: string, opts: GenerateOptions): Promise<void> {
  const { printHeader, colors, icons } = require('../core/terminal-compat');
  const { Spinner } = require('../tui/progress');
  printHeader('Code Generation');
  console.log('');

  // Token usage tracking
  const tokenUsage: TokenUsage = {
    planTokens: 0, generateTokens: 0, verifyTokens: 0, fixTokens: 0, totalTokens: 0,
  };

  // -- Pre-check: Patent DB --
  const { checkPatentPatterns } = require('../core/patent-db');
  const patentCheck = checkPatentPatterns(prompt);
  if (!patentCheck.safe) {
    console.log('  [BLOCKED] Patent/security risk detected:');
    for (const b of patentCheck.blocks) {
      console.log(`     X ${b.name} -- ${b.alternative}`);
    }
    console.log('  Generation blocked.\n');
    return;
  }
  if (patentCheck.warnings.length > 0) {
    console.log('  [WARNING] IP warnings:');
    for (const w of patentCheck.warnings) {
      console.log(`     ${w.name} -- ${w.alternative}`);
    }
    console.log('  Generating with alternative patterns.\n');
  }

  // -- Pre-check: Yolo mode git stash --
  const { loadMergedConfig } = require('../core/config');
  const csConfig = loadMergedConfig();
  if (csConfig.fileMode === 'yolo') {
    try {
      const { execSync } = require('child_process');
      execSync('git stash push -m "cs-quill-yolo-backup"', { stdio: 'pipe' });
      console.log('  [YOLO] git stash auto-backup complete\n');
    } catch { /* no git or nothing to stash */ }
  }

  // Read project context
  const pkgPath = join(process.cwd(), 'package.json');
  const context = existsSync(pkgPath) ? readFileSync(pkgPath, 'utf-8').slice(0, 2000) : undefined;

  // -- Step 1: Plan --
  console.log('  [1/6] Planning (SEAL contract generation)...');

  // Inject patent directive + style + presets + references into context
  const { loadProfile, buildStyleDirective } = require('../core/style-learning');
  const { getPresetsForFramework, buildPresetDirective } = require('./preset');
  const { searchPatterns, buildReferencePrompt, recordUsage } = require('../core/reference-db');

  const projectId = process.cwd().split('/').pop() ?? 'unknown';
  const styleProfile = loadProfile(projectId);
  const styleDir = styleProfile ? buildStyleDirective(styleProfile) : '';
  const presets = csConfig.framework ? getPresetsForFramework(csConfig.framework) : [];
  const presetDir = buildPresetDirective(presets);

  // Reference search -- load external references
  try {
    const { loadExternalReferences } = require('../core/reference-db');
    const refPath = join(process.cwd(), '..', 'new1');
    const { existsSync: refExists } = require('fs');
    const candidates = [refPath, join(process.cwd(), 'new1'), join(process.cwd(), '..', '..', 'new1')];
    for (const p of candidates) {
      if (refExists(p)) { loadExternalReferences(p); break; }
    }
  } catch { /* external references not available -- skip */ }

  const references = searchPatterns(prompt, csConfig.framework ?? undefined, 5);
  const refDir = buildReferencePrompt(references);
  if (references.length > 0) {
    console.log(`        References matched: ${references.length} -- ${references.map((r: any) => r.name).join(', ')}`);
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
    onChunk: (t: string) => {
      planRaw += t;
      tokenUsage.planTokens += Math.ceil(t.length / 4);
    },
    temperature: getTemperature('plan'),
  });

  let plan = parsePlanResult(planRaw);
  // Retry once on plan failure
  if (!plan) {
    console.log('        [RETRY] First attempt failed, retrying...');
    planRaw = '';
    await streamChat({
      systemInstruction: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: planPrompt + '\n\nIMPORTANT: Output ONLY valid JSON.' }],
      onChunk: (t: string) => {
        planRaw += t;
        tokenUsage.planTokens += Math.ceil(t.length / 4);
      },
      temperature: 0.2,
    });
    plan = parsePlanResult(planRaw);
  }
  if (!plan) {
    console.log('  [FAIL] Plan generation failed. Try a more specific prompt.');
    return;
  }

  console.log(`        -> ${plan.totalParts} PARTs decomposed`);
  for (const c of plan.contracts) {
    const deps = c.dependencies.length > 0 ? ` (-> PART ${c.dependencies.join(',')})` : ' (independent)';
    console.log(`        PART ${c.part}: ${c.role}${deps}`);
  }

  // Dry-run: show plan and exit
  if (opts.dryRun) {
    const totalLines = plan.contracts.reduce((s: number, c: SealContract) => s + c.estimatedLines, 0);
    const estimatedTokens = totalLines * 15;
    const estimatedCostUsd = (estimatedTokens / 1000) * 0.003;
    const waves = buildExecutionWaves(plan.contracts);
    const apiCalls = plan.totalParts + 1 + (opts.mode !== 'fast' ? 2 : 0);
    console.log(`\n  Execution Plan:`);
    console.log(`     Code:        ~${totalLines} lines`);
    console.log(`     PARTs:       ${plan.totalParts} (${waves.length} waves parallel)`);
    console.log(`     API calls:   ~${apiCalls}`);
    console.log(`     Est. cost:   ~$${estimatedCostUsd.toFixed(3)}`);
    console.log(`     Structure:   ${opts.structure}`);
    console.log(`     Mode:        ${opts.mode}`);
    if (references.length > 0) console.log(`     References:  ${references.length}`);
    console.log('\n  (--dry-run: not executed)');
    return;
  }

  // -- Step 2: Parallel Generate (wave-based) --
  const waves = buildExecutionWaves(plan.contracts);
  console.log(`\n  [2/6] Parallel generation (${waves.length} waves)...`);

  const generated: GeneratedPart[] = [];
  const contractMap = new Map(plan.contracts.map((c: SealContract) => [c.part, c]));
  const qualityRules = buildQualityRulesFromCatalog();
  const maxRetries = opts.mode === 'strict' ? 2 : 1;

  for (let wi = 0; wi < waves.length; wi++) {
    const wave = waves[wi];
    const waveProgress: WaveProgress = {
      waveIndex: wi, totalWaves: waves.length,
      partsInWave: wave.length, partsCompleted: 0, partsFailed: 0,
    };
    console.log(`        Wave ${wi + 1}/${waves.length}: PART ${wave.join(', ')} (${wave.length} concurrent)`);

    const waveResults = await Promise.all(
      wave.map(async (partNum: number) => {
        const contract = contractMap.get(partNum);
        if (!contract) return null;

        // Build generation prompt with SEAL contract + dependency context
        const depsContext = contract.dependencies
          .map((d: number) => generated.find(g => g.part === d)?.code ?? '')
          .filter(Boolean)
          .map((c: string, i: number) => `[PART ${contract.dependencies[i]} output]:\n${c.slice(0, 500)}`)
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

        const result = await generatePartWithRetry(contract, genPrompt, streamChat, qualityRules, maxRetries);

        waveProgress.partsCompleted++;
        if (result.retries > maxRetries) waveProgress.partsFailed++;
        tokenUsage.generateTokens += result.tokensUsed;

        // Progress report per PART completion
        if (wave.length > 1) {
          const pct = Math.round((waveProgress.partsCompleted / waveProgress.partsInWave) * 100);
          console.log(`          PART ${partNum} done (${pct}% of wave${result.retries > 0 ? `, ${result.retries} retries` : ''}, ${result.durationMs}ms)`);
        }

        return {
          part: partNum, code: result.code, contract,
          tokensUsed: result.tokensUsed, retries: result.retries,
          durationMs: result.durationMs,
        } as GeneratedPart;
      }),
    );

    for (const r of waveResults) {
      if (r) generated.push(r);
    }

    // Report wave summary
    reportWaveProgress(waveProgress, colors);
  }

  // Report generation stats
  const totalRetries = generated.reduce((s, g) => s + g.retries, 0);
  const totalGenMs = generated.reduce((s, g) => s + g.durationMs, 0);
  if (totalRetries > 0) {
    console.log(`        [NOTE] ${totalRetries} total retries across all PARTs`);
  }
  console.log(`        Generation time: ${totalGenMs}ms total`);

  // Define fileName early (used in verify + receipt)
  const fileName = prompt.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40) + '.ts';

  // -- Step 3: Merge --
  console.log('\n  [3/6] Merge (import dedup + PART assembly)...');
  let mergedCode = mergeGeneratedParts(generated, opts.structure);
  mergedCode = deduplicateImports(mergedCode);

  // Validate merged code
  const mergeValidation = validateGeneratedCode(mergedCode);
  if (!mergeValidation.valid) {
    console.log(`        [WARN] Merged code has issues:`);
    for (const err of mergeValidation.errors) {
      console.log(`          - ${err}`);
    }
  }

  console.log(`        -> ${mergedCode.split('\n').length} lines complete`);

  // -- Step 4: Verify (Enhanced 8-team + AST pipeline) --
  console.log('\n  [4/6] 8-team + AST verification...');

  let pipelineResult: { teams: Array<{ name: string; score: number; findings: Array<string | { message: string }> }>; overallScore: number; overallStatus: string };
  try {
    const { runEnhancedPipeline } = require('../core/ast-bridge');
    const enhanced = await runEnhancedPipeline(mergedCode, 'typescript', fileName);
    console.log(`        Engines: ${enhanced.engines.join(', ')}`);

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
    const icon = stage.score >= 80 ? '[OK]' : stage.score >= 60 ? '[!!]' : '[XX]';
    console.log(`        ${icon} ${stage.name.padEnd(14)} ${stage.score}/100`);
  }
  console.log(`        Overall: ${pipelineResult.overallScore}/100 (${pipelineResult.overallStatus})`);

  // -- Step 4.5: Cross-Model Verification (full/strict only) --
  if (opts.mode !== 'fast' && csConfig.keys.length >= 2) {
    console.log('\n  [4.5/6] Cross-model verification...');
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
          onChunk: (t: string) => {
            judgeRaw += t;
            tokenUsage.verifyTokens += Math.ceil(t.length / 4);
          },
          temperature: getTemperature('judge'),
        });

        const judgeResult = parseJudgeResult(judgeRaw);
        if (judgeResult) {
          const agreed = judgeResult.findings.filter((f: any) => f.verdict === 'agree').length;
          const dismissed = judgeResult.findings.filter((f: any) => f.verdict === 'dismiss').length;
          console.log(`        Agreed: ${agreed} | Dismissed: ${dismissed} (confidence: ${Math.round(judgeResult.overallAgreement * 100)}%)`);
        }
      } else {
        console.log('        -> No findings, skipping cross-check');
      }
    } catch {
      console.log('        -> Cross-check skipped (insufficient keys or API error)');
    }
  }

  // -- Step 5: Auto-fix loop --
  const guard = createLoopGuard({ passThreshold: opts.mode === 'strict' ? 85 : 77 });
  let finalCode = mergedCode;

  if (pipelineResult.overallStatus !== 'pass' && opts.mode !== 'fast') {
    console.log('\n  [5/6] Auto-fix loop...');

    const { runVerificationLoop } = require('../core/pipeline-bridge');

    try {
      const maxRounds = opts.mode === 'strict' ? 3 : 2;
      const verifyResult = await runVerificationLoop(mergedCode, 'typescript', maxRounds);

      if (verifyResult.finalScore > pipelineResult.overallScore) {
        console.log(`        -> ${verifyResult.rounds} rounds, final ${verifyResult.finalScore}/100`);
      } else {
        console.log(`        -> No further fixes needed (${verifyResult.finalScore}/100)`);
      }
    } catch {
      console.log('        -> Auto-fix skipped');
    }
  } else {
    console.log('\n  [5/6] Auto-fix -- not needed [OK]');
  }

  // -- Step 6: Save + Receipt --
  console.log('\n  [6/6] Save + receipt...');

  const csDir = join(process.cwd(), '.cs', 'generated');
  mkdirSync(csDir, { recursive: true });

  const filePath = join(csDir, fileName);
  writeFileSync(filePath, finalCode, 'utf-8');
  console.log(`        -> ${filePath}`);

  // Calculate total tokens
  tokenUsage.totalTokens = tokenUsage.planTokens + tokenUsage.generateTokens + tokenUsage.verifyTokens + tokenUsage.fixTokens;

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

  // Token usage summary
  console.log(`\n  Token Usage:`);
  console.log(`     Plan:      ~${tokenUsage.planTokens}`);
  console.log(`     Generate:  ~${tokenUsage.generateTokens}`);
  console.log(`     Verify:    ~${tokenUsage.verifyTokens}`);
  console.log(`     Total:     ~${tokenUsage.totalTokens}`);

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
    console.log('\n  Generating tests...');
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
      console.log(`        -> ${testPath}`);
    } catch {
      console.log('        [WARN] Test generation failed');
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
      console.log(`\n  Commit: ${commitMsg}`);
    } catch {
      console.log('\n  [WARN] Commit failed');
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
      execSync(`gh pr create --title "${prTitle}" --body "Generated by CS Quill\n\nScore: ${pipelineResult.overallScore}/100\nReceipt: ${receipt.id}"`, { stdio: 'pipe' });
      console.log(`\n  PR created: ${prTitle}`);
    } catch {
      console.log('\n  [WARN] PR creation failed (gh CLI required)');
    }
  }

  // Badge auto-trigger
  try {
    const { evaluateBadges } = require('../core/badges');
    const { newBadges } = evaluateBadges();
    if (newBadges.length > 0) {
      for (const b of newBadges) console.log(`  [BADGE] ${b.icon} ${b.name} -- ${b.description}`);
    }
  } catch { /* badges optional */ }

  console.log('\n  Done!\n');
}

// IDENTITY_SEAL: PART-4 | role=main-generate | inputs=prompt,opts | outputs=file+receipt
