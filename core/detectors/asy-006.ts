import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy006Detector: RuleDetector = {
  ruleId: 'ASY-006', // Promise.all vs 순차 await 오류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // 복수의 연속된 await 식 탐지가 필요
    return findings;
  }
};
