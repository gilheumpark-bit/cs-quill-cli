import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg011Detector: RuleDetector = {
  ruleId: 'CFG-011', // devDeps 프로덕션 빌드 포함
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // package.json 체크
    return findings;
  }
};
