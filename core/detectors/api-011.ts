import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 */
export const api011Detector: RuleDetector = {
  ruleId: 'API-011', // setTimeout 문자열 인자
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('setTimeout(')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'setTimeout 문자열 인자 위반 의심' 
        });
      }
    });

    return findings;
  }
};
