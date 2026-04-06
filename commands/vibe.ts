// ============================================================
// CS Quill 🦔 — cs vibe command
// ============================================================
// 바이브코더 모드: 자연어 100%, 기술 0.
// 스펙 정리 → 확인 → 생성 → 미리보기
// + 구조화된 바이브 템플릿 (casual, formal, minimal, verbose)
// + 프롬프트에서 바이브 키워드 파싱
// + 생성에 스타일 제약 적용

const { runGenerate } = require('./generate');

// ============================================================
// PART 1 — Vibe Templates & Style Constraints
// ============================================================

interface VibeTemplate {
  name: string;
  keywords: string[];
  systemModifier: string;
  constraints: {
    maxLinesPerFile: number;
    commentDensity: 'none' | 'minimal' | 'moderate' | 'heavy';
    namingStyle: 'short' | 'descriptive' | 'verbose';
    errorHandling: 'minimal' | 'standard' | 'comprehensive';
    codeStyle: string;
  };
}

const VIBE_TEMPLATES: Record<string, VibeTemplate> = {
  casual: {
    name: 'casual',
    keywords: ['간단', '대충', '빠르게', 'quick', 'simple', 'fast', 'easy', 'casual', 'prototype', '프로토', '시제품'],
    systemModifier: 'Write code in a relaxed, casual style. Prioritize speed and simplicity over perfection. Use concise variable names. Skip non-essential error handling. Minimal comments — the code should speak for itself.',
    constraints: {
      maxLinesPerFile: 100,
      commentDensity: 'minimal',
      namingStyle: 'short',
      errorHandling: 'minimal',
      codeStyle: 'concise, prototype-friendly, skip boilerplate',
    },
  },
  formal: {
    name: 'formal',
    keywords: ['정식', '프로덕션', '배포', 'production', 'formal', 'enterprise', 'professional', 'deploy', 'release', '출시'],
    systemModifier: 'Write production-quality code. Use descriptive names, comprehensive error handling, input validation, JSDoc comments, and proper typing. Follow best practices rigorously.',
    constraints: {
      maxLinesPerFile: 300,
      commentDensity: 'heavy',
      namingStyle: 'verbose',
      errorHandling: 'comprehensive',
      codeStyle: 'production-grade, fully typed, documented, validated',
    },
  },
  minimal: {
    name: 'minimal',
    keywords: ['미니멀', '최소', 'minimal', 'lean', 'bare', 'tiny', 'small', '작게', '가볍게', 'lightweight'],
    systemModifier: 'Write minimal code. Every line must earn its place. No unnecessary abstractions, no extra dependencies, no premature optimization. Fewest files possible.',
    constraints: {
      maxLinesPerFile: 50,
      commentDensity: 'none',
      namingStyle: 'short',
      errorHandling: 'minimal',
      codeStyle: 'ultra-lean, zero boilerplate, single-file preferred',
    },
  },
  verbose: {
    name: 'verbose',
    keywords: ['자세히', '상세', '설명', 'verbose', 'detailed', 'documented', 'tutorial', '튜토리얼', '학습', 'learning', 'educational'],
    systemModifier: 'Write well-documented, educational code. Every function should have JSDoc with examples. Add inline comments explaining the "why". Use descriptive variable names. Include usage examples.',
    constraints: {
      maxLinesPerFile: 500,
      commentDensity: 'heavy',
      namingStyle: 'verbose',
      errorHandling: 'comprehensive',
      codeStyle: 'tutorial-style, heavily commented, self-documenting',
    },
  },
};

/**
 * Parse vibe keywords from the user prompt and return the matching template.
 * Falls back to 'casual' if no keywords match.
 */
function detectVibeFromPrompt(prompt: string): VibeTemplate {
  const lower = prompt.toLowerCase();
  let bestMatch: { template: VibeTemplate; score: number } = { template: VIBE_TEMPLATES.casual, score: 0 };

  for (const template of Object.values(VIBE_TEMPLATES)) {
    let score = 0;
    for (const keyword of template.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += keyword.length; // longer keyword matches are weighted higher
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { template, score };
    }
  }

  return bestMatch.template;
}

/**
 * Build style constraint instructions to inject into the AI system prompt.
 */
function buildStyleConstraints(template: VibeTemplate): string {
  const c = template.constraints;
  return `
STYLE CONSTRAINTS (vibe: ${template.name}):
- Max lines per file: ${c.maxLinesPerFile}
- Comment density: ${c.commentDensity}
- Naming style: ${c.namingStyle}
- Error handling: ${c.errorHandling}
- Code style: ${c.codeStyle}
Do not exceed these constraints. They define the user's preferred coding style.`;
}

// IDENTITY_SEAL: PART-1 | role=vibe-templates | inputs=prompt | outputs=VibeTemplate

// ============================================================
// PART 2 — Vibe System Prompt
// ============================================================

function buildVibeSpecPrompt(template: VibeTemplate): string {
  return `You are a product manager for CS Quill. The user is a non-developer (vibe coder).
They will describe what they want in everyday language. Your job:

1. Extract concrete features from their description
2. Present them as a simple checklist (emoji + short description)
3. Suggest a tech stack based on the project context
4. Output JSON:

{
  "features": ["📸 Photo upload", "❤️ Likes + comments", "👤 Profile page"],
  "techStack": "Next.js + TypeScript + Tailwind",
  "estimatedFiles": 5,
  "prompt": "Create a photo sharing app with: upload, likes, comments, profile, mobile responsive",
  "vibe": "${template.name}"
}

Keep it SIMPLE. No jargon. The user doesn't know what an API is.

${template.systemModifier}
${buildStyleConstraints(template)}`;
}

