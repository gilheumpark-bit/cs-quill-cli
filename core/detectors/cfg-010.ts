import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: build-config
 */
export const cfg010Detector: RuleDetector = {
  ruleId: 'CFG-010',
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 스캐폴딩 
    sourceFile.forEachDescendant(node => {
      // 휴리스틱 임시 블록
      if (node.getKind() === SyntaxKind.StringLiteral && node.getText().includes('webpack')) {
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'CFG-010 위반 의심' 
        });
      }
    });

    return findings;
  }
};
