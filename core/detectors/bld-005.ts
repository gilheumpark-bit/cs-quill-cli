import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld005Detector: RuleDetector = {
  ruleId: 'BLD-005', // moduleResolution 부재
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // tsconfig.json 체크
    return findings;
  }
};
