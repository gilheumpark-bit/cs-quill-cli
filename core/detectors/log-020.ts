import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log020Detector: RuleDetector = {
  ruleId: 'LOG-020', // 얕은 복사 깊은 수정 원본 영향
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.SpreadAssignment || node.getKind() === SyntaxKind.SpreadElement) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '얕은 복사 깊은 수정 원본 영향 위반 의심' 
        });
      }
    });

    return findings;
  }
};
