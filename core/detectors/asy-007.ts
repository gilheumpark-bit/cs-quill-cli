import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy007Detector: RuleDetector = {
  ruleId: 'ASY-007', // Promise.race timeout 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // Promise.race의 인수로 setTimeout 기반 Promise가 있는지 확인 필요
    return findings;
  }
};
