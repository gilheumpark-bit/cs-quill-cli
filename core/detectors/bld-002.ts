import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld002Detector: RuleDetector = {
  ruleId: 'BLD-002', // noUnusedLocals: false
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // tsconfig.json 체크
    return findings;
  }
};
