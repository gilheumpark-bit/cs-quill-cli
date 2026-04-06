import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 */
export const api001Detector: RuleDetector = {
  ruleId: 'API-001', // 존재하지 않는 메서드 호출 (hallucination)
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '존재하지 않는 메서드 호출 (hallucination) 위반 의심' 
        });
      }
    });

    return findings;
  }
};
