import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg010Detector: RuleDetector = {
  ruleId: 'CFG-010', // .env git 추적 포함
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // .gitignore 체크
    return findings;
  }
};
