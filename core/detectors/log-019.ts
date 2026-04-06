import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log019Detector: RuleDetector = {
  ruleId: 'LOG-019', // typeof null === object
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.BinaryExpression && node.getText().includes('typeof') && node.getText().includes('object')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'typeof null === object 위반 의심' 
        });
      }
    });

    return findings;
  }
};
