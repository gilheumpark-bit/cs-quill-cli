import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: medium | Confidence: medium
 */
export const cfg011Detector: RuleDetector = {
  ruleId: 'CFG-011', // devDeps 프로덕션 빌드 포함
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for devDeps 프로덕션 빌드 포함
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'devDeps 프로덕션 빌드 포함 위반' });
      // }
    });
    */

    return findings;
  }
};
