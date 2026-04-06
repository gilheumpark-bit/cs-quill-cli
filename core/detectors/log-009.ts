import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 */
export const log009Detector: RuleDetector = {
  ruleId: 'LOG-009', // 드모르간 미적용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PrefixUnaryExpression) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '드모르간 미적용 위반 의심' 
        });
      }
    });

    return findings;
  }
};
