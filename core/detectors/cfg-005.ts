import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg005Detector: RuleDetector = {
  ruleId: 'CFG-005', // moduleResolution 부재
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // tsconfig.json 체크
    return findings;
  }
};
