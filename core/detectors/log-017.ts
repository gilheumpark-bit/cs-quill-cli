import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log017Detector: RuleDetector = {
  ruleId: 'LOG-017', // 정수 나눗셈 Math.floor 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.BinaryExpression && (node as any).getOperatorToken().getKind() === SyntaxKind.SlashToken) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '정수 나눗셈 Math.floor 없음 위반 의심' 
        });
      }
    });

    return findings;
  }
};
