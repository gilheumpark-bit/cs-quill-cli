import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 */
export const res006Detector: RuleDetector = {
  ruleId: 'RES-006',
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 스캐폴딩 
    sourceFile.forEachDescendant(node => {
      // 휴리스틱 임시 블록
      if (node.getKind() === SyntaxKind.CallExpression && node.getText().includes('setTimeout')) {
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'RES-006 위반 의심' 
        });
      }
    });

    return findings;
  }
};
