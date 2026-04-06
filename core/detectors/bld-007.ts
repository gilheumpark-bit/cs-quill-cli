import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld007Detector: RuleDetector = {
  ruleId: 'BLD-007', // 순환 의존성
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // Madge 등 외부 도구 필요
    return findings;
  }
};
