import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 */
export const api014Detector: RuleDetector = {
  ruleId: 'API-014', // WeakMap 없이 private 관리
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Map(')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'WeakMap 없이 private 관리 위반 의심' 
        });
      }
    });

    return findings;
  }
};
