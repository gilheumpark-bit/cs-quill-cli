import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: high | Confidence: high
 */
export const err010Detector: RuleDetector = {
  ruleId: 'ERR-010', // 비동기 에러를 동기 catch
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 비동기 에러를 동기 catch
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '비동기 에러를 동기 catch 위반' });
      // }
    });
    */

    return findings;
  }
};
