// ============================================================
// CS Quill 🦔 — cs learn command
// ============================================================
// 주니어용: 수정 이유를 쉽게 설명해줌.
// 최근 검증 결과를 가져와서 각 수정 항목을 교육적으로 해설.

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ReceiptData } from '../formatters/receipt';

// ============================================================
// PART 1 — Learn Runner
// ============================================================

export async function runLearn(topic?: string): Promise<void> {
  console.log('🦔 CS Quill — 학습 모드\n');

  // Topic-specific learning
  if (topic) {
    try {
      const { streamChat } = require('../core/ai-bridge');
      const { getTemperature } = require('../core/ai-config');
      console.log(`  📚 "${topic}" 학습 중...\n  `);
      await streamChat({
        systemInstruction: 'You are a friendly Korean coding mentor. Explain the given topic with examples. Use 💡 for tips. Keep it under 20 lines.',
        messages: [{ role: 'user', content: `Explain: ${topic}` }],
        onChunk: (t: string) => { process.stdout.write(t); },
        temperature: getTemperature('explain'),
      });
      console.log('\n');
      return;
    } catch {
      console.log('  ⚠️  AI 연결 실패. 최근 검증 기록 기반으로 학습합니다.\n');
    }
  }

  // Load latest receipt
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  if (!existsSync(receiptDir)) {
    console.log('  📭 검증 기록이 없습니다. cs generate 또는 cs verify 먼저 실행하세요.\n');
    return;
  }

  const files = readdirSync(receiptDir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) {
    console.log('  📭 영수증이 없습니다.\n');
    return;
  }

  const latest: ReceiptData = JSON.parse(readFileSync(join(receiptDir, files[0]), 'utf-8'));

  console.log(`  📄 최근 검증: ${latest.id} (${new Date(latest.timestamp).toLocaleString()})\n`);

  // Find teams with issues
  const problemTeams = latest.pipeline.teams.filter(t => t.score < 80);

  if (problemTeams.length === 0) {
    console.log('  ✅ 모든 팀 통과! 잘하고 있어요.\n');
    return;
  }

  // AI explanation for each problem team
  try {
    const { streamChat } = require('../core/ai-bridge');

    for (const team of problemTeams) {
      console.log(`  ─── ${team.name} (${team.score}/100) ───\n`);

      const learnPrompt = `You are a friendly coding mentor. Explain this verification result to a beginner.

Team: ${team.name}
Score: ${team.score}/100
Findings: ${team.findings} issues
Blocking: ${team.blocking}

Explain:
1. What this team checks (1 sentence, simple)
2. Why it matters (real-world consequence)
3. How to fix it (practical tip)

Use Korean. Be encouraging. Use 💡 for tips. Keep it SHORT (3-5 lines per section).`;

      process.stdout.write('  ');
      await streamChat({
        systemInstruction: 'You are a friendly Korean coding mentor for beginners.',
        messages: [{ role: 'user', content: learnPrompt }],
        onChunk: (t: string) => { process.stdout.write(t); },
      });
      console.log('\n');
    }
  } catch {
    // Fallback: 동적 해설 (영수증 finding 기반 + 정적 팁 매핑)
    const teamTips: Record<string, { what: string; why: string; howPrefix: string }> = {
      regex: { what: '표면 패턴 검사 (console.log, eval, TODO)', why: '프로덕션에 디버그 코드가 남으면 보안+성능 문제', howPrefix: '해당 라인에서' },
      ast: { what: 'AST 구조 분석 (함수 길이, 중첩 깊이, 미사용 파라미터)', why: '복잡한 코드는 버그 확률이 높고 리뷰가 어려움', howPrefix: '함수를 50줄 이하로 분리하고' },
      hollow: { what: '빈 함수/스텁 감지', why: '미구현 코드가 런타임에 예상치 못한 동작', howPrefix: '빈 함수에 실제 로직을 채우거나' },
      'dead-code': { what: 'return 이후 코드, 주석 처리된 코드', why: '데드코드는 혼란을 주고 번들 크기 증가', howPrefix: '사용하지 않는 코드를 삭제하고' },
      'design-lint': { what: 'z-index 하드코딩, 매직넘버 색상, 포맷 불일치', why: '디자인 시스템 없으면 UI 일관성 파괴', howPrefix: 'CSS 변수/디자인 토큰을 사용하고' },
      'cognitive-load': { what: '줄 길이 초과, 중첩 삼항, 파일 크기', why: '읽기 어려운 코드 = 유지보수 비용 증가', howPrefix: '긴 줄을 분리하고 삼항을 if로 변경' },
      'bug-pattern': { what: '=== NaN, parseInt radix, forEach(async), 빈 catch', why: '자바스크립트 함정 패턴으로 런타임 버그 발생', howPrefix: '' },
      security: { what: 'eval, innerHTML, 하드코딩 키, 개인키 노출', why: '보안 취약점은 서비스 전체를 위험에 빠뜨림', howPrefix: '' },
    };

    for (const team of problemTeams) {
      const tip = teamTips[team.name];
      console.log(`  ─── ${team.name} (${team.score}/100) ───`);
      if (tip) {
        console.log(`  📋 검사 항목: ${tip.what}`);
        console.log(`  ⚡ 왜 중요: ${tip.why}`);
        console.log(`  💡 수정법: ${tip.howPrefix} cs verify --precision ${team.name} 으로 상세 확인`);
      } else {
        console.log(`  💡 cs verify 로 상세 확인 후 개선하세요.`);
      }
      // 실제 finding 수 기반 동적 메시지
      if (typeof team.findings === 'number' && team.findings > 5) {
        console.log(`  📊 ${team.findings}건 — 가장 빈번한 문제부터 순차 해결 추천`);
      }
      console.log('');
    }
  }
}

// IDENTITY_SEAL: PART-1 | role=learn-runner | inputs=none | outputs=console
