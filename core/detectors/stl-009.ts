import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl009Detector: RuleDetector = {
  ruleId: 'STL-009', // quote style 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // Prettier 등 도구 권장
    return findings;
  }
};
