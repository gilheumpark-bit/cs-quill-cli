import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy003Detector: RuleDetector = {
  ruleId: 'ASY-003', // Unhandled Promise rejection
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // Symbol이나 CallExpression chaining 추적 필요 (catch 호출여부)
    return findings;
  }
};
