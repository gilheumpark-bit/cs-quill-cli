import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ012Detector: RuleDetector = {
  ruleId: 'TYP-012', // strict 모드 미활성화
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // tsconfig.json 설정 체크이므로 SourceFile에서 예외.
    
    return findings;
  }
};
