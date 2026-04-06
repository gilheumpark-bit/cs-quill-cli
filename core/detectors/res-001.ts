import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res001Detector: RuleDetector = {
  ruleId: 'RES-001', // 파일 스트림 close 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 파일 스트림 close 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '파일 스트림 close 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
