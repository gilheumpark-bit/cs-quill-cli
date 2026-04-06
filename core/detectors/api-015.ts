import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 */
export const api015Detector: RuleDetector = {
  ruleId: 'API-015', // Symbol 대신 문자열 키
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAssignment) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'Symbol 대신 문자열 키 위반 의심' 
        });
      }
    });

    return findings;
  }
};
