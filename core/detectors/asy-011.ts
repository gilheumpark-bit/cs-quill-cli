import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy011Detector: RuleDetector = {
  ruleId: 'ASY-011', // 동기 heavy computation — event loop 블로킹
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // readFileSync 등 동기 I/O 함수나 큰 루프 탐지
    return findings;
  }
};
