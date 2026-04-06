import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: low | Confidence: medium
 */
export const api004Detector: RuleDetector = {
  ruleId: 'API-004', // Object.keys vs entries 의도 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Object.keys vs entries 의도 불일치
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Object.keys vs entries 의도 불일치 위반' });
      // }
    });
    */

    return findings;
  }
};
