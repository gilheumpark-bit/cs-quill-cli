import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ002Detector: RuleDetector = {
  ruleId: 'TYP-002', // 함수 반환 타입 미선언
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.getFunctions().forEach(func => {
      if (!func.getReturnTypeNode()) {
        findings.push({ line: func.getStartLineNumber(), message: '함수 반환 타입 미선언 위반' });
      }
    });
    sourceFile.getClasses().forEach(cls => {
      cls.getMethods().forEach(method => {
        if (!method.getReturnTypeNode()) {
          findings.push({ line: method.getStartLineNumber(), message: '메서드 반환 타입 미선언 위반' });
        }
      });
    });
    return findings;
  }
};
