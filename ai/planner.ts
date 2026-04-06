// ============================================================
// CS Quill 🦔 — Planner (SEAL Contract Generator)
// ============================================================
// Plan → SEAL 계약 → 병렬 생성의 첫 단계.
// 태스크를 N개 PART로 분해하고 각 PART의 계약을 정의한다.

const { GOOD_PATTERN_CATALOG } = require('../core/good-pattern-catalog');

// ============================================================
// Quality Section Builder — good-pattern-catalog → compact checklist
// ============================================================

function buildPlannerQualitySection(): string {
  type IsoQuality = 'Maintainability' | 'Reliability' | 'Security' | 'Performance';

  // Filter to boost + high-confidence patterns only
  const topPatterns = GOOD_PATTERN_CATALOG.filter(
    (p: any) => p.signal === 'boost' && p.confidence === 'high',
  );

  // Group by ISO quality dimension
  const grouped: Record<IsoQuality, string[]> = {
    Maintainability: [],
    Reliability: [],
    Security: [],
    Performance: [],
  };

  for (const p of topPatterns) {
    const dim = p.quality as IsoQuality;
    if (grouped[dim]) {
      grouped[dim].push(p.title);
    }
  }

  // Cap total rules at 20: distribute proportionally, min 3 per dimension
  const MAX_RULES = 20;
  const dims = Object.keys(grouped) as IsoQuality[];
  const total = dims.reduce((s, d) => s + grouped[d].length, 0);
  const selected: Record<IsoQuality, string[]> = {
    Maintainability: [],
    Reliability: [],
    Security: [],
    Performance: [],
  };

  let remaining = MAX_RULES;
  for (const dim of dims) {
    const quota = Math.max(3, Math.round((grouped[dim].length / total) * MAX_RULES));
    const take = Math.min(quota, grouped[dim].length, remaining);
    selected[dim] = grouped[dim].slice(0, take);
    remaining -= take;
    if (remaining <= 0) break;
  }

  const lines = ['QUALITY DIMENSIONS (apply during PART design):'];
  for (const dim of dims) {
    if (selected[dim].length > 0) {
      lines.push(`[${dim}] ${selected[dim].join(', ')}`);
    }
  }

  return lines.join('\n');
}

const PLANNER_QUALITY_SECTION = buildPlannerQualitySection();

// ============================================================
// PART 1 — Types
// ============================================================

export interface SealContract {
  part: number;
  role: string;
  inputs: string[];
  outputs: string[];
  dependencies: number[];
  estimatedLines: number;
}

export interface PlanResult {
  task: string;
  totalParts: number;
  contracts: SealContract[];
  namingConvention: string;
  framework: string | null;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SealContract,PlanResult

// ============================================================
// PART 2 — Planner System Prompt
// ============================================================

export const PLANNER_SYSTEM_PROMPT = `You are the CS Quill Planner. Your job is to decompose a coding task into PART-based SEAL contracts for parallel generation.

RULES:
1. Divide the task into 2-7 PARTs based on complexity.
2. Each PART must have a clear, single responsibility.
3. Define the SEAL contract for each PART:
   - role: one-line description of what this PART does
   - inputs: TypeScript types/interfaces this PART receives
   - outputs: TypeScript types/interfaces this PART exports
   - dependencies: PART numbers this PART depends on (downstream → upstream only)
4. CIRCULAR DEPENDENCIES ARE FORBIDDEN. Only depend on lower-numbered PARTs.
5. PARTs with no dependencies can be generated IN PARALLEL.
6. Specify a naming convention (camelCase, PascalCase, etc.) for consistency across PARTs.
7. Detect the framework from context (React, Next.js, Vue, etc.) if applicable.

SIZE RULES:
- < 50 lines total → 1 PART (no split needed)
- 50-100 lines → 2-3 PARTs
- 100-300 lines → 3-5 PARTs
- 300+ lines → 5-7 PARTs

${PLANNER_QUALITY_SECTION}

OUTPUT FORMAT (JSON only, no markdown):
{
  "task": "original task description",
  "totalParts": 3,
  "contracts": [
    {
      "part": 1,
      "role": "Types & validation schemas",
      "inputs": [],
      "outputs": ["LoginInput", "User", "AuthToken"],
      "dependencies": [],
      "estimatedLines": 30
    },
    {
      "part": 2,
      "role": "Auth core logic (login, register)",
      "inputs": ["LoginInput"],
      "outputs": ["login()", "register()"],
      "dependencies": [1],
      "estimatedLines": 60
    },
    {
      "part": 3,
      "role": "Token management & middleware",
      "inputs": ["AuthToken"],
      "outputs": ["verifyToken()", "requireRole()"],
      "dependencies": [1],
      "estimatedLines": 40
    }
  ],
  "namingConvention": "camelCase for functions, PascalCase for types",
  "framework": "Next.js"
}`;

// IDENTITY_SEAL: PART-2 | role=system-prompt | inputs=none | outputs=PLANNER_SYSTEM_PROMPT

// ============================================================
// PART 3 — Plan Builder
// ============================================================

export function buildPlannerPrompt(task: string, context?: string): string {
  const parts: string[] = [
    `Task: ${task}`,
  ];

  if (context) {
    parts.push(`\nProject context:\n${context}`);
  }

  parts.push('\nGenerate the SEAL contract plan as JSON.');

  return parts.join('\n');
}

export function parsePlanResult(raw: string): PlanResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.contracts || !Array.isArray(parsed.contracts)) return null;

    // Validate no circular dependencies
    for (const contract of parsed.contracts) {
      for (const dep of contract.dependencies) {
        if (dep >= contract.part) {
          return null; // Circular or forward dependency
        }
      }
    }

    return parsed as PlanResult;
  } catch {
    return null;
  }
}

/**
 * Identify which PARTs can run in parallel (no unresolved dependencies).
 * Returns arrays of PART numbers grouped by execution wave.
 */
export function buildExecutionWaves(contracts: SealContract[]): number[][] {
  const waves: number[][] = [];
  const completed = new Set<number>();

  while (completed.size < contracts.length) {
    const wave: number[] = [];

    for (const c of contracts) {
      if (completed.has(c.part)) continue;
      const depsResolved = c.dependencies.every(d => completed.has(d));
      if (depsResolved) wave.push(c.part);
    }

    if (wave.length === 0) break; // Deadlock (shouldn't happen if validation passed)

    waves.push(wave);
    for (const p of wave) completed.add(p);
  }

  return waves;
}

// IDENTITY_SEAL: PART-3 | role=plan-builder | inputs=task,context | outputs=PlanResult,executionWaves
