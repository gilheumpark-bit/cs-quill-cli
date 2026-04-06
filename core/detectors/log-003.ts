import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log003Detector: RuleDetector = {
  ruleId: 'LOG-003', // boolean 리터럴 비교
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.BinaryExpression && (node.getText().includes('=== true') || node.getText().includes('=== false'))) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'boolean 리터럴 비교 위반 의심' 
        });
      }
    });

    return findings;
  }
};
