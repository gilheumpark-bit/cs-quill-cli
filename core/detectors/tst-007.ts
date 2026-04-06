import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst007Detector: RuleDetector = {
  ruleId: 'TST-007', // shared state 오염
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // let 선언 후 여러 it 에서 변경하는지
    return findings;
  }
};
