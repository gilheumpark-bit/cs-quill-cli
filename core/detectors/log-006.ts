import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log006Detector: RuleDetector = {
  ruleId: 'LOG-006', // 객체 동일성 오해
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.BinaryExpression) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '객체 동일성 오해 위반 의심' 
        });
      }
    });

    return findings;
  }
};
