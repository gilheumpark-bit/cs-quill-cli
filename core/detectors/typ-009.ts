import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ009Detector: RuleDetector = {
  ruleId: 'TYP-009', // 함수 오버로드 시그니처 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // 오버로드는 TypeChecker 필요, 여기서는 넘김
    
    return findings;
  }
};
