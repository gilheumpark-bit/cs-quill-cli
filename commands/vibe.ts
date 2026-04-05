// ============================================================
// CS Quill 🦔 — cs vibe command
// ============================================================
// 바이브코더 모드: 자연어 100%, 기술 0.
// 스펙 정리 → 확인 → 생성 → 미리보기

import { runGenerate } from './generate';

// ============================================================
// PART 1 — Vibe System Prompt
// ============================================================

const VIBE_SPEC_PROMPT = `You are a product manager for CS Quill. The user is a non-developer (vibe coder).
They will describe what they want in everyday language. Your job:

1. Extract concrete features from their description
2. Present them as a simple checklist (emoji + short description)
3. Suggest a tech stack based on the project context
4. Output JSON:

{
  "features": ["📸 Photo upload", "❤️ Likes + comments", "👤 Profile page"],
  "techStack": "Next.js + TypeScript + Tailwind",
  "estimatedFiles": 5,
  "prompt": "Create a photo sharing app with: upload, likes, comments, profile, mobile responsive"
}

Keep it SIMPLE. No jargon. The user doesn't know what an API is.`;

// IDENTITY_SEAL: PART-1 | role=vibe-prompt | inputs=none | outputs=VIBE_SPEC_PROMPT

// ============================================================
// PART 2 — Vibe Runner
// ============================================================

export async function runVibe(prompt: string): Promise<void> {
  console.log('🦔 CS Quill — 바이브 모드 ✨\n');

  // Step 1: Parse vibe into spec
  console.log('  뭘 만들지 정리할게요...\n');

  let specRaw = '';
  try {
    const { streamChat } = require('../core/ai-bridge');
    await streamChat({
      systemInstruction: VIBE_SPEC_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      onChunk: (t: string) => { specRaw += t; },
    });
  } catch {
    console.log('  ⚠️  AI 연결 실패. 직접 생성으로 전환합니다.\n');
    await runGenerate(prompt, { mode: 'full', structure: 'auto' });
    return;
  }

  // Parse spec
  let spec: { features: string[]; techStack: string; estimatedFiles: number; prompt: string };
  try {
    const jsonMatch = specRaw.match(/\{[\s\S]*\}/);
    spec = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    spec = null as never;
  }

  if (!spec) {
    // Fallback: use original prompt directly
    console.log('  스펙 정리를 건너뛰고 바로 만들게요.\n');
    await runGenerate(prompt, { mode: 'full', structure: 'auto' });
    return;
  }

  // Show spec
  console.log('  ┌──────────────────────────────────┐');
  for (const feature of spec.features) {
    console.log(`  │ ${feature.padEnd(34)}│`);
  }
  console.log('  └──────────────────────────────────┘');
  console.log(`\n  🛠️  ${spec.techStack}`);
  console.log(`  📁 약 ${spec.estimatedFiles}개 파일\n`);

  // Confirmation (대화형)
  const { createInterface } = require('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer = '';
  try {
    answer = await new Promise<string>((resolve, reject) => {
      rl.question('  이대로 만들까요? (Y/n/수정): ', a => resolve(a.trim()));
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
    // User wants to modify
    finalPrompt = `${spec.prompt}. Additional: ${answer}`;
    console.log(`\n  📝 수정 반영: "${answer}"\n`);
  }

  // Step 2: Generate
  console.log('  🦔 만드는 중... ☕ 잠깐 쉬세요\n');

  await runGenerate(finalPrompt, {
    mode: 'full',
    structure: 'auto',
  });

  console.log('  🦔 바이브 완료! 결과는 .cs/generated/ 에 있어요.\n');
  console.log('  다음 단계:');
  console.log('    cs apply --all        → 원본에 적용');
  console.log('    cs verify ./src       → 검증');
  console.log('    cs vibe "수정사항"     → 추가 수정\n');
}

// IDENTITY_SEAL: PART-2 | role=vibe-runner | inputs=prompt | outputs=generated-code
