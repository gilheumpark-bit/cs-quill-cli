import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ006Detector: RuleDetector = {
  ruleId: 'TYP-006', // generics 타입 파라미터 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.TypeReference) {
        const typeName = (node as any).getTypeName().getText();
        if ((typeName === 'Promise' || typeName === 'Array' || typeName === 'Map' || typeName === 'Set') && (node as any).getTypeArguments().length === 0) {
          findings.push({ line: node.getStartLineNumber(), message: 'generics 타입 파라미터 누락 위반' });
        }
      }
    });
    return findings;
  }
};
