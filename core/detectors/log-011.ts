import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log011Detector: RuleDetector = {
  ruleId: 'LOG-011', // .sort() comparator 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && node.getText().includes('.sort()')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '.sort() comparator 없음 위반 의심' 
        });
      }
    });

    return findings;
  }
};
