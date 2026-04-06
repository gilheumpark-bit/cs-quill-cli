import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: high | Confidence: medium
 */
export const cfg007Detector: RuleDetector = {
  ruleId: 'CFG-007', // 순환 의존성
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 순환 의존성
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '순환 의존성 위반' });
      // }
    });
    */

    return findings;
  }
};
