import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 */
export const api012Detector: RuleDetector = {
  ruleId: 'API-012', // Array 생성자 숫자 1개
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Array(')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'Array 생성자 숫자 1개 위반 의심' 
        });
      }
    });

    return findings;
  }
};
