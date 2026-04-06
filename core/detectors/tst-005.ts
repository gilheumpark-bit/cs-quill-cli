import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst005Detector: RuleDetector = {
  ruleId: 'TST-005', // hardcoded 날짜 — 미래 실패
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // new Date('2025-01-01') 등 확인
    return findings;
  }
};
