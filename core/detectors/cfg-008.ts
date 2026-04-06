import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg008Detector: RuleDetector = {
  ruleId: 'CFG-008', // devDeps vs deps 분류 오류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // package.json 체크
    return findings;
  }
};
