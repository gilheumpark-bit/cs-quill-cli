import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ007Detector: RuleDetector = {
  ruleId: 'TYP-007', // never 타입을 값으로 반환
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.FunctionDeclaration || node.getKind() === SyntaxKind.MethodDeclaration) {
        const returnType = (node as any).getReturnTypeNode?.();
        if (returnType && returnType.getKind() === SyntaxKind.NeverKeyword) {
          findings.push({ line: node.getStartLineNumber(), message: 'never 타입을 값으로 반환 위반' });
        }
      }
    });
    return findings;
  }
};
