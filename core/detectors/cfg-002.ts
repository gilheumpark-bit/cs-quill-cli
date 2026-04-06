import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const cfg002Detector: RuleDetector = {
  ruleId: 'CFG-002', // noUnusedLocals: false
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // tsconfig.json 체크
    return findings;
  }
};
