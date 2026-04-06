import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: critical | Confidence: high
 */
export const api001Detector: RuleDetector = {
  ruleId: 'API-001', // 존재하지 않는 메서드 호출 (hallucination)
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 존재하지 않는 메서드 호출 (hallucination)
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '존재하지 않는 메서드 호출 (hallucination) 위반' });
      // }
    });
    */

    return findings;
  }
};
