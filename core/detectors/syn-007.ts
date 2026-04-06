import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn007Detector: RuleDetector = {
  ruleId: 'SYN-007', // 템플릿 리터럴 미종결
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 템플릿 리터럴 미종결
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '템플릿 리터럴 미종결 위반' });
      // }
    });
    */

    return findings;
  }
};
