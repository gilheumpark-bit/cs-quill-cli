import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: high | Confidence: high
 */
export const syn009Detector: RuleDetector = {
  ruleId: 'SYN-009', // import 경로 따옴표 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for import 경로 따옴표 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'import 경로 따옴표 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
