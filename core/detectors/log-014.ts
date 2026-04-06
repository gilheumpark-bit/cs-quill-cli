import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log014Detector: RuleDetector = {
  ruleId: 'LOG-014', // 원본 배열 변형
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && (node.getText().includes('.push(') || node.getText().includes('.splice('))) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '원본 배열 변형 위반 의심' 
        });
      }
    });

    return findings;
  }
};
