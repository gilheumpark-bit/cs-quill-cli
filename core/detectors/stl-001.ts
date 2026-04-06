import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl001Detector: RuleDetector = {
  ruleId: 'STL-001', // 단일 문자 변수명 혼동
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.getVariableDeclarations().forEach(decl => {
      const name = decl.getName();
      if (name.length === 1 && !['i', 'j', 'k', '_', 'e'].includes(name)) {
        findings.push({ line: decl.getStartLineNumber(), message: '단일 문자 변수명 위반: ' + name });
      }
    });
    return findings;
  }
};
