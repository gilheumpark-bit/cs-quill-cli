import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy010Detector: RuleDetector = {
  ruleId: 'ASY-010', // event listener 중복 등록
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // 루프 안이나 React render 내 addEventListener 확인
    return findings;
  }
};
