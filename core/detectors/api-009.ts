import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 */
export const api009Detector: RuleDetector = {
  ruleId: 'API-009', // document.write()
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('document.write(')) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'document.write() 위반 의심' 
        });
      }
    });

    return findings;
  }
};
