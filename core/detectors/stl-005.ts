import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: medium | Confidence: medium
 */
export const stl005Detector: RuleDetector = {
  ruleId: 'STL-005', // 파일명 대소문자 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 파일명 대소문자 불일치
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '파일명 대소문자 불일치 위반' });
      // }
    });
    */

    return findings;
  }
};
