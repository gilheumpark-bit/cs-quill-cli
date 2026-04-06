import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld008Detector: RuleDetector = {
  ruleId: 'BLD-008', // devDeps vs deps 분류 오류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // package.json 체크
    return findings;
  }
};
