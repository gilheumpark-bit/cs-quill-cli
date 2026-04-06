import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log008Detector: RuleDetector = {
  ruleId: 'LOG-008', // 삼항 중첩 3단+
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ConditionalExpression) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '삼항 중첩 3단+ 위반 의심' 
        });
      }
    });

    return findings;
  }
};
