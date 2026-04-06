import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log004Detector: RuleDetector = {
  ruleId: 'LOG-004', // !! 불필요 사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PrefixUnaryExpression && node.getText().startsWith('!!')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '!! 불필요 사용 위반 의심' 
        });
      }
    });

    return findings;
  }
};
