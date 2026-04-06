import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: medium | Confidence: medium
 */
export const err011Detector: RuleDetector = {
  ruleId: 'ERR-011', // 타입 구분 없이 catch
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 타입 구분 없이 catch
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '타입 구분 없이 catch 위반' });
      // }
    });
    */

    return findings;
  }
};
