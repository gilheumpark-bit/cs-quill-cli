import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: medium | Confidence: low
 */
export const res007Detector: RuleDetector = {
  ruleId: 'RES-007', // 전역 캐시 무한 성장
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // Check top-level or class-level Map/Set declarations
    const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
    const propDecls = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyDeclaration);

    const allDecls = [...varDecls, ...propDecls];
    let hasGlobalMapSet = false;
    let globalLines: number[] = [];

    for (const decl of allDecls) {
       let isGlobalOrStatic = false;
       if (decl.isKind(SyntaxKind.VariableDeclaration)) {
          const parentStatement = decl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
          if (parentStatement && parentStatement.getParent() === sourceFile) {
             isGlobalOrStatic = true;
          }
       } else if (decl.isKind(SyntaxKind.PropertyDeclaration)) {
          if (decl.hasModifier(SyntaxKind.StaticKeyword)) {
             isGlobalOrStatic = true;
          }
       }

       if (isGlobalOrStatic) {
          const init = decl.getInitializer();
          if (init && init.isKind(SyntaxKind.NewExpression)) {
             const typeName = init.getExpression().getText();
             if (typeName === 'Map' || typeName === 'Set') {
                hasGlobalMapSet = true;
                globalLines.push(decl.getStartLineNumber());
             }
          }
       }
    }

    let hasDeleteOrClear = false;
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (propName === 'delete' || propName === 'clear') {
             hasDeleteOrClear = true;
          }
       }
    }

    if (hasGlobalMapSet && !hasDeleteOrClear) {
       for (const line of globalLines) {
           findings.push({ line, message: '전역 캐시 무한 성장 위반 (Map/Set clear 누락)' });
       }
    }

    return findings;
  }
};
