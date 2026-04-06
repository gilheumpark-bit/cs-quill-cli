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
    // Data-driven fallback: load tips from rule-catalog categories
    const teamCategoryMap: Record<string, string[]> = {
      regex: ['api-misuse', 'naming-style'],
      ast: ['syntax', 'type', 'variable', 'complexity'],
      hollow: ['logic-semantic'],
      'dead-code': ['logic-semantic', 'variable'],
      'design-lint': ['naming-style', 'build-tooling'],
      'cognitive-load': ['complexity'],
      'bug-pattern': ['runtime', 'async-event', 'error-handling'],
      security: ['security', 'resource'],
    };

    // Build team tips dynamically from rule-catalog
    let catalogRules: any[] = [];
    try {
      const { RULE_CATALOG } = require('../core/rule-catalog');
      catalogRules = RULE_CATALOG;
    } catch { /* skip */ }

    for (const team of problemTeams) {
      console.log(`  ─── ${team.name} (${team.score}/100) ───`);

      const categories = teamCategoryMap[team.name] ?? [];
      if (catalogRules.length > 0 && categories.length > 0) {
        // Find relevant rules from catalog for this team's categories
        const relevantRules = catalogRules.filter((r: any) =>
          categories.some(cat => r.category === cat || r.category?.includes(cat))
        );

        // Group by severity for actionable display
        const critical = relevantRules.filter((r: any) => r.severity === 'critical' || r.severity === 'high');
        const medium = relevantRules.filter((r: any) => r.severity === 'medium');

        // Show what this team checks based on actual rule titles
        const sampleTitles = relevantRules.slice(0, 4).map((r: any) => r.title).join(', ');
        console.log(`  📋 검사 항목: ${sampleTitles || team.name + ' 관련 규칙'}`);
        console.log(`  📊 관련 규칙: ${relevantRules.length}개 (심각 ${critical.length}, 중간 ${medium.length})`);

        // Show top priority rules as actionable fixes
        if (critical.length > 0) {
          console.log('  ⚡ 우선 수정:');
          for (const rule of critical.slice(0, 3)) {
            const cweTag = rule.cwe ? ` [${rule.cwe}]` : '';
            console.log(`     - ${rule.id}: ${rule.title}${cweTag}`);
          }
        }
        console.log(`  💡 cs verify --precision ${team.name} 으로 상세 확인`);
      } else {
        console.log(`  💡 cs verify 로 상세 확인 후 개선하세요.`);
      }

      // Dynamic message based on actual finding count from receipt
      if (typeof team.findings === 'number' && team.findings > 5) {
        console.log(`  📊 ${team.findings}건 — 가장 빈번한 문제부터 순차 해결 추천`);
      } else if (typeof team.findings === 'number' && team.findings > 0) {
        console.log(`  📊 ${team.findings}건 발견 — 빠르게 해결 가능`);
      }
      console.log('');
    }
  }
}

// IDENTITY_SEAL: PART-1 | role=learn-runner | inputs=none | outputs=console
