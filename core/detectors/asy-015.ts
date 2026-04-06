import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy015Detector: RuleDetector = {
  ruleId: 'ASY-015', // race condition — 공유 상태
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // await 전후 상태 변경 추적 필요
    return findings;
  }
};
