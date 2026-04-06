import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: high | Confidence: high
 */
export const typ012Detector: RuleDetector = {
  ruleId: 'TYP-012', // strict 모드 미활성화
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for strict 모드 미활성화
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'strict 모드 미활성화 위반' });
      // }
    });
    */

    return findings;
  }
};
