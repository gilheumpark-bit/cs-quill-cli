import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: low | Confidence: low
 */
export const api014Detector: RuleDetector = {
  ruleId: 'API-014', // WeakMap 없이 private 관리
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for WeakMap 없이 private 관리
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'WeakMap 없이 private 관리 위반' });
      // }
    });
    */

    return findings;
  }
};
