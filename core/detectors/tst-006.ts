import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst006Detector: RuleDetector = {
  ruleId: 'TST-006', // 단일 테스트 복수 단위 테스트
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // 여러 expect 가 다른 범주를 테스트하는지. (개수 체크)
    return findings;
  }
};
