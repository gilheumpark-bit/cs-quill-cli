import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst008Detector: RuleDetector = {
  ruleId: 'TST-008', // happy path만 커버
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // catch나 throw test 부재
    return findings;
  }
};
