import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld001Detector: RuleDetector = {
  ruleId: 'BLD-001', // strict: false
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // tsconfig.json 체크용이므로 소스코드 레벨에서는 보통 스킵
    return findings;
  }
};
