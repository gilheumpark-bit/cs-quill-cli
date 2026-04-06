import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 */
export const api005Detector: RuleDetector = {
  ruleId: 'API-005', // localStorage 동기 차단 대용량
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && node.getText().includes('localStorage.setItem')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'localStorage 동기 차단 대용량 위반 의심' 
        });
      }
    });

    return findings;
  }
};
