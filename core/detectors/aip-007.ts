import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-007: null 체크 불필요 위치 (Unnecessary null checks)
 * AI adds redundant null/undefined checks in positions where the value
 * is guaranteed to be non-null (e.g., immediately after assignment, inside
 * a block already guarded by a null check).
 */
export const aip007Detector: RuleDetector = {
  ruleId: 'AIP-007',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    // Detect patterns: if (x !== null) { ... if (x !== null) ... }
    // i.e., nested redundant null checks on the same variable
    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.IfStatement) return;
      const condText = node.getChildAtIndex(1)?.getText() ?? '';

      // Extract variable being null-checked
      const nullCheckMatch = condText.match(/^(\w+)\s*!==?\s*(?:null|undefined)$/) ??
                             condText.match(/^(?:null|undefined)\s*!==?\s*(\w+)$/);
      if (!nullCheckMatch) return;
      const guardedVar = nullCheckMatch[1];

      // Look for nested if-statements checking the same variable
      const thenBlock = node.getChildAtIndex(2);
      if (!thenBlock) return;

      thenBlock.getDescendantsOfKind(SyntaxKind.IfStatement).forEach(inner => {
        const innerCond = inner.getExpression().getText();
        const sameCheck = innerCond.includes(`${guardedVar} !== null`) ||
                          innerCond.includes(`${guardedVar} !== undefined`) ||
                          innerCond.includes(`${guardedVar} != null`);
        if (sameCheck) {
          findings.push({
            line: inner.getStartLineNumber(),
            message: `불필요한 null 체크: '${guardedVar}'는 이미 line ${node.getStartLineNumber()}에서 null 가드됨`,
          });
        }
      });
    });

    // Detect: const x = new Foo(); if (x === null) ...
    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.VariableStatement) return;
      const decls = node.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
      for (const decl of decls) {
        const init = decl.getInitializer();
        if (!init || init.getKind() !== SyntaxKind.NewExpression) continue;
        const varName = decl.getName();
        // Check next sibling
        const nextSibling = node.getNextSibling();
        if (nextSibling?.getKind() === SyntaxKind.IfStatement) {
          const condText = nextSibling.getChildAtIndex(1)?.getText() ?? '';
          if (condText.includes(`${varName} === null`) || condText.includes(`${varName} == null`)) {
            findings.push({
              line: nextSibling.getStartLineNumber(),
              message: `불필요한 null 체크: '${varName}'는 new로 생성되어 null일 수 없음`,
            });
          }
        }
      }
    });

    return findings;
  }
};
