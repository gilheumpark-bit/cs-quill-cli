import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ008Detector: RuleDetector = {
  ruleId: 'TYP-008', // union null|undefined 미처리
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TypeChecker 기반 검사가 정밀하지만 임시로 Null 키워드가 있는 곳 조사
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
        const expr = (node as any).getExpression();
        // 실제로는 TypeChecker가 필요. 현재는 빈 룰로 둠.
      }
    });
    return findings;
  }
};
