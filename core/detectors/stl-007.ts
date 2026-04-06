import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl007Detector: RuleDetector = {
  ruleId: 'STL-007', // 주석 vs 코드 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // AI/NLP 필요
    return findings;
  }
};
