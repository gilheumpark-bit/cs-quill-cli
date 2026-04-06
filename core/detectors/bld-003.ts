import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld003Detector: RuleDetector = {
  ruleId: 'BLD-003', // skipLibCheck: true
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // tsconfig.json 체크
    return findings;
  }
};
