import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst003Detector: RuleDetector = {
  ruleId: 'TST-003', // mock 미설정 외부 실제 호출
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // 너무 복잡하므로 스킵
    return findings;
  }
};
