import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: medium | Confidence: medium
 */
export const prf003Detector: RuleDetector = {
  ruleId: 'PRF-003', // JSON.parse(JSON.stringify()) 깊은 복사
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for JSON.parse(JSON.stringify()) 깊은 복사
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'JSON.parse(JSON.stringify()) 깊은 복사 위반' });
      // }
    });
    */

    return findings;
  }
};
