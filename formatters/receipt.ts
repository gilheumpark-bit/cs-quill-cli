// ============================================================
// CS Quill 🦔 — Verification Receipt Formatter
// ============================================================
// formatAuditReport (audit-engine.ts) 스타일 기반.
// Pipeline, Harness, CrossModel 결과를 통합 영수증으로 포맷.

import { createHash, createHmac } from 'crypto';

// ============================================================
// PART 1 — Types
// ============================================================

export interface ReceiptData {
  id: string;
  timestamp: number;
  codeHash: string;
  pipeline: {
    teams: Array<{
      name: string;
      score: number;
      blocking: boolean;
      findings: number;
      passed: boolean;
    }>;
    overallScore: number;
    overallStatus: 'pass' | 'warn' | 'fail';
  };
  harness?: {
    gatesRun: number;
    gatesPassed: number;
    gateFailed?: string;
  };
  crossCheck?: {
    model: string;
    agreed: boolean;
    agreementRate: number;
    dismissed: number;
  };
  verification: {
    rounds: number;
    fixesApplied: number;
    stopReason: string;
  };
  receiptHash: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ReceiptData

// ============================================================
// PART 2 — Hash Chain
// ============================================================

let lastReceiptHash: string | null = null;
const HMAC_SECRET = process.env.CS_RECEIPT_SECRET ?? 'cs-quill-receipt-chain-v1';

export function computeReceiptHash(data: Omit<ReceiptData, 'receiptHash'>): string {
  const payload = JSON.stringify(data) + (lastReceiptHash ?? 'GENESIS');
  return createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

export function verifyReceiptHash(receipt: ReceiptData, previousHash: string | null): boolean {
  const payload = JSON.stringify({ ...receipt, receiptHash: undefined }) + (previousHash ?? 'GENESIS');
  const expected = createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  return expected === receipt.receiptHash;
}

export function chainReceipt(receipt: ReceiptData): void {
  lastReceiptHash = receipt.receiptHash;
}

export function getChainHead(): string | null {
  return lastReceiptHash;
}

// IDENTITY_SEAL: PART-2 | role=hash-chain | inputs=ReceiptData | outputs=hash

// ============================================================
// PART 3 — Terminal Formatter
// ============================================================

export function formatReceipt(receipt: ReceiptData, lang: 'ko' | 'en' = 'ko'): string {
  const labels = lang === 'ko'
    ? {
        title: '검증 영수증',
        score: '종합 점수',
        pipeline: '파이프라인',
        harness: '하네스',
        crossCheck: '크로스모델',
        verification: '검증 루프',
        rounds: '라운드',
        fixes: '자동수정',
        stopReason: '종료 사유',
        pass: '통과',
        fail: '실패',
        hash: '영수증 해시',
        chain: '체인 해시',
      }
    : {
        title: 'VERIFICATION RECEIPT',
        score: 'Total Score',
        pipeline: 'Pipeline',
        harness: 'Harness',
        crossCheck: 'Cross-Model',
        verification: 'Verification Loop',
        rounds: 'Rounds',
        fixes: 'Auto-fixes',
        stopReason: 'Stop Reason',
        pass: 'PASS',
        fail: 'FAIL',
        hash: 'Receipt Hash',
        chain: 'Chain Hash',
      };

  const divider = '═'.repeat(52);
  const thinDiv = '─'.repeat(52);
  const lines: string[] = [];

  const statusIcon = receipt.pipeline.overallStatus === 'pass' ? '✅' : receipt.pipeline.overallStatus === 'warn' ? '⚠️' : '❌';

  lines.push(divider);
  lines.push(`  🦔 ${labels.title}`);
  lines.push(`  ${labels.score}: ${receipt.pipeline.overallScore}/100 ${statusIcon}`);
  lines.push(`  ID: ${receipt.id}`);
  lines.push(`  ${new Date(receipt.timestamp).toISOString()}`);
  lines.push(divider);

  // Pipeline teams
  lines.push('');
  lines.push(`  ${labels.pipeline} (8${lang === 'ko' ? '팀' : ' Teams'})`);
  for (const team of receipt.pipeline.teams) {
    const icon = team.passed ? '✅' : team.blocking ? '❌' : '⚠️';
    const bar = '█'.repeat(Math.round(team.score / 5)) + '░'.repeat(20 - Math.round(team.score / 5));
    const blockTag = team.blocking ? ' [BLOCKING]' : '';
    lines.push(`    ${icon} ${team.name.padEnd(14)} ${bar} ${team.score}/100${blockTag}`);
  }

  // Harness
  if (receipt.harness) {
    lines.push('');
    lines.push(thinDiv);
    lines.push(`  ${labels.harness} (3-Gate)`);
    lines.push(`    Gates: ${receipt.harness.gatesPassed}/${receipt.harness.gatesRun} ${labels.pass}`);
    if (receipt.harness.gateFailed) {
      lines.push(`    ❌ Failed: ${receipt.harness.gateFailed}`);
    }
  }

  // Cross-model
  if (receipt.crossCheck) {
    lines.push('');
    lines.push(thinDiv);
    lines.push(`  ${labels.crossCheck}`);
    lines.push(`    Model: ${receipt.crossCheck.model}`);
    lines.push(`    ${lang === 'ko' ? '합의율' : 'Agreement'}: ${Math.round(receipt.crossCheck.agreementRate * 100)}%`);
    lines.push(`    ${lang === 'ko' ? '기각' : 'Dismissed'}: ${receipt.crossCheck.dismissed}${lang === 'ko' ? '건' : ''}`);
  }

  // Verification loop
  lines.push('');
  lines.push(thinDiv);
  lines.push(`  ${labels.verification}`);
  lines.push(`    ${labels.rounds}: ${receipt.verification.rounds}`);
  lines.push(`    ${labels.fixes}: ${receipt.verification.fixesApplied}${lang === 'ko' ? '건' : ''}`);
  lines.push(`    ${labels.stopReason}: ${receipt.verification.stopReason}`);

  // Hashes
  lines.push('');
  lines.push(thinDiv);
  lines.push(`  ${labels.hash}: ${receipt.receiptHash.slice(0, 16)}...`);
  lines.push(`  Code Hash: ${receipt.codeHash.slice(0, 16)}...`);

  lines.push(divider);

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-3 | role=terminal-formatter | inputs=ReceiptData,lang | outputs=string

// ============================================================
// PART 4 — JSON / SARIF Export
// ============================================================

export function toJSON(receipt: ReceiptData): string {
  return JSON.stringify(receipt, null, 2);
}

export function toSARIF(receipt: ReceiptData): object {
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'CS Quill',
            version: '0.1.0',
            informationUri: 'https://github.com/gilheumpark-bit/eh-universe-web',
          },
        },
        results: receipt.pipeline.teams
          .filter(t => !t.passed)
          .map(t => ({
            ruleId: `cs-quill/${t.name}`,
            level: t.blocking ? 'error' : 'warning',
            message: { text: `${t.name}: ${t.findings} findings, score ${t.score}/100` },
          })),
      },
    ],
  };
}

// IDENTITY_SEAL: PART-4 | role=export | inputs=ReceiptData | outputs=JSON,SARIF
