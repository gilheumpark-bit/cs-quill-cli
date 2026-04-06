import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg001Detector: RuleDetector = {
  ruleId: 'CFG-001', // strict: false
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // tsconfig.json 체크용이므로 소스코드 레벨에서는 보통 스킵

    return findings;
  }
};
