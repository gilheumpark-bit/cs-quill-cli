// ============================================================
// CS Quill 🦔 — cs explain command
// ============================================================
// 기존 코드를 PART별로 분석 + 쉬운 해설.

import { readFileSync, statSync } from 'fs';

// ============================================================
// PART 1 — Explain System Prompt
// ============================================================

const EXPLAIN_SYSTEM_PROMPT = `You are CS Quill's code explainer. Analyze the given code and explain it in simple terms.

FORMAT:
1. One-line summary of what the file does.
2. Break down by logical sections (if PART/SEAL comments exist, use those).
3. For each section:
   - Line range
   - What it does (simple language, no jargon)
   - 💡 Key insight or gotcha
4. End with overall assessment (complexity, quality, potential issues).

Adapt language to the user's detected language (Korean if code has Korean comments, else English).
Keep explanations SHORT. No walls of text.`;

// IDENTITY_SEAL: PART-1 | role=explain-prompt | inputs=none | outputs=EXPLAIN_SYSTEM_PROMPT

// ============================================================
// PART 2 — Explain Runner
// ============================================================

export async function runExplain(path: string): Promise<void> {
  console.log('🦔 CS Quill — 코드 해설\n');

  const stat = statSync(path);
  if (!stat.isFile()) {
    console.log('  ⚠️  파일을 지정하세요.');
    console.log('  예: cs explain ./src/auth.ts');
    return;
  }

  const code = readFileSync(path, 'utf-8');
  const lines = code.split('\n').length;
  console.log(`  📄 ${path} (${lines}줄)\n`);

  // Check for PART/SEAL structure
  const partCount = (code.match(/\/\/ PART \d|IDENTITY_SEAL/g) ?? []).length / 2;
  if (partCount > 0) {
    console.log(`  📐 PART 구조 감지: ${Math.ceil(partCount)}개 PART\n`);
  }

  // AI explanation
  try {
    const { streamChat } = await import('../core/ai-bridge');

    process.stdout.write('  ');
    await streamChat({
      systemInstruction: EXPLAIN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Explain this code:\n\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\`` }],
      onChunk: (t: string) => { process.stdout.write(t); },
    });
    console.log('\n');
  } catch {
    console.log('  ⚠️  AI 해설 불가. AST 정적 분석으로 대체:\n');

    // Fallback: AST 기반 심층 분석 (ast-engine 연동)
    try {
      const { analyzeWithTypeScript, analyzeWithTsMorph } = await import('../adapters/ast-engine');
      const tsFindings = await analyzeWithTypeScript(code, path);
      const tsMorphFindings = await analyzeWithTsMorph(code, path);

      // 함수 목록 + 복잡도
      const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
      const funcs: string[] = [];
      let m;
      while ((m = funcRegex.exec(code)) !== null) funcs.push(m[1] ?? m[2]);

      console.log(`  📐 구조:`);
      console.log(`     Import: ${(code.match(/^import /gm) ?? []).length}개`);
      console.log(`     함수: ${funcs.length}개 ${funcs.length > 0 ? `(${funcs.slice(0, 5).join(', ')}${funcs.length > 5 ? '...' : ''})` : ''}`);
      console.log(`     Export: ${(code.match(/^export /gm) ?? []).length}개`);
      console.log(`     PART: ${Math.ceil(partCount)}개`);

      // AST 분석 결과
      const allFindings = [...tsFindings, ...tsMorphFindings];
      if (allFindings.length > 0) {
        console.log(`\n  🔬 AST 분석 (${allFindings.length}건):`);
        for (const f of allFindings.slice(0, 8)) {
          const icon = f.severity === 'error' ? '🔴' : '🟡';
          console.log(`     ${icon} :${f.line ?? 0} ${f.message}`);
        }
      }

      // PART별 요약
      const partMatches = [...code.matchAll(/\/\/\s*PART\s*(\d+)\s*—\s*(.+)/g)];
      if (partMatches.length > 0) {
        console.log(`\n  📋 PART 구조:`);
        for (const pm of partMatches) {
          console.log(`     PART ${pm[1]}: ${pm[2].trim()}`);
        }
      }

      const todos = (code.match(/TODO|FIXME|HACK/g) ?? []).length;
      if (todos > 0) console.log(`\n  ⚠️  TODO/FIXME: ${todos}개`);
      console.log('');
    } catch {
      // 최소 fallback
      console.log(`  📦 Import: ${(code.match(/^import /gm) ?? []).length}개`);
      console.log(`  📝 함수: ${(code.match(/function\s+\w+/g) ?? []).length}개`);
      console.log(`  📤 Export: ${(code.match(/^export /gm) ?? []).length}개`);
      console.log('');
    }
  }
}

// IDENTITY_SEAL: PART-2 | role=explain-runner | inputs=path | outputs=console
