import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log018Detector: RuleDetector = {
  ruleId: 'LOG-018', // timezone 미고려 날짜 연산
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Date')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'timezone 미고려 날짜 연산 위반 의심' 
        });
      }
    });

    return findings;
  }
};
