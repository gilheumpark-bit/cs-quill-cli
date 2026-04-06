import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld010Detector: RuleDetector = {
  ruleId: 'BLD-010', // .env git 추적 포함
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // .gitignore 체크
    return findings;
  }
};
