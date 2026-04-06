import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * CMX-018: Feature Envy
 * Detects methods that access another object's properties/methods more than their own class's.
 * Heuristic: counts `this.X` vs `otherObj.X` property accesses in each method.
 */
export const cmx018Detector: RuleDetector = {
  ruleId: 'CMX-018',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    for (const cls of sourceFile.getClasses()) {
      for (const method of cls.getMethods()) {
        let thisAccess = 0;
        let otherAccess = 0;

        method.forEachDescendant(node => {
          if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
            const expr = (node as any).getExpression();
            if (expr?.getKind() === SyntaxKind.ThisKeyword) {
              thisAccess++;
            } else if (
              expr?.getKind() === SyntaxKind.Identifier ||
              expr?.getKind() === SyntaxKind.PropertyAccessExpression
            ) {
              otherAccess++;
            }
          }
        });

        // Feature envy: method uses external objects more than its own class
        // Threshold: otherAccess > thisAccess and otherAccess >= 4
        if (otherAccess > thisAccess && otherAccess >= 4) {
          const name = method.getName();
          findings.push({
            line: method.getStartLineNumber(),
            message: `메서드 '${name}'이(가) 외부 객체를 ${otherAccess}회 접근하고 this를 ${thisAccess}회 접근합니다. Feature Envy가 의심됩니다.`,
          });
        }
      }
    }

    return findings;
  },
};
