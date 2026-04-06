import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ014Detector: RuleDetector = {
  ruleId: 'TYP-014', // strictNullChecks 위반
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TypeChecker 필요
    
    return findings;
  }
};
