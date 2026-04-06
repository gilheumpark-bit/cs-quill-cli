import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl004Detector: RuleDetector = {
  ruleId: 'STL-004', // 상수 소문자
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.getVariableStatements().forEach(stmt => {
      if (stmt.getDeclarationKind() === 'const') {
        stmt.getDeclarations().forEach(decl => {
          const name = decl.getName();
          // primitive literal만 대상으로 할 경우 조건 추가 필요
          if (name.length > 3 && name === name.toLowerCase() && name.includes('_')) {
             // SNAKE_CASE 여야 하는데 snake_case인 경우
             findings.push({ line: decl.getStartLineNumber(), message: '상수 대문자 위반: ' + name });
          }
        });
      }
    });
    return findings;
  }
};
