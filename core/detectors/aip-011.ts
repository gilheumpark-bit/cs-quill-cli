import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-011: 구형 패턴 고집 (Legacy pattern insistence)
 * AI uses outdated JavaScript/TypeScript patterns when modern equivalents exist.
 * Detects: var usage, function keyword for callbacks, require() in TS, etc.
 */
export const aip011Detector: RuleDetector = {
  ruleId: 'AIP-011',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    // Detect 'var' declarations
    sourceFile.getVariableStatements().forEach(stmt => {
      if (stmt.getDeclarationKind().toString() === 'var') {
        findings.push({
          line: stmt.getStartLineNumber(),
          message: '구형 패턴: var 사용 — let/const 사용 권장',
        });
      }
    });

    // Detect require() calls in TypeScript files
    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const expr = node.getChildAtIndex(0);
      if (expr?.getText() === 'require') {
        findings.push({
          line: node.getStartLineNumber(),
          message: '구형 패턴: require() 사용 — import/export 구문 권장',
        });
      }
    });

    // Detect arguments keyword usage (should use rest params)
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.Identifier && node.getText() === 'arguments') {
        const parent = node.getParent();
        // Skip if it's a property assignment key or interface member
        if (parent?.getKind() === SyntaxKind.PropertyAccessExpression ||
            parent?.getKind() === SyntaxKind.ElementAccessExpression) {
          // check if this 'arguments' is the object part
          const paText = parent.getText();
          if (paText.startsWith('arguments')) {
            findings.push({
              line: node.getStartLineNumber(),
              message: '구형 패턴: arguments 객체 사용 — rest 파라미터(...args) 권장',
            });
          }
        }
      }
    });

    // Detect for-in on arrays
    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.ForInStatement) return;
      const expr = node.getChildAtIndex(3); // the expression being iterated
      if (expr) {
        findings.push({
          line: node.getStartLineNumber(),
          message: '구형 패턴: for...in 사용 — 배열에는 for...of, 객체에는 Object.entries() 권장',
        });
      }
    });

    return findings;
  }
};
