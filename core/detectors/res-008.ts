import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: low | Confidence: low
 */
export const res008Detector: RuleDetector = {
  ruleId: 'RES-008', // WeakRef 부재 대형 객체 참조
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // Heuristic: Using Map or Set to store large objects (DOM nodes, canvas, etc.)
    // We can guess if a variable name implies a cache and it's initialized with Map instead of WeakMap
    const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
    for (const decl of varDecls) {
       const name = decl.getName();
       if (name.toLowerCase().includes('cache') || name.toLowerCase().includes('elements') || name.toLowerCase().includes('nodes')) {
          const init = decl.getInitializer();
          if (init && init.isKind(SyntaxKind.NewExpression)) {
             const typeName = init.getExpression().getText();
             if (typeName === 'Map' || typeName === 'Set') {
                findings.push({ line: decl.getStartLineNumber(), message: `WeakRef/WeakMap 부재 대형 객체 참조 위반 가능성: ${name}` });
             }
          }
       }
    }

    return findings;
  }
};
