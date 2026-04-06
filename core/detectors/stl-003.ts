import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl003Detector: RuleDetector = {
  ruleId: 'STL-003', // boolean is/has/can 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.getVariableDeclarations().forEach(decl => {
      // boolean 타입 명시된 경우만 체크
      const type = decl.getTypeNode();
      if (type && type.getKind() === SyntaxKind.BooleanKeyword) {
        const name = decl.getName();
        if (!/^(is|has|can|should|will)/.test(name)) {
          findings.push({ line: decl.getStartLineNumber(), message: 'boolean 명명 위반: ' + name });
        }
      }
    });
    return findings;
  }
};
