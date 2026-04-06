import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg006Detector: RuleDetector = {
  ruleId: 'CFG-006', // paths alias 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // 프로젝트 레벨 체크
    return findings;
  }
};
