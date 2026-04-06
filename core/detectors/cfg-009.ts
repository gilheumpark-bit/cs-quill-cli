import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: medium | Confidence: medium
 */
export const cfg009Detector: RuleDetector = {
  ruleId: 'CFG-009', // peerDependencies 미선언
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for peerDependencies 미선언
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'peerDependencies 미선언 위반' });
      // }
    });
    */

    return findings;
  }
};
