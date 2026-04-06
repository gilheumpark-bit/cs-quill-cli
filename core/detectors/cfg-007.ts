import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg007Detector: RuleDetector = {
  ruleId: 'CFG-007', // 순환 의존성
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // Madge 등 외부 도구 필요
    return findings;
  }
};
