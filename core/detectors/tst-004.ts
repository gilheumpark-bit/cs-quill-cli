import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst004Detector: RuleDetector = {
  ruleId: 'TST-004', // assertion 없이 resolves/rejects
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // .resolves / .rejects 에 await 나 return 확인 필요
    return findings;
  }
};
