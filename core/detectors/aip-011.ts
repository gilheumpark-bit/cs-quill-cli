import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-antipattern
 */
export const aip011Detector: RuleDetector = {
  ruleId: 'AIP-011',
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 스캐폴딩 
    sourceFile.forEachDescendant(node => {
      // 휴리스틱 임시 블록
      if (node.getKind() === SyntaxKind.Identifier && node.getText().includes('TODO')) {
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: 'AIP-011 위반 의심' 
        });
      }
    });

    return findings;
  }
};
