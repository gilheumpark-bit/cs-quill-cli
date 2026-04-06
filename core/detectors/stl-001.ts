import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl001Detector: RuleDetector = {
  ruleId: 'STL-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 스캐폴딩 
    sourceFile.forEachDescendant(node => {
      // 휴리스틱 임시 블록
      if (node.getKind() === SyntaxKind.FunctionDeclaration && node.getText().includes('any')) {
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'STL-001 위반 의심' 
        });
      }
    });

    return findings;
  }
};
