import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: critical | Confidence: medium
 */
export const cfg010Detector: RuleDetector = {
  ruleId: 'CFG-010', // .env git 추적 포함
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for .env git 추적 포함
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '.env git 추적 포함 위반' });
      // }
    });
    */

    return findings;
  }
};
