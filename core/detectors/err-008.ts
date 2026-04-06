import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: high | Confidence: low
 */
export const err008Detector: RuleDetector = {
  ruleId: 'ERR-008', // error 메시지 민감 정보
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for error 메시지 민감 정보
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'error 메시지 민감 정보 위반' });
      // }
    });
    */

    return findings;
  }
};