// IDENTITY_SEAL: PART-2 | role=vibe-prompt | inputs=VibeTemplate | outputs=string

// ============================================================
// PART 3 — Vibe Runner
// ============================================================

export async function runVibe(prompt: string): Promise<void> {
  console.log('🦔 CS Quill — 바이브 모드 ✨\n');

  // Step 0: Detect vibe style from prompt keywords
  const vibeTemplate = detectVibeFromPrompt(prompt);
  console.log(`  🎨 바이브 스타일: ${vibeTemplate.name}`);
  const c = vibeTemplate.constraints;
  console.log(`     (${c.codeStyle})\n`);

  // Step 1: Parse vibe into spec
  console.log('  뭘 만들지 정리할게요...\n');

  let specRaw = '';
  try {
    const { streamChat } = require('../core/ai-bridge');
    await streamChat({
      systemInstruction: buildVibeSpecPrompt(vibeTemplate),
      messages: [{ role: 'user', content: prompt }],
      onChunk: (t: string) => { specRaw += t; },
    });
  } catch {
    console.log('  ⚠️  AI 연결 실패. 직접 생성으로 전환합니다.\n');
    console.log(`  (바이브 스타일 "${vibeTemplate.name}" 유지)\n`);
    await runGenerate(prompt, {
      mode: 'full',
      structure: 'auto',
      vibeConstraints: buildStyleConstraints(vibeTemplate),
    });
    return;
  }

  // Parse spec — try structured extraction first, then fallback with vibe constraints
  let spec: { features: string[]; techStack: string; estimatedFiles: number; prompt: string; vibe?: string };
  try {
    const jsonMatch = specRaw.match(/\{[\s\S]*\}/);
    spec = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    spec = null as never;
  }

  if (!spec) {
    // Structured fallback: extract features from raw text instead of blind generate
    console.log('  스펙 정리를 건너뛰고 바이브 제약 적용 후 생성합니다.\n');
    const featureLines = specRaw.split('\n').filter(l => /^[\s]*[-*✓✅📸❤️👤🔍📁🛠️]/.test(l)).slice(0, 10);
    if (featureLines.length > 0) {
      console.log('  추출된 기능:');
      for (const line of featureLines) {
        console.log(`    ${line.trim()}`);
      }
      console.log('');
    }
    await runGenerate(prompt, {
      mode: 'full',
      structure: 'auto',
      vibeConstraints: buildStyleConstraints(vibeTemplate),
    });
    return;
  }

  // Show spec
  console.log('  ┌──────────────────────────────────┐');
  for (const feature of spec.features) {
    console.log(`  │ ${feature.padEnd(34)}│`);
  }
  console.log('  └──────────────────────────────────┘');
  console.log(`\n  🛠️  ${spec.techStack}`);
  console.log(`  📁 약 ${spec.estimatedFiles}개 파일`);
  console.log(`  🎨 바이브: ${vibeTemplate.name}\n`);

  // Confirmation (대화형)
  const { createInterface } = require('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer = '';
  try {
    answer = await new Promise<string>((resolve, reject) => {
      rl.question('  이대로 만들까요? (Y/n/수정): ', (a: string) => resolve(a.trim()));
      rl.on('error', reject);
      rl.on('close', () => resolve('y')); // Default on pipe close
    });
  } finally {
    rl.close();
  }

  if (answer.toLowerCase() === 'n') {
    console.log('  취소됨.\n');
    return;
  }

  let finalPrompt = spec.prompt;
  if (answer && answer.toLowerCase() !== 'y' && answer !== '') {
    // User wants to modify — also check for vibe change in the modification
    const modVibeTemplate = detectVibeFromPrompt(answer);
    if (modVibeTemplate.name !== vibeTemplate.name && answer.toLowerCase() !== answer) {
      console.log(`  🎨 바이브 변경: ${vibeTemplate.name} → ${modVibeTemplate.name}`);
    }
    finalPrompt = `${spec.prompt}. Additional: ${answer}`;
    console.log(`\n  📝 수정 반영: "${answer}"\n`);
  }

  // Step 2: Generate with vibe style constraints injected
  console.log('  🦔 만드는 중... ☕ 잠깐 쉬세요\n');

  await runGenerate(finalPrompt, {
    mode: 'full',
    structure: 'auto',
    vibeConstraints: buildStyleConstraints(vibeTemplate),
  });

  console.log('  🦔 바이브 완료! 결과는 .cs/generated/ 에 있어요.\n');
  console.log('  다음 단계:');
  console.log('    cs apply --all        → 원본에 적용');
  console.log('    cs verify ./src       → 검증');
  console.log('    cs vibe "수정사항"     → 추가 수정\n');
}

// Expose templates for testing/external use
export { VIBE_TEMPLATES, detectVibeFromPrompt, buildStyleConstraints };

// IDENTITY_SEAL: PART-3 | role=vibe-runner | inputs=prompt | outputs=generated-code
