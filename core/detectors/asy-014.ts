import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy014Detector: RuleDetector = {
  ruleId: 'ASY-014', // for await 없이 async iterable
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // TypeChecker로 iterable의 반환 타입이 AsyncIterable인지 확인 필요
    return findings;
  }
};
