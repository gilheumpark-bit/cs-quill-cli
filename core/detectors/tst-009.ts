import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst009Detector: RuleDetector = {
  ruleId: 'TST-009', // coverage 100% 무의미 assertion
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // expect(true).toBe(true) 등
    return findings;
  }
};
