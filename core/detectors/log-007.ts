import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log007Detector: RuleDetector = {
  ruleId: 'LOG-007', // 비트/논리 연산자 혼동
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.BinaryExpression && ((node as any).getOperatorToken().getKind() === SyntaxKind.AmpersandToken || (node as any).getOperatorToken().getKind() === SyntaxKind.BarToken)) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '비트/논리 연산자 혼동 위반 의심' 
        });
      }
    });

    return findings;
  }
};
