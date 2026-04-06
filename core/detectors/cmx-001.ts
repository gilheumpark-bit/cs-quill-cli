import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 */
export const cmx001Detector: RuleDetector = {
  ruleId: 'CMX-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 스캐폴딩 
    sourceFile.forEachDescendant(node => {
      // 휴리스틱 임시 블록
      if (node.getKind() === SyntaxKind.FunctionDeclaration && node.getText().split('\n').length > 50) {
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'CMX-001 위반 의심' 
        });
      }
    });

    return findings;
  }
};
